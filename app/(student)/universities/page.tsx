'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { publicInstitutions } from '@/lib/data/institutions';
import type { Institution } from '@/lib/types';
import { SiteHeader } from '@/components/SiteHeader';
import { Page, Card, Banner, Button, ButtonLink, Chip, Monogram, EmptyState, SectionTitle } from '@/components/ui';
import { SiteFooterView } from '@/components/SiteFooter';
import { useSupportNumber } from '@/lib/useSupportNumber';

/**
 * University-first browsing. The competitor's single best idea: a student who
 * sees their own university's name believes the product is for them. This is a
 * far better entry point than a profile form.
 */
export default function UniversitiesPage() {
  return (
    <Suspense fallback={<main className="p-6 text-ink-quiet">Loading universities...</main>}>
      <UniversityBrowser />
    </Suspense>
  );
}

function UniversityBrowser() {
  // D-1/D-2/D-4. The footer is sync now; the number comes from here.
  const supportNumber = useSupportNumber();
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
  /**
   * An interview they already started and never finished.
   *
   * Held here so the page can offer it BEFORE they tap anything. The 14 Aug
   * bug was not only that the credit looked spent — it was that nothing on
   * this page mentioned the sitting sitting there, so the only thing the
   * student could see was a wall telling them to pay.
   */
  const [inProgress, setInProgress] = useState<{
    sessionId: string;
    answered: number;
    total: number;
    institutionId: string;
    isPractice: boolean;
  } | null>(null);
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
        const ip = j?.data?.entitlement?.inProgress ?? null;
        setInProgress(ip && !ip.isPractice ? ip : null);
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

  /**
   * "See all", the way Netflix does it — the client's own comparison.
   *
   * The full UK list on one page reads as a wall, and a wall is the fastest
   * way to make somebody give up on finding their own university. So we show a
   * handful and let them open the rest deliberately.
   *
   * TWO THINGS THIS MUST NOT DO, both of which are the same defect shape as
   * "you have used your free questions" — a screen implying something untrue:
   *
   *   1. It must NEVER hide a search result. If a student types "Wolverhampton"
   *      and the match is on the collapsed side, hiding it says "we do not have
   *      your university" when we do. So the moment there is a query or a
   *      filter, everything is shown and the control disappears.
   *   2. The number is real, not decorative. "See all 34" comes from the list.
   */
  const SHOW_FIRST = 6;
  const [showAllOthers, setShowAllOthers] = useState(false);
  const isSearching = q.trim().length > 0 || type !== 'all';
  const visibleOthers = isSearching || showAllOthers ? others : others.slice(0, SHOW_FIRST);
  const hiddenCount = others.length - visibleOthers.length;

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
      <Page>
      <div>
        <div className="text-center">
          <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
            Choose your university
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-ink-soft">
            Questions are built from the credibility themes universities publish, not from any
            leaked question list.
          </p>
        </div>

        {/* Search first, and large. This is a list a student scans, so the
            fastest way through it is the field, not the grid. */}
        <div className="relative mx-auto mt-8 max-w-xl">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-quiet">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for universities, cities..."
            aria-label="Search universities"
            className="block w-full rounded-control border border-line bg-surface py-4 pl-12 pr-4 text-base text-ink outline-none transition-colors duration-tap ease-move placeholder:text-ink-quiet focus:border-ink-quiet focus:bg-surface-sunk"
          />
        </div>

        <div className="mb-10 mt-4 flex flex-wrap justify-center gap-2">
          {(['all', 'Pre-CAS', 'CAS', 'Pre-Admission'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`min-h-tap rounded-full border px-5 py-2 text-sm font-semibold transition-colors duration-tap ease-move ${
                type === t
                  ? 'border-go bg-go text-white'
                  : 'border-line bg-surface text-ink-soft hover:bg-surface-sunk hover:text-ink'
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
          <div className="mb-6">
            <Banner
              tone={errorAction ? 'warn' : 'stop'}
              title={error}
              action={
                errorAction ? (
                  <ButtonLink href={errorAction.href}>{errorAction.label}</ButtonLink>
                ) : undefined
              }
            />
          </div>
        )}

        {/* ------------------------------------------------------------------
            RESUME. This banner is the fix for the worst bug of the 14 Aug walk.

            The client answered one of ten free questions, pressed Back, and
            this page told him "You have used your free questions. Buy a pack
            to keep going." His interview was whole and one click away. The
            product told a paying-in-future student it had taken his free trial
            when it had not.

            It sits ABOVE everything, before the search and the cards, because
            a student who has an unfinished interview has exactly one sensible
            next action and should not have to find it.
            ------------------------------------------------------------------ */}
        {inProgress && (
          <div className="mb-6 rounded-card border-2 border-go bg-go-tint p-5">
            <p className="mb-1 font-bold text-ink">You have an interview in progress</p>
            <p className="mb-4 leading-relaxed text-go-dark">
              {inProgress.answered > 0
                ? `You answered ${inProgress.answered} of ${inProgress.total} questions. Nothing is lost. Pick up exactly where you stopped.`
                : `You started this interview and have not answered anything yet. Nothing is lost. Go straight back in.`}
            </p>
            <Link
              href={`/interview/${inProgress.sessionId}`}
              className="inline-flex items-center justify-center rounded-control bg-go px-6 py-3.5 text-base font-bold text-white transition-colors duration-tap ease-move active:scale-[0.98]"
            >
              Continue your interview
            </Link>
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
          <div className="rounded-card border border-line bg-surface p-8 text-center shadow-card">
            <p className="mb-2 font-serif text-title font-semibold text-ink">
              Your university is not on our list yet
            </p>
            <p className="mx-auto mb-5 max-w-md leading-relaxed text-ink-soft">
              That does not stop you. A Pre-CAS interview asks the same themes wherever you apply,
              so you can practise the general UK paper right now and it will still be the interview
              you are about to sit.
            </p>
            <button
              onClick={() => start(publicInstitutions()[0]?.slug ?? 'bpp-university')}
              disabled={starting !== null}
              className="inline-flex items-center justify-center rounded-control bg-ink px-6 py-3.5 font-bold text-white disabled:opacity-60"
            >
              {starting ? 'Starting...' : 'Practise the general UK interview'}
            </button>
            <p className="mt-3 text-sm text-ink-quiet">
              Or try a shorter search, "Coventry" rather than "Coventry University London".
            </p>
          </div>
        ) : (
          <>
          {/* B20: the six our students actually apply to are pinned under
              "Most applied"; the rest of the UK is listed below so a student
              can always find their own university. */}
          {featured.length > 0 && (
            <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-bold text-ink">
              <span className="text-go" aria-hidden>
                ★
              </span>
              Most applied
            </h2>
          )}
          <ul className="grid gap-4 sm:grid-cols-2">
            {featured.map((i) => (
              <UniCard key={i.id} i={i} starting={starting} signedIn={signedIn} hasCredit={hasCredit} resuming={Boolean(inProgress)} onStart={start} />
            ))}
          </ul>

          {others.length > 0 && (
            <>
              <div className="mb-4 mt-12 flex items-end justify-between gap-4 border-b border-line pb-3">
                <h2 className="font-serif text-title font-bold text-ink">
                  All UK universities
                  <span className="ml-2 text-sm font-normal text-ink-quiet">
                    {others.length}
                  </span>
                </h2>
                {/* Only offered when there is genuinely something folded away,
                    and never while a search is running. */}
                {!isSearching && hiddenCount > 0 && (
                  <button
                    onClick={() => setShowAllOthers(true)}
                    className="shrink-0 text-sm font-bold text-go-dark underline underline-offset-4 transition-opacity duration-tap ease-move hover:opacity-70"
                  >
                    See all {others.length}
                  </button>
                )}
                {!isSearching && showAllOthers && (
                  <button
                    onClick={() => setShowAllOthers(false)}
                    className="shrink-0 text-sm font-bold text-ink-soft underline underline-offset-4 transition-opacity duration-tap ease-move hover:opacity-70"
                  >
                    Show fewer
                  </button>
                )}
              </div>
              <ul className="grid gap-4 sm:grid-cols-2">
                {visibleOthers.map((i) => (
                  <UniCard key={i.id} i={i} starting={starting} signedIn={signedIn} hasCredit={hasCredit} resuming={Boolean(inProgress)} onStart={start} />
                ))}
              </ul>
              {!isSearching && hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllOthers(true)}
                  className="mx-auto mt-6 flex min-h-tap items-center justify-center rounded-control border border-line bg-surface px-6 py-3 font-bold text-ink transition-colors duration-tap ease-move hover:bg-surface-sunk"
                >
                  See all {others.length} universities
                </button>
              )}
            </>
          )}
          </>
        )}
      </div>
      </Page>
      <SiteFooterView whatsappDigits={supportNumber} />
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
  resuming,
  onStart,
}: {
  i: Institution;
  starting: string | null;
  signedIn: boolean | null;
  /** Null while we are still asking. False once we know they have none left. */
  hasCredit: boolean | null;
  /** True when this student has an unfinished sitting anywhere. */
  resuming: boolean;
  onStart: (slug: string) => void;
}) {
  // WALK 1.11. Forty seven cards each promising a "free first try" to a student
  // who used theirs an hour ago is the product telling him something untrue,
  // and then refusing him when he believes it. The card tells the truth first.
  const locked = signedIn === true && hasCredit === false;
  return (
    <li className="flex flex-col rounded-card border border-line bg-surface p-5 shadow-card transition-colors duration-tap ease-move hover:border-line-strong">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {/* QA B2: several official marks are white artwork and vanished on a
              white chip. brightness(0) renders every mark as ink, so they are
              all visible and consistent. Universities with no mark of ours
              show a monogram: we never scrape a logo we are not licensed for. */}
          {/* One fixed tile whether or not a logo file exists, so a missing
              logo never shifts the card and a wrong-sized one never stretches
              (D-7). We never scrape a mark we are not licensed for; the
              monogram is the honest fallback, not a placeholder. */}
          <Monogram name={i.name} src={i.logoUrl ?? null} />
          <div className="min-w-0">
            <h3 className="font-serif text-lg font-bold leading-tight text-ink">{i.name}</h3>
            <p className="mt-0.5 text-sm text-ink-quiet">{i.city}</p>
          </div>
        </div>
        <Chip tone={locked && !resuming ? 'warn' : 'go'}>
          {resuming ? 'In progress' : locked ? 'Needs a pack' : 'Free first try'}
        </Chip>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="rounded-control border border-line bg-surface-sunk px-3 py-3 text-center">
          <p className="text-micro uppercase tracking-wide text-ink-quiet">Duration</p>
          <p className="mt-0.5 font-bold text-ink">{i.durationMinutes} mins</p>
        </div>
        <div className="rounded-control border border-line bg-surface-sunk px-3 py-3 text-center">
          <p className="text-micro uppercase tracking-wide text-ink-quiet">Questions</p>
          <p className="mt-0.5 font-bold text-ink">{i.questionCount} Qs</p>
        </div>
      </div>

      {/* U-3: ONE action per card, and its label never promises something the
          server will refuse. */}
      <Button
        onClick={() => onStart(i.slug)}
        disabled={starting !== null}
        full
        variant={resuming ? 'primary' : locked ? 'tertiary' : 'secondary'}
        className="mt-auto"
      >
        {starting === i.slug
          ? 'Starting...'
          : signedIn === false
            ? 'Sign in to start'
            : /* An open sitting is resumed, never replaced — the server does
                 this too, so the label must not promise a fresh start it will
                 not give. */
              resuming
              ? 'Continue your interview'
              : locked
                ? 'Buy a pack to start'
                : 'Start interview'}
      </Button>
    </li>
  );
}
