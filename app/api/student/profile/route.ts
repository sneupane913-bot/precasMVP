import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/db';
import { currentStudent } from '@/lib/auth/session';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { apiError, type ApiResult } from '@/lib/types';
import { zodMessage } from '@/lib/zod-message';

export const runtime = 'nodejs';

/**
 * N-30. THE ONE THING WE ASK FOR BEFORE THE FREE TRIAL STARTS.
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * Ten free questions cost us real money at a provider. Google sign-in alone
 * cannot stop the same person taking them again from a second Gmail, and the
 * client is right that this is not hypothetical: a student with three Gmail
 * addresses is thirty free questions we pay for and never sell.
 *
 * An email address is free and unlimited. A Nepali mobile number is neither.
 * That asymmetry is the whole mechanism. We do not block anything here, and we
 * never turn a student away at this screen: we simply RECORD the number, so
 * that `/super` can show the owner three accounts sharing one number and let
 * them decide. Judgement stays with a person.
 *
 * WHY IT IS NOT ONLY A PHONE NUMBER
 * ---------------------------------
 * A form with one field, asking for a number, before anything has been given,
 * reads as harvesting. The other fields are not padding: the evaluator marks a
 * bachelor's answer differently from a master's, and the university decides
 * which paper they sit. We ask for things we genuinely use.
 */

/**
 * Nepali mobile numbers only, and this is deliberate.
 *
 * The client's words: a student can "literally give us a ten digit number".
 * NTC and Ncell mobiles begin 98, 97 or 96 and are ten digits. An optional 977
 * country code is accepted because plenty of people type it, and a leading zero
 * is stripped before it reaches here.
 *
 * A landline, a foreign number, or ten arbitrary digits will not pass.
 */
const NEPALI_MOBILE = /^(?:977)?9[678]\d{8}$/;

const Body = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Please write your full name.')
    .max(80, 'That name is too long.'),
  whatsappNumber: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, '').replace(/^0+/, ''))
    .refine((s) => NEPALI_MOBILE.test(s), {
      message:
        'That does not look like a Nepali mobile number. It should start 98, 97 or 96 and have ten digits.',
    }),
  level: z.enum(['bachelor', 'masters']).nullable().optional(),
  targetUniversity: z.string().trim().max(120).nullable().optional(),
  city: z.string().trim().max(60).nullable().optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`profile:${clientIp(req)}`, RL.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'too many attempts', 'Please wait a moment and try again.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(
      apiError('NOT_SIGNED_IN', 'no session', 'Please sign in again.'),
      { status: 401 }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid profile', zodMessage(err as never)),
      { status: 400 }
    );
  }

  // Store one canonical shape so two students who typed 977 and 0 differently
  // are still recognised as the same number by the duplicate check in /super.
  const digits = body.whatsappNumber.replace(/^977/, '');

  const updated = await repo().updateStudent(student.id, {
    name: body.fullName,
    whatsappNumber: digits,
    /**
     * Deliberately NOT set to true.
     *
     * `whatsappConfirmed` means a human confirmed the number really reaches
     * them. Nothing on this screen proves that, and marking it confirmed here
     * would make the super admin's own dashboard lie to the owner on the day a
     * payment goes wrong and the number turns out to be dead.
     */
    whatsappConfirmed: false,
    level: body.level ?? student.level ?? null,
    targetUniversity: body.targetUniversity || student.targetUniversity || null,
    city: body.city || student.city || null,
  });

  if (!updated) {
    return NextResponse.json(
      apiError('NOT_FOUND', 'student vanished', 'Something went wrong. Please sign in again.'),
      { status: 404 }
    );
  }

  const result: ApiResult<{ saved: true }> = { ok: true, data: { saved: true } };
  return NextResponse.json(result);
}
