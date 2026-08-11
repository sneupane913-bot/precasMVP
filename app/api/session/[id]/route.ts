import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getInstitution } from '@/lib/data/institutions';
import { getQuestion, publicQuestion } from '@/lib/data/questions';
import { sttIsMocked } from '@/lib/ai/stt';
import { evaluatorIsMocked } from '@/lib/ai/evaluate';
import { storeIsEphemeral } from '@/lib/store';
import { ownsSession } from '@/lib/owner-session';
import { apiError, type ApiResult, type InterviewSession, type PublicQuestion } from '@/lib/types';

export const runtime = 'nodejs';

/** Resume state. A closed tab must never cost a student their session. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  }> = {
    ok: true,
    data: {
      session: safeSession,
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
