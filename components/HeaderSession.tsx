'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * The right hand side of the header, and the only place in the product a
 * student can sign out.
 *
 * WALK 1.16 found that no sign out control existed anywhere. That is not a
 * missing nicety, it is the single worst thing in a consultancy lab: thirty
 * students share a handful of machines, the session cookie lasts ninety days,
 * and the next student to sit down is already signed in as the last one. They
 * can read a stranger's report and spend a stranger's credits, and the student
 * who paid has no way to prevent it.
 *
 * ---------------------------------------------------------------------------
 * TESTED WALK, 14 Aug — the bug the client reported twice and I closed twice.
 *
 * The client signed in, landed on /universities, and the header showed
 * "Sign in / Start free" as though nothing had happened. They reported it, I
 * looked at the code, the code was right, and I closed it. They reported it
 * again. Watching it happen in a browser took ten seconds to find.
 *
 * This component used to hold ONE piece of state — `signedIn: boolean | null` —
 * and render with `if (signedIn !== true) return <SignedOut/>`. That single
 * line collapses two completely different situations into one:
 *
 *     null  = "I have not asked the server yet"
 *     false = "I asked, and nobody is signed in"
 *
 * and then renders both as SIGNED OUT. So on every page load, every signed-in
 * student is told "Sign in" for as long as /api/me takes to answer. On this
 * Mac, on localhost, that was over four seconds. On a mid-range Android on
 * Nepali mobile data it is worse.
 *
 * The old comment above that line said "never flash Sign out at somebody who
 * is not signed in", and it was right that the reverse would be bad. But the
 * cure was worse than the disease: flashing "Sign in" at somebody who IS
 * signed in tells them the product has forgotten them, which is the exact
 * fear PILOT-01 was about, and it happens on every single navigation rather
 * than in a rare edge case.
 *
 * It is the same mistake as G-1 in a different costume: **do not assert a
 * state you have not established.** G-1 refuses to score an answer it could
 * not hear. This now refuses to claim a session state it has not confirmed.
 *
 * Two fixes:
 *   1. `unknown` is its own state and renders a neutral placeholder of the
 *      same width, so nothing lies and nothing jumps.
 *   2. Server-rendered pages pass the answer in as `initial`, so there is no
 *      unknown phase at all and the first paint is already correct. Client
 *      pages (/universities, /account, /practice) cannot do that — a server
 *      component imported into a client page becomes a client component — so
 *      they get the honest placeholder and resolve a moment later.
 * ---------------------------------------------------------------------------
 */
export interface SessionSnapshot {
  signedIn: boolean;
  name: string | null;
  /**
   * What they have left, shown in the header on every page.
   *
   * The client's words: "does it show it somewhere above, because it has to
   * show it somewhere above". It did not. The balance existed only on
   * /account, so a student who never opened that page had no idea how many
   * mocks they had left until the moment they were refused one, and the
   * "nearly out" nudge lived on the same page they were not visiting.
   *
   * Undefined means not known yet, which is never rendered as a number.
   */
  mocksLeft?: number;
  practiceLeft?: number;
}

export function HeaderSession({ initial }: { initial?: SessionSnapshot }) {
  // `undefined` means we genuinely do not know yet. It is never rendered as
  // either signed in or signed out.
  const [session, setSession] = useState<SessionSnapshot | undefined>(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Still re-check even when the server told us, because the session may have
    // been ended in another tab — a real case in a consultancy lab, where the
    // point of Sign out is that it takes effect everywhere.
    let cancelled = false;
    fetch('/api/me')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        // `/api/me` already carries the entitlement, so the header count stays
        // correct after an answer is given without a page reload. Without this
        // the client re-check would blank the number it had just rendered.
        setSession({
          signedIn: Boolean(j?.data?.signedIn),
          name: j?.data?.name ?? null,
          mocksLeft: j?.data?.entitlement?.mocksLeft,
          practiceLeft: j?.data?.entitlement?.practiceLeft,
        });
      })
      .catch(() => {
        // A failed check is NOT evidence of being signed out. If the server
        // told us at render time, keep believing it; only fall back to signed
        // out when we never had an answer in the first place.
        if (!cancelled) setSession((s) => s ?? { signedIn: false, name: null });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    setBusy(true);
    try {
      await fetch('/api/me', { method: 'DELETE' });
    } catch {
      // Even if the call fails we still send them home, and the cookie is
      // cleared on the next successful request. Leaving them stuck on a page
      // that says "Signing out..." forever would be worse.
    }
    setSession({ signedIn: false, name: null });
    setBusy(false);
    // A full navigation, not a soft push, so no cached page still shows the
    // previous student's name or numbers.
    window.location.href = '/';
  }

  // ---- unknown: say nothing, but hold the space so the header does not jump.
  if (session === undefined) {
    return (
      <div
        aria-hidden
        className="h-[42px] w-[132px] animate-pulse rounded-xl bg-slate-200/60"
      />
    );
  }

  if (!session.signedIn) {
    return (
      <>
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
      </>
    );
  }

  return (
    <>
      {/* Their own name, so on a shared machine it is obvious at a glance
          whose account is open. */}
      {session.name && (
        <span className="hidden max-w-[9rem] truncate text-sm text-slate-500 md:inline">
          {session.name}
        </span>
      )}
      {/*
        What they have left, on every page.

        Amber at 1 or 0 so the warning finds them wherever they are, rather
        than waiting on /account for a visit that may never come. It is a link,
        so the answer to "how do I get more" is one tap away from the number
        itself.
      */}
      {typeof session.mocksLeft === 'number' && (
        <Link
          href="/account"
          title={`${session.mocksLeft} mock interviews and ${session.practiceLeft ?? 0} practice questions left`}
          className={`hidden rounded-full px-3 py-1 text-xs font-bold transition sm:inline ${
            session.mocksLeft <= 1
              ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          {session.mocksLeft === 0
            ? `No mocks left · ${session.practiceLeft ?? 0} practice`
            : `${session.mocksLeft} mock${session.mocksLeft === 1 ? '' : 's'} · ${session.practiceLeft ?? 0} practice`}
        </Link>
      )}
      <Link
        href="/account"
        className="hidden text-sm font-semibold text-slate-600 transition hover:text-ink sm:inline"
      >
        My practice
      </Link>
      <button
        onClick={signOut}
        disabled={busy}
        className="inline-flex items-center justify-center rounded-xl border-2 border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? 'Signing out...' : 'Sign out'}
      </button>
    </>
  );
}
