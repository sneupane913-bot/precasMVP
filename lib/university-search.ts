import type { Institution } from '@/lib/types';

/**
 * FINDING A UNIVERSITY YOU CANNOT SPELL.
 *
 * 11 September 2026. A student complained that Arden University was not in
 * the product. It was not, and that is fixed elsewhere; but he had typed
 * "ardin", and the search was an exact substring match, so he would have
 * been told "nothing found" even once it was. A student who cannot find their
 * own university assumes the product is not for them and leaves.
 *
 * So the match is now tolerant, in three small ways and no more:
 *
 *   1. Punctuation, accents and case are ignored ("St George’s" = "st georges").
 *   2. Filler words are ignored when anything else is typed: "arden uni",
 *      "uni of hull" and "the university of york" all work.
 *   3. Each remaining word of the query must match SOME word of the
 *      university's name, short name or city, where "match" means: it is a
 *      prefix of the word ("manch"), or it is within one typo of the word for
 *      words of 4 to 7 letters and within two typos for longer ones
 *      ("ardin", "wolverhamton", "brimingham"). Three-letter words must be
 *      exact ("uel", "bpp"), because one typo in three letters matches
 *      everything.
 *
 * Every word must match, so "arden manchester" finds only the Manchester
 * campus row and "arden" finds both. This is deliberately not a ranking or a
 * fuzzy score: a student either sees their university or they do not.
 */

const FILLER = new Set(['of', 'the', 'and', 'uni', 'univ', 'university', 'universities', 'in', 'at']);

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function words(s: string): string[] {
  return normalise(s).split(' ').filter(Boolean);
}

/** Typos allowed for a query word of this length. */
function tolerance(len: number): number {
  if (len <= 3) return 0;
  if (len <= 7) return 1;
  return 2;
}

/**
 * Optimal string alignment distance (insert, delete, substitute, swap two
 * adjacent letters), capped: returns max + 1 as soon as it cannot be met.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    rows[i] = [i];
    for (let j = 1; j <= b.length; j++) rows[i]![j] = i === 0 ? j : 0;
  }
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, rows[i - 2]![j - 2]! + 1);
      }
      rows[i]![j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return rows[a.length]![b.length]!;
}

function wordMatches(token: string, word: string): boolean {
  if (word.startsWith(token)) return true;
  const tol = tolerance(token.length);
  if (tol === 0) return false;
  if (editDistance(token, word, tol) <= tol) return true;
  // A typo inside the first few letters of a longer word ("manchseter" for
  // "manchester" is caught above; "brimingh" for "birmingham" is caught here).
  return word.length > token.length && editDistance(token, word.slice(0, token.length), tol) <= tol;
}

/** The words a query is matched against for one institution. */
export function haystack(inst: Pick<Institution, 'name' | 'shortName' | 'city'>): string[] {
  return [...new Set([...words(inst.name), ...words(inst.shortName), ...words(inst.city)])];
}

export function matchesUniversity(
  inst: Pick<Institution, 'name' | 'shortName' | 'city'>,
  query: string
): boolean {
  const all = words(query);
  if (all.length === 0) return true;
  const meaningful = all.filter((t) => !FILLER.has(t));
  const tokens = meaningful.length > 0 ? meaningful : all;
  const hay = haystack(inst);
  return tokens.every((t) => hay.some((w) => wordMatches(t, w)));
}
