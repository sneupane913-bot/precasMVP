import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStudent, clearStudentSession } from '@/lib/auth/session';
import { entitlementFor } from '@/lib/entitlement';
import { activeOfferFor } from '@/lib/rewards';
import { repo } from '@/lib/db';
import { apiError, type ApiResult } from '@/lib/types';
import { withStoreErrors } from '@/lib/api-errors';

export const runtime = 'nodejs';

/** Who am I, and what am I allowed to do. Everything computed server-side. */
export async function GET() {
  return withStoreErrors(async () => {
  const student = await currentStudent();
  if (!student) {
    return NextResponse.json({ ok: true, data: { signedIn: false } });
  }

  const ent = await entitlementFor(student);
  // I9. The deadline comes from the server so the browser can only render it,
  // never invent one. Null means there is genuinely nothing to offer, which is
  // a better answer than a fake countdown.
  const offer = await activeOfferFor(student.id);
  const ledger = await repo().listLedger(student.id);
  const referrals = ledger.filter((e) => e.reason === 'referral_reward').length;

  const result: ApiResult<{
    signedIn: true;
    name: string | null;
    email: string | null;
    referralCode: string;
    referralsRewarded: number;
    profileComplete: boolean;
    entitlement: typeof ent;
    offer: typeof offer;
  }> = {
    ok: true,
    data: {
      signedIn: true,
      name: student.name,
      email: student.email,
      referralCode: student.referralCode,
      referralsRewarded: referrals,
      // The full profile is captured at the report moment, not before the
      // trial. Forcing a form on a nervous student before any value is the
      // funnel mistake the marketing analyst correctly pushed back on.
      profileComplete: Boolean(student.name && student.attributionConsultancy),
      entitlement: ent,
      offer,
    },
  };
  return NextResponse.json(result);
  });
}

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  /**
   * Free text: which consultancy the student is applying through.
   * LEAD GENERATION ONLY. This never grants anyone access to anything, and
   * the schema comment says the same. Do not use it for authorisation.
   */
  attributionConsultancy: z.string().max(160).optional(),
});

/** Profile completion, captured at the report moment. */
export async function POST(req: Request) {
  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(
      apiError('NOT_SIGNED_IN', 'no session', 'Please sign in again.'),
      { status: 401 }
    );
  }

  let body: z.infer<typeof Patch>;
  try {
    body = Patch.parse(await req.json());
  } catch {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', 'Please check the details you entered.'),
      { status: 400 }
    );
  }

  // Only these two fields. A student cannot patch their own credits, status,
  // consultancy binding or referral code by adding them to the body.
  const updated = await repo().updateStudent(student.id, {
    ...(body.name ? { name: body.name } : {}),
    ...(body.attributionConsultancy !== undefined
      ? { attributionConsultancy: body.attributionConsultancy.trim() || null }
      : {}),
  });

  return NextResponse.json({
    ok: true,
    data: { name: updated?.name ?? null, attributionConsultancy: updated?.attributionConsultancy ?? null },
  });
}

export async function DELETE() {
  await clearStudentSession();
  return NextResponse.json({ ok: true, data: { signedOut: true } });
}
