import { NextResponse } from 'next/server';
import { z } from 'zod';
import { repo } from '@/lib/db';
import { currentStudent } from '@/lib/auth/session';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { apiError, type ApiResult } from '@/lib/types';
import { zodMessage } from '@/lib/zod-message';
import { looksLikeUniversity, UNIVERSITY_HINT } from '@/lib/university-check';
import { BRAND_NAME } from '@/lib/branding';

export const runtime = 'nodejs';

/**
 * Enough of the address for its owner to recognise it, not enough for a
 * stranger to learn it. `phillipkhatri@gmail.com` becomes `p*********i@gmail.com`.
 *
 * Shown because the alternative is worse: "this number is taken", full stop,
 * to a student who has simply forgotten which of their two Gmails they used,
 * and who then has no way forward except to give up or ring somebody.
 */
function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf('@');
  if (at < 1) return null;
  const name = email.slice(0, at);
  const domain = email.slice(at);
  if (name.length <= 2) return name[0] + '*' + domain;
  return name[0] + '*'.repeat(Math.min(9, name.length - 2)) + name[name.length - 1] + domain;
}

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
 * That asymmetry is the whole mechanism.
 *
 * ONE NUMBER, ONE ACCOUNT (12 September 2026)
 * -------------------------------------------
 * This screen used to only RECORD the number and let `/super` show the owner
 * three accounts sharing one, so judgement stayed with a person. It stopped
 * being enough. A student signed in on a second Gmail with the same number,
 * took a second free mock with it, and was then credited a paid pack TWICE —
 * once by hand onto the account he had abandoned, once through the checkout on
 * the account he was actually using. The owner could not even tell the two
 * apart on screen, and the count that was supposed to warn him sat one tab
 * away on a page he had no reason to open that day.
 *
 * So the number is now UNIQUE, and it is enforced here, at the one place every
 * account must pass through before it can practise.
 *
 * The refusal is deliberately not a dead end. A genuine student who signed in
 * with the wrong Gmail is the commonest case by far, so they are told their
 * number already has an account, given a masked hint of which one, and pointed
 * at support. We do not silently merge accounts and we do not take a number
 * away from the account already holding it: the older account keeps it, and a
 * person decides anything else.
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
  targetUniversity: z
    .string()
    .trim()
    .max(120)
    .refine((v) => looksLikeUniversity(v), { message: UNIVERSITY_HINT })
    .nullable()
    .optional(),
  city: z.string().trim().max(60).nullable().optional(),
});

export async function POST(req: Request) {
  /**
   * RL.signIn, not RL.auth, and the difference is a consultancy lab.
   *
   * This form is now MANDATORY before any interview (PROFILE_REQUIRED in
   * /api/session/create), and RL.auth is 5 per 5 minutes PER IP — a lab of
   * thirty students on one Wi-Fi would have had 25 of them refused at the
   * welcome screen. There is no secret to brute-force here (the caller is
   * already signed in), so the generous sign-in budget is the right one, for
   * exactly the reason written above RL.signIn in lib/rate-limit.ts.
   */
  const rl = rateLimit(`profile:${clientIp(req)}`, RL.signIn);
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

  /**
   * ONE NUMBER, ONE ACCOUNT.
   *
   * Checked against EVERY account, active or disabled. Excluding disabled ones
   * would hand the number straight back to a third Gmail the moment the owner
   * disabled the second, which is the same hole with an extra step.
   *
   * Honest limitation, written down because it is the sort of thing QA should
   * test rather than discover: this is a read followed by a write, so two
   * requests landing in the same handful of milliseconds could both pass. That
   * is not the threat here — the threat is one person signing in again on
   * another day — and the duplicate report in `/super` still catches anything
   * that slips through. Postgres closes it properly with a unique index, which
   * supabase/schema.sql now declares.
   */
  const holders = await repo().listStudentsByWhatsapp(digits);
  const other = holders.find((h) => h.id !== student.id);
  if (other) {
    return NextResponse.json(
      apiError(
        'NUMBER_IN_USE',
        `whatsapp number already held by ${other.id}`,
        `This number already has an ${BRAND_NAME} account${
          maskEmail(other.email) ? ` (${maskEmail(other.email)})` : ''
        }. Please sign in with that Google account instead. If you think this is a mistake, message us on WhatsApp and a person will sort it out.`
      ),
      { status: 409 }
    );
  }

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
