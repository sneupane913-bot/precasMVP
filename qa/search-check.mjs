/**
 * THE UNIVERSITY SEARCH: a student who cannot spell their university must
 * still find it (11 September 2026, the "ardin" complaint).
 *
 * Static: imports the product's TypeScript directly, no server needed.
 *
 *   node --experimental-strip-types --no-warnings --import ./qa/_alias-register.mjs qa/search-check.mjs
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { matchesUniversity } = await import(join(root, 'lib/university-search.ts'));
const { publicInstitutions } = await import(join(root, 'lib/data/institutions.ts'));

const ALL = publicInstitutions();
const find = (q) => ALL.filter((i) => matchesUniversity(i, q)).map((i) => i.name);

let pass = 0;
let fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${what}${detail ? `\n           ${detail}` : ''}`);
}
const same = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

const ARDEN = ['Arden University, London', 'Arden University, Manchester'];
t('S-01', '"ardin" (the student\'s spelling) finds both Arden campus rows', same(find('ardin'), ARDEN), find('ardin').join(' | '));
t('S-02', '"Arden" finds both campus rows and nothing else', same(find('Arden'), ARDEN), find('Arden').join(' | '));
t('S-03', '"arden uni" ignores the filler word', same(find('arden uni'), ARDEN), find('arden uni').join(' | '));
t('S-04', '"arden manchester" narrows to the Manchester campus', same(find('arden manchester'), ['Arden University, Manchester']), find('arden manchester').join(' | '));
t('S-05', '"Arden University, London" as typed on the offer letter finds the London campus', find('Arden University, London').includes('Arden University, London'));
t('S-06', '"wolverhamton" (one letter missing) finds Wolverhampton', find('wolverhamton').some((n) => /Wolverhampton/.test(n)), find('wolverhamton').join(' | '));
t('S-07', '"brimingham" (two letters swapped) finds the Birmingham universities', find('brimingham').some((n) => /Birmingham/.test(n)), find('brimingham').join(' | '));
t('S-08', '"manch" as a prefix finds the Manchester universities', find('manch').some((n) => /Manchester/.test(n)) && find('manch').every((n) => /Manchester|Arden/.test(n)), find('manch').join(' | '));
t('S-09', '"st georges" without the apostrophe finds City St George\'s', find('st georges').some((n) => /St George/.test(n)), find('st georges').join(' | '));
t('S-10', '"uni of hull" finds the University of Hull', find('uni of hull').includes('University of Hull'), find('uni of hull').join(' | '));
t('S-11', 'Three-letter codes stay exact: "uel" finds UEL, "uwl" finds UWL, neither finds the other', find('uel').includes('University of East London') && !find('uel').includes('University of West London') && find('uwl').includes('University of West London'), `${find('uel').join(' | ')} / ${find('uwl').join(' | ')}`);
t('S-12', 'Empty query shows everything', find('').length === ALL.length);
t('S-13', 'Nonsense finds nothing', find('xqzjv').length === 0, find('xqzjv').join(' | '));
t('S-14', 'The catalogue has exactly two Arden rows, one per campus, sharing the short name Arden', ALL.filter((i) => i.shortName === 'Arden').length === 2 && ALL.filter((i) => i.shortName === 'Arden').map((i) => i.city).sort().join(',') === 'London,Manchester');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
