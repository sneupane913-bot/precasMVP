import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getInstitution } from '@/lib/data/institutions';
import { getQuestion, resolvedQuestion } from '@/lib/data/questions';
import { transcribe, redact } from '@/lib/ai/stt';
import { evaluateAnswer } from '@/lib/ai/evaluate';
import { checkAudio, checkCredits, LIMITS } from '@/lib/credits';
import { apiError, type Answer, type ApiResult } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 26;

/**
 * The hot path. See docs/MVP_SPEC.md section 4.
 *
 * The single rule that defines this product: there is NO path through this
 * function that produces a score from an empty transcript. The competitor
 * awards 43% to silence. We refuse, and we tell the student why.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await store.get(params.id);
  if (!session) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session', 'Your interview session has expired. Please start again.'),
      { status: 404 }
    );
  }
  if (session.status === 'completed') {
    return NextResponse.json(
      apiError('SESSION_DONE', 'already completed', 'This interview is already finished.'),
      { status: 409 }
    );
  }

  const form = await req.formData();
  const file = form.get('audio');
  const questionId = String(form.get('questionId') ?? '');
  const durationSeconds = Number(form.get('durationSeconds') ?? 0);

  if (!(file instanceof Blob) || !questionId) {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'missing audio or questionId', 'Something went wrong sending your answer. Please record it again.'),
      { status: 400 }
    );
  }

  const orderIndex = session.questionIds.indexOf(questionId);
  if (orderIndex === -1) {
    return NextResponse.json(
      apiError('BAD_QUESTION', 'question not in plan', 'Something went wrong. Please start the interview again.'),
      { status: 400 }
    );
  }

  // Attempts are read from the stored attemptNumber, NOT by counting rows.
  // Each new attempt replaces the previous row for this question, so counting
  // rows would always return 1 and the cap would never fire. Found in QA.
  const existingForQuestion = session.answers.find((a) => a.questionId === questionId);
  const priorAttempts = existingForQuestion?.attemptNumber ?? 0;
  if (priorAttempts >= LIMITS.maxAttemptsPerQuestion) {
    return NextResponse.json(
      apiError(
        'TOO_MANY_ATTEMPTS',
        'attempt cap',
        'You have tried this question three times. Move on to the next question and come back to this one in practice.'
      ),
      { status: 429 }
    );
  }

  // Guardrail before any paid call.
  const bytes = file.size;
  const audioCheck = checkAudio(bytes, durationSeconds);
  if (!audioCheck.allowed) {
    await recordFailure(session.id, questionId, orderIndex, priorAttempts, durationSeconds, 'silent');
    return NextResponse.json(
      apiError(audioCheck.code, 'audio rejected before transcription', audioCheck.userMessage),
      { status: 400 }
    );
  }

  const credits = await checkCredits(null);
  if (!credits.allowed) {
    return NextResponse.json(apiError(credits.code, 'no credits', credits.userMessage), {
      status: 402,
    });
  }

  const buffer = await file.arrayBuffer();
  const stt = await transcribe(buffer, file.type || 'audio/webm');

  // === The guard. No transcript, no score. Ever. ===
  if (stt.status !== 'ok') {
    await recordFailure(
      session.id,
      questionId,
      orderIndex,
      priorAttempts,
      durationSeconds,
      stt.status
    );

    const userMessage =
      stt.status === 'silent'
        ? 'We could not hear your answer. Check that your microphone is on, then record again.'
        : stt.status === 'too_short'
          ? 'That answer was too short for us to give you useful feedback. Try to speak for at least thirty seconds.'
          : 'Something went wrong while listening to your answer. Please record it again.';

    const payload: ApiResult<{
      transcriptStatus: typeof stt.status;
      canRetry: boolean;
      attemptsLeft: number;
    }> = {
      ok: true,
      data: {
        transcriptStatus: stt.status,
        canRetry: priorAttempts + 1 < LIMITS.maxAttemptsPerQuestion,
        attemptsLeft: LIMITS.maxAttemptsPerQuestion - priorAttempts - 1,
      },
    };
    // 200, not an error status: this is an expected outcome the UI must handle,
    // not an exception. The student sees a retry prompt, never a dead end.
    return NextResponse.json({ ...payload, userMessage });
  }

  const institution = getInstitution(session.institutionId);
  const baseQuestion = getQuestion(questionId);
  if (!institution || !baseQuestion) {
    return NextResponse.json(
      apiError('DATA_ERROR', 'missing institution or question', 'Something went wrong. Please start again.'),
      { status: 500 }
    );
  }

  const question = resolvedQuestion(baseQuestion, institution);
  const transcript = redact(stt.transcript);

  const evaluation = await evaluateAnswer({
    question,
    transcript,
    durationSeconds,
    previousTranscripts: session.answers
      .filter((a) => a.transcriptStatus === 'ok')
      .map((a) => a.transcript),
  });

  const answer: Answer = {
    questionId,
    orderIndex,
    attemptNumber: priorAttempts + 1,
    durationSeconds,
    transcript,
    transcriptStatus: 'ok',
    evaluation, // may be null if the evaluator failed. Still never fabricated.
    createdAt: new Date().toISOString(),
  };

  const fresh = await store.get(session.id);
  const answers = (fresh ?? session).answers.filter((a) => a.questionId !== questionId);
  answers.push(answer);
  answers.sort((a, b) => a.orderIndex - b.orderIndex);

  await store.update(session.id, {
    answers,
    status: 'in_progress',
    currentIndex: Math.max(session.currentIndex, orderIndex + 1),
  });

  const result: ApiResult<{
    transcriptStatus: 'ok';
    transcript: string;
    evaluation: typeof evaluation;
    evaluationFailed: boolean;
  }> = {
    ok: true,
    data: {
      transcriptStatus: 'ok',
      transcript,
      evaluation,
      evaluationFailed: evaluation === null,
    },
  };
  return NextResponse.json(result);
}

async function recordFailure(
  sessionId: string,
  questionId: string,
  orderIndex: number,
  priorAttempts: number,
  durationSeconds: number,
  status: 'silent' | 'too_short' | 'failed'
) {
  const session = await store.get(sessionId);
  if (!session) return;
  const answers = session.answers.filter((a) => a.questionId !== questionId);
  answers.push({
    questionId,
    orderIndex,
    attemptNumber: priorAttempts + 1,
    durationSeconds,
    transcript: '',
    transcriptStatus: status,
    evaluation: null, // never a score without a transcript
    createdAt: new Date().toISOString(),
  });
  answers.sort((a, b) => a.orderIndex - b.orderIndex);
  await store.update(sessionId, { answers, status: 'in_progress' });
}
