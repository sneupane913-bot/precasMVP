/**
 * THE LIKELIHOOD TABLE, FOR THE CLIENT, IN THE CHAT (Q-14b).
 *
 * The evidence behind each university's paper is never shown in the product.
 * It is read here, by the assistant, and pasted into the conversation as a
 * table. Client decision, 8 September 2026.
 *
 *   node --experimental-strip-types --no-warnings --import ./qa/_alias-register.mjs qa/evidence-table.mjs
 *       -> one row per university: sources, facts, and how the bank splits by level
 *   node ... qa/evidence-table.mjs inst-bpp
 *       -> every question for that university with its level, reason and source
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const q = await import(join(root, 'lib/data/questions.ts'));
const inst = await import(join(root, 'lib/data/institutions.ts'));
const ev = await import(join(root, 'lib/data/university-evidence.ts'));
const facts = await import(join(root, 'lib/data/institution-facts.ts'));

const LEVEL = { very_likely: 'Very likely', likely: 'Likely', possible: 'Possible', general: 'General UK' };
const RANK = { very_likely: 0, likely: 1, possible: 2, general: 3 };
const arg = process.argv[2];

if (!arg) {
  console.log('| University | Sources | Facts | Very likely | Likely | Possible | General | CAS Shield |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const i of inst.ALL_INSTITUTIONS) {
    const c = { very_likely: 0, likely: 0, possible: 0, general: 0 };
    for (const x of q.eligiblePool()) c[ev.likelihoodFor(x, i).level] += 1;
    const shield = ev.usesCasShield(i.id);
    console.log(
      `| ${i.name}${i.featured ? ' *' : ''} | ${ev.evidenceFor(i.id).length} | ${facts.profileFor(i.id).length} | ${c.very_likely} | ${c.likely} | ${c.possible} | ${c.general} | ${shield === true ? 'yes' : shield === false ? 'no' : '?'} |`
    );
  }
  process.exit(0);
}

const i = inst.getInstitution(arg);
if (!i) {
  console.error(`no institution "${arg}"`);
  process.exit(1);
}
console.log(`${i.name} (${i.city}). ${ev.evidenceSummary(i).line}`);
console.log(`Facts held: ${facts.profileFor(i.id).length}. Sources: ${ev.evidenceFor(i.id).length}.`);
console.log('');
console.log('| # | Level | Question | Why (source) |');
console.log('|---|---|---|---|');
const rows = q
  .eligiblePool()
  .map((x) => ({ x, lk: ev.likelihoodFor(x, i) }))
  .sort((a, b) => RANK[a.lk.level] - RANK[b.lk.level] || a.x.id.localeCompare(b.x.id));
for (const { x, lk } of rows) {
  const text = q.fill(x.text, i).replace(/\|/g, '/');
  const host = new URL(lk.sourceUrl).hostname.replace(/^www\./, '');
  console.log(`| ${x.id} | ${LEVEL[lk.level]} | ${text}${x.isProbe ? ' (follow-up)' : ''} | ${lk.reason.replace(/\|/g, '/')} ${host} |`);
}
