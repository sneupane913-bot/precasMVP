/**
 * qa/phone-walk.mjs — LOOK AT IT ON A PHONE, WITH A RULER.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 *
 * REDESIGN.md T-5 says the phone pass is part of the definition of done and
 * that no suite substitutes for it. That is still true, and this does not try
 * to. A person still has to hold a real Android on real mobile data and use the
 * camera, the microphone, the meter and the countdown.
 *
 * But there is a class of defect that a person looking at a phone WILL miss and
 * a ruler will not, and on 17 August it produced four real ones at once:
 *
 *   - every footer link was 18px tall and every header link 23px, against a
 *     44px rule that `design-check` D-6a asserts and passes. It passes honestly:
 *     the rule IS in `globals.css`. It is scoped to `button` and
 *     `a[role="button"]`, and a nav link is neither, so the whole of the site
 *     navigation sat under half the minimum on every page.
 *   - `/pricing` slid 51px sideways at 390px, through an `overflow-x-auto` that
 *     was working, because a blanket `min-w-[640px]` on the shared Table meant
 *     a three-column price comparison demanded a back office's width.
 *   - `/owner` pushed its status line 35px off the right edge.
 *   - the sign-in wordmark was a 28px target.
 *
 * Not one of those is visible in a screenshot that has been scaled to fit, and
 * not one is visible to a suite that reads the source. They are visible to
 * `getBoundingClientRect()` in a real 390px viewport, which is all this is.
 *
 * THE MEASUREMENT THAT MATTERS MOST is `pageSlides`. It asks the only question
 * a student would ask — does the page move sideways under my thumb — by
 * actually scrolling it, rather than comparing `scrollWidth` to `clientWidth`.
 * Those two disagreed on `/pricing`: `document.body` fitted perfectly and the
 * page still slid. A proxy that can be right while the product is wrong is the
 * F-5 shape, and this project has paid for that one enough times.
 *
 * ---------------------------------------------------------------------------
 * RUNNING IT
 *
 * Playwright is deliberately NOT a dependency of this project — it is a large
 * install and the gate must stay runnable on a slow connection. So:
 *
 *     npx next dev -p 3400                 # in one terminal
 *     npm i -D playwright && npx playwright install chromium
 *     node qa/phone-walk.mjs               # in another
 *
 * Set QA_WALK_PORT to point it elsewhere. It exits non-zero on any finding, so
 * it can join the gate the day Playwright is worth installing on this machine.
 * ---------------------------------------------------------------------------
 */

import { chromium } from 'playwright';

const PORT = process.env.QA_WALK_PORT || 3400;
const BASE = `http://127.0.0.1:${PORT}`;

/** Every page a person can reach without a passcode. */
const PAGES = [
  ['home', '/'],
  ['universities', '/universities'],
  ['pricing', '/pricing'],
  ['practice', '/practice'],
  ['start', '/start'],
  ['checkout', '/checkout?pack=serious'],
  ['account', '/account'],
  ['dashboard', '/dashboard'],
  ['privacy', '/privacy'],
  ['terms', '/terms'],
  ['refund', '/refund'],
  ['consultancy', '/consultancy'],
  ['owner', '/owner'],
  ['admin', '/admin'],
  ['super', '/super'],
];

/**
 * 390 is an iPhone 12/13/14 and close to the mid-range Androids our students
 * carry. 1440 is the laptop the client reviews on. Designed at 360 first, per
 * D-6, so 390 is not the narrowest case — it is the common one.
 */
const WIDTHS = [
  ['phone', 390, 844],
  ['laptop', 1440, 900],
];

const findings = [];

const browser = await chromium.launch(
  process.env.QA_CHROMIUM ? { executablePath: process.env.QA_CHROMIUM } : {}
);

for (const [wname, width, height] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();

  for (const [name, path] of PAGES) {
    const where = `${wname} ${name}`;
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 90000 });
    } catch (e) {
      findings.push(`${where}: did not load — ${String(e).slice(0, 100)}`);
      continue;
    }
    await page.waitForTimeout(700);

    // 1. Does the page actually slide sideways? Asked by moving it.
    const slidesBy = await page.evaluate(() => {
      window.scrollTo(9999, 0);
      const x = window.scrollX;
      window.scrollTo(0, 0);
      return x;
    });
    if (slidesBy > 0) findings.push(`${where}: slides ${slidesBy}px sideways`);

    // 2. D-6. Tap targets.
    //
    // An inline link INSIDE a sentence is exempt, and the exemption is
    // deliberate rather than convenient: giving "see the refunds page" a 44px
    // box would tear a hole in the paragraph it lives in. The rule is about
    // controls. A link that is its own line — nav, footer, a card action — is a
    // control and is measured.
    const smallTargets = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('a,button,[role=button],input[type=radio],input[type=checkbox]')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.height >= 44) continue;

        // Inline inside prose? Its parent is a text block and it shares the
        // line with words either side of it.
        const parent = el.parentElement;
        const inProse = parent && ['P', 'LI', 'SPAN', 'STRONG', 'EM', 'LABEL', 'DD'].includes(parent.tagName)
          && (parent.textContent || '').trim().length > (el.textContent || '').trim().length + 8;
        if (inProse) continue;

        // A control wrapped in a label big enough to press IS pressable.
        const label = el.closest('label');
        if (label && label.getBoundingClientRect().height >= 44) continue;

        bad.push(`${el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return [...new Set(bad)];
    });
    for (const s of smallTargets) findings.push(`${where}: tap target under 44px — ${s}`);

    // 3. D-8. Nothing below the 13px floor, measured rather than grepped.
    const tinyText = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('body *')) {
        const hasOwnText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (!hasOwnText) continue;
        const size = parseFloat(getComputedStyle(el).fontSize);
        if (size && size < 13) {
          bad.push(`${Math.round(size * 10) / 10}px "${el.textContent.trim().slice(0, 30)}"`);
        }
      }
      return [...new Set(bad)];
    });
    for (const s of tinyText) findings.push(`${where}: text below the 13px floor — ${s}`);

    console.log(`  ${where.padEnd(24)} ${slidesBy || smallTargets.length || tinyText.length ? 'SEE FINDINGS' : 'clean'}`);
  }
  await ctx.close();
}
await browser.close();

console.log('');
if (findings.length === 0) {
  console.log(`  Nothing found across ${PAGES.length} pages at ${WIDTHS.length} widths.`);
  console.log('  This is NOT the phone pass. Camera, microphone, the meter, the');
  console.log('  countdown and install still need a real device on real data (T-5).');
} else {
  for (const f of findings) console.log(`  FAIL  ${f}`);
  console.log(`\n  ${findings.length} finding(s).`);
}
process.exit(findings.length ? 1 : 0);
