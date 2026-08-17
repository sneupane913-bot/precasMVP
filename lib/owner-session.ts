import { cookies } from 'next/headers';

/**
 * Anonymous session ownership.
 *
 * QA finding LIVE-002: `GET /api/session/{id}` and `/results/{id}` were
 * completely unauthenticated. Anyone holding a session id could read another
 * student's transcript, which includes their finances, family, and visa
 * history. A UUID is unguessable, not secret: it travels in URLs, browser
 * history, screenshots and WhatsApp.
 *
 * Fix: on session creation the server issues an HTTP-only anonymous owner id
 * and records it on the session. Every read compares them. No login needed,
 * so the no-account funnel is preserved.
 *
 * This is a floor, not a ceiling. Real accounts replace it later.
 *
 * Note: `cookies()` is asynchronous from Next 15 onward, so every helper here
 * is async and every caller must await it.
 */
export const OWNER_COOKIE = 'precas_uid';

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Read the caller's anonymous id, or null. */
export async function readOwnerId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(OWNER_COOKIE)?.value ?? null;
}

const OWNER_COOKIE_OPTIONS = {
  httpOnly: true, // JavaScript cannot read or forge it
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: ONE_YEAR,
};

/**
 * ---------------------------------------------------------------------------
 * THE SAME BUG AS THE SIGN-IN COOKIE, AND WORSE IN ITS CONSEQUENCE.
 *
 * This used to write the cookie into the ambient jar via `cookies()` and then
 * `/api/session/create` returned its own `NextResponse`. On Netlify that
 * `Set-Cookie` is never sent, so the browser has no owner id — and EVERY later
 * call on that interview (`GET /api/session/[id]`, consent, answer, skip,
 * complete) guards on `ownsSession(session.ownerId)` and refuses.
 *
 * So a student could create an interview and then be locked out of the very
 * interview they had just created, on the request immediately afterwards. The
 * session row in the database was perfect. See lib/auth/session.ts for the full
 * write-up; the rule is the same one: the cookie goes on the response that is
 * actually returned.
 * ---------------------------------------------------------------------------
 */

/** A fresh owner id. The CALLER must attach it with `withOwnerId`. */
export function newOwnerId(): string {
  return crypto.randomUUID();
}

/** Read the caller's id, or mint one. Attaching it is the caller's job. */
export async function ensureOwnerId(): Promise<string> {
  return (await readOwnerId()) ?? newOwnerId();
}

/** Put the owner id on the response that is actually returned. */
export function withOwnerId<T extends { cookies: { set: (...a: never[]) => unknown } }>(
  res: T,
  id: string
): T {
  (res.cookies.set as unknown as (n: string, v: string, o: typeof OWNER_COOKIE_OPTIONS) => void)(
    OWNER_COOKIE,
    id,
    OWNER_COOKIE_OPTIONS
  );
  return res;
}

/**
 * True when the caller owns this session.
 *
 * Sessions created before this fix have no owner recorded. Those are treated
 * as NOT readable rather than public, because the QA sessions already leaked
 * and must not stay readable.
 */
export async function ownsSession(
  sessionOwnerId: string | null | undefined
): Promise<boolean> {
  const mine = await readOwnerId();
  if (!mine || !sessionOwnerId) return false;
  return mine === sessionOwnerId;
}
