import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { repo, type Student } from '@/lib/db';

/**
 * Signed student session cookie.
 *
 * A signed value, not a random id looked up in a table, so reading the current
 * student costs no storage call on every request. The signature is what stops a
 * student editing the cookie to become somebody else.
 */
const COOKIE = 'precas_student';
const MAX_AGE = 60 * 60 * 24 * 90;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === 'production') {
    // Refuse to run unsigned in production rather than issue forgeable cookies.
    throw new Error('SESSION_SECRET is required in production');
  }
  return 'dev-only-insecure-secret';
}

function sign(value: string): string {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * ---------------------------------------------------------------------------
 * THE SIGN-IN LOOP, AND WHY IT SURVIVED EVERY TEST WE WROTE.
 *
 * 17 August, on the live Netlify site, a real sign-in produced exactly this:
 *
 *     POST /api/auth/firebase  ->  200  {"ok":true,"isNew":true,...
 *                                        "trial":{"outcome":"granted"}}
 *     GET  /api/me             ->  200  {"signedIn":false}
 *     GET  /api/me             ->  200  {"signedIn":false}
 *
 * The sign-in WORKED. The account was created, the trial was granted, the
 * server was happy. And the very next request said the student was signed out,
 * so every page bounced them back to /start, where they signed in again, for
 * ever. That is the loop the client has reported three times, and it is not
 * Firebase, not the authorised domains, not the environment variables, and not
 * the data store — all four were verified healthy while this was happening.
 *
 * THE CAUSE. `setStudentSession` wrote the cookie through `cookies()` from
 * `next/headers`, and the route handler then returned a BRAND NEW
 * `NextResponse.json(...)`. Next's own dev server stitches the two together.
 * The Netlify adapter does not: the cookie is written to a jar that the
 * returned response never consults, so no `Set-Cookie` header is ever sent.
 * The browser is then behaving perfectly correctly by not having a session.
 *
 * WHY NOTHING CAUGHT IT. Every server suite drives the API with its own cookie
 * jar and asserts on JSON bodies, and the JSON body here was `{"ok":true}` —
 * completely truthful. `next dev` locally stitches the cookie on, so it worked
 * on this machine every single time. It is F-5 in its purest form: proof of the
 * code mistaken for proof of the product, and only a real browser against the
 * real deploy could tell the difference.
 *
 * THE RULE FROM HERE. In a route handler the cookie goes ON THE RESPONSE THAT
 * IS RETURNED. Never into an ambient jar the response cannot see. The two
 * functions below make that the only convenient way to do it.
 * ---------------------------------------------------------------------------
 */

/** Everything about the cookie except which response it rides on. */
export const SESSION_COOKIE = COOKIE;

export function sessionCookieValue(studentId: string): string {
  return `${studentId}.${sign(studentId)}`;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE,
};

/** A response that carries a signed-in session. Use this in route handlers. */
export function withStudentSession<T extends { cookies: { set: (...a: never[]) => unknown } }>(
  res: T,
  studentId: string
): T {
  (res.cookies.set as unknown as (n: string, v: string, o: typeof SESSION_COOKIE_OPTIONS) => void)(
    COOKIE,
    sessionCookieValue(studentId),
    SESSION_COOKIE_OPTIONS
  );
  return res;
}

/** A response that clears the session. Use this in route handlers. */
export function withoutStudentSession<T extends { cookies: { set: (...a: never[]) => unknown } }>(
  res: T
): T {
  (res.cookies.set as unknown as (n: string, v: string, o: Record<string, unknown>) => void)(
    COOKIE,
    '',
    { ...SESSION_COOKIE_OPTIONS, maxAge: 0 }
  );
  return res;
}

/**
 * The ambient-jar versions. Still correct inside a Server Action or a page,
 * where Next owns the response. NOT to be used in a route handler that
 * constructs its own response — see the note above.
 */
export async function setStudentSession(studentId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, sessionCookieValue(studentId), SESSION_COOKIE_OPTIONS);
}

export async function clearStudentSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function currentStudentId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf('.');
  if (idx <= 0) return null;
  const id = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  if (!safeEqual(sig, sign(id))) return null;
  return id;
}

export async function currentStudent(): Promise<Student | null> {
  const id = await currentStudentId();
  if (!id) return null;
  const s = await repo().getStudent(id);
  // A disabled account keeps its data but cannot act.
  if (!s || s.status === 'disabled') return null;
  return s;
}

/**
 * D-30. The signed-in student, disabled or not.
 *
 * `currentStudent()` returns null for a disabled account, which is right for
 * every action but wrong for every MESSAGE. Because the session looked empty,
 * a disabled student was told "Please sign in first so we can save your
 * practice." They ARE signed in; they have been disabled. So they sign in
 * again, succeed at Google, land in the same place and read the same sentence,
 * for ever, with no explanation and nobody to contact.
 *
 * Everywhere else in this product a refusal carries a reason and a way out.
 * This was the one place it did not, and it is the path a wrongly flagged
 * student lands on.
 */
export async function currentStudentEvenIfDisabled(): Promise<Student | null> {
  const id = await currentStudentId();
  if (!id) return null;
  return (await repo().getStudent(id)) ?? null;
}

/** Short, unambiguous, and safe to read out over the phone. */
export function newReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, no I/1
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
