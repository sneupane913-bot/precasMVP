/**
 * Credit packs.
 *
 * One-time purchases, NOT subscriptions. Both competitors sell this way and
 * they are right: a student needs this product for three to six weeks before
 * their interview and then never again. A monthly plan invites them to think
 * about cancelling. A pack does not.
 *
 * Pricing is deliberately 44% to 60% under finduni.ai while still keeping 81%
 * to 87% of every rupee. Working in docs/MONEY.md, competitor tiers in
 * docs/COMPETITOR-PRICING.md.
 *
 * This is DATA. Changing a price is a change here, never a code change.
 */

export interface Plan {
  code: string;
  /** Public packs only. Starter and Pro are hidden by client decision. */
  isPublic: boolean;
  name: string;
  tagline: string;
  priceNpr: number;
  mockInterviews: number;
  practiceSessions: number;
  /** Questions allowed in one mock. Trial is deliberately capped. */
  maxQuestionsPerMock: number;
  badge?: 'MOST POPULAR' | 'BEST VALUE';
  /** Our cost to deliver the whole pack, in NPR. Kept honest, shown to admins. */
  costNpr: number;
}

export const PLANS: Plan[] = [
  {
    code: 'trial',
    isPublic: true,
    name: 'Free trial',
    tagline: 'See if it is any good, first',
    priceNpr: 0,
    mockInterviews: 1,
    practiceSessions: 0,
    maxQuestionsPerMock: 10,
    costNpr: 3,
  },
  {
    code: 'starter',
    isPublic: false,
    name: 'Starter',
    tagline: 'Just before your interview',
    priceNpr: 149,
    mockInterviews: 2,
    practiceSessions: 5,
    maxQuestionsPerMock: 17,
    costNpr: 20,
  },
  {
    code: 'prep',
    isPublic: true,
    name: 'Prep',
    tagline: 'Get comfortable',
    priceNpr: 449,
    mockInterviews: 6,
    practiceSessions: 15,
    maxQuestionsPerMock: 17,
    badge: 'MOST POPULAR',
    costNpr: 59,
  },
  {
    code: 'serious',
    isPublic: true,
    name: 'Serious',
    tagline: 'Build real confidence',
    priceNpr: 799,
    mockInterviews: 12,
    practiceSessions: 30,
    maxQuestionsPerMock: 17,
    badge: 'BEST VALUE',
    costNpr: 118,
  },
  {
    code: 'pro',
    isPublic: false,
    name: 'Pro',
    tagline: 'Until you are ready',
    priceNpr: 1299,
    mockInterviews: 25,
    practiceSessions: 60,
    maxQuestionsPerMock: 17,
    costNpr: 241,
  },
];

/** Bulk seats sold to consultancies, who resell under their own name. */
export interface Bundle {
  code: string;
  name: string;
  priceNpr: number;
  seats: number;
  costNpr: number;
}

export const BUNDLES: Bundle[] = [
  { code: 'small', name: 'Small', priceNpr: 6000, seats: 20, costNpr: 2360 },
  { code: 'medium', name: 'Medium', priceNpr: 13500, seats: 50, costNpr: 5900 },
  { code: 'large', name: 'Large', priceNpr: 24000, seats: 100, costNpr: 11800 },
];

/**
 * What one consultancy seat actually gives the student who takes it.
 *
 * ** NEEDS THE CLIENT'S CONFIRMATION. ** This was never specified, and seats
 * were being sold with nothing behind them, so rather than invent a number I
 * derived one from the client's own figures in BUNDLES above:
 *
 *   every bundle costs us 118 NPR per seat (2360/20, 5900/50, 11800/100)
 *   the Prep pack costs us 241 NPR and contains 6 mocks and 15 practice
 *   118/241 is a shade under half, so a seat is half a Prep pack
 *
 * That gives 3 mocks and 8 practice sessions, and it keeps the wholesale
 * margin the client already priced for (a seat sells at 300 and costs 118).
 * If the client wants a seat to be worth more, raise these two numbers and the
 * bundle prices together, never one without the other.
 */
export const SEAT_GRANT = { mocks: 3, practice: 8 } as const;

/** What the competition charges, so our page can show the comparison honestly. */
export const COMPETITOR_PER_MOCK_NPR = { best: 143, typical: 175, worst: 199 };

/**
 * The only packs a student may see or buy. QA-207: Starter and Pro were
 * displayed despite the client hiding them. Public pages MUST use this, never
 * PLANS directly.
 */
export function publicPlans(): Plan[] {
  return PLANS.filter((p) => p.isPublic && p.priceNpr > 0);
}

/** The trial: first 10 questions of the same 17-question sitting. */
export const TRIAL_QUESTION_COUNT = 10;
export const FULL_MOCK_QUESTION_COUNT = 17;

export function getPlan(code: string): Plan | undefined {
  return PLANS.find((p) => p.code === code);
}

export function perMockNpr(plan: Plan): number {
  return plan.mockInterviews > 0 ? Math.round(plan.priceNpr / plan.mockInterviews) : 0;
}
