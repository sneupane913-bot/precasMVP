/**
 * qa/ledger-check.js — IS THE NUMBER ON SCREEN THE NUMBER IN THE LEDGER?
 *
 * Guards D-44, whose falsifier is: "header count != ledger balance at any
 * moment."
 *
 * Why this is a STATIC suite rather than a server one. A server suite can only
 * prove that the number matched on the runs it happened to make. What actually
 * makes D-44 impossible is structural: there must be exactly ONE path from the
 * ledger to the pill, and every write to the ledger that can be repeated must
 * refuse to repeat itself. Both of those are properties of the source, and both
 * are things a future edit can quietly break while every runtime test stays
 * green. So they are asserted here, where they cost nothing to run and cannot
 * be skipped.
 *
 * The reconciliation that produced these assertions is written up in full on
 * `grantTrial` in lib/entitlement.ts. The short version: the chip did not lie,
 * the ledger held two, and it held two because the trial could be granted twice
 * by two overlapping sign-ins.
 *
 * Run:  node qa/ledger-check.js      (no server, no keys, no network)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${what}${detail ? `\n           ${detail}` : ''}`);
}

/** Comments stripped. Four tests on this project once passed by matching one. */
function code(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

console.log('\n=== IS THE NUMBER ON SCREEN THE NUMBER IN THE LEDGER? ===\n');

// ------------------------------------------------------------------ L-1

/**
 * One path, and it starts at SUM(delta).
 *
 * If `balance()` ever becomes a stored column, every screen in the product
 * inherits a number that can drift from its own history under concurrency —
 * which is the failure mode the ledger was chosen to prevent.
 */
const blob = code('lib/db/blob-repo.ts');
const supa = code('lib/db/supabase-repo.ts');

t('L-1a', 'the blob repo derives a balance by summing deltas',
  /async balance\([\s\S]{0,240}reduce\((?:\s|\S)*?\+\s*r\.delta/.test(blob),
  'balance() must be SUM(delta) over the ledger, never a stored column');

t('L-1b', 'the supabase repo derives a balance by summing deltas',
  /async balance\([\s\S]{0,320}reduce\((?:\s|\S)*?delta/.test(supa),
  'balance() must be SUM(delta) over the ledger, never a stored column');

// ------------------------------------------------------------------ L-2

/**
 * The entitlement is the ONLY consumer, and it reads the repo rather than
 * counting anything itself. A second place that adds up credits is a second
 * answer waiting to disagree with the first (F-2).
 */
const ent = code('lib/entitlement.ts');

t('L-2', 'entitlementFor reads the balance from the repo, and does not recount',
  /r\.balance\(student\.id,\s*'mock'\)/.test(ent) &&
  /r\.balance\(student\.id,\s*'practice'\)/.test(ent),
  "mocksLeft and practiceLeft both come from repo().balance()");

// ------------------------------------------------------------------ L-3

/**
 * The header renders what the server sent, and does not adjust it.
 *
 * A pill that decremented itself locally after an answer would be right most of
 * the time and wrong exactly when it mattered, which is the worst available
 * outcome.
 */
const hdr = code('components/HeaderSession.tsx');

t('L-3a', 'the header chip reads mocksLeft straight from /api/me',
  /mocksLeft:\s*j\?\.data\?\.entitlement\?\.mocksLeft/.test(hdr),
  'the chip takes the server number as given');

t('L-3b', 'the header never does arithmetic on the balance',
  !/mocksLeft\s*[-+]\s*\d/.test(hdr) && !/setSession\([^)]*mocksLeft:\s*\w+\s*[-+]/.test(hdr),
  'no local increment or decrement; the ledger is the only thing that counts');

// ------------------------------------------------------------------ L-4

/**
 * THE ACTUAL D-44 FIX.
 *
 * Every repeatable grant refuses to repeat. `grantPack` has always done this
 * because a re-verified payment must not hand out a second pack. `grantTrial`
 * did not, and two overlapping sign-ins therefore produced two mock credits and
 * a chip reading 2 before the student had answered anything.
 */
t('L-4a', 'grantPack refuses to grant twice for one order',
  /ledger\.some\(\(e\)\s*=>\s*e\.orderId === orderId && e\.reason === 'pack_purchase'\)/.test(ent),
  'idempotent by order id');

const trialFn = ent.slice(ent.indexOf('export async function grantTrial'));
const trialBody = trialFn.slice(0, trialFn.indexOf('\n}') + 2);

t('L-4b', 'grantTrial refuses to grant a second trial',
  /listLedger\(studentId\)/.test(trialBody) &&
  /e\.reason === 'trial_grant'/.test(trialBody) &&
  /return;/.test(trialBody),
  trialBody.trim()
    ? 'checks the ledger for an existing trial_grant before appending'
    : 'grantTrial not found');

// ------------------------------------------------------------------ L-5

/**
 * Nothing outside `lib/entitlement.ts` may append a `trial_grant`.
 *
 * The guard above is only worth anything if it is the single door. A second
 * caller writing the row directly would walk straight past it.
 */
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

const writers = [];
for (const f of [...walk(path.join(ROOT, 'lib')), ...walk(path.join(ROOT, 'app'))]) {
  const rel = path.relative(ROOT, f);
  if (rel === path.join('lib', 'entitlement.ts')) continue;
  if (rel.startsWith(path.join('lib', 'db'))) continue; // type declarations
  const src = fs.readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
  if (/appendLedger\([\s\S]{0,200}'trial_grant'/.test(src)) writers.push(rel);
}

t('L-5', "only lib/entitlement.ts may write a 'trial_grant' row",
  writers.length === 0,
  writers.length
    ? writers.join('\n           ') + '\n           a second door past the idempotency guard'
    : 'one door, and it is guarded');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
