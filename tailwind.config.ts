import type { Config } from 'tailwindcss';

/**
 * THE DESIGN SYSTEM. See REDESIGN.md Part 1.
 *
 * Every value here reads from a CSS variable declared in `app/globals.css`.
 * Nothing is duplicated: a token has exactly one home, and this file only gives
 * it a Tailwind name.
 *
 * That indirection is the point. F-2 — a number written down twice and allowed
 * to disagree — is the defect shape that has cost this project the most, and it
 * has already appeared in the palette's own history: `ink` and `paper` used to
 * be hard-coded hex here while `--brand` lived in CSS, so a consultancy could
 * rebrand the accent and not the text it sat on.
 *
 * `design-check.js` fails the build if any component names a colour, duration
 * or easing directly instead of using one of these.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          dark: 'var(--brand-dark)',
          light: 'var(--brand-light)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          quiet: 'var(--ink-quiet)',
        },
        paper: 'var(--paper)',
        surface: {
          DEFAULT: 'var(--surface)',
          sunk: 'var(--surface-sunk)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        /** The single accent. GO, and nothing else. */
        go: {
          DEFAULT: 'var(--go)',
          dark: 'var(--go-dark)',
          tint: 'var(--go-tint)',
        },
        warn: {
          DEFAULT: 'var(--warn)',
          tint: 'var(--warn-tint)',
        },
        stop: {
          DEFAULT: 'var(--stop)',
          tint: 'var(--stop-tint)',
        },
      },

      fontFamily: {
        serif: ['"Noto Serif"', 'Georgia', 'Cambria', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },

      /**
       * D-8. Four sizes on a phone, five with the display size on desktop.
       * The floor is 16px and it is not negotiable: below it, iOS zooms the
       * page when an input takes focus and the layout breaks under the user.
       */
      fontSize: {
        /**
         * 13px. Glanceable chrome ONLY — status chips, counters, the monitor
         * panel. Never prose, never an instruction, never anything a student
         * has to READ rather than glance at.
         *
         * It exists because the alternative was worse. Twenty places were using
         * 10px and 11px, which is genuinely unreadable for a nervous
         * nineteen-year-old on a phone. Banning small type outright would have
         * meant either a 15px status chip that no longer fits its badge, or the
         * rule being quietly ignored. 13px is the honest floor for a thing you
         * look at rather than read.
         */
        micro: ['0.8125rem', { lineHeight: '1.35' }],
        sm: ['0.9375rem', { lineHeight: '1.5' }],   // 15px — labels and captions ONLY, never body
        base: ['1rem', { lineHeight: '1.6' }],      // 16px — the floor
        lg: ['1.125rem', { lineHeight: '1.55' }],   // 18px — lead paragraphs
        title: ['1.5rem', { lineHeight: '1.25' }],  // 24px — screen titles
        display: ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
      },

      borderRadius: {
        control: 'var(--r-control)',
        card: 'var(--r-card)',
      },

      boxShadow: {
        card: 'var(--shadow-card)',
      },

      /** D-2. Four durations, named by the context they belong to. */
      transitionDuration: {
        tap: 'var(--t-tap)',
        panel: 'var(--t-panel)',
        route: 'var(--t-route)',
      },

      /** D-3. Easing named by DIRECTION, so the wrong one reads wrong. */
      transitionTimingFunction: {
        enter: 'var(--e-enter)',
        exit: 'var(--e-exit)',
        move: 'var(--e-move)',
      },

      /**
       * D-4. Only `transform` and `opacity` appear in any keyframe.
       *
       * Never width, height, top or left: they trigger layout on every frame,
       * and the hardware this runs on is a mid-range Android on mobile data.
       * Never `scale(0)` either — it collapses an element into a point. Scale
       * to 0.96 and fade, which is what "gone" actually looks like.
       */
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.96)', opacity: '0.7' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { transform: 'scale(0.96)', opacity: '0' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },

      animation: {
        // Entrances decelerate into place (D-3).
        fadeIn: 'fadeIn var(--t-panel) var(--e-enter) both',
        slideUp: 'slideUp var(--t-panel) var(--e-enter) both',
        // Decorative, and stopped entirely under reduced motion.
        pulseRing: 'pulseRing 1.8s var(--e-move) infinite',
        marquee: 'marquee 28s linear infinite',
      },

      /** D-6. The thumb band, so a primary action can be placed in it. */
      spacing: {
        thumb: 'var(--thumb-band)',
      },

      minHeight: {
        tap: '48px',
      },
      minWidth: {
        tap: '48px',
      },
    },
  },
  plugins: [],
};

export default config;
