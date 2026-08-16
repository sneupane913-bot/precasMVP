import { NextResponse } from 'next/server';
import { z, type ZodError } from 'zod';
import { zodMessage } from '@/lib/zod-message';
import { currentStudent } from '@/lib/auth/session';
import { repo, type PaymentOrder } from '@/lib/db';
import { getPlan, publicPlans } from '@/lib/data/plans';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { platformDown, platform } from '@/lib/platform';
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
    /** N-22, N-23. Optional, asked once, at the moment it is relevant. */
    whatsappNumber: z.string().max(30).optional(),
    whatsappConfirmed: z.boolean().optional(),
    city: z.string().max(80).optional(),
    level: z.enum(['bachelor', 'masters']).optional(),
    targetUniversity: z.string().max(120).optional(),
  }),
  z.object({ action: z.literal('status'), orderId: z.string().min(1).max(64) }),
]);

export async function POST(req: Request) {
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
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
  } catch (e) {
    // D-22. Name the field and the limit instead of six generic words.
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', zodMessage(e as ZodError)),
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

    const mine = await r.listOrders({ studentId: student.id });

    /**
     * WALK 4.4, and it is the one that costs money.
     *
     * A student who has already sent us a transaction number and is waiting
     * must not be able to start a second payment. The client asked exactly
     * this: "from the same person, multiple requests to the admin cannot go."
     * Without this, a student who pays once and then opens the checkout again
     * and types a slightly different number puts TWO requests in the approval
     * queue for ONE payment. Whoever is approving sees two, believes two, and
     * approves two, and we hand out two packs for one lot of money.
     *
     * We do not create a rival order at all. We show them the one they already
     * have and tell them plainly it is being checked.
     */
    const waiting = mine.find((o) => o.state === 'submitted');
    if (waiting) {
      return NextResponse.json(
        apiError(
          'PAYMENT_ALREADY_WAITING',
          `order ${waiting.id} is already submitted`,
          'You have already sent us a payment and we are checking it now. There is no need to pay again. We will switch your credits on as soon as it is confirmed.',
          { label: 'See my practice', href: '/account' }
        ),
        { status: 409 }
      );
    }

    /**
     * WALK 3.5. Opening the checkout page writes an order, so a student who
     * opens it, closes it, and opens it again writes another, without limit. An
     * abandoned checkout is not fraud and must never be punished, but it must
     * also not be a way to grow our payments table for ever.
     *
     * So an unfinished order for the same pack is handed back rather than
     * replaced. Nothing about the student's experience changes: they see the
     * same amount and the same wallet details. The table simply stops growing.
     */
    const reusable = mine.find(
      (o) =>
        o.state === 'created' &&
        o.packCode === plan.code &&
        new Date(o.expiresAt).getTime() > Date.now()
    );

    const settings = await platform.getSettings();
    const now = Date.now();
    const order: PaymentOrder = reusable ?? {
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
    if (!reusable) await r.createOrder(order);

    const result: ApiResult<{
      orderId: string;
      amountNpr: number;
      packName: string;
      mocks: number;
      practice: number;
      expiresAt: string;
      /** How long a person takes to check it. A number they can plan around. */
      waitHours: number;
      supportWhatsapp: string;
      supportMessage: string;
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
        waitHours: settings.approvalWaitHours ?? 4,
        /**
         * N-12. A worried student should never have to compose a message.
         *
         * They have just sent real money and something has gone wrong; asking
         * them to explain themselves from scratch, in English, on a phone, is
         * the moment we lose them. The link opens WhatsApp with the whole
         * message already written and only their name to confirm.
         */
        supportWhatsapp: settings.supportWhatsapp || process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '',
        supportMessage: `Hello, I am having a problem with my payment on PreCAS Practice. My name is ${student.name ?? ''} and my reference is ${order.id.slice(0, 8)}.`,
        payTo: {
          /**
           * N-11. Settings first, environment second.
           *
           * The super admin can change the wallet and the QR from the back
           * office without a deploy, because a wallet that needs a code release
           * to update is a wallet that will be wrong on the day it matters. The
           * env vars stay as the fallback so nothing breaks before the first
           * time somebody sets them.
           */
          walletName: settings.payWalletName || process.env.PAY_WALLET_NAME || 'eSewa',
          walletNumber: settings.payWalletNumber || process.env.PAY_WALLET_NUMBER || '',
          accountName: settings.payAccountName || process.env.PAY_ACCOUNT_NAME || '',
          // The owner uploads their own wallet QR and puts the URL here. We do
          // not generate the QR ourselves: a wallet QR encodes merchant data we
          // do not hold, and a QR we invented would take the student's money to
          // nowhere. Absent means "show the number instead", never a broken
          // image.
          qrImageUrl: settings.payQrImageUrl || process.env.PAY_QR_IMAGE_URL || null,
        },
      },
    };
    return NextResponse.json(result);
  }

  // ------------------------------------------------------------------ submit
  if (body.action === 'submit') {
    /**
     * D-17. The limiter lives HERE, not at the top of the route.
     *
     * It used to sit before the action branch, so it charged `create` and
     * `status` exactly like `submit`. Three things followed, and all three were
     * seen live:
     *
     *   1. The checkout fires `create` on mount and again on every pack change,
     *      so a student comparing NPR 449 against NPR 799 spent the budget by
     *      looking.
     *   2. The waiting screen polled `status` every 8 seconds against a budget
     *      of 10 an hour, so it locked the student out after 80 seconds. The
     *      screen they are told to wait on destroyed their ability to pay.
     *   3. When it tripped, the whole page collapsed to a pack picker and a red
     *      error, taking the "Talk to a person" card with it, which is the one
     *      place the phone number lives.
     *
     * This exact mistake was already found and fixed on `/super`, and the
     * reasoning is written out in `lib/rate-limit.ts`. It never reached here.
     *
     * Keyed on the STUDENT as well as the IP. A consultancy lab is thirty
     * students behind one address, and `clientIp()` falls back to the literal
     * string 'unknown' when no proxy header is present, which would otherwise
     * pool every student on the platform into a single bucket of ten an hour.
     */
    const rl = rateLimit(`pay:${student.id}:${clientIp(req)}`, RL.payment);
    if (!rl.allowed) {
      const mins = Math.max(1, Math.ceil(rl.retryAfterSec / 60));
      return NextResponse.json(
        apiError(
          'RATE_LIMITED',
          'payment attempts',
          // The server already knows the wait. Saying only "please wait" while
          // holding the number is the kind of small dishonesty that makes a
          // student who has already sent money assume the worst.
          `You have sent this several times already. Please wait about ${mins} ${mins === 1 ? 'minute' : 'minutes'} and try once more. If you have already paid, do not pay again: message us and we will find it.`
        ),
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const order = await r.getOrder(body.orderId);
    if (!order || order.studentId !== student.id) {
      return NextResponse.json(
        apiError('NOT_FOUND', 'no order or not owner', 'We could not find that payment. Please start again.'),
        { status: 404 }
      );
    }
    /**
     * WALK 4.2. The client's exact scenario: "his wifi is not that good, so he
     * is clicking send send send send."
     *
     * The first tap succeeded on the server. His phone never saw the reply, so
     * he taps again, and the old code answered the second identical tap with a
     * red error. A student who has just sent real money and is then shown red
     * concludes the payment failed. He either pays a second time or he decides
     * he has been cheated, and both of those are our fault, not his.
     *
     * The same tap with the same transaction number on the same order is the
     * same request, so it gets the same calm answer. Idempotent, not scolding.
     *
     * Only the SAME number: a different number on an already submitted order is
     * a genuine conflict and is still refused below.
     */
    const sameTxn =
      order.state === 'submitted' &&
      order.walletTxnId === body.walletTxnId.trim().toUpperCase();
    if (sameTxn) {
      return NextResponse.json({
        ok: true,
        data: {
          state: order.state,
          message:
            'Thank you. We already have these details and we are checking your payment now. You do not need to send them again.',
        },
      });
    }

    if (order.state !== 'created') {
      return NextResponse.json(
        apiError(
          'BAD_STATE',
          `order is ${order.state}`,
          order.state === 'verified'
            ? 'This payment has already been approved and your credits are on your account.'
            : 'We already have a payment from you and we are checking it. Please do not send it again.',
          { label: 'See my practice', href: '/account' }
        ),
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

    // N-22, N-23. Store what they volunteered, and nothing they did not.
    const profile: Record<string, unknown> = {};
    if (body.whatsappNumber) profile.whatsappNumber = body.whatsappNumber;
    if (body.whatsappConfirmed !== undefined) profile.whatsappConfirmed = body.whatsappConfirmed;
    if (body.city) profile.city = body.city;
    if (body.level) profile.level = body.level;
    if (body.targetUniversity) profile.targetUniversity = body.targetUniversity;
    if (Object.keys(profile).length > 0) await r.updateStudent(student.id, profile);

    const updated = await r.updateOrder(order.id, {
      state: 'submitted',
      walletTxnId: body.walletTxnId.trim().toUpperCase(),
      payerName: body.payerName,
      payerPhoneSuffix: body.payerPhoneSuffix,
    });

    /**
     * Tell whoever has to approve this that it is waiting.
     *
     * The client's rule: "the moment he clicks send, a notification should go
     * to either admin or the super admin, based on how it has linked." The
     * routing is the order's own consultancy binding, which was set when the
     * order was created from the student's binding, so it cannot be influenced
     * from the browser.
     *
     *   bound to a consultancy -> that consultancy is told, and only that one
     *   no consultancy         -> nothing to send, and nothing is needed: the
     *                             super admin's queue counts waiting orders
     *                             directly, so a message would be noise
     *
     * A student who taps send twice does not generate two messages, because the
     * second identical tap returns above and never reaches this line.
     */
    if (order.consultancyId) {
      await r.addNotification({
        id: crypto.randomUUID(),
        consultancyId: order.consultancyId,
        message: `${body.payerName} has sent a payment of NPR ${order.amountNpr.toLocaleString()} and is waiting for you to approve it.`,
        createdAt: new Date().toISOString(),
        readAt: null,
      });
    }

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
  /**
   * The status poll now carries the REASON and the wait.
   *
   * Both were already computed and neither reached the student. The checkout
   * screen read `state` and threw the rest away, so a rejected student saw a
   * generic "we could not match that payment" while the approver's actual
   * words - "the number is one digit short" - sat unused in the response.
   * Telling somebody no without telling them why is what makes them message
   * us instead of fixing it themselves.
   */
  const settings = await platform.getSettings();
  return NextResponse.json({
    ok: true,
    data: {
      state: order.state,
      amountNpr: order.amountNpr,
      packCode: order.packCode,
      rejectedReason: order.rejectedReason,
      waitHours: settings.approvalWaitHours ?? 4,
      supportWhatsapp: settings.supportWhatsapp ?? process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '',
    },
  });
}
