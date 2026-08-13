/**
 * What to actually DO about a weak sub-score (S-37, S-42).
 *
 * "Keep practising" is not advice, it is a shrug. A student who has just been
 * told they scored 54% needs one concrete thing to change before their next
 * attempt, in words they can act on tonight.
 *
 * Kept in one place so the report and the dashboard cannot give a student
 * different advice about the same weakness.
 */

export const SUBSCORE_LABEL: Record<string, string> = {
  englishClarity: 'English clarity',
  specificity: 'Real detail in your answers',
  genuineIntent: 'Sounding like a genuine student',
  interviewBehaviour: 'Interview behaviour',
};

export const SUBSCORE_ADVICE: Record<string, string> = {
  englishClarity:
    'Slow down and finish your sentences. Aim for thirty seconds an answer, and say the whole thought rather than trailing off.',
  specificity:
    'Name real things. Your exact modules, the tuition fee, the city, the job title you want afterwards. Numbers and names are what make an answer believable.',
  genuineIntent:
    'Say why THIS university and THIS course in your own words. A memorised paragraph sounds memorised, and that is the one thing a credibility interview is designed to catch.',
  interviewBehaviour:
    'Stay on camera, look ahead, and answer the question that was actually asked before adding anything else.',
};

export interface Weakness {
  key: string;
  label: string;
  value: number;
  advice: string;
}

/**
 * The lowest sub-score that was actually ASSESSED.
 *
 * Nulls are skipped deliberately. A null means we could not judge that skill —
 * usually because we could not hear the answer — and telling a student to work
 * on something we never measured would be inventing a weakness. That is the
 * same sin as scoring silence (G-1), one step removed.
 */
export function weakestOf(subScores: Record<string, number | null> | null | undefined): Weakness | null {
  if (!subScores) return null;
  let out: Weakness | null = null;
  for (const [key, value] of Object.entries(subScores)) {
    if (typeof value !== 'number') continue;
    if (!out || value < out.value) {
      out = {
        key,
        label: SUBSCORE_LABEL[key] ?? key,
        value,
        advice: SUBSCORE_ADVICE[key] ?? 'Practise this again and compare your next report.',
      };
    }
  }
  return out;
}
