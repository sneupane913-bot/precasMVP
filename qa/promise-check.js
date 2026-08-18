#!/usr/bin/env node
/**
 * DO NOT SELL MORE SITTINGS THAN THE BANK CAN FILL.
 *
 * The Serious pack promised ten mock interviews. A sitting is 17 questions and
 * the bank held 22 root questions, so a student who paid NPR 799 saw
 * substantially the whole bank in sitting one and then met it again nine more
 * times. Every suite in the gate was green while that was true, because
 * nothing anywhere related the size of a pack to the size of the bank.
 *
 * THE RULE, stated plainly:
 *
 *   A publicly sold pack may promise at most THREE sittings for every full
 *   bank's worth of root questions it has to draw on.
 *
 *     allowed mocks = 3 x floor(root questions / questions per sitting)
 *
 * Three is the number because a student should not meet a familiar question
 * before their third sitting. Below that the mock stops testing preparation and
 * starts testing memory, which is the exact failure the real credibility
 * interview is designed to catch -- so an under-stocked bank does not merely
 * disappoint the student, it coaches them towards the thing that fails them.
 *
 * PROBES ARE NOT COUNTED. A probe is only ever asked after a root question of
 * its own category, so it cannot carry a sitting on its own and it cannot
 * substitute for missing root questions.
 *
 * This check is deliberately about PUBLIC packs only. A pack withdrawn from
 * sale may keep any size it likes: existing holders keep what they bought, and
 * consultancy seats are derived from the Serious pack on purpose so that a seat
 * and a retail pack cannot drift apart. Withdrawing something from sale must
 * not retroactively shrink what somebody already paid for.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const plansSrc = fs.readFileSync(path.join(ROOT, 'lib/data/plans.ts'), 'utf8');
const qSrc = fs.readFileSync(path.join(ROOT, 'lib/data/questions.ts'), 'utf8');

let pass = 0;
const fails = [];
const check = (name, ok, detail) => (ok ? pass++ : fails.push(`${name}: ${detail}`));

// ---------------------------------------------------------------------------
// How many ROOT questions the bank actually holds.
// ---------------------------------------------------------------------------
const draft = qSrc.slice(qSrc.indexOf('const RAW: Draft[]'), qSrc.indexOf('export const QUESTIONS'));
const total = (draft.match(/answerKind:\s*'/g) ?? []).length;
const probes = (draft.match(/isProbe:\s*true/g) ?? []).length;
const roots = total - probes;

check('P-1 the bank could be read', total > 0, 'no questions found in lib/data/questions.ts');
check('P-2 the bank has root questions', roots > 0, `${total} questions but ${probes} are probes, leaving none to open a sitting`);

// ---------------------------------------------------------------------------
// Every plan, and whether it is on sale.
// ---------------------------------------------------------------------------
const plans = [];
const re =
  /code: '(\w+)',[\s\S]*?isPublic: (true|false),[\s\S]*?priceNpr: (\d+),\s*\n\s*mockInterviews: (\d+),[\s\S]*?maxQuestionsPerMock: (\d+)/g;
let m;
while ((m = re.exec(plansSrc))) {
  plans.push({
    code: m[1],
    isPublic: m[2] === 'true',
    priceNpr: Number(m[3]),
    mocks: Number(m[4]),
    perMock: Number(m[5]),
  });
}
check('P-3 the plans could be read', plans.length > 0, 'no plans parsed from lib/data/plans.ts');

// ---------------------------------------------------------------------------
// The rule.
// ---------------------------------------------------------------------------
console.log(`\n  bank: ${roots} root questions (+${probes} probes, which cannot open a sitting)\n`);
console.log('  pack       on sale  price  promises  bank supports');
console.log('  ---------------------------------------------------');

for (const p of plans) {
  const supports = Math.max(1, 3 * Math.floor(roots / p.perMock));
  const flag = !p.isPublic ? 'withdrawn' : p.mocks <= supports ? 'ok' : 'OVER-PROMISED';
  console.log(
    `  ${p.code.padEnd(10)} ${(p.isPublic ? 'yes' : 'no').padEnd(8)} ${String(p.priceNpr).padEnd(6)} ` +
      `${String(p.mocks).padEnd(9)} ${String(supports).padEnd(6)} ${flag}`
  );

  if (!p.isPublic) continue;

  check(
    `P-4 ${p.code} does not promise more than the bank holds`,
    p.mocks <= supports,
    `sold publicly at NPR ${p.priceNpr} for ${p.mocks} sittings of ${p.perMock} questions, but the ` +
      `bank holds ${roots} root questions, which honestly supports ${supports}. A student would meet ` +
      `the same questions again from sitting ${Math.max(2, Math.floor(roots / p.perMock) + 1)}. ` +
      `Either load more questions or withdraw the pack from sale (isPublic: false).`
  );
}

// ---------------------------------------------------------------------------
// Tell whoever is reading when a withdrawn pack could come back. A rule nobody
// can see the other side of just becomes a permanent ban by accident.
// ---------------------------------------------------------------------------
const withdrawn = plans.filter((p) => !p.isPublic && p.priceNpr > 0);
if (withdrawn.length > 0) {
  console.log('\n  withdrawn packs, and what would let them return:');
  for (const p of withdrawn) {
    const need = Math.ceil((p.mocks / 3) * p.perMock);
    console.log(
      `    ${p.code}: needs ${need} root questions (${need - roots > 0 ? `${need - roots} more` : 'satisfied now — you can set isPublic: true'})`
    );
  }
}

// A pack still has to be coherent even when withdrawn.
for (const p of plans) {
  check(
    `P-5 ${p.code} has a sane shape`,
    p.mocks > 0 && p.perMock > 0,
    `mocks=${p.mocks} perMock=${p.perMock}; a pack that promises nothing cannot be sold or honoured`
  );
}

console.log(`\npromise-check: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
