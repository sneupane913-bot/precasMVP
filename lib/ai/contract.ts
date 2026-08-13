/**
 * THE AI CONTRACT.
 *
 * Everything the AI is given, and everything it must give back. Written and
 * fixed BEFORE any key is bought, so that connecting a provider tomorrow is a
 * plumbing job and not a design job.
 *
 * The rule this file exists to serve is N-30: **feedback is about THIS
 * student's answer.** Two students must never receive the same paragraph.
 * Identical advice gets memorised and repeated between friends, and a
 * memorised answer is the single thing a UKVI credibility interview is built
 * to catch. Generic feedback would coach our students into failing, which is
 * worse than no product.
 *
 * Nothing here calls a provider. It defines the shapes, the prompt, and the
 * validation, so the day the key arrives we swap one function and the rest of
 * the system is already correct.
 */

import type { Question } from '@/lib/types';

// ---------------------------------------------------------------- INPUT

/**
 * What we send for ONE answer.
 *
 * Deliberately narrow. Everything here is needed to judge the answer; anything
 * not needed is not sent. The student's name, email, phone, consultancy and
 * payment history are all absent by design (N-33 privacy, G-8): a grader does
 * not need to know who somebody is to say whether they named their course.
 */
export interface EvaluationInput {
  /** The question as the student actually heard it, university substituted in. */
  question: string;
  /** Which theme, so feedback can be specific to what this question tests. */
  category: string;
  /** What the interviewer is really checking. Drives the Point in PEE. */
  intent: string;
  /** The transcript. NEVER empty — G-1 refuses to grade silence upstream. */
  transcript: string;
  /** How long they spoke. A 6-second answer is a different failure to a poor one. */
  durationSeconds: number;
  /** The university, because "why this university" cannot be judged without it. */
  institution: string;
  /**
   * What they said EARLIER in the same sitting.
   *
   * This is what makes the feedback personal rather than generic, and it is
   * also the only way to catch contradiction — a student who says their father
   * is a farmer in question 3 and a businessman in question 11 has a problem
   * no single-answer grader can see.
   */
  previousTranscripts: string[];
  /** Course level changes what a good answer looks like. */
  level: 'bachelor' | 'masters' | 'unknown';
}

/** What we send to score a whole sitting once every answer is in. */
export interface SummaryInput {
  institution: string;
  level: 'bachelor' | 'masters' | 'unknown';
  answers: {
    question: string;
    category: string;
    transcript: string;
    durationSeconds: number;
    /** Null when we could not hear it. Counted as unanswered, never as bad. */
    perAnswer: AnswerFeedback | null;
  }[];
  /** Behaviour signals gathered by the room, not by the AI. */
  flags: { type: string; count: number }[];
}

// ---------------------------------------------------------------- OUTPUT

/**
 * Per-answer feedback. PEE plus a wrap-up, which is the house method.
 *
 * Every string field must quote or paraphrase THIS answer. A response that
 * would make sense attached to any student's answer is a failure, and
 * `looksGeneric()` below rejects it.
 */
export interface AnswerFeedback {
  /** Point — the single judgement, in one sentence. */
  point: string;
  /**
   * Evidence — **their own words, quoted**. This is the field that makes the
   * feedback undeniably theirs, and the field a generic model will try hardest
   * to skip. If it is not a substring-ish match of the transcript, we reject.
   */
  evidence: string;
  /** Explanation — why that matters to an interviewer, tied to this question. */
  explanation: string;
  /** Wrap-up — one concrete thing to change next time. */
  wrapUp: string;
  /**
   * N-32. Nepali carries ONLY what a frightened student must not
   * misunderstand: what went wrong and what to do. Not a translation of the
   * report. The scores, the question and their own words stay in English,
   * because the interview is in English and reading their own answer back in
   * Nepali helps nobody.
   */
  nepali: string;
  /** 0-100, or null when this dimension genuinely could not be judged. */
  scores: {
    englishClarity: number | null;
    specificity: number | null;
    genuineIntent: number | null;
  };
  /** Set when this answer contradicts an earlier one. Quote both. */
  contradiction: string | null;
}

export interface SummaryFeedback {
  overallScore: number;
  band: 'ready' | 'almost_ready' | 'needs_practice' | 'risky';
  /** One sentence about THIS student, naming something they actually said. */
  headline: string;
  strengths: string[];
  risks: string[];
  nepali: string;
  subScores: {
    englishClarity: number | null;
    specificity: number | null;
    genuineIntent: number | null;
    interviewBehaviour: number | null;
  };
}

// ---------------------------------------------------------------- PROMPT

/**
 * The system prompt. Kept here, in code, rather than in a provider console, so
 * it is reviewed, versioned and diffable like everything else.
 */
export const EVALUATOR_SYSTEM_PROMPT = `
You are marking one answer from a mock UK Pre-CAS / UKVI credibility interview.
The student is Nepali and speaking English as a second language.

WHAT YOU ARE JUDGING
An immigration officer is deciding one thing: is this a genuine student who
knows what they have signed up for and can pay for it. You are judging that,
not English literature.

HARD RULES
1. QUOTE THEIR WORDS. The "evidence" field must contain an actual phrase from
   the transcript. Never paraphrase into something they did not say.
2. NEVER WRITE ADVICE THAT WOULD FIT ANY STUDENT. "Give more detail" is
   useless. "You said your course is 'business' but not which modules or why
   Coventry teaches it differently" is useful. If your sentence would make
   sense attached to a different student's answer, rewrite it.
3. DO NOT PENALISE ACCENT, grammar slips, or Nepali sentence order where the
   meaning is clear. An officer is not marking grammar. Penalise only what
   would genuinely worry an officer: vagueness, contradiction, numbers that do
   not add up, or an answer that sounds recited.
4. IF YOU CANNOT JUDGE A DIMENSION, return null for it. Never 0. Zero is a
   judgement; null is the truth that we could not tell.
5. CONTRADICTION: if this answer conflicts with an earlier one, say so and
   quote both. This is the most valuable thing you can find.
6. NEPALI FIELD: two or three sentences, only what went wrong and what to do.
   Do not translate the whole thing. Do not translate their own words back.

TONE
Direct and warm. This student is frightened and has paid money they may not
have much of. Never sarcastic, never congratulatory about nothing.
`.trim();

export function buildEvaluationPrompt(input: EvaluationInput): string {
  const prior = input.previousTranscripts.length
    ? input.previousTranscripts.map((t, i) => `[earlier answer ${i + 1}] ${t}`).join('\n')
    : '(this is their first answer)';

  return [
    `UNIVERSITY: ${input.institution}`,
    `LEVEL: ${input.level}`,
    `QUESTION: ${input.question}`,
    `WHAT THE INTERVIEWER IS CHECKING: ${input.intent}`,
    `THEY SPOKE FOR: ${input.durationSeconds} seconds`,
    '',
    'WHAT THEY SAID:',
    input.transcript,
    '',
    'WHAT THEY SAID EARLIER IN THIS SAME INTERVIEW (check for contradictions):',
    prior,
  ].join('\n');
}

// ---------------------------------------------------------------- VALIDATION

/**
 * The guard that enforces N-30/N-31 at runtime.
 *
 * A model under load will drift towards safe, generic sentences — they are the
 * highest-probability output. That drift is silent and would slowly turn the
 * product into the thing we promised it would not be, so it is checked on every
 * single response rather than spot-checked.
 *
 * Returns a reason when the feedback is unusable, or null when it is fine.
 */
const GENERIC_PHRASES = [
  'give more detail',
  'be more specific',
  'try to speak more',
  'practice more',
  'practise more',
  'good answer',
  'well done',
  'you should improve',
  'keep practicing',
  'keep practising',
  'work on your english',
];

export function looksGeneric(fb: AnswerFeedback, transcript: string): string | null {
  // The evidence must actually come from what they said. This is the single
  // strongest signal that the feedback is about this student.
  const words = fb.evidence
    .toLowerCase()
    .replace(/["'.,!?]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const hay = transcript.toLowerCase();
  const overlap = words.filter((w) => hay.includes(w)).length;
  if (words.length === 0 || overlap / words.length < 0.5) {
    return 'evidence does not quote the student';
  }

  const blob = `${fb.point} ${fb.explanation} ${fb.wrapUp}`.toLowerCase();
  const hit = GENERIC_PHRASES.find((p) => blob.includes(p));
  if (hit) return `generic phrase: "${hit}"`;

  if (fb.wrapUp.trim().length < 25) return 'wrap-up too short to be actionable';
  if (fb.nepali.trim().length === 0) return 'missing Nepali guidance';

  return null;
}

/**
 * What to do when the model returns something generic.
 *
 * NOT "use it anyway", and NOT a fabricated replacement. We keep the transcript
 * and the scores, drop the prose, and tell the student plainly that the written
 * feedback failed. A missing paragraph is honest; a generic one is a lie that
 * costs them the interview.
 */
export const FEEDBACK_UNAVAILABLE =
  'We could not write useful feedback on this answer. Your recording and your score are saved, and this one is on us rather than on you.';

/** Shape check before anything reaches a student. */
export function isWellFormed(x: unknown): x is AnswerFeedback {
  if (!x || typeof x !== 'object') return false;
  const f = x as Record<string, unknown>;
  return (
    typeof f.point === 'string' &&
    typeof f.evidence === 'string' &&
    typeof f.explanation === 'string' &&
    typeof f.wrapUp === 'string' &&
    typeof f.nepali === 'string' &&
    typeof f.scores === 'object' &&
    f.scores !== null
  );
}

// ---------------------------------------------------------------- WIRING

/**
 * Everything the transcription step needs. Groq Whisper Large v3.
 *
 * Cost is about NPR 10 per 17-question mock at published rates, which is the
 * number the whole business model rests on, so it is written down here beside
 * the code that spends it.
 */
export interface TranscriptionInput {
  audio: ArrayBuffer;
  mimeType: string;
  /**
   * Nepali-accented English. Passing the language hint materially improves
   * accuracy and, more importantly, stops the model "correcting" a Nepali
   * speaker into words they did not say — which would then be quoted back at
   * them as evidence.
   */
  languageHint: 'en';
  /** Names and places the model otherwise mangles. Improves the quote quality. */
  vocabularyHint: string[];
}

/** Terms worth biasing the transcriber towards. */
export const VOCABULARY_HINT = [
  'Pre-CAS', 'CAS', 'UKVI', 'Tribhuvan University', 'Kathmandu', 'Pokhara',
  'NEB', 'IELTS', 'PTE', 'lakh', 'rupees', 'consultancy', 'BPP', 'Coventry',
  'University of East London', 'dissertation', 'placement year', 'tuition fee',
  'bank balance', 'education loan', 'sponsor',
];

/**
 * The one thing a future session must not get wrong.
 *
 * When the key arrives, `lib/ai/evaluate.ts` and `lib/ai/stt.ts` swap their mock
 * for a real call and MUST keep every guarantee that is already proven:
 *   G-1  a failed transcription produces NO score, ever
 *   N-30 generic feedback is rejected by looksGeneric() and replaced with
 *        FEEDBACK_UNAVAILABLE, never shipped
 *   Q-10 every paid call goes through the spend breaker and is counted
 *   G-8  nothing identifying the student is sent to any provider
 */
export const AI_INTEGRATION_NOTES = 'see lib/ai/contract.ts header';
