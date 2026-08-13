// Shared types. Kept vertical-agnostic from day one so a second vertical
// (German A1 speaking, IELTS, and so on) is a data change, not a rewrite.

export type VerticalSlug = 'uk-precas';

export type QuestionCategory =
  | 'identity'
  | 'education'
  | 'study_gap'
  | 'why_uk'
  | 'why_university'
  | 'why_course'
  | 'progression'
  | 'finance'
  | 'accommodation'
  | 'immigration'
  | 'future_plans'
  | 'conversational';

export const CATEGORY_LABEL: Record<QuestionCategory, string> = {
  identity: 'About you',
  education: 'Your studies so far',
  study_gap: 'Study gap and work',
  why_uk: 'Why the UK',
  why_university: 'Why this university',
  why_course: 'Why this course',
  progression: 'Academic progression',
  finance: 'Money and fees',
  accommodation: 'Living in the UK',
  immigration: 'Visa history',
  future_plans: 'Your plans after',
  conversational: 'Everyday English',
};

export interface Institution {
  id: string;
  vertical: VerticalSlug;
  slug: string;
  name: string;
  shortName: string;
  country: string;
  city: string;
  interviewType: 'Pre-CAS' | 'CAS' | 'Pre-Admission';
  /** Total questions in a full sitting. */
  questionCount: number;
  durationMinutes: number;
  blurb: string;
  /** Two-letter initials used in place of a logo file. */
  monogram: string;
  accent: string;
  /** Path to the official SVG. Recorded even when not yet displayed. */
  logoUrl: string | null;
  /**
   * False until the business confirms permitted nominative use. While false
   * the monogram renders instead. See public/university-logos/README.md.
   */
  logoApproved: boolean;
  /** Some official marks are white and need a dark background. */
  logoNeedsDarkBackground: boolean;
  /** Hidden from public listings, usable in the pilot. */
  pilotOnly: boolean;
  /**
   * Pinned to the top of the catalogue under "Most applied". These are the six
   * the client's students actually apply to and the only ones with a sourced,
   * university-specific blurb. Everything else is listed so a student can find
   * their own university, and carries the generic themes wording.
   */
  featured?: boolean;
}

export interface Question {
  id: string;
  vertical: VerticalSlug;
  /** null means the question is used for every institution. */
  institutionId: string | null;
  category: QuestionCategory;
  text: string;
  timeLimitSeconds: number;
  /** Shown in the tips carousel during the answer. */
  tips: string[];
  /** A structure to adapt. Never presented as a script to memorise. */
  modelAnswer: string;
  /** Private. Fed to the evaluator. Never sent to the browser. */
  rubricNotes: string;
}

/** A question with the private rubric stripped, safe to send to the client. */
export type PublicQuestion = Omit<Question, 'rubricNotes'>;

export type TranscriptStatus = 'ok' | 'too_short' | 'silent' | 'failed';

export type Band = 'ready' | 'almost_ready' | 'needs_practice' | 'risky';

export const BAND_LABEL: Record<Band, string> = {
  ready: 'Ready',
  almost_ready: 'Almost ready',
  needs_practice: 'Needs practice',
  risky: 'Risky answer',
};

/** PEE plus wrap-up: the house method taught on every screen in the product. */
export interface PeeBreakdown {
  point: boolean;
  evidence: boolean;
  explanation: boolean;
  wrapUp: boolean;
}

export const PEE_STEPS: { key: keyof PeeBreakdown; letter: string; label: string }[] = [
  { key: 'point', letter: 'P', label: 'Point' },
  { key: 'evidence', letter: 'E', label: 'Evidence' },
  { key: 'explanation', letter: 'E', label: 'Explanation' },
  { key: 'wrapUp', letter: 'W', label: 'Wrap-up' },
];

export interface Evaluation {
  score: number;
  band: Band;
  soundsMemorised: boolean;
  /** The student's own words, quoted back. Mandatory when a score exists. */
  quotedBack: string;
  whatWentWell: string;
  fixes: string[];
  modelAnswer: string;
  nepaliHint: string;
  flags: string[];
  pee: PeeBreakdown;
}

export interface Answer {
  questionId: string;
  orderIndex: number;
  attemptNumber: number;
  durationSeconds: number;
  transcript: string;
  transcriptStatus: TranscriptStatus;
  /** null whenever transcriptStatus !== 'ok'. Never fabricate a score. */
  evaluation: Evaluation | null;
  createdAt: string;
}

export type FlagType =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'background_noise'
  | 'low_light'
  | 'face_not_visible'
  | 'multiple_faces'
  | 'no_audio'
  | 'answer_too_short';

export type FlagSeverity = 'critical' | 'moderate' | 'minor';

export const FLAG_META: Record<
  FlagType,
  { label: string; severity: FlagSeverity; studentMessage: string }
> = {
  tab_switch: {
    label: 'Left the interview screen',
    severity: 'critical',
    studentMessage: 'You moved away from this page. In the real interview this looks like cheating.',
  },
  window_blur: {
    label: 'Clicked away from the window',
    severity: 'critical',
    studentMessage: 'You clicked outside the interview window. Stay on this screen.',
  },
  fullscreen_exit: {
    label: 'Left full screen',
    severity: 'moderate',
    studentMessage: 'You left full screen mode.',
  },
  background_noise: {
    // Minor on purpose. A student practising at home will have some noise and
    // that is normal. We mention it so they know, we do not punish them for it.
    label: 'Noisy room',
    severity: 'minor',
    studentMessage:
      'It is quite loud around you. A little noise is fine, but if you can, move somewhere quieter for the real interview.',
  },
  low_light: {
    label: 'Room is too dark',
    severity: 'minor',
    studentMessage: 'Your face is a bit dark. Sit facing a window or a light if you can.',
  },
  face_not_visible: {
    label: 'Face not visible',
    severity: 'critical',
    studentMessage: 'We cannot see your face. Sit in front of the camera.',
  },
  multiple_faces: {
    label: 'Another person in view',
    severity: 'critical',
    studentMessage: 'Someone else is in the picture. You must be alone.',
  },
  no_audio: {
    label: 'No sound detected',
    severity: 'critical',
    studentMessage: 'We cannot hear anything. Check your microphone.',
  },
  answer_too_short: {
    label: 'Answer too short',
    severity: 'minor',
    studentMessage: 'That answer was very short. Try to speak for at least 30 seconds.',
  },
};

export interface SessionFlag {
  type: FlagType;
  questionId: string | null;
  occurredAt: string;
}

export type SessionStatus =
  | 'created'
  | 'device_check'
  | 'in_progress'
  | 'completed'
  | 'abandoned';

export interface InterviewSession {
  id: string;
  vertical: VerticalSlug;
  institutionId: string;
  mode: 'test' | 'practice';
  status: SessionStatus;
  /** Fixed at creation so a resume is deterministic. */
  questionIds: string[];
  /**
   * DEPRECATED as a resume pointer. Kept so old stored sessions still parse.
   *
   * 14 Aug: this was a stored cursor, and a stored cursor drifts. The client
   * pressed record on Q2, went Back, came in again and was put on Q3 — Q2 was
   * gone and he had answered nothing. The header read "Q 8/10 · 1 done, 9
   * left", which is the drift printed on screen: a client-side index that had
   * walked forward eight times against one real answer.
   *
   * The resume point is now DERIVED (see resumeIndexOf) from what actually
   * exists: answers given and skips taken. Derived state cannot drift.
   */
  currentIndex: number;
  answers: Answer[];
  /**
   * Questions the student deliberately passed on.
   *
   * Recorded on the SERVER. Skip used to advance a number in the browser and
   * tell nobody, so a skipped question came back on the next resume and a
   * student could never get past it — or, worse, the browser index ran ahead
   * of the server and questions were silently lost.
   */
  skippedQuestionIds: string[];
  flags: SessionFlag[];
  /** Trial sessions are capped below the institution's full question count. */
  isTrial: boolean;
  /**
   * Anonymous owner id from the HTTP-only cookie. Required to read this
   * session. Null only on sessions created before QA finding LIVE-002 was
   * fixed, and those are deliberately unreadable.
   */
  ownerId: string | null;
  /**
   * The signed-in student who owns this session. Null only on sessions created
   * before sign-in was required. Needed for their own history (D19) and for
   * delete-my-data to find everything (J3).
   */
  studentId: string | null;
  /**
   * QA-208: the consent screen was shown but nothing was recorded, so we could
   * not later prove what a student agreed to or when. Recorded per session
   * until accounts exist, then it moves onto the student record.
   */
  consentVersion: string | null;
  consentAt: string | null;
  createdAt: string;
  completedAt: string | null;
  summary: SessionSummary | null;
}

export interface SessionSummary {
  overallScore: number;
  band: Band;
  headline: string;
  /**
   * null means NOT ASSESSED, not zero. Any dimension that depends on hearing
   * the student is null when nothing was transcribed. QA finding LIVE-009.
   */
  subScores: {
    englishClarity: number | null;
    specificity: number | null;
    genuineIntent: number | null;
    /** Observed rather than heard, so this is always available. */
    interviewBehaviour: number;
  };
  answeredCount: number;
  totalCount: number;
  violationCount: number;
  strengths: string[];
  weakestCategories: QuestionCategory[];
  nextSteps: string[];
}

/**
 * Where a refused student is meant to go next.
 *
 * WALK 1, step 1.11. A student who has used their free ten taps "Start
 * interview" and gets a sentence printed in red with nothing on it to click.
 * He has been told no and handed nothing, which reads as a broken product
 * rather than a locked one, and the client's rule is the opposite: every
 * blocked click becomes an offer to pay.
 *
 * So a refusal now carries its own way out. The server decides where that is,
 * because the server is the only thing that knows WHY it said no.
 */
export interface ApiAction {
  label: string;
  href: string;
}

/** Every API route returns this shape. Never throw a raw error to the client. */
export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: string; message: string; userMessage: string; action?: ApiAction };
    };

export function apiError(
  code: string,
  message: string,
  userMessage: string,
  action?: ApiAction
): ApiResult<never> {
  return { ok: false, error: { code, message, userMessage, ...(action ? { action } : {}) } };
}
