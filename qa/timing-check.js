#!/usr/bin/env node
/**
 * HOW LONG THE STUDENT GETS, CHECKED AGAINST THE PUBLISHED EVIDENCE.
 *
 * The bank used to carry hand-set 45s and 60s limits. Nobody had sourced them,
 * and both sit BELOW the floor of the only per-question specification any UK
 * university publishes:
 *
 *   Oxford Brookes: "15 seconds to read each question and one to two minutes
 *   to record their answer, depending on the question" -- on a page that also
 *   requires "at least two facts or examples" in the answer.
 *
 * You cannot give two facts and a conclusion in 45 seconds. So the product was
 * quietly coaching students to under-answer the real interview, and no suite in
 * the gate would ever have noticed, because a wrong number is still a number.
 *
 * That is what this file is for. It asserts:
 *
 *   1. No question's time contradicts the kind of answer it asks for. Timing is
 *      derived in questions.ts, so this catches somebody re-introducing a
 *      hardcoded value or editing the timing table without thinking.
 *   2. Every answer time sits inside the published 45-120s band, and every
 *      explanatory question clears the 60s floor.
 *   3. A whole sitting lands between the published live and recorded interview
 *      lengths, rather than becoming an hour-long ordeal nobody sits.
 *   4. Probes -- the second-level questions an interviewer fires after an
 *      answer -- can never be asked cold, in a mock or in practice.
 *
 * Rule 4 is behavioural, so it is asserted against the planner source rather
 * than a value. That is weaker than running the planner and weaker than this
 * project would like; it is here because a probe asked as question one would
 * be visible to every student on day one, and no check at all is worse.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const timingSrc = fs.readFileSync(path.join(ROOT, 'lib/data/timing.ts'), 'utf8');
const qSrc = fs.readFileSync(path.join(ROOT, 'lib/data/questions.ts'), 'utf8');

let pass = 0;
const fails = [];
const check = (name, ok, detail) => (ok ? pass++ : fails.push(`${name}: ${detail}`));

// ---------------------------------------------------------------------------
// Read the timing table out of timing.ts.
// ---------------------------------------------------------------------------
const TIMING = {};
for (const m of timingSrc.matchAll(
  /^\s{2}(\w+):\s*\{\s*\n\s*answerSeconds:\s*(\d+),\s*\n\s*readSeconds:\s*(\d+),\s*\n\s*targetSeconds:\s*(\d+),/gm
)) {
  TIMING[m[1]] = {
    answer: Number(m[2]),
    read: Number(m[3]),
    target: Number(m[4]),
  };
}

const KINDS = ['intro', 'factual', 'explanatory', 'comparative', 'probe', 'closing'];
check(
  'T-1 every answer kind has a timing',
  KINDS.every((k) => TIMING[k]),
  `missing: ${KINDS.filter((k) => !TIMING[k]).join(', ') || 'none'} (parsed: ${Object.keys(TIMING).join(', ')})`
);

// ---------------------------------------------------------------------------
// The published band. Oxford Brookes is the source for both ends.
// ---------------------------------------------------------------------------
for (const [kind, t] of Object.entries(TIMING)) {
  check(
    `T-2 ${kind} is inside the published band`,
    t.answer >= 45 && t.answer <= 120,
    `${t.answer}s is outside 45-120s. Oxford Brookes publishes one to two minutes; ` +
      `45s is the floor we allow for a purely factual answer and 120s is the sector ceiling.`
  );
  check(
    `T-3 ${kind} target is under its cap`,
    t.target < t.answer,
    `target ${t.target}s is not below the ${t.answer}s cap, so the student is told to aim at or past the cut-off`
  );
}

check(
  'T-4 explanatory clears the two-facts floor',
  (TIMING.explanatory?.answer ?? 0) >= 60,
  `explanatory is ${TIMING.explanatory?.answer}s. Oxford Brookes requires "at least two facts or ` +
    `examples" per answer, and two evidenced points plus a conclusion does not fit under 60s.`
);

check(
  'T-5 comparative does not exceed the sector ceiling',
  (TIMING.comparative?.answer ?? 999) <= 120,
  `comparative is ${TIMING.comparative?.answer}s, past the 120s ceiling in the only published spec`
);

check(
  'T-6 the read window matches Oxford Brookes',
  TIMING.explanatory?.read === 15,
  `explanatory read time is ${TIMING.explanatory?.read}s. Brookes publishes 15 seconds, and it is ` +
    `the only institution in the sector that publishes one at all.`
);

// ---------------------------------------------------------------------------
// No question may carry its own time. Timing is derived from the kind.
// ---------------------------------------------------------------------------
const draftBlock = qSrc.slice(qSrc.indexOf('const RAW: Draft[]'), qSrc.indexOf('export const QUESTIONS'));
check(
  'T-7 no question hardcodes a time',
  !/timeLimitSeconds:\s*\d+/.test(draftBlock),
  'a question in the bank sets timeLimitSeconds directly. It must come from answerKind, ' +
    'or the number and the kind of answer can drift apart silently -- which is exactly how ' +
    'the 45s limits got there.'
);

const kindsUsed = [...draftBlock.matchAll(/answerKind:\s*'(\w+)'/g)].map((m) => m[1]);
check('T-8 the bank has questions', kindsUsed.length > 0, 'no answerKind found in the bank');
check(
  'T-9 every question uses a known kind',
  kindsUsed.every((k) => KINDS.includes(k)),
  `unknown: ${[...new Set(kindsUsed.filter((k) => !KINDS.includes(k)))].join(', ')}`
);

// ---------------------------------------------------------------------------
// A whole sitting must be a length somebody would actually sit.
//
// Brunel publishes 15-20 minutes for a recorded CAS Shield interview; Lincoln
// publishes 30-40 for a live one. A 17-question mock should land between them.
// ---------------------------------------------------------------------------
const MOCK_LEN = Number(
  /FULL_MOCK_QUESTION_COUNT\s*=\s*(\d+)/.exec(fs.readFileSync(path.join(ROOT, 'lib/data/plans.ts'), 'utf8'))?.[1] ?? 0
);
check('T-10 mock length is known', MOCK_LEN > 0, 'could not read FULL_MOCK_QUESTION_COUNT from plans.ts');

if (MOCK_LEN > 0 && kindsUsed.length > 0) {
  // Worst case: the longest questions available, plus their read windows.
  const per = kindsUsed.map((k) => (TIMING[k]?.answer ?? 0) + (TIMING[k]?.read ?? 0));
  per.sort((a, b) => b - a);
  const worst = per.slice(0, MOCK_LEN).reduce((a, b) => a + b, 0);
  const best = per
    .slice(-MOCK_LEN)
    .reduce((a, b) => a + b, 0);
  check(
    'T-11 a full sitting is a realistic length',
    worst <= 40 * 60 && best >= 12 * 60,
    `a ${MOCK_LEN}-question sitting runs ${Math.round(best / 60)}-${Math.round(worst / 60)} minutes. ` +
      `Published real interviews are 15-20 (recorded, Brunel) to 30-40 (live, Lincoln). ` +
      `Outside 12-40 minutes it is not a rehearsal of anything real.`
  );
}

// ---------------------------------------------------------------------------
// Probes are the second turn. They must never be the first.
// ---------------------------------------------------------------------------
const probeCount = (qSrc.match(/isProbe:\s*true/g) ?? []).length;
check('T-12 the bank has probes', probeCount > 0, 'no probe questions. The second turn is where credibility interviews are decided.');

check(
  'T-13 every probe records what triggers it',
  (qSrc.match(/probeTrigger:/g) ?? []).length === probeCount,
  `${probeCount} probes but ${(qSrc.match(/probeTrigger:/g) ?? []).length} triggers. A probe with no ` +
    `trigger cannot be explained to the student afterwards, and cannot be placed sensibly.`
);

check(
  'T-14 every probe is timed as a probe',
  !/isProbe:\s*true/.test(draftBlock) ||
    [...draftBlock.matchAll(/answerKind:\s*'(\w+)',\s*\n\s*isProbe:\s*true/g)].every((m) => m[1] === 'probe'),
  'a probe carries an answerKind other than "probe", so it is given speech-making time for a ' +
    'question a real interviewer fires in one line'
);

// Scoped to rootPool's own body on purpose. An earlier version of this check
// searched the whole file, and buildPracticePlan happens to contain the same
// filter -- so deleting the filter from rootPool left the check green. The
// mutation run caught it. A substring test that can be satisfied by unrelated
// code somewhere else in the file is not a test of anything.
const rootPoolBody = /function rootPool\(\): Question\[\] \{([\s\S]*?)\n\}/.exec(qSrc)?.[1] ?? '';
check(
  'T-15 mocks pick roots, never probes, as questions',
  rootPoolBody !== '' && /!q\.isProbe/.test(rootPoolBody),
  rootPoolBody === ''
    ? 'rootPool() is gone; buildQuestionPlan is picking from the raw pool again'
    : 'rootPool() no longer excludes probes, so a student can be asked "Where did the money in ' +
      'that account come from?" as question one, about nothing'
);

check(
  'T-16 practice picks roots, never probes',
  /const roots = all\.filter\(\(q\) => !q\.isProbe\);/.test(qSrc),
  'buildPracticePlan can serve a probe on its own. A probe drilled with no preceding answer ' +
    'teaches the student to answer a question nobody asked them.'
);

check(
  'T-17 a probe follows its own topic',
  /probesFor\(root\.category\)/.test(qSrc),
  'the planner places a probe without matching the category of the question before it, so a ' +
    'finance probe can follow an accommodation answer'
);

check(
  'T-18 nothing follows the closing question',
  /root\.answerKind === 'closing'/.test(qSrc),
  'the planner can attach a probe after "is there anything else you would like to add", which ' +
    'is the question that ends the interview'
);

// ---------------------------------------------------------------------------
console.log(`\ntiming-check: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
