import { NextResponse } from 'next/server';
import { currentStudent } from '@/lib/auth/session';
import { repo } from '@/lib/db';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { apiError, type ApiResult } from '@/lib/types';

export const runtime = 'nodejs';

/** Deliberately small. A payment receipt is a phone screenshot, not a photo album. */
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

/**
 * Attach a payment screenshot to an order.
 *
 * The screenshot is **supporting evidence, never proof**. The control that
 * actually prevents a reused payment is the unique wallet transaction id, and
 * the verifier matches that against the receiving wallet's own ledger, not
 * against this image. A screenshot can be forwarded between friends; a
 * transaction id cannot be claimed twice.
 *
 * So this endpoint is optional by design. A student who cannot upload (bad
 * connection, storage denied) must still be able to complete the payment.
 */
export async function POST(req: Request) {
  const rl = rateLimit(`shot:${clientIp(req)}`, RL.payment);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'upload attempts', 'Too many attempts. Please wait and try again.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(apiError('NOT_SIGNED_IN', 'no session', 'Please sign in again.'), {
      status: 401,
    });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'not multipart', 'Something went wrong sending your picture. Please try again.'),
      { status: 400 }
    );
  }

  const orderId = String(form.get('orderId') ?? '');
  const file = form.get('screenshot');

  if (!orderId || !(file instanceof Blob)) {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'missing orderId or file', 'Please choose a picture and try again.'),
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      apiError('TOO_LARGE', `${file.size} bytes`, 'That picture is too big. Please send one under 2 MB.'),
      { status: 400 }
    );
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json(
      apiError('BAD_TYPE', file.type, 'Please send a picture, not another kind of file.'),
      { status: 400 }
    );
  }

  const r = repo();
  const order = await r.getOrder(orderId);
  // Ownership before storage, so a stranger cannot fill our storage with
  // images attached to somebody else's order.
  if (!order || order.studentId !== student.id) {
    return NextResponse.json(
      apiError('NOT_FOUND', 'no order or not owner', 'We could not find that payment.'),
      { status: 404 }
    );
  }

  const key = `receipt/${order.id}`;
  try {
    if (process.env.NETLIFY === 'true' || process.env.NETLIFY_BLOBS_CONTEXT) {
      const { getStore } = await import('@netlify/blobs');
      const store = getStore({ name: 'precas-receipts', consistency: 'strong' });
      await store.set(key, await file.arrayBuffer(), {
        metadata: { orderId: order.id, studentId: student.id, contentType: file.type || 'image/jpeg' },
      });
    }
    // Locally there is no blob store. We still record that a receipt was
    // provided, because the verifier's decision does not depend on the image.
    await r.updateOrder(order.id, { screenshotUrl: key });
  } catch {
    return NextResponse.json(
      apiError(
        'STORE_FAILED',
        'blob write failed',
        'We could not save your picture, but that is fine. Your transaction number is what we check, so your payment can still be approved.'
      ),
      { status: 200 } // not an error the student must act on
    );
  }

  const result: ApiResult<{ attached: true }> = { ok: true, data: { attached: true } };
  return NextResponse.json(result);
}
