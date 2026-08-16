'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FirebaseSignIn, type FirebaseWebConfig } from '@/components/FirebaseSignIn';

export default function StartPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-ink-quiet">Loading...</main>}>
      <StartInner />
    </Suspense>
  );
}

/**
 * The light gate.
 *
 * One Google button and nothing else. The marketing analyst pushed back hard
 * against a registration form before the trial, and the client agreed: full
 * details are captured at the report, once the student has felt some value.
 * Anything added to this page fights that decision.
 */
function StartInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [config, setConfig] = useState<FirebaseWebConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [softDenied, setSoftDenied] = useState<string | null>(null);

  const ref = params.get('ref') ?? undefined;
  const via = params.get('via') ?? undefined;
  /** N-1. The seat size the consultancy's link hands out. */
  const seat = params.get('seat') ?? undefined;
  /**
   * DB-1. Where sign-in sends them.
   *
   * An explicit ?next= always wins — that is what carries a pack choice through
   * the sign-in detour. Otherwise the server decides from whether they have
   * ever paid: a paying student goes to their dashboard, everyone else to the
   * catalogue. Dropping a paying student on the marketing page tells somebody
   * who has already given us money to consider giving us money.
   *
   * Resolved after /api/me answers, so it is never a guess.
   */
  const explicitNext = params.get('next');
  const next = explicitNext ?? '/universities';

  /**
   * PILOT-02. This page never used to ask whether you were ALREADY signed in.
   *
   * That is what turned a single failure into an endless loop. Any page that
   * got a 401 pushed the student here; this page showed the Google button
   * again; they signed in; they were pushed back; and round it went. The client
   * described exactly this: "my practice just reloads the sign in with Gmail
   * page again and again."
   *
   * So the first thing this page does now is check. If a session already
   * exists, we do not show a sign-in screen to somebody who is signed in — we
   * send them where they were going.
   */
  useEffect(() => {
    let cancelled = false;

    /**
     * V-9. Every fetch here is on a timeout, and `loading` is cleared in a
     * `finally`, because of what the client saw on an iPhone 6s: **no sign-in
     * button at all.**
     *
     * The cause was structural rather than a bug in any one line. This screen
     * renders a grey placeholder while `loading` is true, and `loading` was
     * only cleared after two awaited fetches had both resolved. On a slow or
     * old device, one stalled request meant the placeholder stayed forever and
     * the student simply never got a button to press.
     *
     * A sign-in screen must ALWAYS end up showing a way to sign in. If we
     * cannot reach our own API, that is our problem to display, not a reason
     * to show the student nothing.
     */
    const withTimeout = async (url: string, ms = 6000) => {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), ms);
      try {
        const r = await fetch(url, { signal: ac.signal });
        return await r.json();
      } finally {
        clearTimeout(timer);
      }
    };

    (async () => {
      try {
        const me = await withTimeout('/api/me');
        if (!cancelled && me?.data?.signedIn) {
          // DB-1. Decide from the ledger, not from a default. An explicit
          // ?next= still wins, because that is what carries a chosen pack
          // through the sign-in detour.
          const paid = Boolean(me?.data?.entitlement?.hasPaid);
          router.replace(explicitNext ?? (paid ? '/dashboard' : '/universities'));
          return;
        }
      } catch {
        // Cannot tell: show the sign-in screen. Better a needless sign-in than
        // a locked door.
      }
      if (cancelled) return;
      try {
        const j = await withTimeout('/api/auth/config');
        if (!cancelled) setConfig(j.data?.firebase ?? null);
      } catch {
        if (!cancelled) setConfig(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* ---------------- Left: why you are here ----------------
          Stitch "sign_in": the value proposition sits beside the button so the
          page never reads as a bare gate. Hidden on small screens, where the
          button must stay in the thumb zone. */}
      <aside className="hidden flex-col justify-between bg-surface-sunk px-12 py-12 lg:flex">
        <Link href="/" className="font-serif text-xl font-bold text-ink">
          PreCAS Practice
        </Link>

        <div className="max-w-md">
          <h2 className="mb-8 font-serif text-4xl font-bold leading-tight text-ink">
            Practise your UK interview
          </h2>
          <ul className="space-y-5">
            {[
              'Practise the themes universities really ask about.',
              'Record your answers and hear how you sound.',
              'See exactly what to fix, in simple English.',
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <span className="mt-0.5 shrink-0 text-go-dark" aria-hidden>
                  ✓
                </span>
                <span className="leading-relaxed text-ink-soft">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-micro font-semibold uppercase tracking-[0.15em] text-ink-quiet">
            Trusted by students applying to
          </p>
          <div className="flex items-center gap-6">
            {['bpp', 'coventry', 'uel'].map((slug) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={slug}
                src={`/university-logos/${slug}.svg`}
                alt=""
                /* QA B2: white-artwork logos were invisible here. */
                className="h-7 w-auto opacity-45 [filter:brightness(0)]"
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ---------------- Right: the single action ---------------- */}
      <div className="flex flex-col items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          {/* Brand shows on mobile, where the left panel is hidden. */}
          <Link
            href="/"
            className="mb-10 block text-center font-serif text-xl font-bold text-ink lg:hidden"
          >
            PreCAS Practice
          </Link>

          <h1 className="mb-2 text-center font-serif text-3xl font-bold text-ink">
            Sign in to start
          </h1>
          <p className="mb-10 text-center leading-relaxed text-ink-soft">
            One tap with Google. No password, no form, no payment.
          </p>

          {loading ? (
            <div className="h-14 animate-pulse rounded-control bg-surface-sunk" />
          ) : (
            <FirebaseSignIn
              config={config}
              referralCode={ref}
              via={via}
              seat={seat}
              onSignedIn={(r) => {
                // Soft deny is never a dead end: they keep browsing and can buy.
                if (r.trial.outcome === 'soft_denied' && r.trial.message) {
                  setSoftDenied(r.trial.message);
                  return;
                }
                /**
                 * DB-1, on the FIRST sign-in too. A returning payer who signs
                 * in fresh must land on their dashboard, not the catalogue.
                 * Asked here rather than assumed, because the trial grant may
                 * have just changed what they are entitled to.
                 */
                if (explicitNext) {
                  router.push(explicitNext);
                  return;
                }
                fetch('/api/me')
                  .then((x) => x.json())
                  .then((j) =>
                    router.push(j?.data?.entitlement?.hasPaid ? '/dashboard' : '/universities')
                  )
                  .catch(() => router.push('/universities'));
              }}
            />
          )}

      {softDenied && (
        <div className="mt-6 rounded-card border-2 border-warn/40 bg-warn-tint p-5">
          <p className="mb-1 font-bold text-warn">We need to check one thing</p>
          <p className="mb-4 text-sm leading-relaxed text-warn/90">{softDenied}</p>
          <div className="flex flex-col gap-2">
            <a
              href={`https://wa.me/${(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '').replace(/\D/g, '')}`}
              className="rounded-control bg-go px-5 py-3 text-center font-bold text-white"
            >
              Message us on WhatsApp
            </a>
            <button
              onClick={() => router.push('/pricing')}
              className="rounded-control border-2 border-line-strong px-5 py-3 font-semibold text-ink-soft"
            >
              Look at the packs instead
            </button>
          </div>
        </div>
      )}

      {ref && (
        <p className="mt-6 rounded-control bg-go-tint px-4 py-3 text-center text-sm text-go-dark">
          A friend invited you. When you buy a pack, they get a free mock too.
        </p>
      )}

          <p className="mt-6 text-center text-micro leading-relaxed text-ink-quiet">
            We use your Google account only to know it is you and to keep your practice history. We
            never post anything, and we never see your password.
          </p>

          <div className="mt-10 flex justify-center gap-6 text-micro text-ink-quiet">
            <Link href="/privacy" className="hover:text-ink">
              Privacy policy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms of use
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
