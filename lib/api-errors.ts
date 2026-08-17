import { NextResponse } from 'next/server';
import { StoreUnavailableError } from '@/lib/db/blob-repo';
import { SupabaseUnavailable } from '@/lib/db/supabase-repo';
import { apiError } from '@/lib/types';

/**
 * Turn an unexpected throw into the right answer for the student.
 *
 * The distinction this exists to protect (PILOT-01): **"we could not read your
 * record" is not the same as "you are not signed in."** The first is our
 * outage, the second is their state. Collapsing them produced an endless
 * sign-in loop that looked like nothing was wrong at all.
 *
 * 503 also matters because every client page in this product only bounces to
 * the sign-in screen on a 401. Anything else shows a message and stays put, so
 * returning 503 here is what breaks the loop.
 */
export function storeErrorResponse(e: unknown): NextResponse | null {
  /**
   * BOTH stores, not just the blob one.
   *
   * `SupabaseUnavailable` was falling straight through here, so the route threw,
   * Next answered with an HTML 500, and the browser's `res.json()` blew up. The
   * student was then shown "We could not reach our server ... network: fetch
   * failed" — which points at THEIR connection, when the truth was our database
   * refusing us. Two hours were spent looking at the wrong machine because of
   * that one missing case.
   */
  if (!(e instanceof StoreUnavailableError) && !(e instanceof SupabaseUnavailable)) return null;

  // Deliberately logged. A silent storage outage is the worst possible
  // failure: the site looks healthy and simply forgets everybody.
  console.error('[STORE UNAVAILABLE]', e.message, (e as { cause?: unknown }).cause);

  return NextResponse.json(
    apiError(
      'STORE_UNAVAILABLE',
      e.message,
      'We are having trouble reaching our records right now. This is our problem, not yours, and nothing you have paid for is lost. Please try again in a minute.'
    ),
    { status: 503 }
  );
}

/** Wrap a route body so a storage outage never masquerades as something else. */
export async function withStoreErrors(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    const res = storeErrorResponse(e);
    if (res) return res;
    throw e;
  }
}
