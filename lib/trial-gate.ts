import { platform } from '@/lib/platform';
import { repo } from '@/lib/db';
import { BRAND_NAME } from '@/lib/branding';

/**
 * The trial gate.
 *
 * The design bias is stated in HANDOFF (spec 5B) and is the opposite of most
 * anti-fraud work: **minimise false positives even at the cost of letting some
 * abusers through.** A blocked real student is lost revenue and lost trust. An
 * abuser who slips through costs bounded transcription, capped by the spend
 * breaker. So this errs toward letting people in.
 *
 * What it must never do is punish a consultancy lab: thirty real students share
 * one Wi-Fi and sometimes one machine. That is normal, not fraud.
 *
 * The outcome is never a ban. The worst case is a SOFT DENY: the student keeps
 * full browsing, can still buy a pack, and has a human to appeal to.
 */

export interface RiskInput {
  authProviderId: string;
  fingerprintHash: string | null;
  ip: string | null;
}

export interface GateDecision {
  outcome: 'granted' | 'soft_denied' | 'already_claimed';
  riskScore: number;
  reasons: string[];
  /** Shown to the student. Calm, never accusatory, never a dead end. */
  message: string | null;
}

/** Distinct accounts on one device before we even start to wonder. */
const DEVICE_SOFT_THRESHOLD = 4;
/** On an allow-listed consultancy network, labs legitimately go far higher. */
const DEVICE_ALLOWLISTED_THRESHOLD = 40;
const WINDOW_HOURS = 24;

async function ipIsAllowlisted(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const consultancies = await platform.listConsultancies();
  return consultancies.some(
    (c) =>
      c.status === 'approved' &&
      Array.isArray(c.allowlistedIps) &&
      (c.allowlistedIps ?? []).includes(ip)
  );
}

export async function evaluateTrial(input: RiskInput): Promise<GateDecision> {
  const r = repo();

  // One trial per Google account. This is the actual gate; everything else is
  // a secondary signal.
  const existing = await r.getTrialClaimByAuthId(input.authProviderId);
  if (existing) {
    return {
      outcome: 'already_claimed',
      riskScore: 0,
      reasons: ['trial already claimed by this account'],
      message:
        'You have already used your free questions with this Google account. Buy a pack to keep practising.',
    };
  }

  const reasons: string[] = [];
  let score = 0;

  const allowlisted = await ipIsAllowlisted(input.ip);
  if (allowlisted) reasons.push('network is an approved consultancy');

  /**
   * N-18. A device the super admin has soft-blocked by hand.
   *
   * A human looked at the queue and decided. That outranks the heuristic in
   * both directions: it denies where the counter had not yet noticed, and it
   * is still only a SOFT deny, so the student keeps every report they earned
   * and can still buy a pack. We never ban.
   */
  if (input.fingerprintHash) {
    const settings = await platform.getSettings();
    if ((settings.blockedDevices ?? []).includes(input.fingerprintHash)) {
      return {
        outcome: 'soft_denied',
        riskScore: 100,
        reasons: ['device soft-blocked by hand'],
        message: blockedMessage(settings),
      };
    }
  }

  if (input.fingerprintHash) {
    const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
    const distinctAccounts = await r.countClaimsByFingerprint(input.fingerprintHash, since);

    const threshold = allowlisted ? DEVICE_ALLOWLISTED_THRESHOLD : DEVICE_SOFT_THRESHOLD;
    if (distinctAccounts >= threshold) {
      score += 60;
      reasons.push(
        `${distinctAccounts} different accounts claimed on this device in ${WINDOW_HOURS}h (limit ${threshold})`
      );
    } else if (distinctAccounts >= Math.max(2, threshold - 1)) {
      // Noted, not acted on. A family sharing a laptop lands here and must pass.
      score += 15;
      reasons.push(`${distinctAccounts} accounts on this device, within normal range`);
    }
  } else {
    // No fingerprint is mildly unusual but is also just a privacy browser.
    score += 5;
    reasons.push('no device signal available');
  }

  // Deliberately NOT scored: IP on its own. A consultancy lab, a hostel, a
  // cyber cafe and a family all share one address. Blocking on IP alone is the
  // single easiest way to lose thirty real students at once.

  const softDenied = score >= 60;

  return {
    outcome: softDenied ? 'soft_denied' : 'granted',
    riskScore: score,
    reasons,
    message: softDenied
      ? 'We could not automatically confirm you are a new student on this device. You can still look around and buy a pack. To switch on your free questions, message us on WhatsApp and we will turn them on.'
      : null,
  };
}


/**
 * N-19. What a soft-blocked student is told.
 *
 * Never "you are banned". They get the reason in plain words, a number, and a
 * WhatsApp link with the message already written — because a student who has
 * been wrongly flagged is upset, and asking them to compose an appeal in
 * English on a phone is how a real customer gives up instead of contacting us.
 */
export function blockedMessage(settings: { supportWhatsapp?: string; contactPhone?: string }): string {
  const num = settings.supportWhatsapp || settings.contactPhone || '';
  return [
    'We need to check something about this device before giving another free trial.',
    'Nothing you have already done is lost, and you can still buy a pack.',
    num ? `Message us on ${num} and we will sort it out.` : 'Please contact us and we will sort it out.',
  ].join(' ');
}

/** N-19. The pre-filled WhatsApp link for a blocked student. */
export function blockedWhatsappLink(settings: { supportWhatsapp?: string }, name: string | null): string {
  const num = (settings.supportWhatsapp ?? '').replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hello, my free trial on ${BRAND_NAME} is blocked on this device. My name is ${name ?? ''}. Please can you check it.`
  );
  return num ? `https://wa.me/${num}?text=${msg}` : '';
}
