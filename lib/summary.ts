import type {
  Band,
  InterviewSession,
  QuestionCategory,
  SessionSummary,
} from '@/lib/types';
import { FLAG_META } from '@/lib/types';
import { getQuestion } from '@/lib/data/questions';
import { isDemoTranscript } from '@/lib/ai/stt';

function bandFor(score: number): Band {
  if (score >= 80) return 'ready';
  if (score >= 65) return 'almost_ready';
  if (score >= 40) return 'needs_practice';
  return 'risky';
}

/**
 * Builds the overall result from the per-answer evaluations that were already
 * computed during the interview. This is arithmetic, not an AI call, which is
 * why the results page is instant and why nothing here can time out.
 */
export function buildSummary(session: InterviewSession): SessionSummary {
  const scored = session.answers.filter((a) => a.evaluation !== null);
  const total = session.questionIds.length;

  const avg = (ns: number[]) =>
    ns.length ? Math.round(ns.reduce((a, b) => a + b, 0) / ns.length) : 0;

  const overallScore = avg(scored.map((a) => a.evaluation!.score));

  // Sub-scores are derived from real signals, never invented.
  const wordCounts = scored.map((a) => a.transcript.split(/\s+/).length);
  const englishClarity = avg(scored.map((a) => a.evaluation!.score));
  const specificity = avg(
    scored.map((a) => {
      const hasNumber = /\d/.test(a.transcript) ? 15 : 0;
      const hasProperNoun = /\b[A-Z][a-z]{2,}\b/.test(a.transcript) ? 10 : 0;
      return Math.min(100, a.evaluation!.score + hasNumber + hasProperNoun - 12);
    })
  );
  const genuineIntent = avg(
    scored.map((a) => a.evaluation!.score - (a.evaluation!.soundsMemorised ? 18 : 0))
  );

  const criticalFlags = session.flags.filter(
    (f) => FLAG_META[f.type].severity === 'critical'
  ).length;
  const completionRate = total ? scored.length / total : 0;

  /**
   * QA-204: a student who behaved perfectly but whose microphone failed was
   * shown "Behaviour 0%". That reads as an accusation, and it is false: they
   * broke no rules. The old formula multiplied completion by 100, and
   * completion is zero when nothing transcribes, so good behaviour scored zero.
   *
   * Behaviour is now measured only by what we OBSERVED. Rule-following is the
   * baseline and violations subtract from it. Failing to be heard is a
   * microphone problem, not misconduct, so it no longer costs behaviour marks.
   * Abandoning the interview still does, because that is a real observation.
   */
  const abandoned = session.status === 'abandoned';
  const interviewBehaviour = Math.max(
    0,
    Math.min(100, 100 - criticalFlags * 8 - (abandoned ? 25 : 0))
  );

  // Weakest categories, used to drive the practice buttons on the results page.
  const byCategory = new Map<QuestionCategory, number[]>();
  for (const a of scored) {
    const q = getQuestion(a.questionId);
    if (!q) continue;
    const list = byCategory.get(q.category) ?? [];
    list.push(a.evaluation!.score);
    byCategory.set(q.category, list);
  }
  const weakestCategories = [...byCategory.entries()]
    .map(([cat, scores]) => ({ cat, score: avg(scores) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((x) => x.cat);

  // QA finding LIVE-009. With zero audible answers the old version still told
  // the student to "add specifics" and not to "sound memorised". We had heard
  // nothing. That is exactly the fabrication we criticise the competitor for,
  // arriving through the back door of the summary instead of the scorer.
  //
  // Rule: coaching may only be derived from successfully transcribed answers,
  // or from events we genuinely observed (flags, completion). Everything else
  // is reported as not assessed.
  /**
   * D-27. Demo answers count as NOT HEARD.
   *
   * The answer route carries the real guard, "no transcript, no score, ever",
   * but it only fires when `stt.status !== 'ok'` and the mock provider returns
   * `ok`. So with no AI key set, the report showed a student "Almost ready",
   * "75%", and "English clarity 75%" derived from a paragraph they never
   * spoke, with nothing on the page saying the AI was off.
   *
   * `lib/ai/stt.ts` already states the rule this broke: presenting invented
   * text as a student's own answer is the exact failure we criticise the
   * competitor for, and it is not excused by being a development convenience.
   *
   * So anything that depends on HEARING the student is withheld when every
   * scored answer is demo text. Behaviour is still reported, because it was
   * genuinely observed.
   */
  const demoOnly = scored.length > 0 && scored.every((a) => isDemoTranscript(a.transcript));
  const heardNothing = scored.length === 0 || demoOnly;

  const strengths: string[] = [];
  if (demoOnly) {
    // Praising "you used real numbers" for a canned paragraph is the same lie
    // as the score. Only genuinely observed behaviour may be praised.
    if (criticalFlags === 0)
      strengths.push('You stayed on the interview screen the whole time, which is exactly right.');
    strengths.push('You sat the interview under real conditions, with the camera on and the timer running.');
  } else if (heardNothing) {
    // The only honest positives are things that did not depend on hearing them.
    if (criticalFlags === 0)
      strengths.push('You stayed on the interview screen the whole time, which is exactly right.');
    strengths.push('You sat down and started. Sorting out the microphone is the easy part.');
  } else {
    if (completionRate === 1) strengths.push('You answered every question and did not give up.');
    if (avg(wordCounts) > 70) strengths.push('Your answers were a good length, not too short.');
    if (criticalFlags === 0)
      strengths.push('You stayed on screen the whole time, exactly as required.');
    if (scored.some((a) => /\d/.test(a.transcript)))
      strengths.push('You used real numbers, which is what the interviewer wants to hear.');
    if (strengths.length === 0)
      strengths.push('You sat the full mock interview. That is more preparation than most students do.');
  }

  const nextSteps: string[] = [];
  if (demoOnly) {
    // Not a microphone problem, so do not send them to check the microphone.
    nextSteps.push(
      'This is practice mode. The listening is not switched on yet, so the words above are a sample and are not what you said.'
    );
    nextSteps.push('Nothing here is a judgement of your English. Nothing has been scored.');
    nextSteps.push('Everything else on this page is real: the questions, the timer, and how you behaved on camera.');
  } else if (heardNothing) {
    nextSteps.push('We could not hear any of your answers, so there is nothing to judge yet.');
    nextSteps.push('Check your microphone is not muted and that your browser is allowed to use it.');
    nextSteps.push('Do the sound check before you start, and only continue once you hear yourself.');
  } else {
    // D-35. This must come FIRST. The percentage above is the average of the
    // questions that were answered, and a student reading a large green number
    // will not work that out for themselves unless we say it.
    if (completionRate < 0.6)
      nextSteps.push(
        `The score above is only for the ${scored.length} question${scored.length === 1 ? '' : 's'} you answered. Sit the full interview to find out where you really stand.`
      );
    if (specificity < 55)
      nextSteps.push('Add real details to your answers: names, numbers, dates, module titles.');
    if (genuineIntent < 55)
      nextSteps.push('Practise saying your answers in different words, so they do not sound learned by heart.');
    if (criticalFlags > 0)
      nextSteps.push('Stay on the interview screen and keep your face in the camera the whole time.');
    if (completionRate < 1)
      nextSteps.push('Finish every question next time, even if you are not sure of the answer.');
    if (nextSteps.length === 0)
      nextSteps.push('Sit the mock again in two days and try to beat this score.');
  }

  // D-27. A demo sitting gets no headline verdict either. 75% and "Almost
  // ready" printed in the largest type on the page is the part a student
  // believes, whatever the transcript underneath is marked.
  const reportedScore = heardNothing ? 0 : overallScore;

  /**
   * D-35. THE MOST DANGEROUS DEFECT FOUND IN THIS PRODUCT SO FAR.
   *
   * A student answered ONE of ten questions, pressed "End interview", and was
   * shown 92% with a green "Ready" badge and the words "You are close to ready
   * for the real interview". That is not a rounding problem. It is the product
   * telling a student they are prepared for a credibility interview on the
   * evidence of a single answer, and a student who believes it walks into the
   * real thing unprepared.
   *
   * The score itself was not wrong: 92% was the honest average of what was
   * answered. The VERDICT was wrong, because a verdict needs coverage as well
   * as quality. One good answer out of ten is not evidence of readiness any
   * more than one good exam question is evidence of passing the exam.
   *
   * So the band is now capped by how much of the interview was actually sat.
   * Quality can only lower the band from what coverage allows, never raise it.
   */
  const RELIABLE_COVERAGE = 0.9;
  const PARTIAL_COVERAGE = 0.6;
  const rawBand = bandFor(reportedScore);
  const band: Band = heardNothing
    ? rawBand
    : completionRate >= RELIABLE_COVERAGE
      ? rawBand
      : completionRate >= PARTIAL_COVERAGE
        ? // Most of it sat. A positive verdict is possible but not the top one.
          rawBand === 'ready'
          ? 'almost_ready'
          : rawBand
        : // Under 60% answered there is not enough evidence for ANY positive
          // verdict, however well the few answered questions scored.
          rawBand === 'ready' || rawBand === 'almost_ready'
          ? 'needs_practice'
          : rawBand;

  /**
   * The headline must say what actually happened, not dress a fragment up as a
   * result. "You answered 1 of 10 questions" is the single most useful sentence
   * we can put in the largest type on the page.
   */
  const tooLittleToJudge = !heardNothing && completionRate < PARTIAL_COVERAGE;

  const headline = demoOnly
    ? 'Practice mode: we were not listening yet, so this attempt has not been scored'
    : scored.length === 0
      ? 'We could not hear enough of your answers to score this attempt'
      : tooLittleToJudge
        ? `You answered ${scored.length} of ${total} questions, which is not enough to judge whether you are ready`
        : band === 'ready'
          ? 'You are close to ready for the real interview'
          : band === 'almost_ready'
            ? 'You are almost there, a few things to fix'
            : band === 'needs_practice'
              ? 'You need more practice before the real interview'
              : 'This attempt would be risky in the real interview';

  return {
    overallScore: reportedScore,
    band,
    headline,
    // Every dimension that depends on hearing the student is null when we did
    // not hear them. The results page renders "not assessed", never a number.
    subScores: {
      englishClarity: heardNothing ? null : Math.max(0, Math.min(100, englishClarity)),
      specificity: heardNothing ? null : Math.max(0, Math.min(100, specificity)),
      genuineIntent: heardNothing ? null : Math.max(0, Math.min(100, genuineIntent)),
      // Behaviour is observed, not heard, so it stays valid.
      interviewBehaviour,
    },
    answeredCount: scored.length,
    totalCount: total,
    violationCount: session.flags.length,
    strengths,
    weakestCategories,
    nextSteps,
  };
}
