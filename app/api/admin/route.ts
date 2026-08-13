import { NextResponse } from 'next/server';
import { z } from 'zod';
import { platform, type Consultancy, platformDown } from '@/lib/platform';
import { repo } from '@/lib/db';
import { approvePayment, rejectPayment, type Actor } from '@/lib/payments';
import { renewSeat } from '@/lib/entitlement';
import { BUNDLES } from '@/lib/data/plans';
import {
  rateLimit,
  rateLimitPeek,
  rateLimitPenalise,
  clientIp,
  LIMITS as RL,
} from '@/lib/rate-limit';
import { apiError } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('login'),
    slug: z.string().min(1).max(60),
    passcode: z.string().min(1).max(60),
  }),
  z.object({
    action: z.literal('updateBranding'),
    slug: z.string().min(1).max(60),
    passcode: z.string().min(1).max(60),
    logoUrl: z.string().url().max(500).nullable(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  // E9. A consultancy approves its own students' payments.
  z.object({
    action: z.literal('approvePayment'),
    slug: z.string().min(1).max(60),
    passcode: z.string().min(1).max(60),
    orderId: z.string().min(1).max(64),
    /**
     * The admin states plainly that they have seen the money. They are NOT
     * looking at our wallet, so this is their word, and it is recorded as
     * their word in the audit trail rather than as a verified fact.
     */
    confirmedReceived: z.literal(true),
    note: z.string().max(500).optional(),
  }),
  /**
   * N-5. The consultancy tops a student back up. Costs them ONE seat.
   *
   * This is the route a seat-backed student takes when their mocks run out and
   * they do not want to pay us themselves. The consultancy decides; we only
   * check that they have a seat left and that the student is theirs.
   */
  z.object({
    action: z.literal('renewStudent'),
    slug: z.string().min(1).max(60),
    passcode: z.string().min(1).max(60),
    studentId: z.string().min(1).max(64),
    seatSize: z.string().max(20).optional(),
  }),
  /**
   * N-6. The consultancy buys more seats.
   *
   * Deliberately the SAME shape as a student payment — QR, transaction id,
   * super-admin approval — rather than a special B2B flow. One approval queue,
   * one set of money guarantees, one place where a mistake can happen.
   */
  z.object({
    action: z.literal('buySeats'),
    slug: z.string().min(1).max(60),
    passcode: z.string().min(1).max(60),
    bundleCode: z.string().min(2).max(20),
  }),
  z.object({
    action: z.literal('rejectPayment'),
    slug: z.string().min(1).max(60),
    passcode: z.string().min(1).max(60),
    orderId: z.string().min(1).max(64),
    reason: z.string().min(3).max(500),
  }),
]);

/**
 * Consultancy portal API.
 *
 * The isolation rule: a consultancy is looked up by its OWN slug and passcode,
 * and every record returned is filtered by that consultancy's id. There is no
 * parameter through which one consultancy can name another. A suspended or
 * pending consultancy cannot read anything at all.
 */
export async function POST(req: Request) {
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(apiError('BAD_REQUEST', 'invalid body', 'Something went wrong.'), {
      status: 400,
    });
  }

  // Passcodes are compared with a plain equality check and are not hashed.
  // Rate limiting is therefore the ONLY thing standing between a script and a
  // consultancy's student list. 5 attempts per 5 minutes per IP.
  /**
   * PEEK, do not consume. `auth` is a brute-force budget and brute force means
   * GUESSING — so only a WRONG passcode may spend from it. Consuming here
   * charged every legitimate action the same as an attack: loading /super
   * fires four actions, which spent four of five, and the next click was
   * refused with "Too many attempts". See LIMITS.backOffice.
   */
  const rl = rateLimitPeek(`admin-auth:${clientIp(req)}`, RL.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'auth attempts', 'Too many attempts. Please wait five minutes and try again.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const c = await platform.getConsultancy(body.slug);
  if (!c || c.passcode !== body.passcode) {
    // Same message either way, so the response cannot be used to discover
    // which consultancy slugs exist.
    rateLimitPenalise(`admin-auth:${clientIp(req)}`, RL.auth);
    return NextResponse.json(
      apiError('FORBIDDEN', 'bad credentials', 'That name or passcode is not correct.'),
      { status: 403 }
    );
  }

  if (c.status !== 'approved') {
    return NextResponse.json(
      apiError(
        'NOT_APPROVED',
        'status ' + c.status,
        c.status === 'pending'
          ? 'Your account is waiting for approval. You will be contacted shortly.'
          : 'This account has been suspended. Please get in touch.'
      ),
      { status: 403 }
    );
  }

  // E9. Approve or reject a payment, but ONLY one belonging to this
  // consultancy's own student. The ownership check is the whole security of
  // this feature: without it, any approved consultancy could release credits
  // for any student on the platform by guessing an order id.
  if (body.action === 'approvePayment' || body.action === 'rejectPayment') {
    const r0 = repo();
    const order = await r0.getOrder(body.orderId);
    if (!order || order.consultancyId !== c.id) {
      // Same 404 either way, so this cannot be used to discover which order
      // ids exist on other consultancies.
      return NextResponse.json(
        apiError('NOT_FOUND', 'no order or not this consultancy', 'We could not find that payment.'),
        { status: 404 }
      );
    }

    const actor: Actor = {
      role: 'admin',
      id: c.id,
      label: `${c.name} (${c.slug})`,
    };

    const res =
      body.action === 'approvePayment'
        ? await approvePayment(order, actor, body.note)
        : await rejectPayment(order, actor, body.reason);

    if (!res.ok) {
      return NextResponse.json(apiError(res.code, res.code, res.userMessage), { status: 409 });
    }
    return NextResponse.json({
      ok: true,
      data:
        body.action === 'approvePayment'
          ? {
              ...res,
              message:
                'alreadyVerified' in res && res.alreadyVerified
                  ? 'This payment was already approved. Nothing changed.'
                  : 'Approved. Your student can carry on straight away.',
            }
          : { message: 'Rejected. Your student has been told to check their transaction number.' },
    });
  }

  // N-6. Buy more seats. Creates an order the SUPER ADMIN approves.
  if (body.action === 'buySeats') {
    const bundle = BUNDLES.find((b) => b.code === body.bundleCode);
    if (!bundle) {
      return NextResponse.json(
        apiError('BAD_BUNDLE', 'unknown bundle', 'That seat pack is not available.'),
        { status: 400 }
      );
    }
    const r2 = repo();
    const mineOrders = await r2.listOrders({ consultancyId: c.id });
    // Same guard as a student: one payment in flight at a time, so one
    // transfer cannot become two approvals.
    const waiting = mineOrders.find((o) => o.state === 'submitted' && !o.studentId);
    if (waiting) {
      return NextResponse.json(
        apiError(
          'PAYMENT_ALREADY_WAITING',
          `order ${waiting.id} already submitted`,
          'We are already checking a seat payment from you. There is no need to send it again.'
        ),
        { status: 409 }
      );
    }
    const settings = await platform.getSettings();
    const now = Date.now();
    const order = {
      id: crypto.randomUUID(),
      // A consultancy order has no student. That is how the super admin queue
      // tells "seats for a consultancy" from "a pack for a student".
      studentId: '',
      consultancyId: c.id,
      packCode: bundle.code,
      amountNpr: bundle.priceNpr,
      walletTxnId: null,
      payerName: null,
      payerPhoneSuffix: null,
      screenshotUrl: null,
      state: 'created' as const,
      verifiedBy: null,
      verifiedAt: null,
      rejectedReason: null,
      allocatedAt: null,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 60 * 60_000).toISOString(),
    };
    await r2.createOrder(order);
    return NextResponse.json({
      ok: true,
      data: {
        orderId: order.id,
        amountNpr: order.amountNpr,
        seats: bundle.seats,
        payTo: {
          walletName: settings.payWalletName || process.env.PAY_WALLET_NAME || 'eSewa',
          walletNumber: settings.payWalletNumber || process.env.PAY_WALLET_NUMBER || '',
          qrImageUrl: settings.payQrImageUrl || process.env.PAY_QR_IMAGE_URL || null,
        },
        supportWhatsapp: settings.supportWhatsapp || '',
      },
    });
  }

  // N-5. Renew one of our own students, consuming a seat.
  if (body.action === 'renewStudent') {
    const r1 = repo();
    const student = await r1.getStudent(body.studentId);
    // Ownership first. Without this any approved consultancy could top up any
    // student on the platform by guessing an id.
    if (!student || student.consultancyId !== c.id) {
      return NextResponse.json(
        apiError('NOT_FOUND', 'no student or not this consultancy', 'We could not find that student.'),
        { status: 404 }
      );
    }

    const seats = await r1.listSeats(c.id);
    const used = seats.filter((x) => !x.revokedAt).length;
    if (used >= c.seatsTotal) {
      return NextResponse.json(
        apiError(
          'NO_SEATS_LEFT',
          `${used}/${c.seatsTotal} seats used`,
          'You have used all your seats. Buy more to keep topping students up.'
        ),
        { status: 402 }
      );
    }

    const res = await renewSeat(student.id, c.id, c.seatsTotal, `renew:${c.slug}`, body.seatSize);
    if (!res.seated) {
      return NextResponse.json(
        apiError('NO_SEATS_LEFT', 'allocation refused', 'You have used all your seats.'),
        { status: 402 }
      );
    }
    return NextResponse.json({
      ok: true,
      data: {
        granted: { mocks: res.mocks, practice: res.practice },
        seatsLeft: Math.max(0, c.seatsTotal - (used + 1)),
        message: `Topped up with ${res.mocks} more mock interviews. One seat used.`,
      },
    });
  }

  if (body.action === 'updateBranding') {
    const updated: Consultancy = {
      ...c,
      logoUrl: body.logoUrl,
      primaryColor: body.primaryColor,
    };
    await platform.saveConsultancy(updated);
    return NextResponse.json({ ok: true, data: publicView(updated) });
  }

  // login: return only this consultancy's own data.
  //
  // This used to read platform.listStudents(), the old store, so every student
  // who signed in with Google was invisible to their own consultancy. It now
  // reads the live repo, filtered by this consultancy's id, which is also the
  // only place the binding is decided (never from a request field).
  const r = repo();
  const [mine, notifications, seats, orders] = await Promise.all([
    r.listStudents({ consultancyId: c.id }),
    r.listNotifications(c.id),
    r.listSeats(c.id),
    r.listOrders({ consultancyId: c.id }),
  ]);

  // Engagement and entitlement only. No transcript, answer or feedback content
  // ever reaches a consultancy admin. This is the client's stated rule.
  const students = await Promise.all(
    mine.map(async (s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      status: s.status,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      mocksLeft: await r.balance(s.id, 'mock'),
      practiceLeft: await r.balance(s.id, 'practice'),
    }))
  );

  const paid = orders.filter((o) => o.state === 'verified');
  const liveSeats = seats.filter((s) => !s.revokedAt).length;

  /**
   * WALK 5.6, and it made the whole consultancy approval feature imaginary.
   *
   * This route could already approve a payment, and the client's rule is that a
   * student who signed up through a consultancy link is approved by THAT
   * consultancy. But the orders were fetched here, used only to count revenue,
   * and never sent to the browser, and the portal page had no queue on it. So
   * the one person allowed to approve their student's payment had no way to see
   * that a payment existed. The student paid and waited for a button nobody
   * could press.
   *
   * Only their own orders, because listOrders was filtered by their own
   * consultancy id above. Never a transcript, never another consultancy's
   * money.
   */
  const byId = new Map(mine.map((s) => [s.id, s]));
  const visibleOrders = orders.map((o) => ({
    id: o.id,
    studentName: byId.get(o.studentId)?.name ?? null,
    studentEmail: byId.get(o.studentId)?.email ?? null,
    packCode: o.packCode,
    amountNpr: o.amountNpr,
    walletTxnId: o.walletTxnId,
    payerName: o.payerName,
    payerPhoneSuffix: o.payerPhoneSuffix,
    screenshotUrl: o.screenshotUrl,
    state: o.state,
    rejectedReason: o.rejectedReason,
    createdAt: o.createdAt,
    verifiedAt: o.verifiedAt,
  }));

  return NextResponse.json({
    ok: true,
    data: {
      consultancy: publicView(c),
      students,
      notifications,
      orders: visibleOrders,
      stats: {
        studentCount: mine.length,
        activeStudents: mine.filter((s) => s.status === 'active').length,
        seatsTotal: c.seatsTotal,
        // Revoked seats are free again. Counting them as used understated
        // seatsLeft and disagreed with allocateSeat, which has always filtered
        // on revokedAt. Two places disagreeing about how many seats are left is
        // how a consultancy ends up being told it is full when it is not.
        seatsUsed: liveSeats,
        seatsLeft: Math.max(0, c.seatsTotal - liveSeats),
        paidOrders: paid.length,
        /** How many of their students are waiting on them right now. */
        ordersAwaiting: orders.filter((o) => o.state === 'submitted').length,
      },
    },
  });
}

/** Never send the passcode back to the browser. */
function publicView(c: Consultancy) {
  const { passcode: _omit, ...rest } = c;
  return rest;
}
