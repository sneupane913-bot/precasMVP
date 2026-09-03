/**
 * qa/schema-check.js — DOES THE LIVE DATABASE HOLD WHAT THE CODE WRITES?
 *
 * Written on 3 September 2026 after finding that FIVE fields on `Student` —
 * `whatsappNumber`, `whatsappConfirmed`, `city`, `level`, `targetUniversity` —
 * had never been mapped in `lib/db/supabase-repo.ts` and had no column in
 * `supabase/schema.sql`. The welcome screen collected a student's phone
 * number, `updateStudent` was called with it, and the Supabase mapping dropped
 * it on the floor. On the live site the number was never saved, so
 * `needsProfile` stayed true for ever and every returning student was sent
 * back to /welcome and refused an interview.
 *
 * Nothing caught it because every local run and every test suite uses the
 * in-memory store, which keeps whatever it is given. Supabase runs only on the
 * live site. F-5: proof of the code mistaken for proof of the product, on the
 * one code path no test ever ran.
 *
 * So this reads the TYPES and checks the two places a field has to exist for
 * the live site to keep it: the Postgres mapping, in both directions, and the
 * schema. A field that is on the type and missing from either is a value the
 * product will accept and silently lose.
 *
 * Run:  node qa/schema-check.js      (no server, no keys, no network)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${what}${detail ? `\n           ${detail}` : ''}`);
}

const types = fs.readFileSync(path.join(ROOT, 'lib/db/types.ts'), 'utf8');
const repo = fs.readFileSync(path.join(ROOT, 'lib/db/supabase-repo.ts'), 'utf8');
const schema = fs.readFileSync(path.join(ROOT, 'supabase/schema.sql'), 'utf8');
const migrations = fs
  .readdirSync(path.join(ROOT, 'supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8'))
  .join('\n');

/** The field names of one exported interface, comments stripped. */
function fieldsOf(name) {
  const m = types.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`));
  if (!m) return null;
  const body = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  return [...body.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\??:/gm)].map((x) => x[1]);
}
const snake = (s) => s.replace(/([A-Z])/g, '_$1').toLowerCase();

/** The column names inside `create table if not exists <table> ( ... );` */
function columnsOf(table) {
  const m = schema.match(new RegExp(`create table if not exists ${table} \\(([\\s\\S]*?)\\n\\);`));
  if (!m) return null;
  return [...m[1].matchAll(/^\s{2}([a-z0-9_]+)\s/gm)].map((x) => x[1]);
}

console.log('\n=== DOES THE LIVE DATABASE HOLD WHAT THE CODE WRITES? ===\n');

/**
 * Field on the type -> column in the schema, and read AND written by the repo.
 * `toX` must read `r.<column>`; `fromX` (or the insert) must write `<column>:`
 * or `r.<column> =`.
 */
function checkEntity(id, iface, table, { toFn, skip = [] }) {
  const fields = fieldsOf(iface);
  const cols = columnsOf(table);
  t(`${id}a`, `${iface} and the ${table} table were both found`, Boolean(fields && cols),
    !fields ? `interface ${iface} not found in lib/db/types.ts` : !cols ? `table ${table} not found in supabase/schema.sql` : `${fields.length} fields, ${cols.length} columns`);
  if (!fields || !cols) return;

  const toBlock = repo.slice(repo.indexOf(`const ${toFn} =`), repo.indexOf('\n});', repo.indexOf(`const ${toFn} =`)));
  const missingCol = [], notRead = [], notWritten = [];
  for (const f of fields) {
    if (skip.includes(f)) continue;
    const col = snake(f);
    if (!cols.includes(col)) missingCol.push(`${f} -> ${col}`);
    if (!new RegExp(`r\\.${col}\\b`).test(toBlock)) notRead.push(`${f} (${toFn} never reads r.${col})`);
    if (!new RegExp(`(\\br\\.${col}\\s*=|\\b${col}:\\s)`).test(repo)) notWritten.push(`${f} (nothing writes ${col})`);
  }
  t(`${id}b`, `every ${iface} field has a column in ${table}`, missingCol.length === 0,
    missingCol.length ? missingCol.join(', ') + '\n           a field with no column is a value the live site accepts and loses' : `${fields.length - skip.length} fields, all present`);
  t(`${id}c`, `every ${iface} field is READ back from Postgres`, notRead.length === 0,
    notRead.length ? notRead.join(', ') : 'the mapping reads every column');
  t(`${id}d`, `every ${iface} field is WRITTEN to Postgres`, notWritten.length === 0,
    notWritten.length ? notWritten.join(', ') : 'the mapping writes every column');
}

checkEntity('S', 'Student', 'students', { toFn: 'toStudent' });
checkEntity('C', 'Coupon', 'coupons', { toFn: 'toCoupon' });
checkEntity('O', 'PaymentOrder', 'payment_orders', { toFn: 'toOrder' });
checkEntity('L', 'LedgerEntry', 'ledger', { toFn: 'toLedger' });

/**
 * The migration the client has to run by hand must carry every column and
 * table that `schema.sql` gained on 3 Sep. A schema.sql that is right and a
 * migration that is short is a live database that is still wrong.
 */
const mustMigrate = ['whatsapp_number', 'whatsapp_confirmed', 'city', 'level', 'target_university', 'create table if not exists coupons'];
const absent = mustMigrate.filter((k) => !migrations.includes(k));
t('M-1', 'the hand-run migration carries every new column and table', absent.length === 0,
  absent.length ? `missing from supabase/migrations: ${absent.join(', ')}` : `${mustMigrate.length} items present`);

t('M-2', 'the coupon code column is UNIQUE, because that is what makes a code a code',
  /code text not null unique/.test(schema) && /code text not null unique/.test(migrations),
  'a duplicate code would let two students redeem one coupon');

t('M-3', 'redemption on Postgres is a conditional update, not a read then a write',
  /redeemed_by_student_id=is\.null/.test(repo),
  'without the IS NULL in the WHERE, two racing students both win');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
