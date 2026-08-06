import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getInstitution } from '@/lib/data/institutions';
import { buildQuestionPlan, publicQuestion, getQuestion } from '@/lib/data/questions';
import { store } from '@/lib/store';
import { checkCredits, LIMITS } from '@/lib/credits';
import { apiError, type ApiResult, type InterviewSession } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.object({
  institution: z.string().min(1).max(120),
  mode: z.enum(['test', 'practice']).default('test'),
  isTrial: z.boolean().default(true),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', 'Something went wrong. Please go back and try again.'),
      { status: 400 }
    );
  }

  const institution = getInstitution(parsed.institution);
  if (!institution) {
    return NextResponse.json(
      apiError('NOT_FOUND', 'unknown institution', 'We could not find that university.'),
      { status: 404 }
    );
  }

  // Credits are checked BEFORE anything is created. Never after.
  const credits = await checkCredits(null);
  if (!credits.allowed) {
    return NextResponse.json(apiError(credits.code, 'no credits', credits.userMessage), {
      status: 402,
    });
  }

  const limit = parsed.isTrial ? LIMITS.trialQuestionCount : institution.questionCount;
  const questionIds = buildQuestionPlan(limit);

  const session: InterviewSession = {
    id: crypto.randomUUID(),
    vertical: 'uk-precas',
    institutionId: institution.id,
    mode: parsed.mode,
    status: 'device_check',
    questionIds,
    currentIndex: 0,
    answers: [],
    flags: [],
    isTrial: parsed.isTrial,
    createdAt: new Date().toISOString(),
    completedAt: null,
    summary: null,
  };

  await store.create(session);

  const questions = questionIds
    .map((id) => getQuestion(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => publicQuestion(q, institution));

  const result: ApiResult<{ sessionId: string; questions: typeof questions }> = {
    ok: true,
    data: { sessionId: session.id, questions },
  };
  return NextResponse.json(result);
}
