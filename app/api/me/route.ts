import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStudent, clearStudentSession } from '@/lib/auth/session';
import { entitlementFor } from '@/lib/entitlement';
import { activeOfferFor } from '@/lib/rewards';
import { repo } from '@/lib/db';
import { platformDown, platform } from '@/lib/platform';
import { apiError, type ApiResult } from '@/lib/types';
import { withStoreErrors } from '@/lib/api-errors';

export const runtime = 'nodejs';

/** Who am I, and what am I allowed to do. Everything computed server-side. */
export async function GET() {
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


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
    /**
     * N-4. True when this student's mocks came from a consultancy seat and
     * they still have some left.
     *
     * A consultancy student does not pay us — their consultancy did. Showing
     * them a price, a QR code or a pay button would be asking a second time
     * for something already bought, which is the fastest way to lose a
     * consultancy's trust in front of thirty of their students.
     *
     * Computed on the server from the ledger, never sent up by the browser.
     */
    seatBacked: boolean;
  }> = {
    ok: true,
    data: {
      signedIn: true,
      name: student.name,
      email: student.email,
      referralCode: student.referralCode,
      referralsRewarded: referrals,
      seatBacked:
        ledger.some((e) => e.reason === 'seat_allocation') && ent.mocksLeft > 0,
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

/**
 * N-28. A student on the NPR 799 pack can add their own questions.
 *
 * A student who knows their weak spot — or who has a list from their
 * consultancy, or a photograph of one — should be able to drill exactly that.
 * Restricted to the top pack because it is the pack's headline benefit, and
 * because unbounded free text from anonymous accounts is a moderation problem
 * we do not need on day one.
 */
const AddQuestions = z.object({
  ownQuestions: z.array(z.string().min(10).max(300)).min(1).max(20),
});

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
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(
      apiError('NOT_SIGNED_IN', 'no session', 'Please sign in again.'),
      { status: 401 }
    );
  }

  const raw = await req.json().catch(() => null);

  // N-28. Own questions, top pack only.
  const own = AddQuestions.safeParse(raw);
  if (own.success) {
    const ledger = await repo().listLedger(student.id);
    const onTopPack = ledger.some(
      (e) => e.reason === 'pack_purchase' && e.kind === 'mock' && e.delta >= 10
    );
    if (!onTopPack) {
      return NextResponse.json(
        apiError(
          'NOT_ON_TOP_PACK',
          'own questions are a Serious pack feature',
          'Adding your own questions comes with the bigger pack. Everything else you have keeps working.'
        ),
        { status: 402 }
      );
    }
    const cur = await platform.getSettings();
    const added = own.data.ownQuestions.map((text) => ({
      id: `own-${crypto.randomUUID().slice(0, 8)}`,
      category: 'conversational',
      text: text.trim(),
      intent: 'A question this student asked us to drill.',
      addedAt: new Date().toISOString(),
      // Recorded against the student so their questions stay theirs and never
      // leak into another student's paper.
      addedBy: `student:${student.id}`,
    }));
    await platform.saveSettings({
      ...cur,
      extraQuestions: [...(cur.extraQuestions ?? []), ...added],
    });
    return NextResponse.json({ ok: true, data: { added: added.length } });
  }

  let body: z.infer<typeof Patch>;
  try {
    body = Patch.parse(raw);
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
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


  await clearStudentSession();
  return NextResponse.json({ ok: true, data: { signedOut: true } });
}
