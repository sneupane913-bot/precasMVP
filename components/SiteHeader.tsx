import Link from 'next/link';
import { HeaderSession, type SessionSnapshot } from '@/components/HeaderSession';

/**
 * Global header for the public marketing pages (home, universities, pricing,
 * legal). NOT used inside the interview room, where the top bar is the
 * institution and progress instead. See docs/UX_AUDIT.md G2.
 *
 * Server component on purpose: no client state, so it stays fast on a cheap
 * phone. Nav links collapse on small screens to keep the primary action clear.
 *
 * `session` is optional and exists to kill the sign-in flash (see
 * HeaderSession). A SERVER page reads the cookie itself and passes the answer
 * in, so the very first paint is already correct. A CLIENT page cannot — this
 * component gets bundled as a client component there and has no cookie access
 * — so it omits the prop and HeaderSession shows a neutral placeholder for the
 * moment it takes to ask. Neither ever shows the wrong state.
 */
export function SiteHeader({ session }: { session?: SessionSnapshot } = {}) {
  const nav = [
    { label: 'Universities', href: '/universities' },
    { label: 'Practise one question', href: '/practice' },
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

        {/* Right side actions.
            D19: a signed-in student needs a way back to their own history.
            WALK 1.16: and a way OUT. These depend on whether anyone is signed
            in, so they live in a small client island rather than making the
            whole header client-side. */}
        <div className="flex items-center gap-2">
          <HeaderSession initial={session} />
        </div>
      </div>
    </header>
  );
}
