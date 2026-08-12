import { NextResponse } from 'next/server';
import { z } from 'zod';
import { platform, type Consultancy } from '@/lib/platform';
import { repo } from '@/lib/db';
import { approvePayment, rejectPayment, type Actor } from '@/lib/payments';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
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
  const rl = rateLimit(`admin-auth:${clientIp(req)}`, RL.auth);
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

  return NextResponse.json({
    ok: true,
    data: {
      consultancy: publicView(c),
      students,
      notifications,
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
      },
    },
  });
}

/** Never send the passcode back to the browser. */
function publicView(c: Consultancy) {
  const { passcode: _omit, ...rest } = c;
  return rest;
}
