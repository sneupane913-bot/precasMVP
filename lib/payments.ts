import { repo, type PaymentOrder, type ApprovalAudit } from '@/lib/db';
import { grantPack, rewardReferral } from '@/lib/entitlement';
import { activeOfferFor, consumeOffer } from '@/lib/rewards';
import { getPlan } from '@/lib/data/plans';

/**
 * Approving and rejecting a payment, in ONE place.
 *
 * Two roles can now do this: the super admin, and a consultancy admin acting on
 * their own students (E9, the client's decision on 12 August 2026). The moment
 * two routes can release credits, the only safe shape is one function they both
 * call. Two copies of this logic would drift, and the thing that drifts is who
 * gets paid.
 *
 * The caller is responsible for proving WHO it is and WHETHER it may touch this
 * order. This function is responsible for everything after that being correct
 * and identical whoever asked.
 */

export type Actor =
  | { role: 'super_admin'; id: 'super_admin'; label: string }
  /** 'admin' is the audit trail's word for a consultancy admin. */
  | { role: 'admin'; id: string; label: string };

async function audit(a: Omit<ApprovalAudit, 'id' | 'createdAt'>): Promise<void> {
  await repo().appendAudit({ ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
}

/**
 * The one honest sentence about consultancy approval, kept here so it is
 * impossible to approve without recording it.
 *
 * The money for these orders lands in OUR wallet, not the consultancy's. So a
 * consultancy admin approving a payment is asserting something they cannot see
 * for themselves. The client accepted that trade for speed, and the mitigation
 * is not a block but a paper trail: every consultancy approval is stamped with
 * who did it, stays visible in the super admin queue, and can be reversed.
 */
export const CONSULTANCY_APPROVAL_NOTE =
  'Approved by the consultancy, not checked against our wallet ledger.';

export async function approvePayment(
  order: PaymentOrder,
  actor: Actor,
  note?: string
): Promise<
  | { ok: true; alreadyVerified: true }
  | { ok: true; alreadyVerified: false; granted: { mocks: number; practice: number }; referral: unknown }
  | { ok: false; code: string; userMessage: string }
> {
  const r = repo();

  // Idempotent. Re-approving must never hand out a second pack, and both the
  // super admin and a consultancy admin can now reach this at the same moment.
  if (order.state === 'verified' && order.allocatedAt) {
    return { ok: true, alreadyVerified: true };
  }
  if (order.state !== 'submitted') {
    return {
      ok: false,
      code: 'BAD_STATE',
      userMessage: 'This payment is not waiting for approval.',
    };
  }

  // I9. The bonus promised on screen is worked out again HERE, at the moment
  // the money is confirmed, so what the student was shown is what they get. If
  // their window expired while they were paying, the bonus is simply zero and
  // the pack is still granted in full.
  const offer = await activeOfferFor(order.studentId);
  const bonusMocks = offer ? (offer.bonusMocksByPack[order.packCode] ?? 0) : 0;

  const granted = await grantPack(order.studentId, order.packCode, order.id, bonusMocks);
  if (offer && bonusMocks > 0) await consumeOffer(order.studentId, offer.ruleId);
  await r.updateOrder(order.id, {
    state: 'verified',
    verifiedBy: actor.id,
    verifiedAt: new Date().toISOString(),
    allocatedAt: new Date().toISOString(),
  });

  // The referral reward pays only now, when a real payment has been confirmed.
  let referral: unknown = { rewarded: false, why: 'no referrer' };
  const student = await r.getStudent(order.studentId);
  if (student?.referredByCode) {
    const referrer = await r.getStudentByReferralCode(student.referredByCode);
    if (referrer) referral = await rewardReferral(referrer.id, student.id);
  }

  await audit({
    actorRole: actor.role,
    actorId: actor.id,
    action: 'approve_payment',
    subjectId: order.id,
    before: 'submitted',
    after: 'verified',
    note:
      (note ? note + ' ' : '') +
      `txn ${order.walletTxnId}, NPR ${order.amountNpr}, by ${actor.label}` +
      (actor.role === 'admin' ? ` [${CONSULTANCY_APPROVAL_NOTE}]` : ''),
  });

  // E10. When somebody OTHER than the consultancy approves one of their
  // students, that consultancy is told. Their seat and revenue numbers move
  // without them doing anything, and a dashboard that changes silently is a
  // dashboard nobody trusts.
  if (actor.role !== 'admin' && order.consultancyId) {
    await r.addNotification({
      id: crypto.randomUUID(),
      consultancyId: order.consultancyId,
      message: `We approved a payment of NPR ${order.amountNpr.toLocaleString()} for one of your students. Their credits have been added.`,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  }

  return { ok: true, alreadyVerified: false, granted, referral };
}

export async function rejectPayment(
  order: PaymentOrder,
  actor: Actor,
  reason: string
): Promise<{ ok: true } | { ok: false; code: string; userMessage: string }> {
  const r = repo();

  if (order.state === 'rejected') return { ok: true }; // idempotent
  if (order.state === 'verified') {
    // Never silently un-grant. Reversing a paid order is a deliberate act with
    // its own path, not a side effect of clicking reject.
    return {
      ok: false,
      code: 'ALREADY_VERIFIED',
      userMessage: 'This payment was already approved. It cannot be rejected here.',
    };
  }

  await r.updateOrder(order.id, { state: 'rejected', rejectedReason: reason });

  await audit({
    actorRole: actor.role,
    actorId: actor.id,
    action: 'reject_payment',
    subjectId: order.id,
    before: order.state,
    after: 'rejected',
    note: `${reason} (by ${actor.label})`,
  });

  if (actor.role !== 'admin' && order.consultancyId) {
    await r.addNotification({
      id: crypto.randomUUID(),
      consultancyId: order.consultancyId,
      message: `We could not confirm a payment of NPR ${order.amountNpr.toLocaleString()} from one of your students. They have been asked to check their transaction number.`,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  }

  return { ok: true };
}

/**
 * TAKE BACK A PAYMENT THAT SHOULD NEVER HAVE COUNTED (12 September 2026).
 *
 * One student held two Google accounts on one phone number. He was credited by
 * hand onto the account he had stopped using, saw nothing, said so, was asked
 * to pay through the checkout instead, and was credited again on the account he
 * really uses. One payment, two verified orders, two packs, and revenue saying
 * NPR 1,598 where NPR 799 had actually arrived.
 *
 * There was no way to undo either one. `rejectPayment` refuses a verified order
 * on purpose — un-granting credits as a side effect of clicking reject is how a
 * money record and a ledger start disagreeing — and that refusal was right. It
 * just left the owner with nothing at all for the case where a verified payment
 * is genuinely wrong.
 *
 * So this is the deliberate act that was missing, and it is built to the same
 * standard as approval:
 *
 *   - NOTHING IS DELETED. The order keeps its id, its amount and its history
 *     and changes state to 'voided'. The ledger is append-only, so the pack is
 *     handed back as matching NEGATIVE lines rather than by removing the grant.
 *     Read later, the story is "granted, then taken back, and here is why".
 *
 *   - CREDITS ALREADY SPENT ARE NOT CLAWED BACK. A mock that has been sat has
 *     cost us a real provider call and cannot be un-sat. So the reversal takes
 *     back what is still THERE, never more, and reports what it could not take
 *     so the audit trail says it out loud instead of quietly going negative. A
 *     balance below zero would be a lie about a student who did nothing wrong.
 *
 *   - IDEMPOTENT. Voiding twice takes one pack back, not two.
 *
 * Revenue, the paying count and the student's Paid column all filter on
 * `state === 'verified'`, so a voided order drops out of every one of them the
 * moment this returns.
 */
export async function voidPayment(
  order: PaymentOrder,
  actor: Actor,
  reason: string
): Promise<
  | { ok: true; alreadyVoided: boolean; reversed: { mocks: number; practice: number }; keptBecauseUsed: { mocks: number; practice: number } }
  | { ok: false; code: string; userMessage: string }
> {
  const r = repo();

  if (order.state === 'voided') {
    return { ok: true, alreadyVoided: true, reversed: { mocks: 0, practice: 0 }, keptBecauseUsed: { mocks: 0, practice: 0 } };
  }
  if (order.state !== 'verified') {
    return {
      ok: false,
      code: 'NOT_VERIFIED',
      userMessage: 'Only an approved payment can be taken back. This one was never approved.',
    };
  }
  const why = reason.trim();
  if (why.length < 3) {
    return {
      ok: false,
      code: 'NO_REASON',
      userMessage: 'Say why this payment is being taken back. It goes in the audit trail.',
    };
  }

  // What THIS order granted, and what the student still holds. Both are read
  // from the same ledger, so the two numbers cannot disagree.
  const ledger = await r.listLedger(order.studentId);
  const granted = ledger.filter((e) => e.orderId === order.id && e.reason === 'pack_purchase');

  const reversed = { mocks: 0, practice: 0 };
  const keptBecauseUsed = { mocks: 0, practice: 0 };

  for (const kind of ['mock', 'practice'] as const) {
    const gave = granted.filter((e) => e.kind === kind).reduce((n, e) => n + e.delta, 0);
    if (gave <= 0) continue;
    const balance = ledger.filter((e) => e.kind === kind).reduce((n, e) => n + e.delta, 0);
    const take = Math.max(0, Math.min(gave, balance));
    const key = kind === 'mock' ? 'mocks' : 'practice';
    reversed[key] = take;
    keptBecauseUsed[key] = gave - take;
    if (take > 0) {
      await r.appendLedger({
        id: crypto.randomUUID(),
        studentId: order.studentId,
        kind,
        delta: -take,
        reason: 'payment_voided',
        sessionId: null,
        orderId: order.id,
        note: gave === take ? why : `${why} (${gave - take} already used, not taken back)`,
        createdAt: new Date().toISOString(),
      });
    }
  }

  await r.updateOrder(order.id, {
    state: 'voided',
    // The one free-text field on an order, and it already means "why this
    // payment does not count". A void is that, for a different reason.
    rejectedReason: why,
  });

  await audit({
    actorRole: actor.role,
    actorId: actor.id,
    action: 'void_payment',
    subjectId: order.id,
    before: 'verified',
    after: 'voided',
    note:
      `Taken back: NPR ${order.amountNpr}, ${order.packCode}, txn ${order.walletTxnId ?? 'none'}. ` +
      `Returned ${reversed.mocks} mocks and ${reversed.practice} practice` +
      (keptBecauseUsed.mocks || keptBecauseUsed.practice
        ? `; ${keptBecauseUsed.mocks} mocks and ${keptBecauseUsed.practice} practice had already been used and were left alone`
        : '') +
      `. ${why} (by ${actor.label})`,
  });

  if (order.consultancyId) {
    await r.addNotification({
      id: crypto.randomUUID(),
      consultancyId: order.consultancyId,
      message: `We have taken back a payment of NPR ${order.amountNpr.toLocaleString()} recorded for one of your students. ${why}`,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
  }

  return { ok: true, alreadyVoided: false, reversed, keptBecauseUsed };
}

/**
 * A PAYMENT THAT NEVER TOUCHED THE CHECKOUT (11 September 2026).
 *
 * Two students paid by a QR code sent on WhatsApp, never opened the pricing
 * page, and never answered a call. Real money, and the dashboard said four
 * paying students while the client knew it was six. The only tool he had was
 * "Give credit", which writes a ledger line and nothing else, so the credits
 * would have arrived and the revenue would still have been wrong, and the
 * audit trail would have called a paying customer a free grant.
 *
 * So this writes the payment where every payment lives: an order, already
 * verified, with the amount actually received, the date it was received, and
 * a transaction id that says on its face that a person typed it in
 * ("manual-20260911-3f2a9c1b"). The pack is granted through grantPack(), the
 * same path an approval uses, so the ledger, the referral reward and the
 * consultancy notification all behave exactly as they would for a QR payment
 * approved in the queue. Revenue, the paid list and the student's "Paid"
 * column read orders, so all three move at once.
 *
 * What it does NOT do: it does not invent a student. The student must exist,
 * because an order belongs to a student (the Postgres schema enforces it) and
 * because a payment with nobody to give the pack to is a note, not a payment.
 *
 * Double-submit guard: the same student, pack, amount and date recorded twice
 * within a few minutes is one payment clicked twice, not two payments. The
 * second call returns the first order and says so, and grants nothing.
 */
export interface RecordPaymentInput {
  studentId: string;
  packCode: string;
  amountNpr: number;
  /** YYYY-MM-DD, the day the money arrived. Defaults to today. */
  paidOn?: string | null;
  note: string;
}

const DUPLICATE_WINDOW_MS = 5 * 60_000;

export async function recordOfflinePayment(
  input: RecordPaymentInput,
  actor: Actor
): Promise<
  | { ok: true; orderId: string; duplicate: boolean; granted: { mocks: number; practice: number } }
  | { ok: false; code: string; userMessage: string }
> {
  const r = repo();
  const student = await r.getStudent(input.studentId);
  if (!student) {
    return { ok: false, code: 'NOT_FOUND', userMessage: 'That student is not in the directory.' };
  }
  const plan = getPlan(input.packCode);
  if (!plan || plan.priceNpr <= 0) {
    return { ok: false, code: 'BAD_PACK', userMessage: 'Pick a pack that is actually sold.' };
  }
  const amount = Math.round(input.amountNpr);
  if (!Number.isFinite(amount) || amount < 1) {
    return { ok: false, code: 'BAD_AMOUNT', userMessage: 'Type the amount that was actually received.' };
  }
  const day = /^\d{4}-\d{2}-\d{2}$/.test(input.paidOn ?? '')
    ? (input.paidOn as string)
    : new Date().toISOString().slice(0, 10);
  const paidAt = new Date(`${day}T12:00:00.000Z`);
  if (Number.isNaN(paidAt.getTime()) || paidAt.getTime() > Date.now() + 24 * 3_600_000) {
    return { ok: false, code: 'BAD_DATE', userMessage: 'That date is not a day the money could have arrived.' };
  }

  // One payment clicked twice is still one payment.
  const recent = (await r.listOrders({ studentId: student.id })).find(
    (o) =>
      o.state === 'verified' &&
      (o.walletTxnId ?? '').startsWith('manual-') &&
      o.packCode === plan.code &&
      o.amountNpr === amount &&
      o.createdAt.slice(0, 10) === day &&
      o.verifiedAt !== null &&
      Date.now() - new Date(o.verifiedAt).getTime() < DUPLICATE_WINDOW_MS
  );
  if (recent) {
    return { ok: true, orderId: recent.id, duplicate: true, granted: { mocks: 0, practice: 0 } };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const order: PaymentOrder = {
    id,
    studentId: student.id,
    consultancyId: student.consultancyId ?? null,
    packCode: plan.code,
    amountNpr: amount,
    walletTxnId: `manual-${day.replace(/-/g, '')}-${id.slice(0, 8)}`,
    payerName: student.name ?? null,
    payerPhoneSuffix: student.whatsappNumber ? student.whatsappNumber.replace(/\D/g, '').slice(-4) || null : null,
    screenshotUrl: null,
    state: 'verified',
    verifiedBy: actor.id,
    verifiedAt: now,
    rejectedReason: null,
    allocatedAt: null,
    createdAt: paidAt.toISOString(),
    expiresAt: paidAt.toISOString(),
  };
  await r.createOrder(order);

  const granted = await grantPack(student.id, plan.code, order.id);
  await r.updateOrder(order.id, { allocatedAt: new Date().toISOString() });

  let referral: unknown = { rewarded: false, why: 'no referrer' };
  if (student.referredByCode) {
    const referrer = await r.getStudentByReferralCode(student.referredByCode);
    if (referrer) referral = await rewardReferral(referrer.id, student.id);
  }

  await audit({
    actorRole: actor.role,
    actorId: actor.id,
    action: 'record_payment',
    subjectId: order.id,
    before: null,
    after: 'verified',
    note: `Recorded by hand, outside the checkout: NPR ${amount} for ${plan.name}, received ${day}. ${input.note.trim()} (by ${actor.label}, ${order.walletTxnId})`,
  });

  if (order.consultancyId) {
    await r.addNotification({
      id: crypto.randomUUID(),
      consultancyId: order.consultancyId,
      message: `We recorded a payment of NPR ${amount.toLocaleString()} for one of your students. Their credits have been added.`,
      createdAt: now,
      readAt: null,
    });
  }
  void referral;
  return { ok: true, orderId: order.id, duplicate: false, granted: { mocks: granted.mocks, practice: granted.practice } };
}
