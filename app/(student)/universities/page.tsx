'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { publicInstitutions } from '@/lib/data/institutions';
import type { Institution } from '@/lib/types';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

/**
 * University-first browsing. The competitor's single best idea: a student who
 * sees their own university's name believes the product is for them. This is a
 * far better entry point than a profile form.
 */
export default function UniversitiesPage() {
  return (
    <Suspense fallback={<main className="p-6 text-slate-500">Loading universities...</main>}>
      <UniversityBrowser />
    </Suspense>
  );
}

function UniversityBrowser() {
  const router = useRouter();
  // QA finding LIVE-006: the home page links here with ?q=BPP but the field
  // came up blank and every card was shown, so the link promised a filter it
  // never applied.
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [type, setType] = useState<'all' | 'Pre-CAS' | 'CAS' | 'Pre-Admission'>('all');
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /**
   * WALK 1.11. When the server refuses, it now says where to go next. Holding
   * that here is what turns a red sentence into something a student can act on.
   */
  const [errorAction, setErrorAction] = useState<{ label: string; href: string } | null>(null);
  /** Whether this student still has a free try to spend, so the cards can stop
   *  promising one to somebody who has already used theirs. */
  const [hasCredit, setHasCredit] = useState<boolean | null>(null);
  // QA B1: the catalogue let anyone start an interview without signing in.
  // We check once on load so the buttons can say "Sign in to start" instead of
  // failing after the tap.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me')
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setSignedIn(Boolean(j?.data?.signedIn));
        setHasCredit(
          j?.data?.signedIn ? Boolean(j?.data?.entitlement?.canStartMock) : true
        );
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The catalogue already sends a refused student to sign in with
   * `?start=<slug>` so they can be brought back to the university they picked.
   * Nothing ever read that parameter, so they were returned to a page of forty
   * seven cards and had to find theirs again. Now they land where they were.
   */
  const [resumed, setResumed] = useState(false);
  useEffect(() => {
    const wanted = searchParams.get('start');
    if (!wanted || resumed || signedIn !== true) return;
    setResumed(true);
    void start(wanted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, signedIn, resumed]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return publicInstitutions().filter((i) => {
      const matchQ =
        !needle ||
        i.name.toLowerCase().includes(needle) ||
        i.shortName.toLowerCase().includes(needle) ||
        i.city.toLowerCase().includes(needle);
      const matchType = type === 'all' || i.interviewType === type;
      return matchQ && matchType;
    });
  }, [q, type]);

  // B20: the pinned six first, then the rest of the UK. Both come from the
  // same filtered set, so search and the chips work across everything.
  const featured = useMemo(() => results.filter((i) => i.featured), [results]);
  const others = useMemo(() => results.filter((i) => !i.featured), [results]);

  async function start(slug: string) {
    // Not signed in: send them to sign in and come straight back here.
    if (signedIn === false) {
      router.push(`/start?next=${encodeURIComponent('/universities?start=' + slug)}`);
      return;
    }
    setStarting(slug);
    setError(null);
    setErrorAction(null);
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No entitlement fields. The server decides trial length. LIVE-003.
        body: JSON.stringify({ institution: slug, mode: 'test' }),
      });
      const json = (await res.json()) as
        | { ok: true; data: { sessionId: string } }
        | { ok: false; error: { userMessage: string; action?: { label: string; href: string } } };

      if (!json.ok) {
        // Session expired between load and tap: recover by signing in again
        // rather than showing a dead error.
        if (res.status === 401) {
          router.push(`/start?next=${encodeURIComponent('/universities?start=' + slug)}`);
          return;
        }
        setError(json.error.userMessage);
        setErrorAction(json.error.action ?? null);
        // Their free try is gone, so stop the cards promising one.
        if (res.status === 402) setHasCredit(false);
        setStarting(null);
        return;
      }
      router.push(`/interview/${json.data.sessionId}`);
    } catch {
      setError('We could not start your interview. Check your internet connection and try again.');
      setStarting(null);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* B19: centred header, prominent search and chips, per
            docs/design-reference/universities_catalogue. */}
        <h1 className="mb-2 text-center font-serif text-3xl font-bold text-ink sm:text-4xl">
          Choose your university
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-center text-slate-600">
          Questions are built from the credibility themes universities publish, not from any leaked
          question list.
        </p>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for universities, cities..."
          aria-label="Search universities"
          className="mx-auto mb-4 block w-full max-w-xl rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none focus:border-ink"
        />

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {(['all', 'Pre-CAS', 'CAS', 'Pre-Admission'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                type === t
                  ? 'bg-emerald-400 text-ink'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* WALK 1.11. A student who has used their free ten taps Start and gets
            told no. Told no with nothing to click reads as broken. The server
            sends the way out with the refusal, and it is rendered as a real
            button under the sentence. Amber, not red: nothing has gone wrong,
            this is simply the paid part. */}
        {error && (
          <div
            className={`mb-4 rounded-xl border-2 px-4 py-3 ${
              errorAction ? 'border-amber-300 bg-amber-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <p className={`font-medium ${errorAction ? 'text-amber-900' : 'text-red-800'}`}>
              {error}
            </p>
            {errorAction && (
              <Link
                href={errorAction.href}
                className="mt-3 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white"
              >
                {errorAction.label}
              </Link>
            )}
          </div>
        )}

        {results.length === 0 ? (
          /**
           * N-40. Never a dead end here.
           *
           * "We do not have that university" with no button is the worst
           * screen in the funnel: the student has typed their own university,
           * been told no, and been given nothing to press. The questions in a
           * credibility interview are overwhelmingly the same wherever you
           * apply, so a student whose university is missing loses almost
           * nothing by practising the general UK paper — and loses everything
           * if we send them away.
           */
          <div className="rounded-2xl border-2 border-ink bg-white p-8 text-center">
            <p className="mb-2 font-semibold text-ink">
              Your university is not on our list yet
            </p>
            <p className="mx-auto mb-5 max-w-md leading-relaxed text-slate-600">
              That does not stop you. A Pre-CAS interview asks the same themes wherever you apply,
              so you can practise the general UK paper right now and it will still be the interview
              you are about to sit.
            </p>
            <button
              onClick={() => start(publicInstitutions()[0]?.slug ?? 'bpp-university')}
              disabled={starting !== null}
              className="inline-flex items-center justify-center rounded-xl bg-ink px-6 py-3.5 font-bold text-white disabled:opacity-60"
            >
              {starting ? 'Starting...' : 'Practise the general UK interview'}
            </button>
            <p className="mt-3 text-sm text-slate-500">
              Or try a shorter search — "Coventry" rather than "Coventry University London".
            </p>
          </div>
        ) : (
          <>
          {/* B20: the six our students actually apply to are pinned under
              "Most applied"; the rest of the UK is listed below so a student
              can always find their own university. */}
          {featured.length > 0 && (
            <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-bold text-ink">
              <span className="text-emerald-500" aria-hidden>
                ★
              </span>
              Most applied
            </h2>
          )}
          <ul className="grid gap-4 sm:grid-cols-2">
            {featured.map((i) => (
              <UniCard key={i.id} i={i} starting={starting} signedIn={signedIn} hasCredit={hasCredit} onStart={start} />
            ))}
          </ul>

          {others.length > 0 && (
            <>
              <h2 className="mb-4 mt-10 font-serif text-xl font-bold text-ink">
                All UK universities
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {others.length} more
                </span>
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {others.map((i) => (
                  <UniCard key={i.id} i={i} starting={starting} signedIn={signedIn} hasCredit={hasCredit} onStart={start} />
                ))}
              </ul>
            </>
          )}
          </>
        )}
      </div>
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * One university card. Extracted so the pinned six and the wider UK list
 * cannot drift apart visually.
 */
function UniCard({
  i,
  starting,
  signedIn,
  hasCredit,
  onStart,
}: {
  i: Institution;
  starting: string | null;
  signedIn: boolean | null;
  /** Null while we are still asking. False once we know they have none left. */
  hasCredit: boolean | null;
  onStart: (slug: string) => void;
}) {
  // WALK 1.11. Forty seven cards each promising a "free first try" to a student
  // who used theirs an hour ago is the product telling him something untrue,
  // and then refusing him when he believes it. The card tells the truth first.
  const locked = signedIn === true && hasCredit === false;
  return (
    <li className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* QA B2: several official marks are white artwork and vanished on a
              white chip. brightness(0) renders every mark as ink, so they are
              all visible and consistent. Universities with no mark of ours
              show a monogram: we never scrape a logo we are not licensed for. */}
          {i.logoUrl ? (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#eff4ff] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={i.logoUrl}
                alt=""
                className="max-h-full max-w-full object-contain opacity-70 [filter:brightness(0)]"
              />
            </span>
          ) : (
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-black text-white"
              style={{ backgroundColor: i.accent }}
            >
              {i.monogram}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-bold leading-tight text-ink">{i.name}</h3>
            <p className="mt-0.5 text-sm text-slate-500">{i.city}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
            locked ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {locked ? 'Needs a pack' : 'Free first try'}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-center">
          <p className="text-xs text-slate-500">Duration</p>
          <p className="font-bold text-ink">{i.durationMinutes} mins</p>
        </div>
        <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-center">
          <p className="text-xs text-slate-500">Questions</p>
          <p className="font-bold text-ink">{i.questionCount} Qs</p>
        </div>
      </div>

      <button
        onClick={() => onStart(i.slug)}
        disabled={starting !== null}
        className="mt-auto w-full rounded-xl bg-ink px-5 py-3.5 text-base font-bold text-white transition hover:bg-ink/90 active:scale-[0.99] disabled:opacity-50"
      >
        {starting === i.slug
          ? 'Starting...'
          : signedIn === false
            ? 'Sign in to start'
            : locked
              ? 'Buy a pack to start'
              : 'Start interview'}
      </button>
    </li>
  );
}
