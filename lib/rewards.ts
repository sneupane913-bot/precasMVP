import { repo, type RewardRule, type StudentOffer } from '@/lib/db';

/**
 * The rewards engine (I9).
 *
 * Two mechanics, both of which must be HONEST, because the whole product is
 * sold on being the one platform that does not mislead a frightened student:
 *
 * 1. Post-trial window. Finishing the free ten questions starts a real, PERSONAL
 *    countdown. Book a pack inside it and extra mocks are added. It is honest
 *    because the clock starts at a real event, the reward is really granted,
 *    and once it expires it is GONE for that student. We never quietly reissue
 *    the same offer on their next visit.
 *
 * 2. Campaign. A named, dated push (an intake deadline, a festival). The end
 *    time is stored on the server, so reloading the page shows the same
 *    deadline ticking down rather than a fresh one.
 *
 * The rule QA enforces: an evergreen countdown, or one generated in the browser
 * with Date.now() + X, is a dark pattern and a HIGH severity defect. Every
 * deadline here comes from the database.
 *
 * Rewards are a VALUE ADD, never a discount. The client's decision: the price
 * of a pack does not move, so a student who paid yesterday was not overcharged.
 */

export interface ActiveOffer {
  ruleId: string;
  code: string;
  name: string;
  publicReason: string;
  /** ISO. The browser only renders this, it never invents it. */
  endsAt: string;
  bonusMocksByPack: Record<string, number>;
}

/** Defaults, so a fresh install has something sensible and honest. */
export const DEFAULT_RULES: Omit<RewardRule, 'createdAt' | 'updatedAt' | 'updatedBy'>[] = [
  {
    id: 'rule-post-trial',
    code: 'post_trial',
    kind: 'post_trial_window',
    name: 'Finish your free questions',
    publicReason:
      'You finished your free questions today, so we have added extra mocks if you carry on now.',
    active: true,
    // The 12 mock pack gets the bigger sweetener, so the focal pack stays focal.
    bonusMocksByPack: { prep: 1, serious: 2 },
    endsAt: null,
    windowMinutes: 60,
  },
];

export async function rulesOrDefaults(): Promise<RewardRule[]> {
  const stored = await repo().listRewardRules();
  if (stored.length > 0) return stored;
  const now = new Date().toISOString();
  return DEFAULT_RULES.map((r) => ({ ...r, createdAt: now, updatedAt: now, updatedBy: null }));
}

/**
 * Called when a student finishes their free questions. Starts their personal
 * window ONCE. If they already had one, we do not start another, because that
 * is exactly the "timer resets on every visit" trick we refuse to do.
 */
export async function startPostTrialWindow(studentId: string): Promise<StudentOffer | null> {
  const r = repo();
  const rule = (await rulesOrDefaults()).find(
    (x) => x.kind === 'post_trial_window' && x.active
  );
  if (!rule || !rule.windowMinutes) return null;

  const existing = await r.listOffers(studentId);
  if (existing.some((o) => o.ruleId === rule.id)) return null; // never reissued

  const now = Date.now();
  return r.createOffer({
    id: crypto.randomUUID(),
    studentId,
    ruleId: rule.id,
    startedAt: new Date(now).toISOString(),
    endsAt: new Date(now + rule.windowMinutes * 60_000).toISOString(),
    consumedAt: null,
  });
}

/**
 * What this student may honestly be shown right now. Returns null when there is
 * nothing real to offer, and null is a perfectly good answer: no offer beats a
 * fake one.
 */
export async function activeOfferFor(studentId: string): Promise<ActiveOffer | null> {
  const r = repo();
  const rules = await rulesOrDefaults();
  const now = Date.now();

  // Personal window first: it is the more relevant of the two.
  const offers = await r.listOffers(studentId);
  for (const o of offers) {
    if (o.consumedAt) continue;
    if (new Date(o.endsAt).getTime() <= now) continue; // expired stays expired
    const rule = rules.find((x) => x.id === o.ruleId && x.active);
    if (!rule) continue;
    return {
      ruleId: rule.id,
      code: rule.code,
      name: rule.name,
      publicReason: rule.publicReason,
      endsAt: o.endsAt,
      bonusMocksByPack: rule.bonusMocksByPack,
    };
  }

  // Then any running campaign, whose deadline is shared but still real.
  const campaign = rules.find(
    (x) => x.kind === 'campaign' && x.active && x.endsAt && new Date(x.endsAt).getTime() > now
  );
  if (campaign?.endsAt) {
    return {
      ruleId: campaign.id,
      code: campaign.code,
      name: campaign.name,
      publicReason: campaign.publicReason,
      endsAt: campaign.endsAt,
      bonusMocksByPack: campaign.bonusMocksByPack,
    };
  }

  return null;
}

/**
 * How many bonus mocks this pack earns right now. Called at the moment a
 * payment is approved, so the promise made on screen is the one that is kept.
 */
export async function bonusMocksFor(studentId: string, packCode: string): Promise<number> {
  const offer = await activeOfferFor(studentId);
  if (!offer) return 0;
  return offer.bonusMocksByPack[packCode] ?? 0;
}

/** Mark the offer used, so it cannot pay out twice. */
export async function consumeOffer(studentId: string, ruleId: string): Promise<void> {
  const r = repo();
  const offers = await r.listOffers(studentId);
  const match = offers.find((o) => o.ruleId === ruleId && !o.consumedAt);
  if (match) await r.updateOffer(match.id, { consumedAt: new Date().toISOString() });
}
