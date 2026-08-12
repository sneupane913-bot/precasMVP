'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { publicInstitutions } from '@/lib/data/institutions';
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
  // QA B1: the catalogue let anyone start an interview without signing in.
  // We check once on load so the buttons can say "Sign in to start" instead of
  // failing after the tap.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/me')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setSignedIn(Boolean(j?.data?.signedIn));
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function start(slug: string) {
    // Not signed in: send them to sign in and come straight back here.
    if (signedIn === false) {
      router.push(`/start?next=${encodeURIComponent('/universities?start=' + slug)}`);
      return;
    }
    setStarting(slug);
    setError(null);
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No entitlement fields. The server decides trial length. LIVE-003.
        body: JSON.stringify({ institution: slug, mode: 'test' }),
      });
      const json = (await res.json()) as
        | { ok: true; data: { sessionId: string } }
        | { ok: false; error: { userMessage: string } };

      if (!json.ok) {
        // Session expired between load and tap: recover by signing in again
        // rather than showing a dead error.
        if (res.status === 401) {
          router.push(`/start?next=${encodeURIComponent('/universities?start=' + slug)}`);
          return;
        }
        setError(json.error.userMessage);
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
        <h1 className="mb-1 text-2xl font-bold text-ink">Choose your university</h1>
        <p className="mb-5 text-slate-600">
          Questions are built from the credibility themes universities publish, not from any leaked question list.
        </p>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type your university name..."
          aria-label="Search universities"
          className="mb-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3.5 text-base outline-none focus:border-ink"
        />

        <div className="mb-5 flex flex-wrap gap-2">
          {(['all', 'Pre-CAS', 'CAS', 'Pre-Admission'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                type === t ? 'bg-ink text-white' : 'border border-slate-200 bg-white text-slate-600'
              }`}
            >
              {t === 'all' ? 'All types' : t}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
            {error}
          </p>
        )}

        {results.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="mb-2 font-semibold text-ink">We do not have that university yet</p>
            <p className="text-slate-600">
              Try a shorter search, or pick any university above. The questions are almost the same
              everywhere.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {results.map((i) => (
              <li
                key={i.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5"
              >
                {/* Card layout follows docs/design-reference/universities_catalogue:
                    logo chip, name, city, then Duration / Questions stat boxes. */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {/* QA B2: several marks are white artwork and vanished on a
                        white chip. brightness(0) renders every mark as ink so
                        all six are visible and consistent. */}
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
                      <h2 className="font-serif text-lg font-bold leading-tight text-ink">
                        {i.name}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-500">{i.city}</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    Free first try
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
                  onClick={() => start(i.slug)}
                  disabled={starting !== null}
                  className="mt-auto w-full rounded-xl bg-ink px-5 py-3.5 text-base font-bold text-white transition hover:bg-ink/90 active:scale-[0.99] disabled:opacity-50"
                >
                  {starting === i.slug
                    ? 'Starting...'
                    : signedIn === false
                      ? 'Sign in to start'
                      : 'Start interview'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
