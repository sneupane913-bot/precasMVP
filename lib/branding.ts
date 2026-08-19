/**
 * The default consultancy brand colour.
 *
 * It was written as a raw `#0d1b2a` three times inside `app/admin/page.tsx` —
 * once as the colour picker's initial state and twice as a fallback — and it is
 * the same value as the `--ink` token. Four copies of one colour, in two
 * languages, is F-2 with a fuse lit: the first person to darken the brand will
 * change one or two of them.
 *
 * It has to be a literal SOMEWHERE, because `<input type="color">` cannot read a
 * CSS variable. So it lives here, once, and `--brand` in globals.css is
 * documented as tracking it.
 */
export const DEFAULT_BRAND_HEX = '#0d1b2a';

/**
 * THE PRODUCT NAME.
 *
 * Was "PreCAS Practice" — the placeholder name used throughout development
 * (see the old PROJECT_CONTEXT.md: "The product name is a placeholder... final
 * brand TBD"). The domain is now examtestai.com, so the placeholder had to go.
 *
 * It was written as a raw string 21 times across 16 files — the header logo,
 * the footer, every page's browser-tab title, the WhatsApp support messages,
 * the 404 page, the PWA manifest. A rename done by hand across that many
 * files is exactly how one gets missed and the product shows two names to two
 * different students. So it lives here once, and every one of those places
 * imports it instead of typing it.
 *
 * `qa/rules-check.js` checks the 404 page against this same constant, so a
 * change here that forgets to update the 404 page's own copy fails the gate
 * rather than shipping quietly wrong.
 */
export const BRAND_NAME = 'ExamTestAI';
