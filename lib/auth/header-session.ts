import { currentStudent } from '@/lib/auth/session';
import type { SessionSnapshot } from '@/components/HeaderSession';

/**
 * What the header should show, resolved on the SERVER.
 *
 * Exists so a server-rendered page can hand `<SiteHeader session={...} />` the
 * truth and skip the "unknown" phase entirely. Without this, every page load
 * showed a signed-in student "Sign in" until /api/me came back — over four
 * seconds on localhost, and the bug the client reported twice.
 *
 * Never throws. A header is decoration around the page; if the store is having
 * a bad day the page must still render, and the client-side check in
 * HeaderSession will correct whatever this could not determine. This is the
 * one place where swallowing a store error is right, and it is deliberately
 * NOT the pattern anywhere else — PILOT-01 was caused by exactly this
 * swallowing happening in the data layer, where it made a broken store look
 * like a student who does not exist.
 */
export async function headerSession(): Promise<SessionSnapshot | undefined> {
  try {
    const s = await currentStudent();
    return { signedIn: Boolean(s), name: s?.name ?? null };
  } catch {
    return undefined; // unknown, not "signed out"
  }
}
