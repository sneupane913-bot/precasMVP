import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { getInstitution } from '@/lib/data/institutions';
import { getQuestion, resolvedQuestion , primeExtraQuestions} from '@/lib/data/questions';
import { transcribe, redact } from '@/lib/ai/stt';
import { evaluateAnswer } from '@/lib/ai/evaluate';
import { checkAudio, LIMITS } from '@/lib/credits';
import { platformDown } from '@/lib/platform';
import { ownsSession } from '@/lib/owner-session';
import { currentStudent } from '@/lib/auth/session';
import { consume, entitlementFor } from '@/lib/entitlement';
import { rateLimit, clientIp, LIMITS as RL, spendBreakerTripped, recordPaidCall } from '@/lib/rate-limit';
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
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Owner switch, before any paid call.
  // D-24. Questions added with no deploy join the pool before it is used.
  await primeExtraQuestions();

  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }

  const rl = rateLimit(`answer:${clientIp(req)}`, RL.answer);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'too many answers', 'Please slow down and try again in a minute.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  const session = await store.get(id);
  // Ownership before any paid call: otherwise a stranger with a session id
  // could spend our transcription budget. QA finding LIVE-002.
  if (!session || !(await ownsSession(session.ownerId))) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session or not owner', 'Your interview session has expired. Please start again.'),
      { status: 404 }
    );
  }
  if (session.status === 'completed') {
    return NextResponse.json(
      apiError('SESSION_DONE', 'already completed', 'This interview is already finished.'),
      { status: 409 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    // QA-210: an empty or non-multipart body threw and surfaced as a 500.
    // A malformed request is the caller's error, and it must never look like
    // our server fell over.
    return NextResponse.json(
      apiError('BAD_REQUEST', 'body was not multipart form data', 'Something went wrong sending your answer. Please record it again.'),
      { status: 400 }
    );
  }
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

  // (There used to be a checkCredits() call here. It was a placeholder that
  // always returned allowed, so it read like a control while guarding nothing.
  // The real debit is the ledger consume immediately below, which is the only
  // thing the browser cannot influence.)

  /**
   * Debit the sitting.
   *
   * This is the point where a mock interview is genuinely used: the student has
   * recorded something we are about to pay a provider to transcribe. Before
   * this, nothing has cost us anything and nothing should cost them anything.
   *
   * `consume` is idempotent per session, so the remaining sixteen answers of a
   * seventeen-question mock do not each take another credit.
   *
   * An anonymous session with no signed-in student is left alone. Those are
   * bound to the owner cookie and capped by the trial gate, and inventing a
   * debit against a student that does not exist would corrupt the ledger.
   */
  const answeringStudent = await currentStudent();
  if (answeringStudent) {
    const paid = await consume(
      answeringStudent.id,
      session.mode === 'practice' ? 'practice' : 'mock',
      session.id
    );
    if (!paid) {
      const ent = await entitlementFor(answeringStudent);
      return NextResponse.json(
        apiError(
          'NO_CREDITS_LEFT',
          'balance exhausted',
          ent.reason ?? 'You have used all your practice. Buy a pack to keep going.'
        ),
        { status: 402 }
      );
    }
  }

  // Global breaker. The last thing between a runaway and a real bill.
  if (spendBreakerTripped()) {
    return NextResponse.json(
      apiError(
        'SPEND_LIMIT',
        'monthly provider cap reached',
        'Practice is paused for today while we check our systems. Your credits are safe. Please try again later.'
      ),
      { status: 503 }
    );
  }

  const buffer = await file.arrayBuffer();
  recordPaidCall();
  const stt = await transcribe(buffer, file.type || 'audio/webm', durationSeconds);

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
      // 14 Aug. The client found that speaking quietly produced nothing at
      // all, and the screen never told him WHY — the meter said "Very quiet"
      // in the corner and the message only said to check the microphone was
      // on. His microphone WAS on. The one thing he needed to be told was to
      // speak up, and that is now the first sentence.
      stt.status === 'silent'
        ? 'We could not hear you. The recording came out too quiet. Your microphone is working, so please speak louder and a little closer to it, then record again. In the real interview the officer will need to hear you clearly too.'
        : stt.status === 'too_short'
          ? 'We heard you, but that answer was too short for useful feedback. Aim for about thirty seconds: say your point, then one real detail to back it up.'
          : 'Something went wrong while listening to your answer. Please record it again.';

    /**
     * `userMessage` lives INSIDE data.
     *
     * It used to be spread in beside `data` as a sibling, so an `ok: true`
     * response carried a user-facing field that the `ApiResult` type does not
     * describe. It worked, because the one component that reads it happened to
     * know, but every other route in this codebase puts user-facing text inside
     * `data` or inside `error`, and a field that exists only by convention is
     * one refactor away from silently disappearing. The student would then be
     * told nothing at all about why their answer was not used.
     */
    const payload: ApiResult<{
      transcriptStatus: typeof stt.status;
      canRetry: boolean;
      attemptsLeft: number;
      userMessage: string;
    }> = {
      ok: true,
      data: {
        transcriptStatus: stt.status,
        canRetry: priorAttempts + 1 < LIMITS.maxAttemptsPerQuestion,
        attemptsLeft: LIMITS.maxAttemptsPerQuestion - priorAttempts - 1,
        userMessage,
      },
    };
    // 200, not an error status: this is an expected outcome the UI must handle,
    // not an exception. The student sees a retry prompt, never a dead end.
    return NextResponse.json(payload);
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
    /**
     * D-39. Did the timer end this answer, or did the student?
     *
     * One second of tolerance, because the recorder stops a fraction after the
     * limit and we would otherwise miss every genuine cut-off. Erring towards
     * detecting it is the safer direction: the cost of a false positive is one
     * extra piece of timing advice, while the cost of a false negative is the
     * student being marked down for a sentence they were never allowed to
     * finish, or praised for an ending the machine invented for them.
     */
    ranOutOfTime: durationSeconds >= question.timeLimitSeconds - 1,
  });

  const answer: Answer = {
    questionId,
    orderIndex,
    attemptNumber: priorAttempts + 1,
    durationSeconds,
    transcript,
    transcriptStatus: 'ok',
    /**
     * We heard them, but clearly not all of them.
     *
     * Recorded on the answer so the report can carry the same honesty as the
     * room, rather than the student being told once and then shown a score
     * later with no context.
     */
    partialCapture: stt.partial,
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
    partialCapture: boolean;
    partialMessage: string | null;
  }> = {
    ok: true,
    data: {
      transcriptStatus: 'ok',
      transcript,
      evaluation,
      evaluationFailed: evaluation === null,
      /**
       * We heard them, but not all of them.
       *
       * The wording matters more than the flag. It takes the blame in OUR name
       * and never theirs, it does not use the word accent, and it does not tell
       * them to speak better English. It tells them the one mechanical thing
       * that actually helps: get closer to the microphone. Then it makes clear
       * the feedback covers only the part we caught, so a thin score is
       * explained rather than quietly accepted as a verdict on them.
       */
      partialCapture: stt.partial,
      partialMessage: stt.partial
        ? 'We only caught part of what you said. That is our microphone and our listening, not your English. Speak a little closer to the microphone next time and we will hear all of it. The feedback below is only about the part we did hear.'
        : null,
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
