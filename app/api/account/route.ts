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
  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(
      apiError('NOT_SIGNED_IN', 'no session', 'Please sign in to see your practice history.'),
      { status: 401 }
    );
  }

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
      sessions: sessions.map((s) => {
        const inst = getInstitution(s.institutionId);
        return {
          id: s.id,
          university: inst?.name ?? 'Your university',
          mode: s.mode,
          status: s.status,
          createdAt: s.createdAt,
          completedAt: s.completedAt,
          answered: s.answers.filter((a) => a.transcriptStatus === 'ok').length,
          total: s.questionIds.length,
          // The band, never a bare number, and only when one honestly exists.
          band: s.summary?.band ?? null,
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

function buildProgress(sessions: { summary: { overallScore: number; subScores: Record<string, number | null> } | null }[]) {
  const scored = sessions
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
