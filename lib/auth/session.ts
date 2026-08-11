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

export async function setStudentSession(studentId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, `${studentId}.${sign(studentId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  });
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

/** Short, unambiguous, and safe to read out over the phone. */
export function newReferralCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, no I/1
  let out = '';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}
