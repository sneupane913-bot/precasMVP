/**
 * THE PAPER: rules Q-11 to Q-14 (7 September 2026).
 *
 * The first customer feedback on the live product was that a student's paper
 * did not feel like their university, and the client's requirements from it
 * were: no repeated question across however many sittings a student buys,
 * every question linked to the student's university by evidence, and a
 * likelihood shown for each. This suite drives the real plan builder against
 * the real bank for every institution in the catalogue.
 *
 * Static: it imports the product's TypeScript directly, no server needed.
 *
 *   node --experimental-strip-types --no-warnings --import ./qa/_alias-register.mjs qa/paper-check.mjs
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const q = await import(join(root, 'lib/data/questions.ts'));
const inst = await import(join(root, 'lib/data/institutions.ts'));
const facts = await import(join(root, 'lib/data/institution-facts.ts'));
const evidence = await import(join(root, 'lib/data/university-evidence.ts'));
const ai = await import(join(root, 'lib/ai/evaluate.ts'));

let pass = 0;
let fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${what}${detail ? `\n           ${detail}` : ''}`);
}

const pool = q.eligiblePool();
const roots = pool.filter((x) => !x.isProbe);
const probes = pool.filter((x) => x.isProbe);
const ALL = inst.ALL_INSTITUTIONS;
const FULL = 17;
const SITTINGS = 10;

console.log('\n=== THE BANK ===\n');

t('Q-3b', 'The bank carries ten full sittings without a repeat: at least 120 roots and 50 probes',
  roots.length >= 120 && probes.length >= 50,
  `${roots.length} roots, ${probes.length} probes (${pool.length} questions)`);

const openers = roots.filter((x) => x.category === 'identity').length;
t('Q-11a', 'Ten sittings can each open with a different identity question', openers >= 10, `${openers} openers`);

// Positional ids are stored on sessions and in institution-facts.ts, so the
// first bank must never move. These three have been the same since 13 August.
t('Q-11b', 'The bank is append-only: the original ids still point at the original questions',
  q.getQuestion('q-01')?.text === 'Please introduce yourself briefly.' &&
    /Why did you choose \{\{university\}\}\?/.test(q.getQuestion('q-09')?.text ?? '') &&
    /How is this course assessed/.test(q.getQuestion('q-12')?.text ?? ''),
  'q-01, q-09 and q-12 unchanged');

const fams = new Map();
for (const x of pool) {
  const f = q.questionFamily(x.id);
  fams.set(f, (fams.get(f) ?? 0) + 1);
}
const multi = [...fams.values()].filter((n) => n > 1).length;
t('Q-11c', 'Paraphrase families are detected and small (the bank is not full of near-copies)',
  multi <= 8, `${multi} families with more than one member`);

console.log('\n=== NO REPEATS, EVERY UNIVERSITY ===\n');

// Q-11: ten full sittings per institution, accumulating what was seen, must
// contain no repeated id and no paraphrase of a seen id. Every institution,
// because the evidence filter (Q-14) changes the pool per university.
let worstRepeat = null;
let worstFamily = null;
let shortPaper = null;
let noOpener = null;
for (const i of ALL) {
  const seen = new Set();
  for (let s = 0; s < SITTINGS; s++) {
    const plan = q.buildQuestionPlan(FULL, { seen, institutionId: i.id });
    if (plan.length !== FULL) shortPaper = shortPaper ?? `${i.name} sitting ${s + 1}: ${plan.length} questions`;
    const first = q.getQuestion(plan[0]);
    if (!first || first.category !== 'identity') noOpener = noOpener ?? `${i.name} sitting ${s + 1} opened with ${first?.category}`;
    const seenFams = new Set([...seen].map((id) => q.questionFamily(id)));
    for (const id of plan) {
      if (seen.has(id)) worstRepeat = worstRepeat ?? `${i.name} sitting ${s + 1} repeated ${id}`;
      else if (seenFams.has(q.questionFamily(id))) worstFamily = worstFamily ?? `${i.name} sitting ${s + 1} paraphrased a seen question with ${id}`;
      seen.add(id);
    }
    if (new Set(plan).size !== plan.length) worstRepeat = worstRepeat ?? `${i.name} sitting ${s + 1} repeats inside one paper`;
  }
}
t('Q-11', `Ten full sittings at every one of ${ALL.length} universities: no question is ever asked twice`,
  worstRepeat === null, worstRepeat ?? `${ALL.length * SITTINGS} papers, zero repeats`);
t('Q-11d', 'And no paraphrase of an already-asked question while an unseen one exists',
  worstFamily === null, worstFamily ?? 'zero family repeats');
t('Q-3', 'Every paper is the full length the student paid for', shortPaper === null, shortPaper ?? `every paper ${FULL} long`);
t('N-26b', 'Every sitting opens with an identity question', noOpener === null, noOpener ?? 'all opened on identity');

// The trial (10) and then the paid extension to 17 must not overlap either.
{
  const seen = new Set();
  const trial = q.buildQuestionPlan(10, { seen, institutionId: 'inst-coventry' });
  const extension = q.buildQuestionPlan(17, { seen: new Set(trial), institutionId: 'inst-coventry' }).filter((id) => !trial.includes(id));
  t('S-53b', 'The seven questions unlocked by paying are not among the free ten',
    extension.length >= 7 && extension.every((id) => !trial.includes(id)), `${extension.length} fresh questions available`);
}

console.log('\n=== LINKED TO THE UNIVERSITY ===\n');

// Q-12: where a university publishes its own guidance, its paper prefers the
// questions it publishes. Measured over many papers so randomness averages.
{
  const cov = 'inst-university-of-aberdeen';
  let withPref = 0;
  let without = 0;
  const N = 40;
  for (let n = 0; n < N; n++) {
    withPref += q.buildQuestionPlan(FULL, { institutionId: cov }).filter((id) => q.publishedBy(id).includes(cov)).length;
    without += q.buildQuestionPlan(FULL, {}).filter((id) => q.publishedBy(id).includes(cov)).length;
  }
  t('Q-12', 'A paper for a university that publishes its own guidance carries more of its published questions than a generic paper',
    withPref > without * 1.5, `Aberdeen: ${(withPref / N).toFixed(1)} published questions per paper with preference, ${(without / N).toFixed(1)} without`);
}

// Q-13: placeholders resolve to the real UKVI figure for the campus band.
{
  const london = inst.getInstitution('inst-uel');
  const outside = inst.getInstitution('inst-coventry');
  const qid = pool.find((x) => x.text.includes('{{ukviMonthly}}') || x.modelAnswer.includes('{{ukviMonthly}}'));
  const a = q.publicQuestion(qid, london);
  const b = q.publicQuestion(qid, outside);
  const blob = (x) => `${x.text} ${x.modelAnswer} ${x.tips.join(' ')}`;
  t('Q-13', 'The living-cost figure resolves to the London band in London and the outside band elsewhere',
    blob(a).includes('£1,529') && blob(b).includes('£1,171') && !blob(a).includes('£1,171') && !blob(b).includes('£1,529'),
    `UEL: ${blob(a).includes('£1,529') ? '£1,529' : 'wrong'}, Coventry: ${blob(b).includes('£1,171') ? '£1,171' : 'wrong'}`);
  t('Q-13b', 'No placeholder survives into anything a student or the marker reads',
    ALL.every((i) => pool.every((x) => {
      const r = q.resolvedQuestion(x, i);
      return !/\{\{/.test(`${r.text} ${r.modelAnswer} ${r.tips.join(' ')} ${r.rubricNotes}`);
    })), 'every question, every institution, resolved clean');
  const src = readFileSync(join(root, 'lib/data/institution-facts.ts'), 'utf8');
  t('Q-13c', 'The UKVI figure lives in one place, with its GOV.UK source and the date it was checked',
    /london: 1529/.test(src) && /outsideLondon: 1171/.test(src) && /gov\.uk\/student-visa\/money/.test(src) && /checkedOn: '2026-/.test(src),
    'institution-facts.ts carries the figure, the source and the date');
  const bank = readFileSync(join(root, 'lib/data/questions.ts'), 'utf8') + readFileSync(join(root, 'lib/data/questions-batch3.ts'), 'utf8');
  const typed = bank.match(/£1,?[0-9]{3}/g)?.filter((m) => !/^\s*\/\//.test(m)) ?? [];
  // The only permitted literal is the comment in questions.ts that records
  // what was verified; question text and rubrics use the placeholders.
  const inText = bank.split('\n').filter((l) => /£1,?(529|171|483|136)/.test(l) && !/^\s*\/\//.test(l) && !/^\s*\*/.test(l));
  t('Q-13d', 'No question or rubric types the UKVI figure in by hand', inText.length === 0, inText.length ? inText[0].trim().slice(0, 80) : `${typed.length} literal figures, all in comments`);
}

// The evaluator is told the campus facts.
{
  const block = facts.institutionFactBlock(inst.getInstitution('inst-coventry'));
  t('Q-13e', 'The marker receives the campus city, the UKVI band and the figure',
    /Coventry/.test(block) && /outside London/.test(block) && /£1,171/.test(block), block.split('\n')[1]?.slice(0, 90));
  const evalSrc = readFileSync(join(root, 'lib/ai/evaluate.ts'), 'utf8');
  const answerSrc = readFileSync(join(root, 'app/api/session/[id]/answer/route.ts'), 'utf8');
  t('Q-13f', 'And the answer route actually passes it',
    /institutionFacts/.test(evalSrc) && /institutionFactBlock\(institution\)/.test(answerSrc), 'evaluateAnswer({ institutionFacts }) from the answer route');
}

console.log('\n=== LIKELIHOOD, WITH ITS EVIDENCE ===\n');

// Q-14: every question served for a university carries a likelihood with a
// reason and a URL, and every paper draws only from evidenced questions.
{
  let missing = null;
  let badUrl = null;
  let tooEarly = null;
  for (const i of ALL) {
    const evidenced = new Set(q.eligiblePoolFor(i.id).map((x) => x.id));
    const plan = q.buildQuestionPlan(FULL, { institutionId: i.id });
    for (const id of plan) {
      const pq = q.publicQuestion(q.getQuestion(id), i);
      if (!pq.likelihood) { missing = missing ?? `${i.name}: ${id} has no likelihood`; continue; }
      if (!/^https?:\/\//.test(pq.likelihood.sourceUrl) || !pq.likelihood.reason) badUrl = badUrl ?? `${i.name}: ${id} likelihood without a URL or reason`;
      // A first sitting must not reach for general evidence while the
      // university's own evidenced pool is deep enough to fill it.
      const cat = q.getQuestion(id).category;
      const evidencedInCat = [...evidenced].filter((x) => q.getQuestion(x).category === cat && Boolean(q.getQuestion(x).isProbe) === Boolean(q.getQuestion(id).isProbe)).length;
      if (pq.likelihood.level === 'general' && evidencedInCat >= 3) tooEarly = tooEarly ?? `${i.name}: ${id} (${cat}) is general although ${evidencedInCat} evidenced ${cat} questions exist`;
    }
  }
  t('Q-14', 'Every question in every university\'s paper carries a likelihood level, a reason and a source URL',
    missing === null && badUrl === null, missing ?? badUrl ?? `${ALL.length} papers checked`);
  t('Q-14b', 'A first sitting never uses general UK evidence while questions with evidence naming the university remain in that theme',
    tooEarly === null, tooEarly ?? 'evidenced questions are always drawn first');

  const ab = inst.getInstitution('inst-university-of-aberdeen');
  const lk = evidence.likelihoodFor(q.getQuestion('q-09'), ab);
  t('Q-14c', 'A question on a university\'s own page is "very likely" there, citing that page',
    lk?.level === 'very_likely' && /abdn\.ac\.uk/.test(lk.sourceUrl), `${lk?.level}: ${lk?.reason} (${lk?.sourceUrl})`);

  const bangor = inst.getInstitution('inst-bangor-university');
  const gen = evidence.likelihoodFor(q.getQuestion('q-09'), bangor);
  const hasOwn = evidence.hasOwnEvidence(bangor.id);
  t('Q-14d', 'A university with no evidence of its own says so in the reason, and cites the general UK source',
    hasOwn || (gen?.level === 'general' && /no interview guidance we could find/.test(gen.reason) && /^https?:\/\//.test(gen.sourceUrl)),
    hasOwn ? 'Bangor now has its own evidence; assertion not applicable' : `${gen?.reason}`);

  const covered = ALL.filter((i) => evidence.hasOwnEvidence(i.id)).length;
  t('Q-14e', 'The research covers a majority of the catalogue with evidence naming the university',
    covered >= Math.ceil(ALL.length / 2), `${covered} of ${ALL.length} universities have at least one source that names them`);

  const summary = evidence.evidenceSummary(inst.getInstitution('inst-coventry'));
  t('Q-14f', 'The university card states its evidence base in one line',
    /Coventry/.test(summary.line) && summary.official >= 1, summary.line);
}

console.log('\n=== SURFACES ===\n');
{
  const room = readFileSync(join(root, 'components/InterviewRoom.tsx'), 'utf8');
  const results = readFileSync(join(root, 'app/(student)/results/[sessionId]/page.tsx'), 'utf8');
  const unis = readFileSync(join(root, 'app/(student)/universities/page.tsx'), 'utf8');
  const evPage = join(root, 'app/(student)/universities/[slug]/evidence/page.tsx');
  t('Q-14g', 'The interview room shows the likelihood under the question', /question\.likelihood/.test(room) && /LIKELIHOOD_LABEL/.test(room), 'InterviewRoom reads question.likelihood');
  t('Q-14h', 'The report shows it per question with a link to the source', /likelihoodFor\(base, institution\)/.test(results) && /sourceUrl/.test(results), 'results page links each question to its source');
  t('Q-14i', 'Every university card states its evidence and links to the evidence page',
    /evidenceSummary\(i\)\.line/.test(unis) && /\/universities\/\$\{i\.slug\}\/evidence/.test(unis), 'card line and link present');
  t('Q-14j', 'The evidence page exists', (() => { try { readFileSync(evPage); return true; } catch { return false; } })(), evPage.replace(root, ''));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
