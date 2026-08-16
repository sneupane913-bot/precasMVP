import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getInstitution } from '@/lib/data/institutions';
import { getQuestion, publicQuestion, buildQuestionPlan , primeExtraQuestions} from '@/lib/data/questions';
import { currentStudent } from '@/lib/auth/session';
import { entitlementFor } from '@/lib/entitlement';
import { sttIsMocked } from '@/lib/ai/stt';
import { evaluatorIsMocked } from '@/lib/ai/evaluate';
import { storeIsEphemeral } from '@/lib/store';
import { ownsSession } from '@/lib/owner-session';
import { platformDown } from '@/lib/platform';
import { apiError, type ApiResult, type InterviewSession, type PublicQuestion } from '@/lib/types';
import { resumeIndexOf, answeredCountOf } from '@/lib/resume';

export const runtime = 'nodejs';

/** Resume state. A closed tab must never cost a student their session. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


  // D-24. Load questions added without a deploy before anything resolves ids.
  await primeExtraQuestions();

  const { id } = await params;
  const session = await store.get(id);

  // QA finding LIVE-002. A transcript contains the student's finances, family
  // and visa history. Reads are bound to the anonymous owner cookie issued at
  // creation. We answer 404, not 403, so this cannot be used to confirm that a
  // given session id exists.
  if (!session || !(await ownsSession(session.ownerId))) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session or not owner', 'We could not find that interview. Please start a new one.'),
      { status: 404 }
    );
  }

  const institution = getInstitution(session.institutionId);
  if (!institution) {
    return NextResponse.json(
      apiError('DATA_ERROR', 'missing institution', 'Something went wrong. Please start a new interview.'),
      { status: 500 }
    );
  }

  /**
   * D-23. Paying unlocks the REST OF THIS SITTING, which is a locked product
   * decision and is printed on the paywall: "Buying a pack unlocks the
   * remaining 7 of this same sitting."
   *
   * It was never implemented. `questionIds` is fixed at creation from the
   * entitlement at that moment, and nothing extended it afterwards, so a
   * student who hit the wall at question 10, paid, and came back found the
   * same 10 questions. They got the new pack, but the interview they paid to
   * finish stayed capped, which is the exact moment of maximum frustration.
   *
   * Done here, lazily, rather than inside the payment approval: it is
   * idempotent, it self-heals sittings that were paid for by any route
   * (approval, a seat, a manual grant), and it cannot leave a half-applied
   * write behind if approval and extension were two steps.
   */
  if (session.isTrial) {
    const student = await currentStudent();
    if (student) {
      const ent = await entitlementFor(student);
      const fullLength = Math.min(ent.questionsAllowed, institution.questionCount);
      if (ent.hasPaid && fullLength > session.questionIds.length) {
        const extra = buildQuestionPlan(fullLength).filter(
          (qid) => !session.questionIds.includes(qid)
        );
        const extended = [
          ...session.questionIds,
          ...extra.slice(0, fullLength - session.questionIds.length),
        ];
        /**
         * A COMPLETED trial sitting is reopened, and that is the whole point.
         *
         * Reaching the gate marks the sitting completed, and the gate is where
         * the student is asked to pay. So a guard that skipped completed
         * sittings would have skipped the only case the promise describes.
         * Their answers, their summary and their place are all kept; the
         * remaining questions are simply added and the sitting is live again.
         */
        session.questionIds = extended;
        session.isTrial = false;
        session.status = 'in_progress';
        await store.update(session.id, {
          questionIds: extended,
          isTrial: false,
          status: 'in_progress',
        });
      }
    }
  }

  const questions = session.questionIds
    .map((id) => getQuestion(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => publicQuestion(q, institution));

  // QA-201: the whole session object was returned, ownerId included. That is
  // the secret binding the session to this browser; echoing it hands an
  // attacker the value they would otherwise have to guess. Strip it.
  const { ownerId: _secret, ...safeSession } = session;

  const result: ApiResult<{
    session: Omit<InterviewSession, 'ownerId'>;
    questions: PublicQuestion[];
    institution: typeof institution;
    demo: { stt: boolean; evaluator: boolean; storage: boolean };
    /** Derived, never stored. See lib/resume.ts for why. */
    resumeIndex: number;
    answeredCount: number;
  }> = {
    ok: true,
    data: {
      session: safeSession,
      resumeIndex: resumeIndexOf(session),
      answeredCount: answeredCountOf(session),
      questions,
      institution,
      // Surfaced so the UI can say plainly that transcripts are sample text.
      demo: {
        stt: sttIsMocked(),
        evaluator: evaluatorIsMocked(),
        storage: storeIsEphemeral(),
      },
    },
  };

  return NextResponse.json(result);
}
