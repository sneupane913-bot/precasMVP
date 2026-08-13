/**
 * qa/contract-check.mjs — the AI contract, PROVEN BY EXECUTION.
 *
 * Every other suite in here talks to a running server. This one does not, and
 * it is the only suite that runs the AI guarantees as CODE rather than reading
 * them. That distinction matters more than it sounds:
 *
 *   Four separate times on this project a test "passed" because it matched a
 *   COMMENT that described the rule, while the code beneath the comment did
 *   something else. `model-check.js` proves AI-1..AI-8 by grepping
 *   lib/ai/contract.ts, which is exactly that shape of test. It is kept —
 *   grepping is the right tool for "the system prompt lives in code" — but it
 *   cannot prove that looksGeneric() actually REJECTS anything.
 *
 * So this suite imports the real functions and feeds them real feedback:
 * feedback that quotes a student, feedback that invents a quote, and every
 * generic phrase we claim to catch. Nothing is read as text.
 *
 * Rules proven here: N-30, N-31, N-32, and a behavioural second pass over
 * AI-1, AI-2, AI-3, AI-4 and AI-6.
 *
 * Run:  node --experimental-strip-types --no-warnings qa/contract-check.mjs
 * (No server, no keys, no network. It is safe to run at any time.)
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const {
  looksGeneric,
  isWellFormed,
  buildEvaluationPrompt,
  EVALUATOR_SYSTEM_PROMPT,
  FEEDBACK_UNAVAILABLE,
  VOCABULARY_HINT,
} = await import(join(root, 'lib/ai/contract.ts'));

let pass = 0;
let fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${what}${detail ? `\n           ${detail}` : ''}`);
}

// ---------------------------------------------------------------- fixtures

/** A real-shaped answer from a real-shaped student. */
const TRANSCRIPT =
  'My course is MSc International Business at Coventry University and the ' +
  'tuition is fourteen thousand pounds which my father pays from his farm income.';

/** Feedback that is unmistakably about the transcript above. The control. */
const GOOD = {
  point: 'You named the course but never said what Coventry teaches differently.',
  evidence: 'my course is MSc International Business at Coventry',
  explanation:
    'An officer who hears only a course title cannot tell whether you researched the place or picked it from a list.',
  wrapUp: 'Name two modules from the Coventry course page and say what each one gets you afterwards.',
  nepali: 'कोर्सको नाम भन्नुभयो तर किन Coventry भन्ने भन्नुभएन। दुईवटा मोड्युलको नाम लिनुहोस्।',
  scores: { englishClarity: 72, specificity: 40, genuineIntent: null },
  contradiction: null,
};

const clone = (over = {}) => ({ ...GOOD, ...over });

console.log('\n=== AI CONTRACT (executed, not read) ===\n');

// ---------------------------------------------------------------- N-30

console.log('N-30  Feedback is about THIS student. Two students never get the same paragraph.\n');

t('N-30a', 'feedback quoting the student is accepted',
  looksGeneric(GOOD, TRANSCRIPT) === null,
  `looksGeneric -> ${JSON.stringify(looksGeneric(GOOD, TRANSCRIPT))}`);

const invented = clone({ evidence: 'you mentioned wanting excellent career opportunities abroad' });
t('N-30b', 'invented quote is REJECTED',
  looksGeneric(invented, TRANSCRIPT) === 'evidence does not quote the student',
  `-> ${JSON.stringify(looksGeneric(invented, TRANSCRIPT))}`);

t('N-30c', 'empty evidence is REJECTED (no quote is not a pass)',
  typeof looksGeneric(clone({ evidence: '' }), TRANSCRIPT) === 'string',
  `-> ${JSON.stringify(looksGeneric(clone({ evidence: '' }), TRANSCRIPT))}`);

t('N-30d', 'evidence of only tiny words is REJECTED, never divided by zero',
  typeof looksGeneric(clone({ evidence: 'it is a big one' }), TRANSCRIPT) === 'string',
  `-> ${JSON.stringify(looksGeneric(clone({ evidence: 'it is a big one' }), TRANSCRIPT))}`);

// The literal N-30 promise: the SAME paragraph cannot serve two students.
const OTHER_TRANSCRIPT =
  'I want to study nursing in Leeds because my aunt is a nurse there and she said the hospital placements are good.';
const servesBoth =
  looksGeneric(GOOD, TRANSCRIPT) === null && looksGeneric(GOOD, OTHER_TRANSCRIPT) === null;
t('N-30e', 'one paragraph cannot pass for two different students',
  servesBoth === false,
  `same feedback vs a nursing-in-Leeds answer -> ${JSON.stringify(looksGeneric(GOOD, OTHER_TRANSCRIPT))}`);

// Half-quoted evidence: the model lifts a couple of words and pads the rest.
// This is the realistic failure, not the obvious one, so it is tested directly.
const halfQuoted = clone({
  evidence: 'Coventry business degree offering outstanding international employability prospects',
});
t('N-30f', 'evidence padded with words they never said is REJECTED',
  typeof looksGeneric(halfQuoted, TRANSCRIPT) === 'string',
  `-> ${JSON.stringify(looksGeneric(halfQuoted, TRANSCRIPT))}`);

// ---------------------------------------------------------------- N-31

console.log('\nN-31  Generic feedback is a DEFECT. Every response is checked, not spot-checked.\n');

// Read the phrase list out of the source and prove EVERY entry is caught.
// Hard-coding the list here would let the two drift apart silently.
const src = readFileSync(join(root, 'lib/ai/contract.ts'), 'utf8');
const listBlock = src.slice(src.indexOf('const GENERIC_PHRASES'), src.indexOf('export function looksGeneric'));
const phrases = [...listBlock.matchAll(/'([^']+)'/g)].map((m) => m[1]);

t('N-31a', 'the generic-phrase list is non-trivial',
  phrases.length >= 8, `${phrases.length} phrases declared`);

const missed = phrases.filter((p) => {
  const fb = clone({ wrapUp: `${GOOD.wrapUp} Also, ${p}, and you will be fine next time.` });
  return looksGeneric(fb, TRANSCRIPT) === null;
});
t('N-31b', 'EVERY declared generic phrase is actually caught',
  missed.length === 0, missed.length ? `slipped through: ${missed.join(', ')}` : `all ${phrases.length} rejected`);

// The phrases must be caught wherever they appear, not only in wrapUp.
const inPoint = phrases.filter((p) => looksGeneric(clone({ point: `You should ${p}.` }), TRANSCRIPT) === null);
t('N-31c', 'caught in the Point field too, not only the wrap-up',
  inPoint.length === 0, inPoint.length ? `missed in point: ${inPoint.join(', ')}` : 'point field checked');

t('N-31d', 'an unactionably short wrap-up is REJECTED',
  typeof looksGeneric(clone({ wrapUp: 'Do better.' }), TRANSCRIPT) === 'string',
  `-> ${JSON.stringify(looksGeneric(clone({ wrapUp: 'Do better.' }), TRANSCRIPT))}`);

t('N-31e', 'rejection gives a REASON, so a failure can be diagnosed not guessed',
  typeof looksGeneric(invented, TRANSCRIPT) === 'string' && looksGeneric(invented, TRANSCRIPT).length > 10,
  'reasons are strings, not booleans');

// N-31/AI-8: what happens next. Honest absence, never a fabricated replacement.
t('N-31f', 'the fallback blames us, not the student, and promises nothing false',
  /on us rather than on you/i.test(FEEDBACK_UNAVAILABLE) &&
  /saved/i.test(FEEDBACK_UNAVAILABLE) &&
  !/try again|retry|refresh/i.test(FEEDBACK_UNAVAILABLE),
  JSON.stringify(FEEDBACK_UNAVAILABLE));

// ---------------------------------------------------------------- N-32

console.log('\nN-32  Nepali carries what went wrong and what to do. It is not a translation.\n');

t('N-32a', 'missing Nepali guidance is REJECTED',
  typeof looksGeneric(clone({ nepali: '   ' }), TRANSCRIPT) === 'string',
  `-> ${JSON.stringify(looksGeneric(clone({ nepali: '   ' }), TRANSCRIPT))}`);

// One Nepali field, and only one. A nepaliQuestion / nepaliEvidence / nepaliScores
// field appearing later would BE the translation we said we would not build.
const strayNepali = [...src.matchAll(/^\s{2}(nepali\w+)\??:/gm)].map((m) => m[1]);
t('N-32b', 'exactly one Nepali field exists in the contract',
  strayNepali.length === 0 && (src.match(/^\s{2}nepali:\s*string;/gm) || []).length === 2,
  strayNepali.length ? `stray translated fields: ${strayNepali.join(', ')}` : 'nepali: string on AnswerFeedback and SummaryFeedback only');

t('N-32c', 'the prompt forbids translating the report or their own words back',
  /Do not translate the whole thing/i.test(EVALUATOR_SYSTEM_PROMPT) &&
  /Do not translate their own words back/i.test(EVALUATOR_SYSTEM_PROMPT),
  'both instructions present');

// ---------------------------------------------------------------- AI-1 / AI-2

console.log('\nAI-1 / AI-2  The evaluator gets seven facts and nothing that identifies anybody.\n');

// Feed it a polluted object — the way a careless caller three months from now
// will feed it — and prove the leak does not reach the wire.
const polluted = {
  question: 'How will you pay your tuition fee at Coventry University?',
  category: 'finance',
  intent: 'whether the money is real and the student knows the number',
  transcript: TRANSCRIPT,
  durationSeconds: 41,
  institution: 'Coventry University',
  previousTranscripts: ['My father has a farm in Chitwan.'],
  level: 'masters',
  // none of this may survive
  name: 'Sita Sharma',
  email: 'sita.sharma@example.com',
  phone: '9812345678',
  studentId: 'stu_9f21c',
  consultancy: 'Everest Education Kathmandu',
  paymentHistory: [{ orderId: 'ord_1', amountNpr: 449 }],
  fingerprint: 'fp_ab21',
  ipAddress: '27.34.11.9',
};
const wire = buildEvaluationPrompt(polluted);
const leaked = ['Sita Sharma', 'sita.sharma@example.com', '9812345678', 'stu_9f21c',
  'Everest Education', 'ord_1', 'fp_ab21', '27.34.11.9'].filter((v) => wire.includes(v));
t('AI-2', 'a polluted input still sends NOTHING identifying',
  leaked.length === 0, leaked.length ? `LEAKED: ${leaked.join(', ')}` : '8 identifying fields dropped');

t('AI-1', 'the prompt carries the question, intent, duration, university, level and prior answers',
  wire.includes('Coventry University') && wire.includes('finance'.length ? polluted.intent : '') &&
  wire.includes('41') && wire.includes('masters') && wire.includes('Chitwan') &&
  wire.includes(polluted.question),
  'all six permitted facts present');

t('AI-4', 'earlier answers are sent BECAUSE contradiction is the point',
  /contradictions/i.test(wire) && wire.includes('My father has a farm in Chitwan.'),
  'prior transcripts labelled and asked about');

t('AI-4b', 'a first answer says so plainly instead of sending an empty block',
  buildEvaluationPrompt({ ...polluted, previousTranscripts: [] }).includes('(this is their first answer)'),
  'no ambiguous empty section');

// ---------------------------------------------------------------- AI-3 / AI-6

console.log('\nAI-3 / AI-6  Nulls stay null. Accent is never marked.\n');

t('AI-3a', 'a null sub-score is well-formed — null is never coerced to 0',
  isWellFormed(clone({ scores: { englishClarity: null, specificity: null, genuineIntent: null } })) === true,
  'all-null scores accepted as valid output');

t('AI-3b', 'feedback missing a required field is NOT well-formed',
  isWellFormed({ ...GOOD, wrapUp: undefined }) === false && isWellFormed({ ...GOOD, nepali: 42 }) === false,
  'missing wrapUp and non-string nepali both rejected');

t('AI-3c', 'junk is not well-formed and does not throw',
  isWellFormed(null) === false && isWellFormed('ok') === false && isWellFormed([]) === false,
  'null, string and array all rejected');

t('AI-6', 'the prompt forbids penalising accent, and says what MAY be penalised',
  /DO NOT PENALISE ACCENT/.test(EVALUATOR_SYSTEM_PROMPT) &&
  /vagueness, contradiction/i.test(EVALUATOR_SYSTEM_PROMPT),
  'accent excluded, real risks named');

t('AI-6b', 'the prompt forbids 0 where the truth is null',
  /Never 0\./.test(EVALUATOR_SYSTEM_PROMPT) && /null is the truth/i.test(EVALUATOR_SYSTEM_PROMPT),
  'zero-is-a-judgement instruction present');

// ---------------------------------------------------------------- AI-7

t('AI-7', 'the vocabulary hint covers Nepali names a transcriber would mangle',
  VOCABULARY_HINT.includes('Kathmandu') && VOCABULARY_HINT.includes('lakh') &&
  VOCABULARY_HINT.includes('UKVI') && VOCABULARY_HINT.length >= 15,
  `${VOCABULARY_HINT.length} terms`);

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
