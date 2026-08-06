import type {
  Band,
  InterviewSession,
  QuestionCategory,
  SessionSummary,
} from '@/lib/types';
import { FLAG_META } from '@/lib/types';
import { getQuestion } from '@/lib/data/questions';

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
  const interviewBehaviour = Math.max(
    0,
    Math.round(100 * completionRate - criticalFlags * 6)
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

  const strengths: string[] = [];
  if (completionRate === 1) strengths.push('You answered every question and did not give up.');
  if (avg(wordCounts) > 70) strengths.push('Your answers were a good length, not too short.');
  if (criticalFlags === 0) strengths.push('You stayed on screen the whole time, exactly as required.');
  if (scored.some((a) => /\d/.test(a.transcript)))
    strengths.push('You used real numbers, which is what the interviewer wants to hear.');
  if (strengths.length === 0)
    strengths.push('You sat the full mock interview. That is more preparation than most students do.');

  const nextSteps: string[] = [];
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

  const band = bandFor(overallScore);
  const headline =
    scored.length === 0
      ? 'We could not hear enough of your answers to score this attempt'
      : band === 'ready'
        ? 'You are close to ready for the real interview'
        : band === 'almost_ready'
          ? 'You are almost there, a few things to fix'
          : band === 'needs_practice'
            ? 'You need more practice before the real interview'
            : 'This attempt would be risky in the real interview';

  return {
    overallScore,
    band,
    headline,
    subScores: {
      englishClarity: Math.max(0, Math.min(100, englishClarity)),
      specificity: Math.max(0, Math.min(100, specificity)),
      genuineIntent: Math.max(0, Math.min(100, genuineIntent)),
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
