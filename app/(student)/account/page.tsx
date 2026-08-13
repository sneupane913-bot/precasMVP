'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { OfferCountdown, type Offer } from '@/components/OfferCountdown';

/**
 * The student's own account.
 *
 * D19: their practice history, so the product remembers them and they can go
 * back to a report.
 * J3: the delete-my-data button, which actually deletes.
 */

interface Session {
  id: string;
  university: string;
  mode: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  answered: number;
  total: number;
  band: string | null;
}

interface Progress {
  sittings: number;
  /** Null until there are two scored sittings. One point is a dot, not a direction. */
  trend: number | null;
  latest: number | null;
  weakest: { key: string; label: string; value: number; advice: string } | null;
}

interface Account {
  name: string | null;
  email: string | null;
  referralCode: string;
  entitlement: { mocksLeft: number; practiceLeft: number; isTrial: boolean };
  sessions: Session[];
  offer?: Offer | null;
  progress?: Progress;
  /** N-4. Their consultancy paid; never show them a price. */
  seatBacked?: boolean;
}

const BAND_LABEL: Record<string, string> = {
  ready: 'Ready',
  almost_ready: 'Almost ready',
  needs_practice: 'Needs practice',
  risky: 'Needs work',
};

export default function AccountPage() {
  const router = useRouter();
  const [data, setData] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/account');
      if (res.status === 401) {
        router.push('/start?next=/account');
        return;
      }
      const json = await res.json();
      if (json.ok) setData(json.data);
      else setError(json.error.userMessage);
    } catch {
      setError('We could not load your account. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteEverything() {
    setDeleting(true);
    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteEverything', confirm: 'DELETE' }),
      });
      const json = await res.json();
      if (json.ok) {
        router.push('/?deleted=1');
        return;
      }
      setError(json.error.userMessage);
    } catch {
      setError('We could not delete your data. Please try again, or message us on WhatsApp.');
    } finally {
      setDeleting(false);
    }
  }

  const referralLink =
    typeof window !== 'undefined' && data
      ? `${window.location.origin}/start?ref=${data.referralCode}`
      : '';

  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-10">
        <h1 className="mb-8 font-serif text-3xl font-bold text-ink">Your practice</h1>

        {loading && <p className="text-slate-500">Loading...</p>}

        {error && (
          <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
            {error}
          </p>
        )}

        {data && (
          <>
            {/* I9. Only rendered when the server says there is a real, unexpired
                offer. Never invented here. */}
            {data.offer && (
              <div className="mb-8">
                <OfferCountdown offer={data.offer} />
              </div>
            )}

            {/* N-4. A seat-backed student is told where their mocks came from
                and what to do when they run out, instead of being sold to. */}
            {data.seatBacked && (
              <section className="mb-8 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
                <p className="mb-1 font-bold text-ink">Your consultancy is covering this</p>
                <p className="text-sm leading-relaxed text-emerald-900">
                  You do not pay us anything. When your interviews run out, ask your consultancy to
                  add more — they can do it in a moment.
                </p>
              </section>
            )}

            {/* What they have left */}
            <section className="mb-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">Mock interviews left</p>
                <p className="font-serif text-3xl font-black text-ink">
                  {data.entitlement.mocksLeft}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm text-slate-600">Practice questions left</p>
                <p className="font-serif text-3xl font-black text-ink">
                  {data.entitlement.practiceLeft}
                </p>
              </div>
            </section>

            {/* S-41 and S-42. Progress, and the one thing to work on next.
                S-44: nothing here is a number the student cannot act on, so
                the whole block is hidden until there is something real to say. */}
            {data.progress && data.progress.sittings > 0 && (
              <section className="mb-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="mb-1 text-sm text-slate-600">Your progress</p>
                  {data.progress.trend === null ? (
                    <>
                      <p className="font-serif text-2xl font-bold text-ink">
                        {data.progress.sittings === 1 ? 'One interview done' : `${data.progress.sittings} done`}
                      </p>
                      {/* Honest: we will not draw a trend from a single point. */}
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        Do one more and we will show you whether you are improving.
                      </p>
                    </>
                  ) : (
                    <>
                      <p
                        className={`font-serif text-3xl font-black ${
                          data.progress.trend > 0
                            ? 'text-emerald-600'
                            : data.progress.trend < 0
                              ? 'text-amber-600'
                              : 'text-ink'
                        }`}
                      >
                        {data.progress.trend > 0 ? '+' : ''}
                        {data.progress.trend}%
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        {data.progress.trend > 0
                          ? `Better than your first interview. You are at ${data.progress.latest}% now.`
                          : data.progress.trend < 0
                            ? `Down from your first interview. That happens \u2014 the questions get harder as you go further in.`
                            : `The same as your first interview. You are at ${data.progress.latest}%.`}
                      </p>
                    </>
                  )}
                </div>

                {data.progress.weakest && (
                  <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
                    <p className="mb-1 text-sm text-emerald-800">Work on this next</p>
                    <p className="font-serif text-xl font-bold text-ink">
                      {data.progress.weakest.label}
                    </p>
                    <p className="mb-3 mt-1 text-sm leading-relaxed text-emerald-900">
                      {data.progress.weakest.advice}
                    </p>
                    <Link
                      href="/practice"
                      className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                    >
                      Practise one question
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* History */}
            <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-5">
                <h2 className="font-serif text-lg font-bold text-ink">Everything you have done</h2>
                <p className="text-sm text-slate-600">
                  Only you can see these. We never show your answers to a consultancy.
                </p>
              </div>

              {data.sessions.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="mb-2 font-semibold text-ink">You have not practised yet</p>
                  <p className="mb-5 text-sm text-slate-500">
                    Your first ten questions are free.
                  </p>
                  <Link
                    href="/universities"
                    className="inline-flex items-center justify-center rounded-xl bg-ink px-6 py-3 font-bold text-white"
                  >
                    Start practising
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.sessions.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                      <div>
                        <p className="font-semibold text-ink">{s.university}</p>
                        <p className="text-sm text-slate-500">
                          {new Date(s.createdAt).toLocaleDateString()} ·{' '}
                          {s.answered} of {s.total} answered
                          {s.band ? ` · ${BAND_LABEL[s.band] ?? s.band}` : ''}
                        </p>
                      </div>
                      {s.status === 'completed' ? (
                        <Link
                          href={`/results/${s.id}`}
                          className="rounded-xl border-2 border-ink px-4 py-2.5 text-sm font-bold text-ink"
                        >
                          See report
                        </Link>
                      ) : (
                        <Link
                          href={`/interview/${s.id}`}
                          className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"
                        >
                          Carry on
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Referral */}
            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="mb-1 font-serif text-lg font-bold text-ink">Invite a friend</h2>
              <p className="mb-4 text-sm text-slate-600">
                When a friend buys a pack using your link, you get one extra mock interview.
              </p>
              <div className="flex flex-wrap gap-2">
                <code className="flex-1 truncate rounded-xl bg-[#eff4ff] px-4 py-3 text-sm text-ink">
                  {referralLink}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(referralLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white"
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </section>

            {/* Delete, J3 */}
            <section className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
              <h2 className="mb-1 font-bold text-red-900">Delete everything</h2>
              <p className="mb-4 text-sm leading-relaxed text-red-900/90">
                This removes every interview and every answer you have given us, for good. We cannot
                get them back afterwards. Your payment records stay, because we are required to keep
                a record of money, but your name and email are removed from them.
              </p>

              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="rounded-xl border-2 border-red-400 bg-white px-5 py-3 font-bold text-red-700"
                >
                  Delete my data
                </button>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={deleteEverything}
                    disabled={deleting}
                    className="flex-1 rounded-xl bg-red-600 px-5 py-3 font-bold text-white disabled:opacity-60"
                  >
                    {deleting ? 'Deleting...' : 'Yes, delete everything'}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
                  >
                    Keep my data
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
