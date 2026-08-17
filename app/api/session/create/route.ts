import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getInstitution } from '@/lib/data/institutions';
import {
  buildQuestionPlan,
  buildPracticePlan,
  publicQuestion,
  getQuestion,
  primeExtraQuestions,
} from '@/lib/data/questions';
import { store } from '@/lib/store';
import { weakestCategoryFor } from '@/lib/advice';
import { platformDown } from '@/lib/platform';
import { supportWhatsapp } from '@/lib/support';
import { rateLimit, clientIp, LIMITS as RL, maxMocksPerDay } from '@/lib/rate-limit';
import { ensureOwnerId, withOwnerId } from '@/lib/owner-session';
import { currentStudent, currentStudentEvenIfDisabled } from '@/lib/auth/session';
import { entitlementFor } from '@/lib/entitlement';
import { repo } from '@/lib/db';
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
  /** D18: practice can be aimed at one category. Never affects entitlement. */
  category: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  // D-24. Questions added with no deploy join the pool before it is used.
  await primeExtraQuestions();

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
    /**
     * D-30. Say which of the two things has actually happened.
     *
     * A disabled account also makes `currentStudent()` null, so a disabled
     * student used to be told to sign in, sign in successfully, and be told to
     * sign in again. Never a loop with no explanation: if they are signed in
     * and disabled, say so, and give them somebody to talk to.
     */
    const disabled = await currentStudentEvenIfDisabled();
    if (disabled) {
      const num = await supportWhatsapp();
      return NextResponse.json(
        apiError(
          'ACCOUNT_DISABLED',
          'account disabled',
          `Your account is paused, so you cannot start a new interview. Nothing you have done has been lost and any credits you paid for are safe.${
            num ? ` Please message or call ${num} and we will sort it out.` : ' Please get in touch and we will sort it out.'
          }`,
          num ? { label: 'Message us', href: `https://wa.me/${num.replace(/\D/g, '')}` } : undefined
        ),
        { status: 403 }
      );
    }
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

  // I7. The monthly spend breaker protects the business; this protects it from
  // one account. A student on an unlimited-feeling pack, or a script holding a
  // valid session, could otherwise burn the whole month's transcription budget
  // alone in an afternoon. The constant existed but nothing enforced it.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Practice is a single question and costs a fraction of a mock, so the daily
  // mock cap deliberately does not apply to it.
  const mocksToday = (await repo().listLedger(student.id)).filter(
    (e) => e.kind === 'mock' && e.reason === 'session_consumed' && e.createdAt >= since
  ).length;
  if (parsed.mode === 'test' && mocksToday >= maxMocksPerDay()) {
    return NextResponse.json(
      apiError(
        'DAILY_LIMIT',
        `daily mock cap ${maxMocksPerDay()}`,
        `You have started ${mocksToday} mock interviews today. Please come back tomorrow, or message us if you need more.`
      ),
      { status: 429 }
    );
  }

  const institution = getInstitution(parsed.institution);
  if (!institution) {
    return NextResponse.json(
      apiError('NOT_FOUND', 'unknown institution', 'We could not find that university.'),
      { status: 404 }
    );
  }

  // ---- Entitlement is decided HERE, never by the caller. ----
  //
  // Two adversarial findings both traced to this block ignoring what the
  // student is actually entitled to:
  //
  //   CASE 1. Nothing checked whether they held a credit, so a student who had
  //   used their free ten could open a whole second interview, sit through the
  //   device check, and only be refused at the moment they spoke. Being turned
  //   away after committing is worse than being told up front.
  //
  //   CASE 2. The plan was hard-coded to 'trial', so a student who had PAID
  //   still received a 10 question session. They bought the remaining seven and
  //   never got them. That is the worst kind of bug, because they paid for it.
  //
  // Both now come from the ledger, which is the only thing the browser cannot
  // influence.
  const ent = await entitlementFor(student);

  /**
   * AN UNFINISHED SITTING IS RESUMED, NEVER REPLACED.
   *
   * 14 Aug. The client answered one of his ten free questions, pressed Back by
   * mistake, and was told he had used his free trial. The credit is spent on
   * the FIRST answer (see consume()), which is right — otherwise one credit
   * buys seventeen questions across seventeen abandoned tabs — but it left the
   * sitting stranded with no way back into it, and the balance said zero.
   *
   * So a student loses a whole mock, free or paid, by pressing the browser
   * back button once. His rule, and it is the correct one: a sitting is not
   * spent until it is finished.
   *
   * Creating a SECOND session here would be worse than refusing: it would take
   * another credit for questions they have already paid to answer. Returning
   * the open one costs nothing, loses nothing, and is what they meant to do.
   *
   * A different university is not a different decision — they still have one
   * sitting open and one credit spent — so it resumes too, and the response
   * says which institution it belongs to so the page can be honest about it.
   */
  if (ent.inProgress && (parsed.mode === 'practice') === ent.inProgress.isPractice) {
    const open = await store.get(ent.inProgress.sessionId);
    const openInst = open ? getInstitution(open.institutionId) : undefined;
    if (open && openInst && open.studentId === student.id) {
      const openQuestions = open.questionIds
        .map((id) => getQuestion(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q))
        .map((q) => publicQuestion(q, openInst));
      return NextResponse.json({
        ok: true,
        data: {
          sessionId: open.id,
          questions: openQuestions,
          questionLimit: openQuestions.length,
          // The page needs all three to be honest: that this is a resume, how
          // far in they were, and which university it belongs to — because
          // they may have tapped a different one.
          resumed: true,
          answered: ent.inProgress.answered,
          institutionId: open.institutionId,
          institutionName: openInst.name,
        },
      });
    }
  }

  /**
   * The sitting they opened and have not answered yet.
   *
   * `inProgress` above only covers sittings where a credit has actually been
   * spent, which is deliberate: before the first answer nothing has been paid
   * for and nothing can be lost, so being forced back into a university they no
   * longer want would be wrong.
   *
   * But a student who opens BPP, loses signal, and taps BPP again should not
   * quietly leave an orphan session behind every time. So an open, unanswered
   * sitting for the SAME mode and the SAME university is handed back. Same
   * fault as the checkout writing a new order on every visit, same fix.
   *
   * A DIFFERENT university still gets a fresh sitting, because they changed
   * their mind and it has cost them nothing.
   */
  {
    const mineOpen = await store.listByStudent(student.id);
    const untouched = mineOpen.find(
      (x) =>
        x.institutionId === institution.id &&
        x.mode === parsed.mode &&
        (x.answers?.length ?? 0) === 0 &&
        x.status !== 'completed' &&
        x.status !== 'abandoned'
    );
    if (untouched) {
      const uq = untouched.questionIds
        .map((id) => getQuestion(id))
        .filter((q): q is NonNullable<typeof q> => Boolean(q))
        .map((q) => publicQuestion(q, institution));
      return NextResponse.json({
        ok: true,
        data: {
          sessionId: untouched.id,
          questions: uq,
          questionLimit: uq.length,
          // Not `resumed`: there is nothing to resume, they simply have the
          // same sitting back. Saying "resumed" would make the screen tell
          // them they were part way through when they had not started.
          reopened: true,
          answered: 0,
          institutionId: untouched.institutionId,
          institutionName: institution.name,
        },
      });
    }
  }

  const canStart = parsed.mode === 'practice' ? ent.canStartPractice : ent.canStartMock;
  if (!canStart) {
    return NextResponse.json(
      apiError(
        'NO_CREDITS_LEFT',
        `no ${parsed.mode} credit`,
        (parsed.mode === 'practice' ? ent.practiceReason : ent.reason) ??
          'Buy a pack to keep practising.',
        // WALK 1.11. Being told no is not the same as being stuck. The refusal
        // carries the way out with it, so the catalogue can put a button under
        // the sentence instead of leaving a student staring at red text.
        { label: 'See the packs', href: '/pricing' }
      ),
      { status: 402 }
    );
  }
  // D18. Practice is a single question drill, a full mock is the exam. They
  // draw on two separate credit pools, so which one this is decides what the
  // student is charged as well as how long it is.
  const isPractice = parsed.mode === 'practice';
  const questionLimit = isPractice
    ? 1
    : Math.min(ent.questionsAllowed, institution.questionCount);
  const questionIds = isPractice
    ? buildPracticePlan(parsed.category ?? (await weakestCategoryFor(student.id)) ?? undefined)
    : buildQuestionPlan(questionLimit);

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
    skippedQuestionIds: [],
    answers: [],
    flags: [],
    isTrial: !ent.hasPaid,
    ownerId,
    studentId: student.id,
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
  // The owner id must ride on THIS response. Without it the browser never
  // receives the cookie, and the student is refused by every guard on the
  // interview they have just created. See lib/owner-session.ts.
  return withOwnerId(NextResponse.json(result), ownerId);
}
