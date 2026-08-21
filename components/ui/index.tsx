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

/**
 * Card tones.
 *
 * A tone rather than a `className` override, and the reason is not tidiness.
 * Passing `className="bg-ink"` to a component whose base already says
 * `bg-surface` leaves TWO background utilities on the element and lets the
 * generated stylesheet's ORDER decide which wins — which is not something the
 * page author can see, reason about, or test. That is F-2 with an invisible
 * arbiter. A tone picks exactly one.
 */
export type CardTone = 'default' | 'sunk' | 'ink' | 'go' | 'warn' | 'stop';

const CARD_TONE: Record<CardTone, string> = {
  default: 'border-line bg-surface',
  sunk: 'border-line bg-surface-sunk',
  /** The focal card. Used once per screen at most. */
  ink: 'border-ink bg-ink text-white',
  go: 'border-go bg-go-tint',
  warn: 'border-warn/40 bg-warn-tint',
  stop: 'border-stop/40 bg-stop-tint',
};

export function Card({
  children,
  className = '',
  tone = 'default',
  as: As = 'div',
}: {
  children: ReactNode;
  className?: string;
  tone?: CardTone;
  as?: 'div' | 'section' | 'li';
}) {
  return (
    <As className={`rounded-card border ${CARD_TONE[tone]} p-5 shadow-card md:p-6 ${className}`}>
      {children}
    </As>
  );
}

/* ---------------------------------------------------------------- buttons */

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'warn';

const VARIANT: Record<Variant, string> = {
  /** GO. One per screen, and only for the action the screen exists for. */
  primary: 'bg-go text-white hover:bg-go-dark',
  /** Serious, but not the primary action. */
  secondary: 'bg-ink text-white hover:opacity-90',
  /** Everything else. */
  tertiary: 'border border-line bg-surface text-ink hover:bg-surface-sunk',
  danger: 'border-2 border-stop bg-surface text-stop hover:bg-stop-tint',
  /** Reversible, but somebody will have to explain it. Pausing, unflagging. */
  warn: 'border-2 border-warn bg-surface text-warn hover:bg-warn-tint',
};

/**
 * Two sizes, and only two.
 *
 * `sm` is for a row action inside a dense back-office table, where a full-size
 * button would push a nine-column table off the screen. It is NOT a smaller tap
 * target: the 48px floor comes from `min-h-tap` here and from the global
 * `button { min-height: 48px }` in globals.css, and neither is negotiable
 * (D-6). Only the horizontal padding and the label size come down.
 */
type Size = 'sm' | 'md';

const SIZE: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-5 py-3 text-base',
};

const BUTTON_BASE =
  'inline-flex min-h-tap items-center justify-center gap-2 rounded-control font-bold ' +
  'transition-colors duration-tap ease-move active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  full,
  className = '',
  ...rest
}: {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  full?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={`${BUTTON_BASE} ${SIZE[size]} ${VARIANT[variant]} ${full ? 'w-full' : ''} ${className}`}
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
  size = 'md',
  full,
  className = '',
  ...rest
}: {
  children: ReactNode;
  href: string;
  variant?: Variant;
  size?: Size;
  full?: boolean;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>) {
  return (
    <Link
      href={href}
      {...rest}
      className={`${BUTTON_BASE} ${SIZE[size]} ${VARIANT[variant]} ${full ? 'w-full' : ''} ${className}`}
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
        /* QA B2 (applied here too): bpp.svg and uel.svg are white/reversed
           artwork (fill:#fff) and vanished on this light tile. brightness(0)
           flattens every mark to solid ink — all visible, all consistent,
           exactly as the TrustedBy strip and /start already render them. */
        <img
          src={src}
          alt=""
          width={size - 16}
          height={size - 16}
          className="object-contain [filter:brightness(0)]"
        />
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

/* ------------------------------------------------------------------ pills */

/**
 * A filter pill. Selected state is carried by FILL, not by colour alone, and
 * it reports `aria-pressed` so a screen reader hears the state that a sighted
 * student sees (D-9).
 *
 * This existed three times before it existed once: `/universities` had it
 * inline, `/practice` had a slightly different one, and `/admin` a third. Three
 * copies of a control is three chances for them to disagree, which is exactly
 * the shape (F-2) that this kit exists to make impossible.
 */
export function Pill({
  selected = false,
  children,
  className = '',
  ...rest
}: {
  selected?: boolean;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      aria-pressed={selected}
      className={`min-h-tap rounded-full border px-5 py-2 text-sm font-semibold transition-colors duration-tap ease-move ${
        selected
          ? 'border-go bg-go text-white'
          : 'border-line bg-surface text-ink-soft hover:bg-surface-sunk hover:text-ink'
      } ${className}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ input */

const INPUT_BASE =
  'block w-full rounded-control border border-line bg-surface px-4 py-3 text-base text-ink outline-none ' +
  'transition-colors duration-tap ease-move placeholder:text-ink-quiet focus:border-ink-quiet focus:bg-surface-sunk ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

/**
 * A labelled field.
 *
 * The label is a real `<label>` with a real `htmlFor`, never a placeholder
 * pretending to be one: a placeholder disappears the moment a student starts
 * typing, which is precisely when they most need to know what the box wanted.
 */
export function Field({
  label,
  id,
  hint,
  error,
  children,
}: {
  label: string;
  id: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-sm text-ink-quiet">{hint}</p>}
      {error && (
        <p className="text-sm font-semibold text-stop" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  className = '',
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${INPUT_BASE} ${className}`} />;
}

export function Textarea({
  className = '',
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${INPUT_BASE} ${className}`} />;
}

export function Select({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={`${INPUT_BASE} ${className}`}>
      {children}
    </select>
  );
}

/** The search box, with its magnifier. One implementation, used everywhere. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-quiet"
      >
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={`${INPUT_BASE} py-4 pl-12 pr-4`}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- status */

/**
 * D-32. A STATUS DOT THAT CARRIES A WORD.
 *
 * The defect was "super admin status dots unclear", and the honest reading of
 * it is not that the dots were the wrong colour — it is that a dot is not a
 * sentence. Green and amber are indistinguishable to roughly one man in twelve,
 * and even to everybody else "green" only means something once you have learned
 * this screen's private code.
 *
 * So the word is not optional here. It is the API. There is no way to render
 * this component without one, which is what makes D-9 hold rather than merely
 * be intended.
 */
export function Status({
  tone = 'neutral',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  const dot: Record<Tone, string> = {
    neutral: 'bg-ink-quiet',
    go: 'bg-go',
    warn: 'bg-warn',
    stop: 'bg-stop',
    info: 'bg-brand-light',
  };
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-ink">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- tables */

/**
 * A table inside a card, with a header strip and a horizontal scroll.
 *
 * The scroll is the whole reason this is a component. `/admin` and `/super`
 * are the two screens most likely to be opened on a phone in a hurry — a
 * consultancy owner checking a payment — and a nine-column table with no
 * overflow rule simply pushes the page sideways and breaks every other screen
 * width along with it.
 */
export function TableCard({
  title,
  action,
  children,
  note,
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-card border border-line bg-surface shadow-card">
      <header className="flex flex-col gap-3 border-b border-line p-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-serif text-title font-semibold text-ink">{title}</h2>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className="max-w-full overflow-x-auto">{children}</div>
      {note && (
        <p className="border-t border-line px-5 py-3 text-micro leading-relaxed text-ink-quiet">
          {note}
        </p>
      )}
    </section>
  );
}

/**
 * `minWidth` is OPT IN, and that is the whole lesson of this component.
 *
 * It shipped with a blanket `min-w-[640px]`, on the reasoning that a wide back
 * office should scroll rather than squeeze. Correct for nine columns. Wrong for
 * the three-column price comparison, which needs no minimum at all — and at
 * 390px it made the WHOLE PAGE slide 51px sideways, through an
 * `overflow-x-auto` that was doing its job, because a scrollable child's
 * min-content still reaches the document's scroll region in this arrangement.
 *
 * It is worth naming what that cost: a student on a phone, on the page where
 * they decide whether to pay, with the layout sliding under their thumb. And it
 * came from a sweep that was tidying class names. A default that is right for
 * the hardest case and wrong for the common one is not a default.
 */
export function Table({
  children,
  minWidth,
}: {
  children: ReactNode;
  /** Only for genuinely dense tables. Omit it and the table is fluid. */
  minWidth?: number;
}) {
  return (
    <table className="w-full text-left text-sm" style={minWidth ? { minWidth } : undefined}>
      {children}
    </table>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface-sunk text-micro font-bold uppercase tracking-[0.08em] text-ink-quiet">
      {children}
    </thead>
  );
}

export function TH({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-5 py-3 font-bold ${className}`}>{children}</th>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>;
}

export function TD({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-5 py-4 align-middle text-ink-soft ${className}`}>{children}</td>;
}
