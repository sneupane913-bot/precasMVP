import Link from 'next/link';

/**
 * Global header for the public marketing pages (home, universities, pricing,
 * legal). NOT used inside the interview room, where the top bar is the
 * institution and progress instead. See docs/UX_AUDIT.md G2.
 *
 * Server component on purpose: no client state, so it stays fast on a cheap
 * phone. Nav links collapse on small screens to keep the primary action clear.
 */
export function SiteHeader() {
  const nav = [
    { label: 'Universities', href: '/universities' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Pricing', href: '/pricing' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        {/* Logo, links home */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 font-black text-white">
            P
          </span>
          <span className="font-serif text-lg text-ink">PreCAS Practice</span>
        </Link>

        {/* Center nav, hidden on small screens */}
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="text-sm font-medium text-slate-600 transition hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/start"
            className="hidden text-sm font-semibold text-ink transition hover:opacity-70 sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/start"
            className="inline-flex items-center justify-center rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white transition active:scale-[0.98]"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
