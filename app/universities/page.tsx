'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { INSTITUTIONS } from '@/lib/data/institutions';

/**
 * University-first browsing. The competitor's single best idea: a student who
 * sees their own university's name believes the product is for them. This is a
 * far better entry point than a profile form.
 */
export default function UniversitiesPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | 'Pre-CAS' | 'CAS' | 'Pre-Admission'>('all');
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return INSTITUTIONS.filter((i) => {
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
    setStarting(slug);
    setError(null);
    try {
      const res = await fetch('/api/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution: slug, mode: 'test', isTrial: true }),
      });
      const json = (await res.json()) as
        | { ok: true; data: { sessionId: string } }
        | { ok: false; error: { userMessage: string } };

      if (!json.ok) {
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
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-1 text-2xl font-bold text-ink">Choose your university</h1>
        <p className="mb-5 text-slate-600">
          We will ask you the questions this university asks in its interview.
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
                <div className="mb-3 flex items-start gap-3">
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-base font-black text-white"
                    style={{ backgroundColor: i.accent }}
                  >
                    {i.monogram}
                  </span>
                  <div className="min-w-0">
                    <h2 className="font-bold leading-tight text-ink">{i.name}</h2>
                    <p className="text-sm text-slate-500">
                      {i.city} · {i.durationMinutes} min · {i.questionCount} questions
                    </p>
                  </div>
                </div>

                <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-600">{i.blurb}</p>

                <div className="mb-3 flex gap-2">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    {i.interviewType}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    Free first try
                  </span>
                </div>

                <button
                  onClick={() => start(i.slug)}
                  disabled={starting !== null}
                  className="w-full rounded-xl bg-ink px-5 py-3.5 text-base font-bold text-white disabled:opacity-50"
                >
                  {starting === i.slug ? 'Starting...' : 'Start interview'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
