import Link from 'next/link';

/**
 * The one screen a student sees when a link does not work (K11, K12).
 *
 * There is exactly one of these on purpose. The two dead ends we had — an old
 * `/results/{id}` and an unknown `/interview/{id}` — were failing differently
 * and badly, and two separately maintained apology screens drift apart until
 * one of them is wrong. This is also the screen most likely to be read by a
 * frightened student who thinks they have lost money, so its copy is the copy
 * that matters most in the product.
 *
 * Three rules it must always keep:
 *
 *   1. Never a dead end. Two ways forward, always.
 *   2. Never blame the student, and never imply loss. "Nothing has been lost"
 *      appears before the reasons, not after them.
 *   3. Never say WHICH reason applies. Both call sites hide the difference
 *      between "does not exist" and "is not yours" on purpose: confirming that
 *      a guessed id exists is the leak that LIVE-002 was closed to prevent.
 */
export function RecoveryScreen({
  title,
  lead,
  reasons,
  primary,
  footnote,
}: {
  title: string;
  lead: string;
  reasons: [string, string][];
  primary: { href: string; label: string };
  footnote?: string;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-16">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-10 block text-center font-serif text-lg font-bold text-ink">
          PreCAS Practice
        </Link>

        <h1 className="mb-3 text-center font-serif text-display font-bold text-ink">{title}</h1>
        <p className="mb-6 text-center leading-relaxed text-ink-soft">{lead}</p>

        <div className="mb-8 rounded-card border border-line bg-surface p-5 shadow-card">
          <p className="mb-3 font-semibold text-ink">The usual reasons</p>
          <ul className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
            {reasons.map(([head, body]) => (
              <li key={head}>
                <strong className="text-ink">{head}</strong> {body}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={primary.href}
            className="inline-flex w-full items-center justify-center rounded-control bg-ink px-6 py-4 font-bold text-white"
          >
            {primary.label}
          </Link>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-control border-2 border-line-strong px-6 py-4 font-semibold text-ink-soft"
          >
            Go to the home page
          </Link>
        </div>

        {footnote && (
          <p className="mt-6 text-center text-sm leading-relaxed text-ink-quiet">{footnote}</p>
        )}
      </div>
    </main>
  );
}

/** Shared wording, so the two call sites cannot drift apart. */
export const WRONG_DEVICE: [string, string] = [
  'You are on a different device.',
  'Your practice is kept on the phone or computer you used at the time.',
];
export const CLEARED_DATA: [string, string] = [
  'You cleared your browsing data.',
  'That removes the record this browser kept of your practice.',
];
