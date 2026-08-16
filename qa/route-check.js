/**
 * qa/route-check.js — WHERE DOES EVERY BUTTON GO?
 *
 * Written 14 Aug, after "Choose Prep" turned out to point at `/start`.
 *
 * `/start` is the sign-in page, and it bounces an already-signed-in student to
 * `/universities`. So the single highest-value control in the product — the
 * button whose entire job is to take money — sent every visitor to the
 * catalogue instead of to checkout, including a student who had used all ten
 * free questions and was actively trying to pay us.
 *
 * Nine suites were green. Not one of them looked at where a `<Link>` points,
 * because a link's destination is not something an API test can see. The client
 * found it in under a minute of clicking, and then said the thing that produced
 * this file: he does not want to discover these by clicking, one at a time, for
 * three days.
 *
 * So this walks every page and component, extracts every destination, and
 * checks it. It also PRINTS THE WHOLE MAP, because the map itself is the thing
 * he asked for and it is worth reading even when everything passes.
 *
 * What it cannot do: know that `/start` bounces. That is why R-4 exists — it
 * encodes the specific knowledge that a few routes REDIRECT, so a control whose
 * words promise one thing must not be pointed at a route that does another.
 *
 * Run:  node qa/route-check.js      (no server, no keys, no network)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(6)} ${what}${detail ? `\n           ${detail}` : ''}`);
}

// ---------------------------------------------------------------- routes

/** Every route the app actually serves, from the filesystem. */
function realRoutes() {
  const out = new Set();
  (function walk(dir, url) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      if (e.name === 'api') continue;
      // (group) folders do not appear in the URL.
      const seg = /^\(.*\)$/.test(e.name) ? '' : `/${e.name}`;
      const next = url + seg;
      if (fs.existsSync(path.join(dir, e.name, 'page.tsx'))) out.add(next || '/');
      walk(path.join(dir, e.name), next);
    }
  })(path.join(ROOT, 'app'), '');
  if (fs.existsSync(path.join(ROOT, 'app/page.tsx'))) out.add('/');
  return out;
}
const ROUTES = realRoutes();

/** Does a href match a real route, allowing for [dynamic] segments? */
function resolves(href) {
  const clean = href.split('?')[0].split('#')[0].replace(/\/$/, '') || '/';
  if (ROUTES.has(clean)) return true;
  const parts = clean.split('/').filter(Boolean);
  for (const r of ROUTES) {
    const rp = r.split('/').filter(Boolean);
    if (rp.length !== parts.length) continue;
    if (rp.every((seg, i) => seg.startsWith('[') || seg === parts[i])) return true;
  }
  return false;
}

// ---------------------------------------------------------------- files

function walkFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else if (/\.tsx$/.test(e.name) && !/ \d\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}
const FILES = [
  ...walkFiles(path.join(ROOT, 'app')),
  ...walkFiles(path.join(ROOT, 'components')),
];

/** Comments stripped. Five times a test on this project matched a comment. */
function code(file) {
  return fs
    .readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

// ---------------------------------------------------------------- extract

const links = []; // { file, href, dynamic }
for (const f of FILES) {
  const src = code(f);
  const rel = path.relative(ROOT, f);
  // href="/x"  href={'/x'}  href={`/x/${id}`}  router.push('/x')
  for (const m of src.matchAll(/href=(?:"([^"]+)"|\{`([^`]+)`\}|\{'([^']+)'\})/g)) {
    links.push({ file: rel, href: m[1] ?? m[2] ?? m[3], tpl: Boolean(m[2]) });
  }
  for (const m of src.matchAll(/router\.(?:push|replace)\(\s*(?:`([^`]+)`|'([^']+)')/g)) {
    links.push({ file: rel, href: m[1] ?? m[2], tpl: Boolean(m[1]) });
  }
  /**
   * Links declared as DATA, not as JSX.
   *
   * SiteFooter builds its nav from an array of `{ label, href: '/refund' }`
   * objects and maps over it. The first version of R-6 could not see that and
   * reported /refund as an orphan when it is linked from every page in the
   * product. A check that cries wolf gets ignored, which is worse than not
   * having it — so the extractor was fixed rather than the rule relaxed.
   */
  for (const m of src.matchAll(/\bhref:\s*(?:'([^']+)'|`([^`]+)`|"([^"]+)")/g)) {
    links.push({ file: rel, href: m[1] ?? m[2] ?? m[3], tpl: Boolean(m[2]) });
  }
}

const internal = links.filter((l) => l.href.startsWith('/'));
const external = links.filter((l) => !l.href.startsWith('/'));

console.log('\n=== WHERE DOES EVERY BUTTON GO? ===\n');

t('R-1', 'destinations were found to check',
  internal.length >= 30, `${internal.length} internal, ${external.length} external, across ${FILES.length} files`);

// R-2. Every internal destination must be a route that exists. A typo here is
// a 404 for a real student, and nothing else in the suite would notice.
const dead = internal
  // A template with ${...} in the FIRST segment cannot be resolved statically.
  .filter((l) => !/^\/\$\{/.test(l.href))
  .map((l) => ({ ...l, href: l.href.replace(/\$\{[^}]+\}/g, '1') }))
  .filter((l) => !resolves(l.href));
t('R-2', 'every internal destination is a route that exists',
  dead.length === 0,
  dead.length ? dead.map((d) => `${d.file} -> ${d.href}`).join('\n           ') : 'no dead links');

// R-3. External links must be https or a known scheme. A bare wa.me with no
// scheme resolves relative to our own site and 404s.
const badExternal = external.filter(
  (l) => !/^(https:|mailto:|tel:|#|\$\{)/.test(l.href) && !l.href.startsWith('http')
);
t('R-3', 'external links carry a scheme',
  badExternal.length === 0,
  badExternal.length ? badExternal.map((d) => `${d.file} -> ${d.href}`).join('\n           ') : 'all schemed');

/**
 * R-4. THE ONE THAT WOULD HAVE CAUGHT THE PRICING BUG.
 *
 * Some routes REDIRECT rather than render: /start sends a signed-in student to
 * /universities. So pointing a "pay for this pack" control at /start does not
 * take anybody to checkout, it takes them shopping.
 *
 * A control is allowed to route via /start ONLY if it carries ?next=, which is
 * what preserves the student's intent through the sign-in detour.
 */
const REDIRECTING = ['/start'];
const payWords = /choose|buy|pay|upgrade|checkout|pack/i;
const offenders = [];
for (const f of FILES) {
  const src = code(f);
  const rel = path.relative(ROOT, f);
  for (const m of src.matchAll(/href=(?:"([^"]+)"|\{`([^`]+)`\}|\{'([^']+)'\})([\s\S]{0,700}?)<\/(?:Link|a)>/g)) {
    const href = m[1] ?? m[2] ?? m[3];
    const text = (m[4] ?? '').replace(/<[^>]*>/g, ' ').replace(/\{[^}]*\}/g, ' ');
    if (!REDIRECTING.some((r) => href.startsWith(r))) continue;
    if (href.includes('next=')) continue;      // intent preserved, fine
    if (payWords.test(text)) offenders.push(`${rel}: "${text.trim().slice(0, 60)}" -> ${href}`);
  }
}
t('R-4', 'no paying control routes through a redirecting page without ?next=',
  offenders.length === 0,
  offenders.length
    ? offenders.join('\n           ') + '\n           (this is the "Choose Prep -> /start -> /universities" bug)'
    : 'every pay/choose/upgrade control lands on checkout or carries ?next=');

// R-5. /checkout must always be reached with a pack, or it silently defaults
// and a student can pay for a pack they did not pick.
const packless = internal.filter((l) => l.href === '/checkout' || l.href === '/checkout?');
t('R-5', '/checkout is never linked without a pack',
  packless.length === 0,
  packless.length ? packless.map((d) => d.file).join(', ') : 'every /checkout link names a pack');

/**
 * R-6. EVERY PAGE HAS A DOOR.
 *
 * Written 16 Aug after I built /dashboard — the single most changed screen of
 * the redesign — and linked it from nowhere. No nav item, no post-sign-in
 * route. The client opened the site, saw the pages he already knew, and
 * reported, correctly, that nothing had changed.
 *
 * `reachable-check.js` guards the same shape for API ACTIONS. It could not see
 * this, because a page is not an action. So the shape shipped again, in the
 * one file that was supposed to be the proof the redesign happened.
 *
 * A route with no inbound link is a route only its author knows about.
 */
const PARAMETERISED = /\[/;                       // /interview/[id] is reached dynamically
const DIRECT_ENTRY = new Set([
  '/',            // typed, and the OG target
  '/start',       // typed, and every 401 pushes here
  '/admin', '/super', '/owner', '/consultancy', '/signout',
]);

const targets = new Set(
  internal.map((l) => l.href.split('?')[0].replace(/\/$/, '') || '/')
);
const orphans = [...ROUTES].filter(
  (r) => !DIRECT_ENTRY.has(r) && !PARAMETERISED.test(r) && !targets.has(r)
);
t('R-6', 'every page is linked from somewhere',
  orphans.length === 0,
  orphans.length
    ? orphans.join(', ') + '\n           a route nothing links to is one only its author can find'
    : `${ROUTES.size} routes, every non-entry one has an inbound link`);

// ---------------------------------------------------------------- the map

console.log('\n--- THE MAP (what the client asked for) ---\n');
const byFile = {};
for (const l of internal) (byFile[l.file] ??= new Set()).add(l.href);
for (const f of Object.keys(byFile).sort()) {
  console.log(`  ${f}`);
  for (const h of [...byFile[f]].sort()) console.log(`      -> ${h}`);
}
console.log('\n  Routes this app serves:');
console.log('      ' + [...ROUTES].sort().join('  '));

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
