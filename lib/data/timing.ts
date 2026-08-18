/**
 * HOW LONG A STUDENT GETS TO ANSWER, AND WHERE THE NUMBERS COME FROM.
 *
 * This file exists because the bank used to carry 45 and 60 second limits that
 * nobody had sourced. They were guesses, and they were wrong in a way that
 * actively coached students badly: the real interview asks for evidence, and
 * you cannot give two facts and a conclusion in 45 seconds.
 *
 * SOURCES, checked 18 August 2026:
 *
 *  [T1] Oxford Brookes University -- the only PUBLISHED per-question spec found
 *       anywhere in the sector:
 *
 *         "Students will have 15 seconds to read each question and one to two
 *          minutes to record their answer, depending on the question."
 *
 *       Same page, on what the answer must contain: answers must be "clear,
 *       easy to understand and relevant", supported by "at least two facts or
 *       examples", and must not be "rehearsed answers".
 *       ~10 questions, CAS Shield recorded format.
 *       https://www.brookes.ac.uk/students/isat/visas/student-visa/getting-your-cas/starting-a-new-course
 *
 *  [T2] Brunel University of London -- CAS Shield interview policy: the whole
 *       interview takes "approximately 15-20 minutes to complete".
 *       https://students.brunel.ac.uk/documents/Policies/cas-shield-interview-policy-2024-5.pdf
 *
 *  [T3] Aston University -- pre-CAS interview policy: "All students invited to
 *       interview will be asked 14 questions in total" (10 category + 2 admin +
 *       2 wildcard), same CAS Shield platform as [T2].
 *       https://www.aston.ac.uk/sites/default/files/2025-07/aston-pre-CAS-interview-policy-v2.pdf
 *
 *  [T4] University of Lincoln -- live Zoom interview, "30 to 40 minutes",
 *       against a published sample bank of 24 questions across 6 topics.
 *       https://www.lincoln.ac.uk/studywithus/internationalstudents/informationforofferholders/pre-casinterview/
 *
 *  [T5] University of Suffolk -- confirms the answer IS capped even where the
 *       number is not published: "You will be presented with a series of
 *       on-screen questions and given a set amount of time to respond."
 *       https://www.uos.ac.uk/international/apply-for-your-cas/
 *
 * THE ARITHMETIC. Two independent numbers agree, which is the reason to trust
 * them:
 *
 *   [T1] states 60-120 seconds of speech per question, outright.
 *   [T2] 15-20 minutes divided by [T3] 14 questions = 64-86 seconds per
 *        question, including reading time.
 *
 * So the real envelope is 60-120 seconds of speech, averaging around 75. Our
 * old 45-60 was below the floor of the published range on every question.
 *
 * WHY THE CAP IS HARD AND NOT A WARNING. CAS Shield stops the recording; [T5]
 * says the time is "set". A mock that lets a student run over is training a
 * habit the real system punishes, so the countdown here cuts.
 */

/**
 * What kind of answer a question wants. This, not the topic, is what decides
 * how long the student gets -- "what is your course called" and "why this
 * university over the others" are both `why_course`-adjacent and need very
 * different amounts of time.
 */
export type AnswerKind =
  /** A fact they either know or do not: course title, fee, intake, city. */
  | 'factual'
  /** Two pieces of evidence and a conclusion. The default. */
  | 'explanatory'
  /** Option A against option B, then the decision. The longest answers. */
  | 'comparative'
  /** The opening. */
  | 'intro'
  /** A second-level probe fired after an earlier answer. */
  | 'probe'
  /** "Is there anything you would like to add?" */
  | 'closing';

export interface AnswerTiming {
  /** Hard cap on the recording, in seconds. The countdown cuts at this. */
  answerSeconds: number;
  /** Seconds to read the question before recording arms. [T1] uses 15. */
  readSeconds: number;
  /** Shown to the student as a target, not enforced. */
  targetSeconds: number;
  /** Why this number. Rendered nowhere; kept so the next person can check it. */
  basis: string;
}

export const TIMING: Record<AnswerKind, AnswerTiming> = {
  intro: {
    answerSeconds: 60,
    readSeconds: 10,
    targetSeconds: 45,
    basis:
      'The opening is a warm-up, not an argument. 60s cap with a 45s target; ' +
      'the bottom of the [T1] band, because padding it wastes the 15-20 minute ' +
      'total in [T2] and reads as rehearsed.',
  },
  factual: {
    answerSeconds: 45,
    readSeconds: 10,
    targetSeconds: 25,
    basis:
      'These are the two "admin" questions in [T3] and the number-checking ' +
      'questions elsewhere. [T1] says "depending on the question", and this is ' +
      'the end of its range those words are for. A student who talks for two ' +
      'minutes about their intake month has misread the interview.',
  },
  explanatory: {
    answerSeconds: 90,
    readSeconds: 15,
    targetSeconds: 70,
    basis:
      '[T1] requires "at least two facts or examples". Two evidenced points ' +
      'plus a one-line conclusion is 70-90s of natural unhurried speech. 90 ' +
      'also sits inside the 64-86s average implied by [T2] and [T3].',
  },
  comparative: {
    answerSeconds: 120,
    readSeconds: 15,
    targetSeconds: 95,
    basis:
      'The ceiling of the only published cap in the sector [T1]. Reserved for ' +
      'questions needing a contrast structure -- this university against the ' +
      'others, the UK against home -- which is the one place two minutes is ' +
      'defensible. Never exceed it.',
  },
  probe: {
    answerSeconds: 60,
    readSeconds: 5,
    targetSeconds: 35,
    basis:
      'Probes in the published banks are near-binary or single-fact: "Are the ' +
      'funds still in the account?", "How long have they been there?". A real ' +
      'interviewer fires these fast, and giving 90s trains the wrong reflex -- ' +
      'the student starts making a speech where a sentence was wanted.',
  },
  closing: {
    answerSeconds: 45,
    readSeconds: 5,
    targetSeconds: 25,
    basis: 'A mop-up prompt, not a new answer.',
  },
};

/** The cap, for the countdown. */
export function answerSecondsFor(kind: AnswerKind): number {
  return TIMING[kind].answerSeconds;
}

/** The read window before recording arms. [T1] is the only source for this. */
export function readSecondsFor(kind: AnswerKind): number {
  return TIMING[kind].readSeconds;
}

/**
 * Sanity bound for a whole sitting, used by qa/timing-check.js.
 *
 * [T2] says 15-20 minutes for a CAS Shield sitting and [T4] says 30-40 for a
 * live one. A 17-question mock of ours should land between those, not past
 * them: an hour-long mock is not a rehearsal of anything real.
 */
export const SITTING_BOUNDS_SECONDS = { min: 12 * 60, max: 40 * 60 };
