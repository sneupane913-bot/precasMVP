import Link from 'next/link';
import { HeaderSession, type SessionSnapshot } from '@/components/HeaderSession';

/**
 * Global header for the public pages. NOT used inside the interview room,
 * where the top bar is the institution and progress instead.
 *
 * Redesigned 16 Aug onto the Stitch "Academic Distinction" system. The layout
 * is the one thing that changed: a taller bar, the serif wordmark carrying more
 * weight, a thin line rather than a shadow, and the nav in ink-soft so the
 * balance pill and the primary action are the only things competing for
 * attention.
 *
 * `session` is optional and exists to kill the sign-in flash. A SERVER page
 * reads the cookie itself and passes the answer in, so the first paint is
 * already correct. A CLIENT page cannot — this becomes a client component there
 * and has no cookie access — so it omits the prop and HeaderSession shows a
 * neutral placeholder for the moment it takes to ask. Neither ever shows the
 * wrong state.
 */
export function SiteHeader({ session }: { session?: SessionSnapshot } = {}) {
  const nav = [
    { label: 'Universities', href: '/universities' },
    { label: 'Practise one question', href: '/practice' },
    { label: 'Pricing', href: '/pricing' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-4 md:px-10">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-control transition-opacity duration-tap ease-move hover:opacity-80"
        >
          <span className="grid h-8 w-8 place-items-center rounded-control bg-go font-serif font-black text-white">
            P
          </span>
          <span className="font-serif text-lg font-bold text-ink">PreCAS Practice</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="text-sm font-medium text-ink-soft transition-colors duration-tap ease-move hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        {/* D19: a signed-in student needs a way back to their own history.
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
