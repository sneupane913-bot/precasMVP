/**
 * Credit checks and cost guardrails.
 *
 * Payments are deferred, but these are NOT payment features. They are cost
 * controls, and they are real from day one. Every call that costs money passes
 * through here first. See docs/UNIT_ECONOMICS.md section 8.
 */

export const LIMITS = {
  /** Server-enforced. A student leaving the recorder running is a direct cost. */
  maxAnswerSeconds: Number(process.env.MAX_ANSWER_SECONDS ?? 90),
  /** Below this we assume silence and refuse to pay to transcribe it. */
  minAudioBytes: 6 * 1024,
  /** Above this something is wrong. Reject rather than pay. */
  maxAudioBytes: 6 * 1024 * 1024,
  /** Free trial question cap, from docs/UNIT_ECONOMICS.md section 7. */
  trialQuestionCount: 10,
  /** Retries allowed per question, so a retry loop cannot drain the balance. */
  maxAttemptsPerQuestion: 3,
} as const;

export type CreditDenial =
  | { allowed: true }
  | { allowed: false; code: string; userMessage: string };

/**
 * Placeholder for the ledger check. Returns allowed while payments are
 * deferred, but every caller already routes through it, so switching to a real
 * ledger is a change inside this function and nowhere else.
 */
export async function checkCredits(_userId: string | null): Promise<CreditDenial> {
  return { allowed: true };
}

export function checkAudio(bytes: number, durationSeconds: number): CreditDenial {
  if (bytes < LIMITS.minAudioBytes) {
    return {
      allowed: false,
      code: 'AUDIO_SILENT',
      userMessage: 'We could not hear anything. Check your microphone and record again.',
    };
  }
  if (bytes > LIMITS.maxAudioBytes) {
    return {
      allowed: false,
      code: 'AUDIO_TOO_LARGE',
      userMessage: 'That recording was too long. Please answer in under 90 seconds.',
    };
  }
  if (durationSeconds > LIMITS.maxAnswerSeconds + 5) {
    return {
      allowed: false,
      code: 'AUDIO_TOO_LONG',
      userMessage: 'That recording was too long. Please answer in under 90 seconds.',
    };
  }
  return { allowed: true };
}
