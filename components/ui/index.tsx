/**
 * THE UI KIT. Every screen is built from these and nothing else.
 *
 * Taken from the Stitch "Academic Distinction" system (docs/design-reference/
 * stitch/) and expressed once, here, in the tokens that already exist. The
 * whole point is that a screen never names a colour, a radius or a duration —
 * it names a COMPONENT, and the component owns the look.
 *
 * That is D-1 with teeth. `design-check.js` can only stop a raw hex; it cannot
 * stop nine pages each inventing a slightly different card. This can.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE MAY NEVER DO
 *
 * Nothing in here fetches, decides, routes conditionally, or holds product
 * state. These are presentation components: they receive what to draw and draw
 * it. The lifecycle — credits, resume, entitlement, payment, the interview —
 * has been tested hard and must not be touched by a redesign.
 *
 * If a component in here ever needs to know whether a student has paid, it is
 * the wrong component.
 * ---------------------------------------------------------------------------
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ layout */

/** The page frame. One max width, one rhythm, everywhere. */
export function Page({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={`mx-auto flex w-full max-w-[1120px] flex-col gap-10 px-4 py-6 md:gap-16 md:px-10 md:py-12 ${className}`}
    >
      {children}
    </main>
  );
}

/** A page title with its optional one-line context underneath. */
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <header>
      <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
        {title}
      </h1>
      {sub && <p className="mt-2 text-ink-soft">{sub}</p>}
    </header>
  );
}

/** A section heading with the thin rule underneath that Stitch uses. */
export function SectionTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`border-b border-line pb-3 font-serif text-title font-semibold text-ink ${className}`}>
      {children}
    </h2>
  );
}

/* ------------------------------------------------------------------- card */

export function Card({
  children,
  className = '',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'li';
}) {
  return (
    <As className={`rounded-card border border-line bg-surface p-5 shadow-card md:p-6 ${className}`}>
      {children}
    </As>
  );
}

/* ---------------------------------------------------------------- buttons */

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger';

const VARIANT: Record<Variant, string> = {
  /** GO. One per screen, and only for the action the screen exists for. */
  primary: 'bg-go text-white hover:bg-go-dark',
  /** Serious, but not the primary action. */
  secondary: 'bg-ink text-white hover:opacity-90',
  /** Everything else. */
  tertiary: 'border border-line bg-surface text-ink hover:bg-surface-sunk',
  danger: 'border-2 border-stop bg-surface text-stop hover:bg-stop-tint',
};

const BUTTON_BASE =
  'inline-flex min-h-tap items-center justify-center gap-2 rounded-control px-5 py-3 text-base font-bold ' +
  'transition-colors duration-tap ease-move active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  children,
  variant = 'primary',
  full,
  className = '',
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`${BUTTON_BASE} ${VARIANT[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
}

/** Same shape as Button, but it navigates. Kept identical so the two can never drift. */
export function ButtonLink({
  children,
  href,
  variant = 'primary',
  full,
  className = '',
  ...rest
}: {
  children: ReactNode;
  href: string;
  variant?: Variant;
  full?: boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link
      href={href}
      {...rest}
      className={`${BUTTON_BASE} ${VARIANT[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ chips */

export type Tone = 'neutral' | 'go' | 'warn' | 'stop' | 'info';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-sunk text-ink-soft border-line',
  go: 'bg-go-tint text-go-dark border-go/30',
  warn: 'bg-warn-tint text-warn border-warn/30',
  stop: 'bg-stop-tint text-stop border-stop/30',
  info: 'bg-surface-sunk text-brand-light border-line',
};

/**
 * A status chip. ALWAYS carries a word.
 *
 * D-9: colour is never the only carrier of meaning. A red dot on its own is
 * invisible to a colour-blind student and meaningless to everybody else.
 */
export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-micro font-bold ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/** A small uppercase section label. Stitch uses these to structure a page. */
export function Eyebrow({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const colour = tone === 'go' ? 'text-go-dark' : tone === 'warn' ? 'text-warn' : 'text-ink-quiet';
  return (
    <p className={`text-micro font-bold uppercase tracking-[0.08em] ${colour}`}>{children}</p>
  );
}

/* ---------------------------------------------------------------- banners */

/**
 * A full-width message. Used for resume, for warnings, for refusals.
 *
 * `tone` decides colour, but the TITLE always says what the tone means, so the
 * banner reads correctly in greyscale.
 */
export function Banner({
  tone = 'go',
  eyebrow,
  title,
  children,
  action,
}: {
  tone?: Tone;
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const shell: Record<Tone, string> = {
    go: 'border-go bg-go-tint',
    warn: 'border-warn/40 bg-warn-tint',
    stop: 'border-stop/40 bg-stop-tint',
    info: 'border-line-strong bg-surface-sunk',
    neutral: 'border-line bg-surface',
  };
  return (
    <div className={`rounded-card border-2 p-5 md:p-6 ${shell[tone]}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1 text-micro font-bold uppercase tracking-[0.08em]">{eyebrow}</p>
          )}
          <p className="font-serif text-lg font-bold text-ink">{title}</p>
          {children && <div className="mt-1 text-ink-soft">{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ progress ---- */

/**
 * The balance ring. The most important element on the dashboard.
 *
 * The client's requirement, in his words: the dashboard's job is to show "how
 * many mock and practice sessions are left with them". So this is deliberately
 * large, deliberately first, and turns amber at 1 or 0 — because a student who
 * only discovers they are out at the moment they are refused has been failed by
 * the screen.
 *
 * `value` and `total` are given, never computed here. This component must not
 * know what a credit is.
 */
export function StatRing({
  value,
  total,
  label,
  sub,
  tone = 'go',
}: {
  value: number;
  total?: number;
  label: string;
  sub?: string;
  tone?: 'go' | 'ink';
}) {
  const low = value <= 1;
  const stroke = low ? 'var(--warn)' : tone === 'go' ? 'var(--go)' : 'var(--ink)';
  const pct = total && total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  const R = 34;
  const C = 2 * Math.PI * R;

  return (
    <Card className="flex items-center gap-5">
      <div className="relative h-[88px] w-[88px] shrink-0">
        <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
          <circle cx="40" cy="40" r={R} fill="none" stroke="var(--line)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
          />
        </svg>
        <span
          className={`absolute inset-0 grid place-items-center font-serif text-[1.75rem] font-bold ${
            low ? 'text-warn' : 'text-ink'
          }`}
        >
          {value}
        </span>
      </div>
      <div className="min-w-0">
        <p className="font-serif text-lg font-semibold leading-snug text-ink">{label}</p>
        {sub && <p className="text-sm text-ink-quiet">{sub}</p>}
        {low && (
          <p className="mt-1 text-micro font-bold text-warn">
            Running low — top up before your interview.
          </p>
        )}
      </div>
    </Card>
  );
}

/** A thin progress bar. Used for "3 of 17 answered". */
export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${value} of ${total} answered`}
    >
      <div className="h-full rounded-full bg-go transition-[width] duration-panel ease-move" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* --------------------------------------------------------------- monogram */

/**
 * The university tile. Fixed size, always.
 *
 * A logo file drops INSIDE it without changing its size, so a missing logo
 * never shifts the layout and a wrong-sized one never stretches (D-7). Until
 * the real logos are downloaded, the initials look deliberate rather than
 * broken — and a generated logo would be a fake of somebody else's trademark.
 */
export function Monogram({
  name,
  src,
  size = 56,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const initials = name
    .replace(/^University of /i, '')
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join('');

  return (
    <span
      className="grid shrink-0 place-items-center overflow-hidden rounded-control border border-line bg-surface-sunk"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size - 16} height={size - 16} className="object-contain" />
      ) : (
        <span className="font-serif text-[1.05rem] font-bold tracking-wide text-ink">{initials}</span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------- rows */

/** A tappable list row: monogram, title, meta, a chip, a chevron. */
export function Row({
  href,
  monogram,
  title,
  meta,
  chip,
}: {
  href: string;
  monogram?: ReactNode;
  title: string;
  meta?: string;
  chip?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-tap items-center gap-4 rounded-card border border-transparent p-3 transition-colors duration-tap ease-move hover:border-line hover:bg-surface"
    >
      {monogram}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-serif text-lg font-semibold text-ink">{title}</span>
        {meta && <span className="block text-sm text-ink-quiet">{meta}</span>}
      </span>
      {chip}
      <ChevronRight />
    </Link>
  );
}

/* ------------------------------------------------------------ empty state */

export function EmptyState({
  image,
  title,
  children,
  action,
}: {
  /** A path under /img. Omitted safely if the file is not there yet. */
  image?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center py-10 text-center">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" width={160} height={120} className="mb-5 opacity-90" />
      )}
      <p className="font-serif text-title font-semibold text-ink">{title}</p>
      {children && <div className="mx-auto mt-2 max-w-md text-ink-soft">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

/* ------------------------------------------------------------------ icons */

/** Thin-stroke icons, matching the type. No icon font, no CDN. */
export function ChevronRight({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`h-5 w-5 shrink-0 text-ink-quiet transition-colors duration-tap group-hover:text-ink ${className}`}>
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={`h-5 w-5 shrink-0 text-go ${className}`}>
      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`h-5 w-5 shrink-0 animate-spin ${className}`}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

/* ------------------------------------------------------------------ bands */

/**
 * The four result bands, used on the report and on every report row.
 *
 * Wording is deliberate. "At risk" rather than "Fail": this is practice, and a
 * frightened student who reads "Fail" on a mock will not come back for the
 * second one — which is the one that would have helped them.
 */
export type Band = 'ready' | 'almost_ready' | 'needs_practice' | 'risky';

export const BAND: Record<Band, { label: string; tone: Tone; shell: string; text: string }> = {
  ready: { label: 'Ready', tone: 'go', shell: 'border-go bg-go-tint', text: 'text-go-dark' },
  almost_ready: { label: 'Almost ready', tone: 'info', shell: 'border-line-strong bg-surface-sunk', text: 'text-brand-light' },
  needs_practice: { label: 'Needs practice', tone: 'warn', shell: 'border-warn/40 bg-warn-tint', text: 'text-warn' },
  risky: { label: 'At risk', tone: 'stop', shell: 'border-stop/40 bg-stop-tint', text: 'text-stop' },
};

export function BandChip({ band }: { band: Band | string | null | undefined }) {
  const b = BAND[(band as Band) ?? 'needs_practice'] ?? BAND.needs_practice;
  return <Chip tone={b.tone}>{b.label}</Chip>;
}
