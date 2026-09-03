import { repo, type Coupon, type Student } from '@/lib/db';
import { platform, type Consultancy } from '@/lib/platform';
import { couponOrderTotal, getCouponPack, getPlan } from '@/lib/data/plans';
import { grantPack } from '@/lib/entitlement';

/**
 * THE COUPON MODEL, in one file.
 *
 * How a consultancy buys for its students from 3 September 2026:
 *
 *   1. A marketer sends the consultancy the unlisted /consultancy page, they
 *      agree a basket ("five Prep coupons and two Serious"), and they pay us
 *      by QR, in advance.
 *   2. The super admin creates the consultancy: name, short name, the coupon
 *      counts, and the amount received. The SERVER works out what that basket
 *      costs and refuses to create anything unless the amount matches to the
 *      rupee. That is the guard against the super admin quietly issuing more
 *      coupons than were paid for.
 *   3. The account is created with a HANDOVER passcode we generate, and the
 *      consultancy is told to change it on first sign-in. Their coupons appear
 *      in their portal.
 *   4. They copy a coupon and send it to a student. The student signs in,
 *      opens /pricing, enters the code, and the pack is switched on at once.
 *      The coupon is then marked used, by whom, and when, and both the
 *      consultancy and the super admin can see it.
 *
 * Every rule the client stated about it is implemented here so the three
 * routes that touch coupons (platform, admin, payment) cannot drift apart.
 */

/**
 * No O/0, no I/1. Twelve characters from 32 letters is about 1.2 x 10^18
 * codes, so a coupon cannot be guessed; the redeem route is rate limited on
 * top. This is the same alphabet as the student referral code, for the same
 * reason: it can be read out over the phone without ambiguity.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const COUPON_CODE_LENGTH = 12;

export function newCouponCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(COUPON_CODE_LENGTH));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** Upper case, no spaces or dashes. Whatever a student pasted, this is the key. */
export function normaliseCouponCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Grouped in fours so it can be read out and copied without losing a letter. */
export function formatCouponCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-');
}

/**
 * The handover passcode the super admin never types.
 *
 * Client decision: "let's not allow the super admin to add a password". One
 * is generated here, shown once on creation, and the consultancy must replace
 * it on first sign-in (see `passcodeIsTemporary`). Letters and digits mixed,
 * because `changePasscode` rightly refuses a digits-only code and the handover
 * code should not set a worse example than the rule it hands over to.
 */
export function newHandoverPasscode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  // Guarantee at least one letter and one digit, whatever the dice said.
  return 'ETA-' + out.slice(0, 5) + '-' + out.slice(5);
}

/**
 * Issue a basket of coupons to a consultancy.
 *
 * The caller has ALREADY verified the money against `couponOrderTotal`. This
 * only mints codes, retrying on the astronomically unlikely collision, and
 * writes them. Returns the coupons so the caller can show them.
 */
export async function issueCoupons(
  consultancyId: string,
  counts: Record<string, number>,
  issuedBy: string
): Promise<Coupon[]> {
  const r = repo();
  const order = couponOrderTotal(counts);
  const batchId = crypto.randomUUID();
  const now = new Date().toISOString();
  const coupons: Coupon[] = [];
  const seen = new Set<string>();
  for (const line of order.lines) {
    for (let i = 0; i < line.count; i++) {
      let code = newCouponCode();
      // Uniqueness is enforced by the store as well; this just avoids the
      // retry round trip in the one-in-a-quintillion case.
      while (seen.has(code) || (await r.getCouponByCode(code))) code = newCouponCode();
      seen.add(code);
      coupons.push({
        id: crypto.randomUUID(),
        code,
        consultancyId,
        packCode: line.code,
        wholesaleNpr: line.wholesaleNpr,
        batchId,
        issuedAt: now,
        issuedBy,
        redeemedAt: null,
        redeemedByStudentId: null,
      });
    }
  }
  await r.createCoupons(coupons);
  return coupons;
}

/**
 * The one sentence the super admin sees when the money does not match. It
 * shows the working, so a genuine typo is obvious and a "just give them a few
 * extra" is refused in plain words.
 */
export function priceMismatchMessage(
  counts: Record<string, number>,
  paidNpr: number
): string | null {
  const order = couponOrderTotal(counts);
  if (order.unknown.length > 0) {
    return `These coupon types do not exist: ${order.unknown.join(', ')}. Please use the packs shown on the form.`;
  }
  if (order.totalCoupons === 0) {
    return 'Enter how many coupons of each pack they have paid for. At least one is needed.';
  }
  if (order.totalNpr !== paidNpr) {
    const working = order.lines
      .map((l) => `${l.count} ${l.name} at NPR ${l.wholesaleNpr.toLocaleString()} = NPR ${l.subtotalNpr.toLocaleString()}`)
      .join(', ');
    return `The coupons and the price do not match. ${working}, which comes to NPR ${order.totalNpr.toLocaleString()}. You entered NPR ${paidNpr.toLocaleString()}. Please check the amount you received, or the number of coupons, and try again.`;
  }
  return null;
}

export type RedeemResult =
  | {
      ok: true;
      alreadyRedeemed: boolean;
      coupon: Coupon;
      consultancy: Consultancy;
      packName: string;
      mocks: number;
      practice: number;
      /** True when an unused free trial was folded into the pack. */
      trialSuperseded: boolean;
    }
  | { ok: false; code: string; userMessage: string };

/**
 * Turn a coupon into a pack, for THIS student, once.
 *
 * The rules, in the order they are checked:
 *
 *   - An unknown code and a used code get the SAME sentence, so the form
 *     cannot be used to discover which codes exist.
 *   - A code this student already redeemed is answered calmly (bad wifi, a
 *     second tap), never with red.
 *   - The consultancy must still be approved. A suspended partner's coupons
 *     stop working, and the student is told to ask their consultancy.
 *   - The claim is atomic in the store. Two students, one code, one winner.
 *   - The pack is granted through `grantPack`, idempotent on the coupon id,
 *     and recorded as a `pack_purchase`, which is what makes `hasPaid` true,
 *     unlocks the remaining questions of an open trial sitting (D-23), and
 *     lets the paid-question count apply.
 *   - If the student has NEVER sat anything, their unused free-trial credit is
 *     folded into the pack: the pack is the pack, and "3 mocks" must mean 3.
 *     A trial they have started or finished is left alone, because D-23
 *     extends that sitting to the full paper instead.
 *   - The student is tagged to the consultancy if they did not already belong
 *     to one, so the super admin can tell a coupon student from a direct one.
 */
export async function redeemCouponForStudent(student: Student, raw: string): Promise<RedeemResult> {
  const r = repo();
  const code = normaliseCouponCode(raw);
  const invalid: RedeemResult = {
    ok: false,
    code: 'COUPON_INVALID',
    userMessage:
      'That coupon code is not valid or has already been used. Check it letter by letter, or ask the consultancy that gave it to you.',
  };
  if (code.length !== COUPON_CODE_LENGTH) return invalid;

  const existing = await r.getCouponByCode(code);
  if (!existing) return invalid;

  const consultancy = await platform.getConsultancy(existing.consultancyId);
  if (!consultancy) return invalid;

  const plan = getPlan(existing.packCode);
  const pack = getCouponPack(existing.packCode);
  if (!plan || !pack) return invalid;

  // The same student, the same code, again: the same calm answer.
  if (existing.redeemedAt && existing.redeemedByStudentId === student.id) {
    return {
      ok: true,
      alreadyRedeemed: true,
      coupon: existing,
      consultancy,
      packName: plan.name,
      mocks: plan.mockInterviews,
      practice: plan.practiceSessions,
      trialSuperseded: false,
    };
  }
  if (existing.redeemedAt) return invalid;

  if (consultancy.status !== 'approved') {
    return {
      ok: false,
      code: 'COUPON_CONSULTANCY_PAUSED',
      userMessage:
        'This coupon cannot be used at the moment. Please ask the consultancy that gave it to you, or message us.',
    };
  }

  // Work out BEFORE the claim whether their free try is untouched, so the
  // decision does not depend on the order of two writes.
  const ledger = await r.listLedger(student.id);
  const everSat = ledger.some((e) => e.reason === 'session_consumed');
  const hasTrialCredit = ledger.some((e) => e.reason === 'trial_grant') && !ledger.some((e) => e.reason === 'trial_superseded');
  const alreadyPaid = ledger.some((e) => e.reason === 'pack_purchase' || e.reason === 'seat_allocation');
  const supersedeTrial = !everSat && hasTrialCredit && !alreadyPaid;

  const claimed = await r.redeemCoupon(code, student.id);
  if (!claimed) return invalid;

  const granted = await grantPack(student.id, plan.code, `coupon:${claimed.id}`);

  if (supersedeTrial && granted.granted) {
    await r.appendLedger({
      id: crypto.randomUUID(),
      studentId: student.id,
      kind: 'mock',
      delta: -1,
      reason: 'trial_superseded',
      sessionId: null,
      orderId: `coupon:${claimed.id}`,
      note: `free try included in the ${plan.name} pack from coupon ${formatCouponCode(code)}`,
      createdAt: new Date().toISOString(),
    });
  }

  // Tag, never re-tag. A student who came through another consultancy's link
  // keeps that binding; the coupon record still says who redeemed it.
  if (!student.consultancyId) {
    await r.updateStudent(student.id, {
      consultancyId: consultancy.id,
      source: 'consultancy',
    });
  }

  await r.appendAudit({
    id: crypto.randomUUID(),
    actorRole: 'student',
    actorId: student.id,
    action: 'redeem_coupon',
    subjectId: claimed.id,
    before: 'unused',
    after: 'used',
    note: `${formatCouponCode(code)} (${plan.name}) from ${consultancy.name} (${consultancy.slug}) redeemed by ${student.name ?? student.email ?? student.id}`,
    createdAt: new Date().toISOString(),
  });

  await r.addNotification({
    id: crypto.randomUUID(),
    consultancyId: consultancy.id,
    message: `${student.name ?? 'A student'} used coupon ${formatCouponCode(code)} (${plan.name}). Their pack is switched on.`,
    createdAt: new Date().toISOString(),
    readAt: null,
  });

  return {
    ok: true,
    alreadyRedeemed: false,
    coupon: claimed,
    consultancy,
    packName: plan.name,
    mocks: granted.mocks,
    practice: granted.practice,
    trialSuperseded: supersedeTrial,
  };
}

/**
 * A colour for each consultancy that never collides with another's.
 *
 * The client asked for the students table to be colour coded by consultancy,
 * "a specific colour code which is never going to repeat for any other
 * consultancy". Hues are handed out along the golden angle in order of
 * creation, so consecutive consultancies are as far apart on the wheel as
 * possible and the assignment is stable: adding a new consultancy never
 * changes an old one's colour. Returned as a hue (0 to 359) and rendered as
 * HSL by the screen, which keeps the raw-hex rule intact.
 */
export function consultancyHues(consultancies: Consultancy[]): Map<string, number> {
  const ordered = [...consultancies].sort((a, b) =>
    a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1
  );
  const out = new Map<string, number>();
  ordered.forEach((c, i) => out.set(c.id, Math.round((i * 137.508 + 210) % 360)));
  return out;
}

/** Coupon statistics for one consultancy, computed the same way everywhere. */
export function couponStats(coupons: Coupon[]) {
  const used = coupons.filter((c) => c.redeemedAt).length;
  const byPack = new Map<string, { packCode: string; name: string; total: number; used: number }>();
  for (const c of coupons) {
    const cur = byPack.get(c.packCode) ?? {
      packCode: c.packCode,
      name: getPlan(c.packCode)?.name ?? c.packCode,
      total: 0,
      used: 0,
    };
    cur.total += 1;
    if (c.redeemedAt) cur.used += 1;
    byPack.set(c.packCode, cur);
  }
  return {
    total: coupons.length,
    used,
    left: coupons.length - used,
    byPack: [...byPack.values()],
  };
}
