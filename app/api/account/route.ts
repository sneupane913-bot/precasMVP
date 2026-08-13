import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStudent, clearStudentSession } from '@/lib/auth/session';
import { entitlementFor } from '@/lib/entitlement';
import { activeOfferFor } from '@/lib/rewards';
import { store } from '@/lib/store';
import { repo } from '@/lib/db';
import { getInstitution } from '@/lib/data/institutions';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { weakestOf } from '@/lib/advice';
import { platformDown } from '@/lib/platform';
import { apiError } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * The student's own account: their history (D19) and their right to delete
 * their data (J3).
 *
 * Everything here is scoped to the signed-in student on the server. There is no
 * id in the request that could name somebody else, which is the same rule the
 * session routes follow.
 */

const Body = z.object({ action: z.literal('deleteEverything'), confirm: z.literal('DELETE') });

export async function GET() {
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
      apiError('NOT_SIGNED_IN', 'no session', 'Please sign in to see your practice history.'),
      { status: 401 }
    );
  }

  const seatLedger = await repo().listLedger(student.id);
  const seatBacked = seatLedger.some((e) => e.reason === 'seat_allocation');

  const [sessions, ent, offer] = await Promise.all([
    store.listByStudent(student.id),
    entitlementFor(student),
    activeOfferFor(student.id),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      name: student.name,
      email: student.email,
      referralCode: student.referralCode,
      entitlement: ent,
      offer,
      /**
       * N-4. A consultancy student never sees a price, a QR or a pay button
       * while their seat still has mocks on it. Their consultancy already
       * paid; asking again in front of thirty of their students is the fastest
       * way to lose that consultancy.
       */
      seatBacked: seatBacked && ent.mocksLeft > 0,
      /**
       * N-14, N-15. What to offer this student, decided here rather than in
       * the browser so the rule lives in one place.
       *
       * `upgrade` is always true for a student who pays us: somebody on the
       * 449 pack should always be able to move up without hunting for it.
       * A seat-backed student is excluded — their consultancy paid, and
       * showing them a price is N-4.
       *
       * `renew` turns on at two mocks or fewer. Earlier is nagging; at zero it
       * is too late, because they have already been stopped mid-preparation.
       */
      offerUpgrade: !seatBacked,
      offerRenew: !seatBacked && ent.mocksLeft <= 2,
      /**
       * N-15. Pre-fill for the next checkout, so a returning student is not
       * asked the same three questions again. Their own last payment only.
       */
      lastPayer: await (async () => {
        const orders = await repo().listOrders({ studentId: student.id });
        const paid = orders.filter((o) => o.state === 'verified' && o.payerName).at(-1);
        return paid ? { name: paid.payerName, phoneSuffix: paid.payerPhoneSuffix } : null;
      })(),
      sessions: sessions.map((s) => {
        const inst = getInstitution(s.institutionId);
        return {
          id: s.id,
          university: inst?.name ?? 'Your university',
          mode: s.mode,
          /** N-37. Marked, so a one-question drill is never read as a mock. */
          isPractice: s.mode === 'practice',
          status: s.status,
          createdAt: s.createdAt,
          completedAt: s.completedAt,
          answered: s.answers.filter((a) => a.transcriptStatus === 'ok').length,
          total: s.questionIds.length,
          // The band, never a bare number, and only when one honestly exists.
          band: s.summary?.band ?? null,
          /**
           * N-47. An unfinished sitting is the most valuable thing on this
           * page: the student has already spent a credit on it and their
           * answers are sitting there. Sending them back to the catalogue to
           * "start again" would waste the credit and lose the work, so an
           * unfinished session links back INTO itself and a finished one links
           * to its report.
           */
          resumeHref: s.status === 'completed' ? `/results/${s.id}` : `/interview/${s.id}`,
          score: s.summary?.overallScore ?? null,
          subScores: s.summary?.subScores ?? null,
        };
      }),
      /**
       * S-41 and S-42. Two numbers a student can actually act on.
       *
       * `trend` is null until there are TWO scored sittings, because "you are
       * improving" needs something to improve from. Inventing a direction from
       * a single data point would be the same sin as scoring silence.
       *
       * `weakest` names the sub-score to work on. It ignores nulls, because a
       * skill we could not assess is not a weakness — it is a gap in our
       * measurement, and telling a student to practise something we never
       * judged would be misleading.
       */
      progress: buildProgress(sessions),
    },
  });
}

function buildProgress(sessions: { mode?: string; summary: { overallScore: number; subScores: Record<string, number | null> } | null }[]) {
  /**
   * N-37. Practice never distorts the mock trend.
   *
   * A practice run is ONE question. Averaging it with a seventeen-question mock
   * would swing the trend wildly on the strength of a single answer and tell
   * the student they had improved or collapsed when nothing of the sort
   * happened.
   */
  const scored = sessions
    .filter((s) => s.mode !== 'practice')
    .filter((s) => s.summary && typeof s.summary.overallScore === 'number')
    .map((s) => s.summary!);

  if (scored.length === 0) return { sittings: 0, trend: null, latest: null, weakest: null };

  const latest = scored[0];
  // Two sittings minimum. One point is a dot, not a direction.
  const trend =
    scored.length >= 2 ? latest.overallScore - scored[scored.length - 1].overallScore : null;

  // Lowest sub-score that was actually assessed.
  const weakest = weakestOf(latest.subScores);

  return { sittings: scored.length, trend, latest: latest.overallScore, weakest };
}

export async function POST(req: Request) {
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


  const rl = rateLimit(`account:${clientIp(req)}`, RL.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'too many attempts', 'Please wait a few minutes and try again.'),
      { status: 429 }
    );
  }

  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(apiError('NOT_SIGNED_IN', 'no session', 'Please sign in.'), {
      status: 401,
    });
  }

  try {
    Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', 'Something went wrong. Please try again.'),
      { status: 400 }
    );
  }

  // J3. A delete button that does not delete is worse than no button, so this
  // removes the recordings-derived data itself, not a flag saying to remove it.
  //
  // What goes: every interview session, which is where the transcripts and
  // feedback live. What stays: the append-only ledger and any payment orders,
  // because those are financial records and deleting them would destroy the
  // audit trail behind money that changed hands. The student record is marked
  // disabled and stripped of name and email rather than removed, so a payment
  // dispute can still be traced without holding their personal details.
  const removed = await store.deleteByStudent(student.id);

  await repo().updateStudent(student.id, {
    name: null,
    email: null,
    status: 'disabled',
    disabledAt: new Date().toISOString(),
    disabledBy: 'student_request',
  });

  await repo().appendAudit({
    id: crypto.randomUUID(),
    actorRole: 'student',
    actorId: student.id,
    action: 'delete_my_data',
    subjectId: student.id,
    before: 'active',
    after: 'deleted',
    note: `student deleted their own data, ${removed} sessions removed`,
    createdAt: new Date().toISOString(),
  });

  await clearStudentSession();

  return NextResponse.json({ ok: true, data: { sessionsRemoved: removed } });
}
