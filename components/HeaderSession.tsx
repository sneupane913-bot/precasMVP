'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * The right hand side of the header, and the only place in the product a
 * student can sign out.
 *
 * WALK 1.16 found that no sign out control existed anywhere. That is not a
 * missing nicety, it is the single worst thing in a consultancy lab: thirty
 * students share a handful of machines, the session cookie lasts ninety days,
 * and the next student to sit down is already signed in as the last one. They
 * can read a stranger's report and spend a stranger's credits, and the student
 * who paid has no way to prevent it. It is also simply what people expect: a
 * product that can be signed into and not out of feels like a trap.
 *
 * A client island rather than making the whole header client-side, so the rest
 * of the header still renders instantly on a cheap phone.
 */
export function HeaderSession() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setSignedIn(Boolean(j?.data?.signedIn));
        setName(j?.data?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
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
    setSignedIn(false);
    setName(null);
    setBusy(false);
    // A full navigation, not a soft push, so no cached page still shows the
    // previous student's name or numbers.
    window.location.href = '/';
  }

  // While we do not yet know, show the neutral actions. Never flash "Sign out"
  // at somebody who is not signed in.
  if (signedIn !== true) {
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
      {name && (
        <span className="hidden max-w-[9rem] truncate text-sm text-slate-500 md:inline">
          {name}
        </span>
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
