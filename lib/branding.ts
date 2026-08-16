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
