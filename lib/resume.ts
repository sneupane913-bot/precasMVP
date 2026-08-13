import type { InterviewSession } from '@/lib/types';

/**
 * WHERE A STUDENT COMES BACK TO. Derived, never stored.
 *
 * The rule, in one sentence: **a question is done when an answer was
 * submitted, or when the student chose to skip it. Nothing else counts.**
 *
 * Why it is derived. `currentIndex` used to be a number written down as the
 * student moved. Numbers written down drift. On 14 Aug the client pressed the
 * record button on question 2, pressed Back before saying anything, came back
 * in and was placed on question 3 — question 2 was simply gone, and he had
 * answered nothing. The header showed the drift plainly: **"Q 8/10 · 1 done, 9
 * left"**. A browser-side index had walked forward eight times against one
 * real answer, and the two never had to agree.
 *
 * Computing it from the answers means the two CANNOT disagree, because there
 * is only one of them. Press record and walk away, close the laptop, come back
 * in a week: the first question with nothing recorded against it is the one
 * you get, every time.
 *
 * The client asked whether an attempt should count after some number of
 * seconds of recording. It should not, and no threshold is needed. A threshold
 * is another number to get wrong, and it would have to be defended for the
 * student whose recording was cut at nine seconds by a power cut. **Submitted
 * audio is the line.** Nothing submitted, nothing counted. G-1 already refuses
 * to score audio it could not hear, so a submitted-but-silent answer is
 * handled honestly further down and is not this function's problem.
 */
export function resumeIndexOf(session: Pick<InterviewSession, 'questionIds' | 'answers' | 'skippedQuestionIds'>): number {
  const answered = new Set((session.answers ?? []).map((a) => a.questionId));
  const skipped = new Set(session.skippedQuestionIds ?? []);
  const idx = session.questionIds.findIndex((id) => !answered.has(id) && !skipped.has(id));
  // Everything is dealt with: park them on the last question rather than out
  // of bounds. The room shows the finish action from there.
  return idx === -1 ? Math.max(0, session.questionIds.length - 1) : idx;
}

/** How many questions genuinely have an answer. Never a stored counter. */
export function answeredCountOf(session: Pick<InterviewSession, 'answers'>): number {
  return new Set((session.answers ?? []).map((a) => a.questionId)).size;
}
