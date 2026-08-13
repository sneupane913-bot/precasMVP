import { repo, type PaymentOrder, type ApprovalAudit } from '@/lib/db';
import { grantPack, rewardReferral } from '@/lib/entitlement';
import { activeOfferFor, consumeOffer } from '@/lib/rewards';

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
