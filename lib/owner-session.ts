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

/** Read it, creating and setting one if absent. Only valid in a route handler. */
export async function ensureOwnerId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(OWNER_COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  jar.set(OWNER_COOKIE, id, {
    httpOnly: true, // JavaScript cannot read or forge it
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR,
  });
  return id;
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
