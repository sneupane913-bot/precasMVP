import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStudent } from '@/lib/auth/session';
import { repo, type PaymentOrder } from '@/lib/db';
import { getPlan, publicPlans } from '@/lib/data/plans';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { platformDown } from '@/lib/platform';
import { apiError, type ApiResult } from '@/lib/types';

export const runtime = 'nodejs';

const ORDER_TTL_MINUTES = 60;

const Body = z.discriminatedUnion('action', [
  /** Step 1: student picks a pack. Price is NOT accepted from the browser. */
  z.object({ action: z.literal('create'), packCode: z.string().min(1).max(40) }),
  /** Step 2: student submits the wallet transaction id. */
  z.object({
    action: z.literal('submit'),
    orderId: z.string().min(1).max(64),
    walletTxnId: z.string().min(4).max(64),
    payerName: z.string().min(1).max(120),
    payerPhoneSuffix: z.string().min(2).max(6),
  }),
  z.object({ action: z.literal('status'), orderId: z.string().min(1).max(64) }),
]);

export async function POST(req: Request) {
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }

  const rl = rateLimit(`pay:${clientIp(req)}`, RL.payment);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'payment attempts', 'Too many attempts. Please wait and try again.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(
      apiError('NOT_SIGNED_IN', 'no session', 'Please sign in before paying.'),
      { status: 401 }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', 'Please check the details you entered.'),
      { status: 400 }
    );
  }

  const r = repo();

  // ------------------------------------------------------------------ create
  if (body.action === 'create') {
    const plan = getPlan(body.packCode);
    // Only publicly offered packs can be bought. A student cannot name the
    // hidden Starter or Pro codes and buy them.
    if (!plan || !publicPlans().some((p) => p.code === plan.code)) {
      return NextResponse.json(
        apiError('BAD_PACK', 'unknown or non-public pack', 'That pack is not available.'),
        { status: 400 }
      );
    }

    const now = Date.now();
    const order: PaymentOrder = {
      id: crypto.randomUUID(),
      studentId: student.id,
      consultancyId: student.consultancyId,
      packCode: plan.code,
      // SERVER-OWNED price. The browser never sends an amount.
      amountNpr: plan.priceNpr,
      walletTxnId: null,
      payerName: null,
      payerPhoneSuffix: null,
      screenshotUrl: null,
      state: 'created',
      verifiedBy: null,
      verifiedAt: null,
      rejectedReason: null,
      allocatedAt: null,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ORDER_TTL_MINUTES * 60_000).toISOString(),
    };
    await r.createOrder(order);

    const result: ApiResult<{
      orderId: string;
      amountNpr: number;
      packName: string;
      mocks: number;
      practice: number;
      expiresAt: string;
      payTo: {
        walletName: string;
        walletNumber: string;
        accountName: string;
        qrImageUrl: string | null;
      };
    }> = {
      ok: true,
      data: {
        orderId: order.id,
        amountNpr: order.amountNpr,
        packName: plan.name,
        mocks: plan.mockInterviews,
        practice: plan.practiceSessions,
        expiresAt: order.expiresAt,
        payTo: {
          walletName: process.env.PAY_WALLET_NAME ?? 'eSewa',
          walletNumber: process.env.PAY_WALLET_NUMBER ?? '',
          accountName: process.env.PAY_ACCOUNT_NAME ?? '',
          // The owner uploads their own wallet QR and puts the URL here. We do
          // not generate the QR ourselves: a wallet QR encodes merchant data we
          // do not hold, and a QR we invented would take the student's money to
          // nowhere. Absent means "show the number instead", never a broken
          // image.
          qrImageUrl: process.env.PAY_QR_IMAGE_URL || null,
        },
      },
    };
    return NextResponse.json(result);
  }

  // ------------------------------------------------------------------ submit
  if (body.action === 'submit') {
    const order = await r.getOrder(body.orderId);
    if (!order || order.studentId !== student.id) {
      return NextResponse.json(
        apiError('NOT_FOUND', 'no order or not owner', 'We could not find that payment. Please start again.'),
        { status: 404 }
      );
    }
    if (order.state !== 'created') {
      return NextResponse.json(
        apiError('BAD_STATE', `order is ${order.state}`, 'This payment has already been submitted.'),
        { status: 409 }
      );
    }
    if (new Date(order.expiresAt).getTime() < Date.now()) {
      await r.updateOrder(order.id, { state: 'expired' });
      return NextResponse.json(
        apiError('EXPIRED', 'order expired', 'This payment request has expired. Please start a new one.'),
        { status: 409 }
      );
    }

    // THE anti-double-claim control. One wallet transaction, one order, ever.
    // A screenshot forwarded between friends is worthless because the second
    // claim on the same transaction id is refused here.
    const claimed = await r.claimWalletTxnId(body.walletTxnId, order.id);
    if (!claimed) {
      return NextResponse.json(
        apiError(
          'TXN_ALREADY_USED',
          'wallet txn id already claimed',
          'That transaction number has already been used. Please check the number, or contact us if you think this is wrong.'
        ),
        { status: 409 }
      );
    }

    const updated = await r.updateOrder(order.id, {
      state: 'submitted',
      walletTxnId: body.walletTxnId.trim().toUpperCase(),
      payerName: body.payerName,
      payerPhoneSuffix: body.payerPhoneSuffix,
    });

    return NextResponse.json({
      ok: true,
      data: {
        state: updated?.state,
        message:
          'Thank you. We are checking your payment against our bank record. This usually takes a short while, and you will be able to continue as soon as it is approved.',
      },
    });
  }

  // ------------------------------------------------------------------ status
  const order = await r.getOrder(body.orderId);
  if (!order || order.studentId !== student.id) {
    return NextResponse.json(
      apiError('NOT_FOUND', 'no order or not owner', 'We could not find that payment.'),
      { status: 404 }
    );
  }
  return NextResponse.json({
    ok: true,
    data: {
      state: order.state,
      amountNpr: order.amountNpr,
      packCode: order.packCode,
      rejectedReason: order.rejectedReason,
    },
  });
}
