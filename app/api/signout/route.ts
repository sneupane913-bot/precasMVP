import { NextResponse } from 'next/server';
import { clearStudentSession } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * Sign out, without needing JavaScript.
 *
 * There is already `DELETE /api/me`, which the header button uses. This exists
 * as well because of where this product is actually used: a shared consultancy
 * machine on a slow connection, where the page renders long before the
 * JavaScript arrives and sometimes the JavaScript never arrives at all. A plain
 * HTML form still works then, and signing out is the one action that must never
 * depend on a bundle loading.
 *
 * POST rather than a link on purpose. A link would be prefetched by the router
 * and quietly sign people out just for hovering near it.
 */
export async function POST(req: Request) {
  await clearStudentSession();
  return NextResponse.redirect(new URL('/?signedout=1', req.url), { status: 303 });
}
