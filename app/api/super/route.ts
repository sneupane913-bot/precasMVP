import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSuperAdmin, platform } from '@/lib/platform';
import { repo, type ApprovalAudit } from '@/lib/db';
import { grantPack, rewardReferral, adminGrant } from '@/lib/entitlement';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { apiError } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('overview'), superKey: z.string().min(1) }),
  z.object({ action: z.literal('orders'), superKey: z.string().min(1) }),
  z.object({
    action: z.literal('verifyPayment'),
    superKey: z.string().min(1),
    orderId: z.string().min(1),
    /** The verifier confirms they matched it in the RECEIVER's own ledger. */
    confirmedInWalletLedger: z.literal(true),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('rejectPayment'),
    superKey: z.string().min(1),
    orderId: z.string().min(1),
    reason: z.string().min(3).max(500),
  }),
  z.object({ action: z.literal('flaggedTrials'), superKey: z.string().min(1) }),
  z.object({
    action: z.literal('resolveTrialFlag'),
    superKey: z.string().min(1),
    claimId: z.string().min(1),
    grant: z.boolean(),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('setStudentStatus'),
    superKey: z.string().min(1),
    studentId: z.string().min(1),
    status: z.enum(['active', 'disabled']),
  }),
  z.object({
    action: z.literal('grantCredit'),
    superKey: z.string().min(1),
    studentId: z.string().min(1),
    kind: z.enum(['mock', 'practice']),
    amount: z.number().int().min(1).max(50),
    note: z.string().max(200),
  }),
  z.object({ action: z.literal('audit'), superKey: z.string().min(1) }),
]);

async function audit(a: Omit<ApprovalAudit, 'id' | 'createdAt'>): Promise<void> {
  await repo().appendAudit({ ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
}

export async function POST(req: Request) {
  const rl = rateLimit(`super:${clientIp(req)}`, RL.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'auth attempts', 'Too many attempts. Please wait five minutes.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(apiError('BAD_REQUEST', 'invalid body', 'Something went wrong.'), {
      status: 400,
    });
  }

  if (!isSuperAdmin(body.superKey)) {
    return NextResponse.json(apiError('FORBIDDEN', 'bad super key', 'Not allowed.'), { status: 403 });
  }

  const r = repo();

  // --------------------------------------------------------------- overview
  if (body.action === 'overview') {
    const [students, consultancies, orders] = await Promise.all([
      r.listStudents(),
      platform.listConsultancies(),
      r.listOrders(),
    ]);

    const verified = orders.filter((o) => o.state === 'verified');
    const revenueNpr = verified.reduce((n, o) => n + o.amountNpr, 0);

    // Attribution: which consultancies our DIRECT students named. This is the
    // sales pipeline, and the strongest growth idea in the brief.
    const attribution = new Map<string, number>();
    for (const s of students) {
      if (!s.attributionConsultancy) continue;
      const key = s.attributionConsultancy.trim().toLowerCase();
      if (key) attribution.set(key, (attribution.get(key) ?? 0) + 1);
    }

    // Referral leaderboard: who brought in people who actually PAID.
    const paidStudentIds = new Set(verified.map((o) => o.studentId));
    const leaderboard = new Map<string, { code: string; name: string | null; paid: number }>();
    for (const s of students) {
      if (!s.referredByCode || !paidStudentIds.has(s.id)) continue;
      const referrer = students.find((x) => x.referralCode === s.referredByCode);
      if (!referrer) continue;
      const cur = leaderboard.get(referrer.id) ?? {
        code: referrer.referralCode,
        name: referrer.name,
        paid: 0,
      };
      cur.paid += 1;
      leaderboard.set(referrer.id, cur);
    }

    return NextResponse.json({
      ok: true,
      data: {
        counts: {
          students: students.length,
          paying: paidStudentIds.size,
          consultancies: consultancies.filter((c) => c.status === 'approved').length,
          pendingConsultancies: consultancies.filter((c) => c.status === 'pending').length,
          ordersAwaiting: orders.filter((o) => o.state === 'submitted').length,
        },
        revenueNpr,
        // Never any transcript or answer content. Engagement and entitlement only.
        students: students.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          source: s.source,
          createdVia: s.createdVia,
          consultancyId: s.consultancyId,
          attributionConsultancy: s.attributionConsultancy,
          status: s.status,
          referralCode: s.referralCode,
          referredByCode: s.referredByCode,
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
        })),
        attribution: [...attribution.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        referralLeaderboard: [...leaderboard.values()].sort((a, b) => b.paid - a.paid),
      },
    });
  }

  // ----------------------------------------------------------------- orders
  if (body.action === 'orders') {
    const orders = await r.listOrders();
    const students = await r.listStudents();
    return NextResponse.json({
      ok: true,
      data: orders.map((o) => ({
        ...o,
        studentName: students.find((s) => s.id === o.studentId)?.name ?? null,
        studentEmail: students.find((s) => s.id === o.studentId)?.email ?? null,
      })),
    });
  }

  // ---------------------------------------------------------- verifyPayment
  if (body.action === 'verifyPayment') {
    const order = await r.getOrder(body.orderId);
    if (!order) {
      return NextResponse.json(apiError('NOT_FOUND', 'no order', 'Not found.'), { status: 404 });
    }

    // Idempotent. Re-verifying must never hand out a second pack, and QA
    // tests exactly this.
    if (order.state === 'verified' && order.allocatedAt) {
      return NextResponse.json({
        ok: true,
        data: { alreadyVerified: true, message: 'This payment was already approved. Nothing changed.' },
      });
    }
    if (order.state !== 'submitted') {
      return NextResponse.json(
        apiError('BAD_STATE', `order is ${order.state}`, 'This payment is not waiting for approval.'),
        { status: 409 }
      );
    }

    const granted = await grantPack(order.studentId, order.packCode, order.id);
    await r.updateOrder(order.id, {
      state: 'verified',
      verifiedBy: 'super_admin',
      verifiedAt: new Date().toISOString(),
      allocatedAt: new Date().toISOString(),
    });

    // Referral reward pays only now, when a real payment has been confirmed.
    let referral = { rewarded: false, why: 'no referrer' };
    const student = await r.getStudent(order.studentId);
    if (student?.referredByCode) {
      const referrer = await r.getStudentByReferralCode(student.referredByCode);
      if (referrer) referral = await rewardReferral(referrer.id, student.id);
    }

    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: 'approve_payment',
      subjectId: order.id,
      before: 'submitted',
      after: 'verified',
      note: body.note ?? `txn ${order.walletTxnId}, NPR ${order.amountNpr}`,
    });

    return NextResponse.json({
      ok: true,
      data: { granted, referral, message: 'Approved and credits added.' },
    });
  }

  // ---------------------------------------------------------- rejectPayment
  if (body.action === 'rejectPayment') {
    const order = await r.getOrder(body.orderId);
    if (!order) {
      return NextResponse.json(apiError('NOT_FOUND', 'no order', 'Not found.'), { status: 404 });
    }
    await r.updateOrder(order.id, { state: 'rejected', rejectedReason: body.reason });
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: 'reject_payment',
      subjectId: order.id,
      before: order.state,
      after: 'rejected',
      note: body.reason,
    });
    return NextResponse.json({ ok: true, data: { state: 'rejected' } });
  }

  // --------------------------------------------------------- flaggedTrials
  if (body.action === 'flaggedTrials') {
    const claims = await r.listTrialClaims({ outcome: 'soft_denied' });
    const students = await r.listStudents();
    return NextResponse.json({
      ok: true,
      data: claims
        .filter((c) => !c.overriddenAt)
        .map((c) => ({
          ...c,
          studentName: students.find((s) => s.id === c.studentId)?.name ?? null,
          studentEmail: students.find((s) => s.id === c.studentId)?.email ?? null,
        })),
    });
  }

  if (body.action === 'resolveTrialFlag') {
    const claims = await r.listTrialClaims();
    const claim = claims.find((c) => c.id === body.claimId);
    if (!claim) {
      return NextResponse.json(apiError('NOT_FOUND', 'no claim', 'Not found.'), { status: 404 });
    }

    await r.updateTrialClaim(claim.id, {
      outcome: body.grant ? 'granted' : 'soft_denied',
      overriddenBy: 'super_admin',
      overriddenAt: new Date().toISOString(),
    });
    if (body.grant) await adminGrant(claim.studentId, 'mock', 1, 'trial override');

    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: body.grant ? 'grant_trial_override' : 'decline_trial_override',
      subjectId: claim.studentId,
      before: 'soft_denied',
      after: body.grant ? 'granted' : 'declined',
      note: body.note ?? null,
    });
    return NextResponse.json({ ok: true, data: { granted: body.grant } });
  }

  // ------------------------------------------------------- student status
  if (body.action === 'setStudentStatus') {
    const s = await r.getStudent(body.studentId);
    if (!s) {
      return NextResponse.json(apiError('NOT_FOUND', 'no student', 'Not found.'), { status: 404 });
    }
    await r.updateStudent(s.id, {
      status: body.status,
      disabledAt: body.status === 'disabled' ? new Date().toISOString() : null,
      disabledBy: body.status === 'disabled' ? 'super_admin' : null,
    });
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: body.status === 'disabled' ? 'disable_student' : 'enable_student',
      subjectId: s.id,
      before: s.status,
      after: body.status,
      note: null,
    });
    return NextResponse.json({ ok: true, data: { status: body.status } });
  }

  if (body.action === 'grantCredit') {
    await adminGrant(body.studentId, body.kind, body.amount, body.note);
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: 'approve_admin_student',
      subjectId: body.studentId,
      before: null,
      after: `+${body.amount} ${body.kind}`,
      note: body.note,
    });
    return NextResponse.json({ ok: true, data: { granted: body.amount } });
  }

  // ------------------------------------------------------------------ audit
  return NextResponse.json({ ok: true, data: await r.listAudit(200) });
}
