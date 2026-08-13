/**
 * qa/header-check.js — DOES THE HEADER EVER CLAIM A STATE IT HAS NOT ESTABLISHED?
 *
 * Written 14 Aug, after the client reported the same bug twice and I closed it
 * twice by reading the code and finding nothing wrong. Watching it in a browser
 * took ten seconds.
 *
 * They signed in, landed on /universities, and the header said "Sign in" as
 * though nothing had happened. The cause was one line:
 *
 *     if (signedIn !== true) return <SignedOut/>
 *
 * where `signedIn` was `boolean | null`. That collapses two different things:
 *
 *     null  = "I have not asked the server yet"
 *     false = "I asked, and nobody is signed in"
 *
 * and renders both as SIGNED OUT. So every signed-in student was told "Sign in"
 * for as long as /api/me took — over four seconds on localhost, worse on Nepali
 * mobile data — on every single navigation.
 *
 * It is G-1 in a different costume. G-1 refuses to score an answer it could not
 * hear. This is the same principle applied to session state: **never assert a
 * state you have not established.** Both failures look small and both tell a
 * student something untrue about themselves.
 *
 * These assertions are structural on purpose. The visual proof was done in a
 * real browser during the TESTED walk; what a test can add is making the
 * three-state shape impossible to collapse back into two by accident, which is
 * exactly the edit somebody will make while "simplifying" this component.
 *
 * Run:  node qa/header-check.js      (no server, no keys, no network)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(9)} ${what}${detail ? `\n            ${detail}` : ''}`);
}

/** Comments stripped. Five times on this project a test matched a comment. */
function code(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

const hs = code('components/HeaderSession.tsx');
const sh = code('components/SiteHeader.tsx');

console.log('\n=== THE HEADER MUST NOT CLAIM WHAT IT DOES NOT KNOW ===\n');

// 1. Three states, not two. `undefined` must be handled before either branch.
t('H-1', 'unknown is handled as its own state, before signed-in or signed-out',
  /session === undefined/.test(hs),
  'an explicit `session === undefined` branch exists');

// 2. The exact collapse that caused the bug must not come back. Any test that
//    treats "not signed in" and "not yet known" as the same value is the bug.
const collapsed = /signedIn\s*!==\s*true/.test(hs) || /!\s*signedIn\s*\)/.test(hs);
t('H-2', 'the two states are NOT collapsed back into one',
  collapsed === false,
  collapsed ? 'found `signedIn !== true` or `!signedIn` — this is the original defect'
            : 'no truthiness shortcut over a three-state value');

// 3. While unknown, neither label may be rendered. Order matters: the unknown
//    branch has to return before the sign-in markup is reachable.
const unknownAt = hs.indexOf('session === undefined');
const signInAt = hs.indexOf('Sign in');
const signOutAt = hs.indexOf('Sign out');
t('H-3', 'neither "Sign in" nor "Sign out" can render while unknown',
  unknownAt > -1 && unknownAt < signInAt && unknownAt < signOutAt,
  `unknown branch at ${unknownAt}, "Sign in" at ${signInAt}, "Sign out" at ${signOutAt}`);

// 4. The placeholder must hold its space, or the page jumps under a thumb that
//    is already moving towards a button. A jumping header on a phone is how
//    somebody taps the wrong thing.
t('H-4', 'the unknown placeholder reserves width and height',
  /h-\[\d+px\]/.test(hs) && /w-\[\d+px\]/.test(hs),
  'fixed-size placeholder, so nothing shifts when the answer arrives');

// 5. A FAILED check is not evidence of being signed out. If the server already
//    told us at render time, a flaky /api/me must not sign the student out on
//    screen.
t('H-5', 'a failed /api/me does not overwrite what the server already told us',
  /setSession\(\(s\)\s*=>\s*s\s*\?\?/.test(hs),
  'the catch preserves an existing snapshot instead of forcing signed-out');

// 6. Server pages pass the answer in, so there is no unknown phase at all.
t('H-6', 'SiteHeader accepts a server-resolved session and forwards it',
  /session\?:\s*SessionSnapshot/.test(sh) && /initial=\{session\}/.test(sh),
  'optional prop, forwarded to HeaderSession');

// 7. Every SERVER page that renders SiteHeader must actually pass it. A page
//    that forgets is a page that flashes, and it would go unnoticed because the
//    flash is brief and only appears to somebody who is signed in.
const pages = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.tsx') pages.push(p);
  }
})(path.join(ROOT, 'app'));

const missing = [];
for (const p of pages) {
  const raw = fs.readFileSync(p, 'utf8');
  if (!/<SiteHeader/.test(raw)) continue;
  if (/^\s*'use client'/.test(raw)) continue;      // client pages cannot; H-1 covers them
  if (!/<SiteHeader\s+session=\{/.test(raw)) missing.push(path.relative(ROOT, p));
}
t('H-7', 'every server page hands SiteHeader the resolved session',
  missing.length === 0,
  missing.length ? `these flash "Sign in" at a signed-in student:\n            ` + missing.join('\n            ')
                 : `${pages.filter((p) => /<SiteHeader/.test(fs.readFileSync(p, 'utf8'))).length} pages render SiteHeader, all server ones pass it`);

// 8. headerSession() must never throw. A header is decoration around a page;
//    if it throws, the whole page 500s and the student sees nothing at all.
const hsrv = code('lib/auth/header-session.ts');
t('H-8', 'the server resolver cannot take a page down',
  /try\s*\{/.test(hsrv) && /catch\s*\{[\s\S]*return undefined/.test(hsrv),
  'returns undefined (unknown) on failure rather than throwing or guessing');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
