import { NextResponse } from 'next/server';
import { currentStudent } from '@/lib/auth/session';
import { repo } from '@/lib/db';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { platformDown } from '@/lib/platform';
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
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


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
  /**
   * SECURITY AUDIT 21 Aug (finding #3). The old check read
   * `if (file.type && ...)`, so a request with an EMPTY content type skipped
   * the allowlist entirely and any 2 MB of anything could be stored labelled
   * image/jpeg. Content type is attacker-supplied either way, so the real
   * check is the magic bytes below; the declared type is now merely required
   * to be an image one when present.
   */
  if (!file.type || !ALLOWED.has(file.type)) {
    return NextResponse.json(
      apiError('BAD_TYPE', file.type || 'missing content type', 'Please send a picture, not another kind of file.'),
      { status: 400 }
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const looksLikeImage =
    // JPEG
    (bytes.length > 2 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    // PNG
    (bytes.length > 7 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    // WebP: RIFF....WEBP
    (bytes.length > 11 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) ||
    // HEIC/HEIF: ....ftyp
    (bytes.length > 11 &&
      bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70);
  if (!looksLikeImage) {
    return NextResponse.json(
      apiError('BAD_TYPE', 'magic bytes are not an image', 'Please send a picture, not another kind of file.'),
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
      await store.set(key, bytes.buffer as ArrayBuffer, {
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
