import { ALL_INSTITUTIONS } from '@/lib/data/institutions';

/**
 * IS THIS A UNIVERSITY, OR A FIST ON THE KEYBOARD?
 *
 * 4 September 2026. A student typed "shdjkas" as their university and it sat
 * in the super admin's directory as if it were one. The field is optional and
 * was free text with no check at all, so anything went through. It matters
 * because the client reads that column to see which universities his students
 * are applying to, and one junk row makes him distrust the whole column.
 *
 * Two layers, in this order:
 *
 *   1. A name we already know (the institutions catalogue) is always accepted,
 *      whatever the heuristic thinks of it. The welcome screen offers these as
 *      a picker, so most students never reach the free-text path.
 *   2. Free text passes only if it looks like a word a person wrote: at least
 *      three letters, at least one vowel, no run of five consonants, not one
 *      character repeated, and only the characters a name can contain.
 *
 * Deliberately a floor, not a gate: "Glyndwr" (Wrexham) and "Strathclyde" are
 * real and must pass, so the consonant-run limit is five with y counted as a
 * vowel, and "asdf" will still get through. The picker is what does the real
 * work; this only stops the obvious.
 */

const VOWEL = /[aeiouy]/i;
const CONSONANT_RUN = /[bcdfghjklmnpqrstvwxz]{5,}/i;
const ALLOWED = /^[a-z0-9 .,'&()\-]+$/i;

const KNOWN = new Set(
  ALL_INSTITUTIONS.flatMap((i) => [i.name.toLowerCase(), i.shortName.toLowerCase()])
);

export const UNIVERSITY_HINT =
  'That does not look like a university name. Pick one from the list, or type the full name as it appears on your offer letter.';

export function isKnownUniversity(text: string): boolean {
  return KNOWN.has(text.trim().toLowerCase());
}

export function looksLikeUniversity(raw: string): boolean {
  const text = raw.trim();
  if (!text) return true; // optional field; empty is "not said", which is honest
  if (isKnownUniversity(text)) return true;
  const letters = text.replace(/[^a-z]/gi, '');
  if (letters.length < 3) return false;
  if (!ALLOWED.test(text)) return false;
  if (!VOWEL.test(letters)) return false;
  if (CONSONANT_RUN.test(letters)) return false;
  if (/^(.)\1+$/i.test(letters)) return false;
  return true;
}

/** Names for the picker: the public catalogue, alphabetical, no duplicates. */
export function universityChoices(): string[] {
  return [...new Set(ALL_INSTITUTIONS.filter((i) => !i.pilotOnly).map((i) => i.name))].sort((a, b) =>
    a.localeCompare(b)
  );
}
