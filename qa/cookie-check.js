/**
 * qa/cookie-check.js — DOES THE COOKIE RIDE ON THE RESPONSE?
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 *
 * On 17 August a real sign-in on the live site produced exactly this:
 *
 *     POST /api/auth/firebase  ->  200  {"ok":true,"isNew":true,
 *                                        "trial":{"outcome":"granted"}}
 *     GET  /api/me             ->  200  {"signedIn":false}
 *
 * The sign-in worked. The account was created, the trial was granted, and the
 * next request said the student was signed out — so every page bounced them
 * back to /start and they signed in again, for ever. The client reported this
 * loop three times.
 *
 * The cause was one line of shape. `setStudentSession` wrote the cookie into
 * the ambient jar from `cookies()`, and the route handler then returned a
 * BRAND NEW `NextResponse.json(...)`. `next dev` stitches those together. The
 * Netlify adapter does not, so no `Set-Cookie` was ever sent.
 *
 * The same shape had also broken `/api/session/create`, where the owner cookie
 * decides whether a student may open the interview they have just created.
 * They could not.
 *
 * WHY NOTHING ELSE CATCHES IT. Every server suite drives the API with its own
 * cookie jar and asserts on JSON bodies — and the body here was `{"ok":true}`,
 * which was completely true. It only fails on a real deploy, in a real
 * browser. That is F-5, proof of the code mistaken for proof of the product,
 * and it cost the pilot a day.
 *
 * So this asserts the SHAPE instead, statically, where it is cheap and certain:
 * a route handler that constructs its own response must never set a cookie
 * through the ambient jar.
 *
 * Run:  node qa/cookie-check.js      (no server, no keys, no network)
 * ---------------------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${what}${detail ? `\n           ${detail}` : ''}`);
}

function code(p) {
  return fs.readFileSync(p, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/route\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

console.log('\n=== DOES THE COOKIE RIDE ON THE RESPONSE? ===\n');

const routes = walk(path.join(ROOT, 'app/api'));

// ------------------------------------------------------------------- C-1
//
// A route handler that returns its own response must not write cookies into
// the ambient jar. `jar.set(` / `jar.delete(` / `cookies()).set(` are the
// forms that silently vanish.
const offenders = [];
for (const f of routes) {
  const src = code(f);
  const writesAmbient =
    /\bjar\s*\.\s*(set|delete)\s*\(/.test(src) ||
    /\(await\s+cookies\(\)\)\s*\.\s*(set|delete)\s*\(/.test(src);
  if (writesAmbient) offenders.push(path.relative(ROOT, f));
}
t('C-1', 'no route handler writes a cookie into the ambient jar',
  offenders.length === 0,
  offenders.length
    ? offenders.join('\n           ') + '\n           these never reach the browser on Netlify'
    : `${routes.length} route handlers checked`);

// ------------------------------------------------------------------- C-2
//
// The helpers that DO attach to a response must exist and must be the ones
// used. A helper nobody calls is the state this bug was already in.
const session = code(path.join(ROOT, 'lib/auth/session.ts'));
t('C-2a', 'the session helpers attach to a response',
  /export function withStudentSession/.test(session) &&
  /export function withoutStudentSession/.test(session),
  'withStudentSession / withoutStudentSession');

const owner = code(path.join(ROOT, 'lib/owner-session.ts'));
t('C-2b', 'the owner-id helper attaches to a response',
  /export function withOwnerId/.test(owner),
  'withOwnerId');

// ------------------------------------------------------------------- C-3
//
// The three routes that MUST carry a cookie, named individually, because a
// generic rule would not have noticed that /api/session/create was broken too.
const MUST = [
  ['app/api/auth/firebase/route.ts', 'withStudentSession', 'sign in'],
  ['app/api/session/create/route.ts', 'withOwnerId', 'starting an interview'],
  ['app/api/signout/route.ts', 'withoutStudentSession', 'signing out'],
  ['app/api/me/route.ts', 'withoutStudentSession', 'signing out from /api/me'],
  ['app/api/account/route.ts', 'withoutStudentSession', 'deleting everything'],
];
for (const [rel, fn, what] of MUST) {
  const p = path.join(ROOT, rel);
  const ok = fs.existsSync(p) && new RegExp(`${fn}\\s*\\(`).test(code(p));
  t('C-3', `${what} sets its cookie on the returned response`, ok, `${rel} -> ${fn}()`);
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
