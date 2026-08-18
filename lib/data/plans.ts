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
    mockInterviews: 3,
    practiceSessions: 15,
    maxQuestionsPerMock: 17,
    badge: 'MOST POPULAR',
    // About NPR 10 a mock at Groq's published rate, so 3 mocks costs us ~30.
    costNpr: 30,
  },
  {
    code: 'serious',
    /**
     * WITHDRAWN FROM PUBLIC SALE, 18 August 2026, until the bank grows.
     *
     * This pack promises ten sittings. A sitting is 17 questions and the bank
     * holds 22 root questions, so a student who bought this saw substantially
     * the whole bank in sitting one and then met it again nine more times.
     * That is not a product; it is the same mock sold ten times.
     *
     * Nothing else changes. The pack still exists, consultancy seats are still
     * derived from it, and anyone who already holds it keeps exactly what they
     * bought. It is simply not offered to new buyers.
     *
     * TO PUT IT BACK: load the reviewed question bank (401 harvested, sourced,
     * in PreCAS-question-bank.xlsx) so the bank holds at least 3 x 17 = 51 root
     * questions, then flip this to true. qa/promise-check.js enforces the rule
     * and will tell you the moment it is satisfied.
     */
    isPublic: false,
    name: 'Serious',
    tagline: 'Build real confidence',
    priceNpr: 799,
    mockInterviews: 10,
    practiceSessions: 20,
    maxQuestionsPerMock: 17,
    badge: 'BEST VALUE',
    costNpr: 98,
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

/**
 * What one consultancy seat gives the student who takes it.
 *
 * Client decision, 12 August 2026: **a seat is the Serious pack**, exactly what
 * a paying student gets for NPR 799. A consultancy student must not receive a
 * lesser product than someone who walked in off the street; the consultancy
 * gets the discount, the student gets the same thing.
 *
 * This is deliberately DERIVED from the plan rather than typed out, so a seat
 * cannot silently drift away from what we sell. Change the Serious pack and the
 * seat follows.
 *
 * It also matches what the original cost sheet always assumed: every bundle was
 * costed at NPR 118 a seat, and NPR 118 is exactly the Serious pack's cost.
 * (An earlier version of this file said 3 mocks, derived from misreading Pro's
 * cost as Prep's. That was wrong and is corrected here.)
 */
const SEAT_PLAN = PLANS.find((p) => p.code === 'serious')!;
export const SEAT_GRANT = {
  mocks: SEAT_PLAN.mockInterviews,
  practice: SEAT_PLAN.practiceSessions,
} as const;

/** What one seat costs us in provider bills. Bundle costs are built from this. */
export const SEAT_COST_NPR = SEAT_PLAN.costNpr;

/**
 * N-1. The seat sizes a consultancy may buy, and may mix in one order.
 *
 * Priced from what each size costs us (about NPR 10 a mock) with the same
 * wholesale margin the client set for the flat seat: the consultancy needs room
 * to resell underneath our retail price or the channel stops existing.
 *
 * `practice` scales with the size so a small seat is not a crippled product —
 * it is a smaller one.
 */
export interface SeatSize {
  code: 'seat3' | 'seat6' | 'seat10';
  label: string;
  mocks: number;
  practice: number;
  /** What the consultancy pays us per seat. */
  priceNpr: number;
  /** What it costs us to deliver. */
  costNpr: number;
}

export const SEAT_SIZES: SeatSize[] = [
  { code: 'seat3', label: '3 mocks', mocks: 3, practice: 15, priceNpr: 150, costNpr: 30 },
  { code: 'seat6', label: '6 mocks', mocks: 6, practice: 18, priceNpr: 240, costNpr: 59 },
  { code: 'seat10', label: '10 mocks', mocks: 10, practice: 20, priceNpr: 300, costNpr: 98 },
];

export function getSeatSize(code: string): SeatSize | undefined {
  return SEAT_SIZES.find((s) => s.code === code);
}

/** The size used when a consultancy has not chosen one. The full pack. */
export const DEFAULT_SEAT_SIZE = SEAT_SIZES[2]!;

/** Bulk seats sold to consultancies, who resell under their own name. */
export interface Bundle {
  code: string;
  name: string;
  priceNpr: number;
  seats: number;
  costNpr: number;
}

/**
 * Client decision, 12 August 2026. Two sizes only, at NPR 300 a seat.
 *
 * The 50 and 100 seat bundles were dropped: Nepali consultancies buy in
 * twenties, and an unsold tier on the page only makes the real ones look small.
 *
 * NPR 300 against a NPR 799 retail price is a 62 percent discount, and that is
 * deliberate rather than generous. The consultancy has to resell to their own
 * students to make anything, so they need room underneath our retail price. At
 * 300 they can charge 500 or 600, make real money, and keep buying. Priced near
 * retail the channel simply stops existing, which is worth more to us than the
 * extra margin per seat.
 */
export const BUNDLES: Bundle[] = [
  { code: 'b20', name: '20 seats', priceNpr: 6000, seats: 20, costNpr: 20 * SEAT_COST_NPR },
  { code: 'b30', name: '30 seats', priceNpr: 9000, seats: 30, costNpr: 30 * SEAT_COST_NPR },
];

/** What the competition charges, so our page can show the comparison honestly. */
export const COMPETITOR_PER_MOCK_NPR = { best: 143, typical: 175, worst: 199 };

/**
 * The competitor's ENTRY pack, which is the only competitor number the page
 * still shows (M-12 withdrew the per-mock comparison).
 *
 * Declared here rather than typed into the table for two reasons. First, a
 * claim about somebody else's price is the claim most likely to become false
 * without us noticing, so it carries the date it was checked and where it came
 * from, and the page prints that date (G-9).
 *
 * Second, and this is the sharp one: their entry pack is NPR 799 and OUR
 * Serious pack is also NPR 799. Two identical numbers a few lines apart in the
 * same table, one of ours and one of theirs. If our price ever changes and
 * somebody updates "the 799 in the table", there is an even chance they change
 * the wrong one and the page silently claims we match a competitor we do not.
 * Naming them differently in code makes that mistake impossible to make by
 * accident.
 */
export const COMPETITOR_ENTRY = {
  priceNpr: 799,
  checkedOn: '6 August 2026',
  where: 'their public checkout',
} as const;

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

/**
 * The cheapest pack a student can actually buy — the "from" price.
 *
 * Exists because sales copy kept typing it. "From NPR 449" was hard-coded in
 * TrialGate and in the comparison table, and the 13 Aug price change did not
 * reach either of them. A price typed into a sentence is a price that will be
 * wrong the first time it changes, and being wrong about OUR OWN price on the
 * page that asks for money is the worst place to be wrong (G-9).
 *
 * Derived, never written down. If the client changes the pack tomorrow, every
 * sentence that quotes it changes with it.
 */
export const ENTRY_PLAN: Plan = publicPlans().reduce((a, b) => (b.priceNpr < a.priceNpr ? b : a));

export function getPlan(code: string): Plan | undefined {
  return PLANS.find((p) => p.code === code);
}

export function perMockNpr(plan: Plan): number {
  return plan.mockInterviews > 0 ? Math.round(plan.priceNpr / plan.mockInterviews) : 0;
}
