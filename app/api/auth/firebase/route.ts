import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyFirebaseIdToken } from '@/lib/auth/firebase';
import { setStudentSession, newReferralCode } from '@/lib/auth/session';
import { repo, type Student } from '@/lib/db';
import { evaluateTrial } from '@/lib/trial-gate';
import { grantTrial, grantSeat } from '@/lib/entitlement';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { platformDown, platform } from '@/lib/platform';
import { apiError, type ApiResult } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.object({
  idToken: z.string().min(1).max(4000),
  /** Non-identifying browser signal. Soft input to the gate, never a block. */
  fingerprint: z.string().max(200).optional(),
  ref: z.string().max(20).optional(),
  via: z.string().max(60).optional(),
});

/**
 * Exchange a Firebase ID token for our own session, then decide the trial.
 *
 * Nothing the browser claims about identity is trusted. Firebase verifies the
 * token; we read the result. Entitlement is granted here on the server and is
 * never requested by the client (the LIVE-003 pattern, extended).
 */
export async function POST(req: Request) {
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }

  // Uses the generous sign-in limit, NOT the passcode limit: a consultancy
  // lab shares one IP and thirty students must all be able to sign in.
  const rl = rateLimit(`signin:${clientIp(req)}`, RL.signIn);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'auth attempts', 'Too many sign-in attempts. Please wait a few minutes.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', 'Something went wrong signing you in. Please try again.'),
      { status: 400 }
    );
  }

  const identity = await verifyFirebaseIdToken(body.idToken);
  if (!identity) {
    return NextResponse.json(
      apiError('AUTH_FAILED', 'token rejected by Firebase', 'We could not sign you in with Google. Please try again.'),
      { status: 401 }
    );
  }

  const r = repo();
  const ip = clientIp(req);
  const fingerprint = body.fingerprint ?? null;
  const now = new Date().toISOString();

  let student = await r.getStudentByAuthId(identity.uid);
  let isNew = false;

  if (!student) {
    isNew = true;

    // A referral binds only at account creation, so it cannot be applied
    // retroactively once the student has already been counted.
    let referredByCode: string | null = null;
    if (body.ref) {
      const referrer = await r.getStudentByReferralCode(body.ref.toUpperCase());
      if (referrer) referredByCode = referrer.referralCode;
    }

    // Resolve the consultancy link, if there is one. Server side, so the slug
    // is checked rather than trusted.
    let viaConsultancyId: string | null = null;
    let viaConsultancySeats = 0;
    if (body.via) {
      const c = await platform.getConsultancy(body.via);
      if (c && c.status === 'approved') {
        viaConsultancyId = c.id;
        viaConsultancySeats = c.seatsTotal;
      }
    }

    const fresh: Student = {
      id: crypto.randomUUID(),
      authProviderId: identity.uid,
      authProvider: identity.provider === 'dev' ? 'dev' : 'google',
      email: identity.email,
      name: identity.name,
      // Phone arrives later, at payment, via OTP on the same Firebase account.
      phoneE164: identity.phoneE164,
      phoneVerifiedAt: identity.phoneE164 ? now : null,
      // Bound from the consultancy's own link, and only if that consultancy
      // exists and is approved. A student cannot invent a consultancy by
      // editing the URL, and a pending or suspended one binds nobody.
      //
      // Binding is attribution, NOT entitlement: it decides whose dashboard
      // this student appears on. Credits still come only from a seat or a
      // verified payment, so a forged link buys nothing.
      consultancyId: viaConsultancyId,
      attributionConsultancy: null,
      source: viaConsultancyId ? 'consultancy' : 'direct',
      createdVia: body.via ?? 'marketing',
      status: 'active',
      disabledAt: null,
      disabledBy: null,
      referralCode: newReferralCode(),
      referredByCode,
      consentVersion: null,
      consentAt: null,
      createdAt: now,
      lastSeenAt: now,
    };
    student = await r.createStudent(fresh);

    // F7. Take a seat if this student came through an approved consultancy
    // link and that consultancy still has one. Deliberately AFTER the student
    // row exists, so a seat is never claimed for an account that failed to
    // create. If the seats are gone the signup carries on exactly as normal:
    // the student keeps their free trial and can buy a pack, because being the
    // fifty-first student through a fifty-seat link is not their fault.
    if (viaConsultancyId) {
      await grantSeat(student.id, viaConsultancyId, viaConsultancySeats, `link:${body.via}`);
    }
  } else {
    // Keep phone in step if it was verified on the Firebase account since.
    const patch: Partial<Student> = { lastSeenAt: now };
    if (identity.phoneE164 && !student.phoneE164) {
      patch.phoneE164 = identity.phoneE164;
      patch.phoneVerifiedAt = now;
    }
    student = (await r.updateStudent(student.id, patch)) ?? student;
  }

  // --- Trial decision -----------------------------------------------------
  const decision = await evaluateTrial({
    authProviderId: identity.uid,
    fingerprintHash: fingerprint,
    ip,
  });

  if (decision.outcome !== 'already_claimed') {
    await r.createTrialClaim({
      id: crypto.randomUUID(),
      studentId: student.id,
      authProviderId: identity.uid,
      fingerprintHash: fingerprint,
      ip,
      outcome: decision.outcome,
      riskScore: decision.riskScore,
      riskReasons: decision.reasons,
      claimedAt: now,
      overriddenBy: null,
      overriddenAt: null,
    });

    if (decision.outcome === 'granted') await grantTrial(student.id);
  }

  await setStudentSession(student.id);

  const result: ApiResult<{
    isNew: boolean;
    name: string | null;
    email: string | null;
    referralCode: string;
    trial: { outcome: string; message: string | null };
  }> = {
    ok: true,
    data: {
      isNew,
      name: student.name,
      email: student.email,
      referralCode: student.referralCode,
      // Risk score and reasons are deliberately NOT returned. Telling a farmer
      // which signal tripped is telling them exactly what to change.
      trial: { outcome: decision.outcome, message: decision.message },
    },
  };
  return NextResponse.json(result);
}
