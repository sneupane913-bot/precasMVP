/**
 * qa/copy-check.js — DOES THE SALES COPY AGREE WITH THE LEDGER?
 *
 * Written on 14 Aug after the TESTED walk found `/consultancy` promising
 * **12 full mock interviews** per seat while `SEAT_GRANT` granted **10**, and
 * **30 practice sessions** while it granted **20**. The numbers were typed by
 * hand in 2026 and the 13 Aug price change never reached them.
 *
 * Every suite was green while that was true. They were green because they all
 * asked `lib/data/plans.ts` what a pack contains, and `plans.ts` was right. The
 * lie was in a paragraph of JSX that no test had any reason to open. Over a
 * 30-seat bundle that is 60 mocks sold and not delivered, on the page a
 * consultancy reads before spending NPR 9,000 — the worst place in the product
 * to be wrong, because it is the page that asks for the money.
 *
 * M-10 already said a seat is "derived from the 799 pack in code so it can
 * never drift". It was derived in the entitlement code. It was not derived in
 * the sentence that made the promise. A rule enforced on one side of a promise
 * is not enforced.
 *
 * So this suite reads the SOURCE OF EVERY PAGE AND COMPONENT and fails on any
 * product number typed as a literal — pack prices, mock counts, practice
 * counts, question counts. The fix is always the same: import it from
 * `plans.ts`. One number, one place, and the copy cannot drift from the ledger
 * again.
 *
 * Comments are stripped before anything is matched. FIVE times on this project
 * a test passed or failed on a code COMMENT rather than on code, including the
 * comments written to explain these very fixes.
 *
 * Run:  node qa/copy-check.js       (no server, no keys, no network)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['app', 'components'];

let pass = 0;
let fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(10)} ${what}${detail ? `\n             ${detail}` : ''}`);
}

// ------------------------------------------------------------------ the truth

// Read the real numbers out of plans.ts rather than restating them here. A test
// that hard-codes 449 is the same bug as a page that hard-codes 449.
const plansSrc = fs.readFileSync(path.join(ROOT, 'lib/data/plans.ts'), 'utf8');
const num = (re) => { const m = plansSrc.match(re); return m ? Number(m[1]) : null; };

const PRICES = [...plansSrc.matchAll(/priceNpr:\s*(\d+)/g)].map((m) => Number(m[1]));
const MOCKS = [...plansSrc.matchAll(/mockInterviews:\s*(\d+)/g)].map((m) => Number(m[1]));
const PRACTICE = [...plansSrc.matchAll(/practiceSessions:\s*(\d+)/g)].map((m) => Number(m[1]));
const TRIAL_Q = num(/TRIAL_QUESTION_COUNT\s*=\s*(\d+)/);
const FULL_Q = num(/FULL_MOCK_QUESTION_COUNT\s*=\s*(\d+)/);

// ------------------------------------------------------------------ files

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}
const FILES = DIRS.flatMap((d) => walk(path.join(ROOT, d)));

/**
 * Strip comments AND import lines before matching.
 *
 * Comments, because of the five-times lesson. Imports, because
 * `import { ... } from '@/lib/data/plans'` is the CORRECT thing to find in a
 * file and must never be mistaken for a hard-coded number.
 */
function code(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')      // /* block */ and JSX {/* block */}
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')  // // line, without eating https://
    .split('\n')
    .filter((l) => !/^\s*import\b/.test(l))
    .join('\n');
}

const rel = (f) => path.relative(ROOT, f);

// ------------------------------------------------------------------ the checks

console.log('\n=== DOES THE SALES COPY AGREE WITH THE LEDGER? ===\n');

t('SETUP', 'the real numbers were read out of plans.ts',
  PRICES.length > 0 && MOCKS.length > 0 && PRACTICE.length > 0 && TRIAL_Q && FULL_Q,
  `prices ${PRICES.join('/')} · mocks ${MOCKS.join('/')} · practice ${PRACTICE.join('/')} · trial ${TRIAL_Q} · full ${FULL_Q}`);

t('FILES', 'every page and component is being read',
  FILES.length >= 20, `${FILES.length} .tsx files under ${DIRS.join(', ')}`);

/** Report every literal hit, with the file and the sentence, so it is fixable. */
function scan(id, what, re, describe) {
  const hits = [];
  for (const f of FILES) {
    const src = code(f);
    for (const m of src.matchAll(re)) {
      const line = src.slice(0, m.index).split('\n').length;
      hits.push(`${rel(f)}:${line}  "${m[0].trim().replace(/\s+/g, ' ')}"`);
    }
  }
  t(id, what, hits.length === 0, hits.length ? `${describe}\n             ` + hits.join('\n             ') : 'none');
}

/**
 * ANY number, not only a number that is currently correct.
 *
 * The first version of this file matched only the digits presently in
 * `plans.ts`. Its own mutation test then quietly exposed the flaw: re-inserting
 * the real bug — "12 full mock interviews" — did NOT trip the mock-count check,
 * because 12 is not a pack size any more. **The stale number is the entire
 * danger.** A check that only recognises correct numbers cannot, by
 * construction, find a number that has gone out of date, which is the one
 * failure this suite exists for.
 *
 * So it now rejects every hand-typed digit in that position. Anything derived
 * renders as `{...}` in the source and never matches, so the correct code is
 * silently fine and the wrong code cannot hide.
 */
scan('M-8/M-9', 'no PRICE is typed by hand in any page',
  /NPR\s*\d[\d,]*/g,
  'import ENTRY_PLAN, publicPlans() or COMPETITOR_ENTRY instead:');

scan('M-10a', 'no MOCK COUNT is typed by hand in any page',
  /\b\d{1,3}\s+(full\s+)?mock/gi,
  'import SEAT_GRANT or the plan instead:');

scan('M-10b', 'no PRACTICE COUNT is typed by hand in any page',
  /\b\d{1,3}\s+practice/gi,
  'import SEAT_GRANT or the plan instead:');

scan('M-10c', 'no QUESTION COUNT is typed by hand in any page',
  /\b\d{1,3}\s+(real\s+)?questions?\b/gi,
  'import TRIAL_QUESTION_COUNT / FULL_MOCK_QUESTION_COUNT instead:');

// The specific promise that broke. Asserted by name so the report says WHY.
const consultancy = code(path.join(ROOT, 'app/consultancy/page.tsx'));
t('M-10', 'the consultancy seat promise is DERIVED, not written down',
  /SEAT_GRANT\.mocks/.test(consultancy) && /SEAT_GRANT\.practice/.test(consultancy),
  'the page that sells seats reads the same constant that grants them');

// M-12. The per-mock rate is withdrawn: at 449 for 3 mocks we are NPR 150
// against a competitor's 143-160, so printing it invites the one comparison we
// lose. The live site was still printing "about NPR 75 per mock interview".
scan('M-12', 'no per-mock rate is rendered anywhere',
  /per\s+mock(\s+interview)?/gi,
  'M-12 withdrew this comparison:');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
