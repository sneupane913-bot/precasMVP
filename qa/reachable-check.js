/**
 * IS THE FEATURE ACTUALLY REACHABLE BY A HUMAN?
 *
 * This suite exists because of the single most expensive defect class in this
 * project. It has now happened five separate times:
 *
 *   - `consume()` was written correctly and had no callers, so credits were
 *     granted and never debited. One NPR 449 pack bought unlimited mocks.
 *   - `allocateSeat()` was written correctly and had no callers, so a
 *     consultancy could buy a hundred seats and the dashboard showed none used.
 *   - `/api/admin` could approve a payment and the portal page had no button,
 *     so the only person allowed to approve their student could not see the
 *     payment existed.
 *   - `setPaymentSettings` worked from the day it was written and no form ever
 *     called it, so the wallet QR could only be changed by a redeploy.
 *   - The payments queue rendered `payerPhone` from a field only Firebase phone
 *     auth ever sets, so the column was empty on every real payment.
 *
 * Every one of those passed a green test suite. A suite that calls an endpoint
 * directly proves the endpoint works. It says nothing at all about whether a
 * person can get to it, and a feature no person can reach does not exist.
 *
 * So this checks the join: every action the API accepts must be called from at
 * least one page or component. Anything genuinely not meant to have a screen
 * must be listed below WITH A REASON. An empty reason is not allowed, because
 * "we meant to do that" is exactly what was said about the four above.
 *
 * Run:  node qa/reachable-check.js      (no server needed)
 */
const fs = require('fs');
const path = require('path');

let pass = 0;
let fail = 0;
function t(id, name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${id.padEnd(26)} ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${id.padEnd(26)} ${name}\n          ${detail}`);
  }
}

/**
 * Actions with no screen ON PURPOSE. Each needs a reason a person would accept.
 * Keep this list short. Every entry is a promise that nobody needs a button.
 */
const NO_SCREEN_NEEDED = {
  status:
    'polled by the checkout page in a loop rather than called from a control, so it is reached without a button',
  DELETE:
    'an HTTP verb picked up by the scan, not an action name',
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

(async () => {
  console.log('\n=== EVERY SERVER FEATURE MUST HAVE A WAY IN ===\n');

  const apiFiles = walk('app/api');
  const uiFiles = walk('app')
    .filter((f) => !f.startsWith('app/api'))
    .concat(walk('components'));
  const uiSource = uiFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');

  // ---- 1. Every action the API accepts is called from some screen ---------
  const actions = new Map(); // action -> route file
  for (const f of apiFiles) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/z\.literal\('([A-Za-z][A-Za-z0-9_]*)'\)/g)) {
      if (!actions.has(m[1])) actions.set(m[1], f);
    }
  }

  const orphans = [];
  for (const [action, file] of actions) {
    if (action in NO_SCREEN_NEEDED) continue;
    const called = new RegExp(`action:\\s*['"\`]${action}['"\`]`).test(uiSource);
    if (!called) orphans.push(`${action} (${file})`);
  }

  t(
    'R-1',
    'Every API action is called from at least one screen',
    orphans.length === 0,
    orphans.length
      ? `${orphans.length} server features that no person can reach:\n          ` +
        orphans.join('\n          ') +
        '\n          Either build the screen, or add it to NO_SCREEN_NEEDED with a reason.'
      : ''
  );

  t(
    'R-2',
    'Nothing was silently excused',
    Object.values(NO_SCREEN_NEEDED).every((why) => typeof why === 'string' && why.length > 20),
    'every entry in NO_SCREEN_NEEDED needs a reason a person would accept'
  );

  // ---- 2. Every field the server sends is read by the screen --------------
  //
  // The narrower version of the same fault. `payerPhone` was returned by the
  // API and rendered by the page, but the API filled it from a field that is
  // never populated, so the column was empty on every real payment. A returned
  // field nobody reads, or a rendered field nobody fills, are both dead wiring.
  const superApi = fs.readFileSync('app/api/super/route.ts', 'utf8');
  const superPage = fs.readFileSync('app/super/page.tsx', 'utf8');

  t(
    'R-3',
    'The payments queue sends a phone number that is actually populated',
    /payerPhone:\s*st\?\.whatsappNumber/.test(superApi),
    'payerPhone read only phoneE164, which is set by Firebase PHONE auth. Everyone signs in with Google, so it was null for every student and the column was always empty.'
  );

  t(
    'R-4',
    'And the screen renders it',
    /tel:\$\{o\.payerPhone\}/.test(superPage),
    'the API can send whatever it likes; if no screen reads it the client still cannot ring anybody'
  );

  // ---- 3. Every tab a page offers actually has content --------------------
  //
  // A tab that renders nothing is the same defect wearing a nicer hat.
  const tabIds = [...superPage.matchAll(/\{\s*id:\s*'([a-z]+)'/g)].map((m) => m[1]);
  const unrendered = tabIds.filter((id) => !new RegExp(`tab === '${id}'`).test(superPage));
  t(
    'R-5',
    'Every tab on the back office renders something',
    unrendered.length === 0,
    `tabs with no branch that renders them: ${unrendered.join(', ')}`
  );

  // ---- 4. Every repo method is used --------------------------------------
  //
  // This is where `consume()` and `allocateSeat()` hid: real code, correct
  // code, zero callers.
  const repoIface = fs.readFileSync('lib/db/index.ts', 'utf8');
  const ifaceBlock = repoIface.slice(repoIface.indexOf('export interface Repo'));
  const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function']);
  const methods = [...ifaceBlock.matchAll(/^\s{2}([a-zA-Z][a-zA-Z0-9]*)\s*\(/gm)]
    .map((m) => m[1])
    .filter((m) => !KEYWORDS.has(m));
  const appSource = walk('app')
    .concat(walk('lib'))
    .filter((f) => !f.includes('lib/db/'))
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
  const deadRepo = methods.filter((m) => !new RegExp(`\\.${m}\\s*\\(`).test(appSource));
  t(
    'R-6',
    'Every method on the data layer has a caller',
    deadRepo.length === 0,
    `written, correct, and called by nobody: ${deadRepo.join(', ')}. This is exactly how consume() and allocateSeat() shipped.`
  );

  console.log(`\n  ${pass} passed, ${fail} failed, ${actions.size} API actions checked\n`);
  process.exit(fail > 0 ? 1 : 0);
})();
