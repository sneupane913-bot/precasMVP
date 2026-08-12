import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getInstitution } from '@/lib/data/institutions';
import { buildQuestionPlan, publicQuestion, getQuestion } from '@/lib/data/questions';
import { getPlan } from '@/lib/data/plans';
import { store } from '@/lib/store';
import { checkCredits } from '@/lib/credits';
import { platformDown } from '@/lib/platform';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { ensureOwnerId } from '@/lib/owner-session';
import { currentStudent } from '@/lib/auth/session';
import { apiError, type ApiResult, type InterviewSession } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * QA finding LIVE-003: the previous version accepted `isTrial` from the
 * request body, so anyone could post `{"isTrial": false}` and receive a full
 * 22-question session for free. That is a direct, unlimited cost leak.
 *
 * The body now carries NO authority fields at all. It says which university
 * the student wants and nothing else. Entitlement is decided here, on the
 * server, from the plan table.
 */
const Body = z.object({
  institution: z.string().min(1).max(120),
  mode: z.enum(['test', 'practice']).default('test'),
});

export async function POST(req: Request) {
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }

  // QA measured 600-4,300 req/min against this endpoint with nothing stopping
  // it. Every session started is money we may spend on transcription.
  const rl = rateLimit(`create:${clientIp(req)}`, RL.sessionCreate);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError(
        'RATE_LIMITED',
        'too many session creates',
        'You are starting interviews very quickly. Please wait a minute and try again.'
      ),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  // QA round 2, defect B1: this endpoint created a full session with NO
  // authentication at all, so the entire sign-in gate could be skipped by
  // posting straight to it, and the home page even linked past it. Every
  // session started is money we may spend on transcription, and an anonymous
  // session cannot be attributed, rate limited per student, or counted against
  // a trial. Sign-in is now required before any session exists.
  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(
      apiError(
        'NOT_SIGNED_IN',
        'no student session',
        'Please sign in first so we can save your practice.'
      ),
      { status: 401 }
    );
  }

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

  const credits = await checkCredits(null);
  if (!credits.allowed) {
    return NextResponse.json(apiError(credits.code, 'no credits', credits.userMessage), {
      status: 402,
    });
  }

  // ---- Entitlement is decided HERE, never by the caller. ----
  // Payments are not live, so every session is a trial. When paid packs land,
  // this reads the buyer's entitlement. The browser never gets a say.
  const plan = getPlan('trial');
  if (!plan) {
    return NextResponse.json(
      apiError('CONFIG', 'trial plan missing', 'Something went wrong. Please try again.'),
      { status: 500 }
    );
  }
  const questionLimit = Math.min(plan.maxQuestionsPerMock, institution.questionCount);
  const questionIds = buildQuestionPlan(questionLimit);

  // Bind the session to this browser so nobody else can read the transcript.
  const ownerId = await ensureOwnerId();

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
    isTrial: true,
    ownerId,
    consentVersion: null,
    consentAt: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    summary: null,
  };

  await store.create(session);

  const questions = questionIds
    .map((id) => getQuestion(id))
    .filter((q): q is NonNullable<typeof q> => Boolean(q))
    .map((q) => publicQuestion(q, institution));

  const result: ApiResult<{
    sessionId: string;
    questions: typeof questions;
    questionLimit: number;
  }> = {
    ok: true,
    data: { sessionId: session.id, questions, questionLimit },
  };
  return NextResponse.json(result);
}
