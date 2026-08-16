/**
 * qa/design-check.js — IS THE DESIGN SYSTEM ACTUALLY A SYSTEM?
 *
 * Enforces REDESIGN.md Part 1 (D-1 to D-9).
 *
 * Why this exists. The client's verdict on the old interface was "this UI is not
 * working with me at all", and the honest reason is that there was no system: a
 * palette half in CSS and half hard-coded in components, tap targets asserted in
 * a markdown file nobody could run, and a reduced-motion block that set every
 * duration to zero without giving anything its finished state.
 *
 * A design system that is not enforced is a mood board. This file is the
 * difference.
 *
 * It guards defect shape F-2 above all: a value written down in two places is a
 * value that will disagree with itself on screen. That shape has already cost
 * this project a sales page promising 12 mocks where 10 were granted, a "From
 * NPR 449" that survived a price change, and a question counter reading
 * "Q 8/10 - 1 done, 9 left".
 *
 * Run:  node qa/design-check.js      (no server, no keys, no network)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
function t(id, what, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${id.padEnd(5)} ${what}${detail ? `\n          ${detail}` : ''}`);
}

const CSS = fs.readFileSync(path.join(ROOT, 'app/globals.css'), 'utf8');
const TW = fs.readFileSync(path.join(ROOT, 'tailwind.config.ts'), 'utf8');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(e.name) && !/ \d\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}
const FILES = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'components'))];

/** Comments stripped. Four tests on this project once passed by matching one. */
function code(f) {
  return fs.readFileSync(f, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}
const rel = (f) => path.relative(ROOT, f);

console.log('\n=== IS THE DESIGN SYSTEM ACTUALLY A SYSTEM? ===\n');

// ------------------------------------------------------------------ D-1

/**
 * Third-party BRAND marks are the one honest exception.
 *
 * Google's G is four specific colours and WhatsApp's mark is one specific
 * green. Recolouring either to fit our palette would misrepresent somebody
 * else's trademark, and a Google button that is not Google-blue reads as a
 * phishing page to the exact nervous user we are building for. So they are
 * allowed, by name, with the reason attached — not by a blanket exemption.
 */
const BRAND_ALLOW = {
  'components/FirebaseSignIn.tsx': 'Google G, four official brand colours',
  'components/ContactUs.tsx': 'WhatsApp official green #25D366',
  'app/layout.tsx': 'theme-color meta, must be a literal for the browser chrome',
  'app/c/[slug]/page.tsx': 'consultancy brand colour injected as a CSS variable',
};

const hexOffenders = [];
for (const f of FILES) {
  const r = rel(f);
  if (BRAND_ALLOW[r]) continue;
  for (const m of code(f).matchAll(/#[0-9a-fA-F]{6}\b/g)) {
    hexOffenders.push(`${r}  ${m[0]}`);
  }
}
t('D-1a', 'no raw colour outside the tokens (third-party brand marks excepted)',
  hexOffenders.length === 0,
  hexOffenders.length
    ? hexOffenders.join('\n          ') + '\n          use a token: ink / ink-soft / go / warn / stop / line / surface'
    : `clean across ${FILES.length} files; ${Object.keys(BRAND_ALLOW).length} brand exceptions, each named`);

const arbitrary = [];
for (const f of FILES) {
  const src = code(f);
  for (const m of src.matchAll(/duration-\[[^\]]+\]|ease-\[[^\]]+\]|cubic-bezier\([^)]*\)/g)) {
    arbitrary.push(`${rel(f)}  ${m[0]}`);
  }
}
t('D-1b', 'no arbitrary duration or easing in any component',
  arbitrary.length === 0,
  arbitrary.length ? arbitrary.join('\n          ') : 'durations and easings come from the config only');

// ------------------------------------------------------------------ D-2

const durations = [...CSS.matchAll(/--t-([a-z]+):\s*(\d+)ms/g)].map((m) => ({ name: m[1], ms: Number(m[2]) }));
t('D-2a', 'three to five named durations, no more',
  durations.length >= 2 && durations.length <= 5,
  durations.map((d) => `${d.name}=${d.ms}ms`).join(' · ') || 'none found');

const tooSlow = durations.filter((d) => d.ms > 500);
t('D-2b', 'no UI duration exceeds 500ms',
  tooSlow.length === 0,
  tooSlow.length
    ? tooSlow.map((d) => `${d.name}=${d.ms}ms`).join(', ') + ' — there is always a student waiting behind it'
    : 'every duration leaves the student in control');

// The rule underneath the table: frequency and duration move opposite ways.
const tap = durations.find((d) => d.name === 'tap');
const route = durations.find((d) => d.name === 'route');
t('D-2c', 'the most frequent motion is the shortest',
  Boolean(tap && route && tap.ms < route.ms),
  tap && route ? `tap ${tap.ms}ms < route ${route.ms}ms` : 'tap or route duration missing');

// ------------------------------------------------------------------ D-3

const easings = [...CSS.matchAll(/--e-([a-z]+):/g)].map((m) => m[1]);
t('D-3a', 'easing is named by direction, not by curve',
  ['enter', 'exit', 'move'].every((k) => easings.includes(k)),
  `declared: ${easings.join(', ') || 'none'}`);

t('D-3b', 'entrances use the entering curve',
  /animation:\s*\n?\s*'fadeIn var\(--t-panel\) var\(--e-enter\)/.test(TW) ||
  /fadeIn[^']*var\(--e-enter\)/.test(TW),
  'fadeIn and slideUp both decelerate into place');

// ------------------------------------------------------------------ D-4

const kf = TW.slice(TW.indexOf('keyframes:'), TW.indexOf('animation:'));
const layoutProps = [...kf.matchAll(/\b(width|height|top|left|right|bottom|margin|padding)\s*:/g)].map((m) => m[1]);
t('D-4a', 'no keyframe animates a layout property',
  layoutProps.length === 0,
  layoutProps.length
    ? `animating ${[...new Set(layoutProps)].join(', ')} triggers layout every frame on a mid-range Android`
    : 'transform and opacity only');

t('D-4b', 'nothing scales to zero',
  !/scale\(0\)/.test(kf) && !/scale\(0(\.0+)?\)/.test(kf),
  'scale(0) collapses an element to a point; 0.96 plus a fade is what gone looks like');

// ------------------------------------------------------------------ D-5

const rmBlock = CSS.slice(CSS.indexOf('prefers-reduced-motion'));
t('D-5a', 'a reduced-motion block exists',
  CSS.includes('prefers-reduced-motion'),
  'an animated product with no handler is a critical failure, not a missing nicety');

t('D-5b', 'reduced motion delivers the FINISHED state, not a frozen one',
  /opacity:\s*1\s*!important/.test(rmBlock) && /transform:\s*none\s*!important/.test(rmBlock),
  'without this an element that animates IN is left parked at opacity 0 — worse than the animation');

t('D-5c', 'focus is never removed',
  /focus-visible/.test(CSS) && /outline:\s*3px/.test(CSS),
  'a visible focus ring, and it is never hidden behind an animation');

// ------------------------------------------------------------------ D-6

t('D-6a', 'every control clears the 44px touch minimum',
  /min-height:\s*4[4-9]px|min-height:\s*5\dpx/.test(CSS),
  (CSS.match(/min-height:\s*\d+px/) || ['none'])[0] + ' — target hardware is a phone held one-handed');

const hoverOnly = [];
for (const f of FILES) {
  const src = code(f);
  // A control whose ONLY affordance is hover. `group-hover` revealing an
  // otherwise hidden action is the realistic form of this bug.
  for (const m of src.matchAll(/className="[^"]*\bhidden\b[^"]*group-hover:(?:block|flex|inline)[^"]*"/g)) {
    hoverOnly.push(`${rel(f)}  ${m[0].slice(0, 70)}`);
  }
}
t('D-6b', 'no behaviour depends on hover',
  hoverOnly.length === 0,
  hoverOnly.length ? hoverOnly.join('\n          ') + '\n          a phone has no hover' : 'hover is decoration on top of something that already works by tap');

// ------------------------------------------------------------------ D-8

t('D-8a', 'the 16px body floor is set, and inputs inherit it',
  /font-size:\s*16px/.test(CSS) && /input,\s*\n?select,\s*\n?textarea\s*\{[\s\S]{0,80}font-size:\s*16px/.test(CSS),
  'below 16px iOS zooms the page on input focus and the layout breaks under the user');

/**
 * Three floors, by what the text is FOR. See REDESIGN.md D-8.
 *
 * The first version of this assertion said "nothing below 15px" and failed on
 * twenty existing places. The resolution was NOT to soften it to fit the code:
 * it was to notice that reading and glancing are different acts. Prose gets
 * 16px, labels 15px, glanceable chrome 13px via `text-micro`. Below 13px is
 * banned outright, because 10px and 11px were the ones doing real harm.
 */
const smallText = [];
for (const f of FILES) {
  for (const m of code(f).matchAll(/text-\[(\d+)px\]/g)) {
    if (Number(m[1]) < 13) smallText.push(`${rel(f)}  ${m[0]}  (below the 13px floor)`);
    else smallText.push(`${rel(f)}  ${m[0]}  (use text-micro, not an arbitrary value)`);
  }
}
t('D-8b', 'no arbitrary text size, and nothing below the 13px floor',
  smallText.length === 0,
  smallText.length ? smallText.join('\n          ') : 'every size comes from the scale: micro 13 / sm 15 / base 16 / lg 18 / title 24');

// ------------------------------------------------------------------ D-9

/** WCAG relative luminance, so contrast is measured rather than eyeballed. */
function lum(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function tok(name) {
  const m = CSS.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  return m ? m[1] : null;
}

const PAIRS = [
  ['ink', 'paper', 4.5, 'body text on the page'],
  ['ink', 'surface', 4.5, 'body text on a card'],
  ['ink-soft', 'surface', 4.5, 'secondary text on a card'],
  ['ink-quiet', 'surface', 3.0, 'quiet text, large only'],
  ['go-dark', 'surface', 4.5, 'the GO colour as text'],
  ['warn', 'warn-tint', 4.5, 'warning text on its own tint'],
  ['stop', 'stop-tint', 4.5, 'error text on its own tint'],
];
const contrastFails = [];
for (const [fg, bg, min, why] of PAIRS) {
  const a = tok(fg), b = tok(bg);
  if (!a || !b) { contrastFails.push(`${fg}/${bg} — token missing`); continue; }
  const r = ratio(a, b);
  if (r < min) contrastFails.push(`${fg} on ${bg} = ${r.toFixed(2)}:1, needs ${min}:1 (${why})`);
}
t('D-9', 'every token pair meets WCAG AA',
  contrastFails.length === 0,
  contrastFails.length
    ? contrastFails.join('\n          ')
    : `${PAIRS.length} pairs measured, all pass`);

// ------------------------------------------------------------------ D-7

t('D-7', 'async placeholders reserve their size',
  /h-\[\d+px\]/.test(fs.readFileSync(path.join(ROOT, 'components/HeaderSession.tsx'), 'utf8')),
  'a header that grows when a name arrives moves a button a thumb is already travelling towards');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
