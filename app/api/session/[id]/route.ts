import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getInstitution } from '@/lib/data/institutions';
import { getQuestion, publicQuestion } from '@/lib/data/questions';
import { sttIsMocked } from '@/lib/ai/stt';
import { evaluatorIsMocked } from '@/lib/ai/evaluate';
import { storeIsEphemeral } from '@/lib/store';
import { apiError, type ApiResult, type InterviewSession, type PublicQuestion } from '@/lib/types';

export const runtime = 'nodejs';

/** Resume state. A closed tab must never cost a student their session. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await store.get(params.id);
  if (!session) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session', 'We could not find that interview. Please start a new one.'),
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

  const result: ApiResult<{
    session: InterviewSession;
    questions: PublicQuestion[];
    institution: typeof institution;
    demo: { stt: boolean; evaluator: boolean; storage: boolean };
  }> = {
    ok: true,
    data: {
      session,
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
