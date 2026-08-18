#!/usr/bin/env node
/**
 * V-9b. THE OLD PHONE CHECK.
 *
 * The client reported, twice, that an iPhone 6s showed NO SIGN-IN BUTTON AT
 * ALL. The first time (V-9) the cause was a stalled fetch leaving `loading`
 * true forever, and app/(student)/start/page.tsx now carries timeouts and a
 * `finally` for it.
 *
 * The second time the cause was not in our code at all.
 *
 * Next.js 16 ships `node_modules/next/dist/shared/lib/modern-browserslist-target.js`
 * containing:
 *
 *     ['chrome 111', 'edge 111', 'firefox 111', 'safari 16.4']
 *
 * That is the DEFAULT compile target when a project declares no browserslist.
 * An iPhone 6s stops at iOS 15.8, i.e. Safari 15.6. So the framework was
 * emitting syntax the device cannot parse, and the proof is in Next's own
 * App Router error boundary, which is in the shared chunk on EVERY page:
 *
 *     class y extends i.default.Component{static{this.contextType=...}}
 *
 * A class static initialisation block is SYNTAX, not an API. Safari 15.6 does
 * not fail at the line — it fails while PARSING THE FILE, so the whole chunk
 * is discarded, React never mounts, and the sign-in screen stays on its grey
 * placeholder for ever. Every page is affected; sign-in is just where it hurts
 * most, because a student who cannot sign in cannot report anything either.
 *
 * Measured on this project, with and without a browserslist key:
 *
 *     default (safari 16.4)   `static{` in JS: 1   `??=`: 1
 *     browserslist safari 13  `static{` in JS: 0   `??=`: 0
 *
 * So this check does two things:
 *
 *   1. Asserts package.json still declares a browserslist that includes an
 *      old Safari. Deleting that key is a one-line change that silently
 *      breaks every old phone, and nothing else in the gate would notice.
 *
 *   2. If a production build is present, reads the ACTUAL emitted chunks and
 *      fails on syntax that Safari 15 cannot parse. Asserting the config is
 *      asserting an intention; asserting the output is asserting the product.
 *      Only the second one would have caught this.
 *
 * Run after `next build` for the full check. Without a build it still runs and
 * says so rather than passing silently, because a check that quietly skips is
 * how a suite goes green over a broken product.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0;
const fails = [];

function check(name, ok, detail) {
  if (ok) {
    pass++;
  } else {
    fails.push(`${name}: ${detail}`);
  }
}

// ---------------------------------------------------------------------------
// 1. The declared target.
// ---------------------------------------------------------------------------
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const list = pkg.browserslist;

check(
  'B-1 browserslist declared',
  Array.isArray(list) && list.length > 0,
  'package.json has no `browserslist` key, so Next.js compiles for its own ' +
    'default of safari 16.4 and every iPhone older than iOS 16.4 gets a blank page.'
);

if (Array.isArray(list)) {
  const safari = list
    .map((s) => /^(?:safari|ios_saf)\s+([\d.]+)/.exec(String(s).trim()))
    .filter(Boolean)
    .map((m) => parseFloat(m[1]));

  check(
    'B-2 an old Safari is named',
    safari.length > 0,
    'browserslist names no safari/ios_saf version. Old iPhones are exactly ' +
      'the devices this project keeps breaking on, so say so explicitly.'
  );

  check(
    'B-3 old Safari is old enough',
    safari.length > 0 && Math.min(...safari) <= 15,
    `lowest safari target is ${safari.length ? Math.min(...safari) : 'none'}; ` +
      'an iPhone 6s runs Safari 15.6 and cannot go higher.'
  );
}

// ---------------------------------------------------------------------------
// 2. The emitted output.
//
// Each pattern below is SYNTAX. An unsupported API throws when it is called,
// which is survivable; unsupported syntax kills the file at parse time, which
// is not. Only syntax is listed here.
// ---------------------------------------------------------------------------
const BANNED = [
  ['static{', 'class static initialisation block', 'Safari 16.4'],
  ['??=', 'logical nullish assignment', 'Safari 14'],
  ['||=', 'logical OR assignment', 'Safari 14'],
  ['&&=', 'logical AND assignment', 'Safari 14'],
];

const chunkDir = path.join(ROOT, '.next', 'static', 'chunks');

if (!fs.existsSync(chunkDir)) {
  console.log('  (no .next build found — config checked, output NOT checked)');
  console.log('  Run `npx next build` first for the check that actually matters.');
} else {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) files.push(p);
    }
  })(chunkDir);

  check('B-4 build produced chunks', files.length > 0, '.next/static/chunks has no .js files');

  for (const [needle, what, needs] of BANNED) {
    const hits = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      if (src.includes(needle)) hits.push(path.basename(f));
    }
    check(
      `B-5 no ${what}`,
      hits.length === 0,
      `${hits.length} chunk(s) contain \`${needle}\` (${what}, needs ${needs}). ` +
        `First: ${hits[0]}. Safari 15 throws a SyntaxError parsing this file, ` +
        `so the chunk never runs and the page renders nothing.`
    );
  }
}

// ---------------------------------------------------------------------------
console.log(`\nbrowser-check: ${pass} passed, ${fails.length} failed`);
for (const f of fails) console.log(`  FAIL ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
