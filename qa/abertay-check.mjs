/** Abertay-specific integration checks; imports the real planner and marker context. */
import assert from 'node:assert/strict';
import { ALL_INSTITUTIONS, getInstitution, publicInstitutions } from '@/lib/data/institutions';
import { QUESTIONS, buildQuestionPlan, getQuestion, publicQuestion, resolvedQuestion } from '@/lib/data/questions';
import { evidenceFor, likelihoodFor } from '@/lib/data/university-evidence';
import { institutionFactBlock, profileFor } from '@/lib/data/institution-facts';
import { matchesUniversity } from '@/lib/university-search';
import { ABERTAY_ID, ABERTAY_PRACTICE } from '@/lib/data/questions-abertay';

const inst = getInstitution(ABERTAY_ID);
assert(inst && inst.city === 'Dundee' && inst.vertical === 'uk-precas');
assert(publicInstitutions().some(i => i.id === ABERTAY_ID));
assert.equal(ALL_INSTITUTIONS.filter(i => i.id === ABERTAY_ID).length, 1);
for (const spelling of ['Abertay', 'Abertey University', 'Abertay Dundee']) assert(matchesUniversity(inst, spelling));
assert.equal(ABERTAY_PRACTICE.length, 16);
assert.equal(new Set(QUESTIONS.map(q => q.id)).size, QUESTIONS.length);
assert.equal(getQuestion('q-01').text, 'Please introduce yourself briefly.');
assert.equal(getQuestion('q-09').text, 'Why did you choose {{university}}?');
assert(evidenceFor(inst.id).every(s => !s.viaCasShield && s.url.includes('abertay.ac.uk')));
assert(evidenceFor(inst.id).every(s => s.questionIds.length === 0));
for (const p of ABERTAY_PRACTICE) {
  const q = getQuestion(p.id);
  assert.equal(q.institutionId, inst.id);
  const likelihood = likelihoodFor(q, inst);
  assert.equal(likelihood.level, 'possible');
  assert.equal(likelihood.sourceUrl, p.sourceUrl);
  assert.match(likelihood.reason, /not a confirmed interview question/);
  const shown = publicQuestion(q, inst);
  assert(!('rubricNotes' in shown) && !('likelihood' in shown) && !('sourceUrl' in shown));
  assert(!/\{\{/.test(JSON.stringify(shown)));
}
const finance = resolvedQuestion(getQuestion('a-09'), inst);
assert.match(finance.modelAnswer, /£1,171/);
assert.match(finance.modelAnswer, /£10,539/);
assert(!finance.modelAnswer.includes('£1,529'));
assert(profileFor(inst.id).length >= 8);
const context = institutionFactBlock(inst);
assert.match(context, /Bell Street/);
assert.match(context, /Parker House/);
assert.match(context, /agent must not/);
for (let n = 0; n < 100; n++) {
  const plan = buildQuestionPlan(17, { institutionId: inst.id });
  assert.equal(plan.length, 17);
  assert.equal(new Set(plan).size, 17);
  assert.equal(getQuestion(plan[0]).category, 'identity');
  assert(plan.filter(id => id.startsWith('a-')).length >= 4);
}
for (const other of ALL_INSTITUTIONS.filter(i => i.id !== inst.id)) {
  const seen = new Set();
  for (let n = 0; n < 3; n++) {
    const plan = buildQuestionPlan(other.questionCount, { institutionId: other.id, seen });
    assert(plan.every(id => !id.startsWith('a-')), other.name);
    plan.forEach(id => seen.add(id));
  }
}
const seen = new Set();
for (let n = 0; n < 10; n++) {
  const plan = buildQuestionPlan(17, { institutionId: inst.id, seen });
  assert(plan.every(id => !seen.has(id)), `Repeated question in Abertay sitting ${n + 1}`);
  plan.forEach(id => seen.add(id));
}
console.log('Abertay: catalogue/search, 16 sourced adaptations, truthful provenance, marker context, 100 full papers, other-university isolation and 10 sittings without repeats passed.');
