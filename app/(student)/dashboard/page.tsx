'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';
import {
  Page,
  Card,
  SectionTitle,
  Banner,
  Button,
  ButtonLink,
  StatRing,
  ProgressBar,
  Monogram,
  Row,
  BandChip,
  EmptyState,
  Eyebrow,
  Spinner,
} from '@/components/ui';

/**
 * THE STUDENT DASHBOARD.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS PAGE EXISTS, AND WHY IT IS ONE JOB WITH D-41
 *
 * The client asked for it, and his reasoning is also the fix for the worst open
 * defect in the product. D-41 is "paying restarts the paper instead of
 * unlocking the remaining 7", and it hid for days. His own diagnosis of why:
 *
 *     "If there was a dashboard, I could literally see that seven questions
 *      were remaining for me."
 *
 * There was no screen anywhere that showed "7 questions remaining", so the
 * defect was invisible until he paid real money and pressed Continue. Building
 * the surface that makes it visible IS the first half of fixing it.
 *
 * The second thing he was explicit about: the most important job of this screen
 * is showing "how many mock and practice sessions are left with them". So the
 * two balance rings are first, largest, and above everything else — before the
 * greeting has finished being read.
 * ---------------------------------------------------------------------------
 *
 * THIS PAGE ADDS NO BEHAVIOUR. It reads `/api/me` and `/api/account`, both of
 * which already existed and are already tested, and draws them. There is no new
 * endpoint, no new entitlement logic and no new state machine. A redesign that
 * quietly reimplements the lifecycle is how tested work gets broken.
 */

interface Sess {
  id: string;
  university: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  answered: number;
  total: number;
  band: string | null;
  isPractice?: boolean;
  resumeHref: string;
}

interface InProgress {
  sessionId: string;
  answered: number;
  total: number;
  institutionId: string;
  isPractice: boolean;
}

export default function DashboardPage() {
  const [name, setName] = useState<string | null>(null);
  const [mocksLeft, setMocksLeft] = useState<number | null>(null);
  const [practiceLeft, setPracticeLeft] = useState<number | null>(null);
  const [packMocks, setPackMocks] = useState<number | undefined>(undefined);
  const [packPractice, setPackPractice] = useState<number | undefined>(undefined);
  const [inProgress, setInProgress] = useState<InProgress | null>(null);
  const [sessions, setSessions] = useState<Sess[]>([]);
  const [seatBacked, setSeatBacked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  /**
   * WALK, 18 Aug — the spinner that never left.
   *
   * The client reported the dashboard stuck on "Loading your practice..."
   * forever. Watching it happen: /api/me and /api/account both came back 200
   * with correct data — the fetches were never the problem — but the screen
   * never updated. The old code called `setLoading(false)` as the LAST line
   * inside a `.then()` with no `.catch()` on the combinator itself. Anything
   * throwing between "the data arrived" and that last line — a bad row shape,
   * a remount racing the fetch, a browser extension touching the page,
   * anything — left `loading` true with no way out and no error shown. A
   * silent hang is worse than a visible failure: at least a failure can be
   * retried.
   *
   * The fix has two parts:
   *   1. `finally` guarantees `setLoading(false)` runs no matter what happens
   *      above it, success or exception. The spinner cannot outlive the
   *      request that's supposed to end it.
   *   2. A 12s safety net independent of the fetches themselves. Netlify's
   *      synchronous functions cap at 10s (see netlify.toml) — 12s gives that
   *      a moment to actually fail before we decide it's hung, without asking
   *      a student to stare at a spinner indefinitely on a slow connection.
   *      On timeout we show a retry state, never a silent freeze.
   */
  useEffect(() => {
    let off = false;
    setLoading(true);
    setLoadFailed(false);

    const timeout = setTimeout(() => {
      if (!off) {
        setLoadFailed(true);
        setLoading(false);
      }
    }, 12_000);

    (async () => {
      try {
        const [me, acc] = await Promise.all([
          fetch('/api/me').then((r) => r.json()).catch(() => null),
          fetch('/api/account').then((r) => r.json()).catch(() => null),
        ]);
        if (off) return;
        const ent = me?.data?.entitlement;
        setName(me?.data?.name ?? null);
        setMocksLeft(typeof ent?.mocksLeft === 'number' ? ent.mocksLeft : null);
        setPracticeLeft(typeof ent?.practiceLeft === 'number' ? ent.practiceLeft : null);
        setInProgress(ent?.inProgress ?? null);
        setSeatBacked(Boolean(me?.data?.seatBacked));
        const rows: Sess[] = acc?.data?.sessions ?? [];
        setSessions(rows);
        /**
         * The ring's denominator.
         *
         * Derived from the largest balance we have actually seen, never a
         * hard-coded pack size. F-2: a "of 10" written into this page would be
         * wrong the moment the client changes a pack, exactly as "12 mocks a
         * seat" was wrong on /consultancy for a week.
         */
        const m = typeof ent?.mocksLeft === 'number' ? ent.mocksLeft : 0;
        const p = typeof ent?.practiceLeft === 'number' ? ent.practiceLeft : 0;
        const usedMocks = rows.filter((s) => !s.isPractice).length;
        setPackMocks(Math.max(m + usedMocks, m, 1));
        setPackPractice(Math.max(p, 1));
      } catch {
        if (!off) setLoadFailed(true);
      } finally {
        clearTimeout(timeout);
        if (!off) setLoading(false);
      }
    })();

    return () => {
      off = true;
      clearTimeout(timeout);
    };
  }, [retryNonce]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const reports = sessions.filter((s) => s.status === 'completed');

  return (
    <>
      <SiteHeader />
      <Page>
        <header>
          <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
            {greeting}
            {name ? `, ${name.split(' ')[0]}` : ''}
          </h1>
          <p className="mt-1 text-ink-quiet">{today}</p>
        </header>

        {loading ? (
          <Card className="flex items-center gap-3 text-ink-soft">
            <Spinner className="text-ink-quiet" />
            <span>Loading your practice...</span>
          </Card>
        ) : loadFailed ? (
          <Card className="flex flex-col items-start gap-3 text-ink-soft">
            <span>
              This is taking longer than it should. Your practice history and balance are safe —
              this screen just could not load them just now.
            </span>
            <Button onClick={() => setRetryNonce((n) => n + 1)}>Try again</Button>
          </Card>
        ) : (
          <>
            {/* ---------------------------------------------------------------
                THE BALANCE. First, largest, above everything.
                The client's words: the dashboard's job is to show how many
                mocks and practice sessions are left. A student who only finds
                out at the moment they are refused has been failed by the
                screen, so the ring turns amber at 1 or 0 rather than waiting.
                --------------------------------------------------------------- */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatRing
                value={mocksLeft ?? 0}
                total={packMocks}
                label="mock interviews left"
                sub={packMocks ? `of ${packMocks} in your pack` : undefined}
                tone="go"
              />
              <StatRing
                value={practiceLeft ?? 0}
                total={packPractice}
                label="practice questions left"
                sub={packPractice ? `of ${packPractice}` : undefined}
                tone="ink"
              />
            </div>

            {/* ---------------------------------------------------------------
                RESUME. The line that makes D-41 impossible to hide again:
                "you answered 3 of 17 questions", stated as a number, on a
                screen the student actually visits.
                --------------------------------------------------------------- */}
            {inProgress && !inProgress.isPractice ? (
              <Banner
                tone="go"
                eyebrow="You have an interview in progress"
                title={`You answered ${inProgress.answered} of ${inProgress.total} questions`}
                action={
                  <ButtonLink href={`/interview/${inProgress.sessionId}`}>
                    Continue where you left off
                  </ButtonLink>
                }
              >
                <div className="mt-3 max-w-md">
                  <ProgressBar value={inProgress.answered} total={inProgress.total} />
                  <p className="mt-2 text-sm">Nothing is lost. Your answers are saved.</p>
                </div>
              </Banner>
            ) : (
              <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-serif text-title font-semibold text-ink">
                    Ready for your next mock?
                  </p>
                  {/* copy-check caught this typed by hand within a minute of
                      writing it. That is F-2, the exact shape that put "12
                      mocks a seat" on the consultancy page for a week. */}
                  <p className="mt-1 text-ink-soft">
                    {FULL_MOCK_QUESTION_COUNT} questions, camera on, about 30 minutes.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <ButtonLink href="/universities">Start a mock interview</ButtonLink>
                  <Link
                    href="/practice"
                    className="inline-flex min-h-tap items-center justify-center px-2 text-sm font-semibold text-ink-soft underline underline-offset-4 transition-colors duration-tap ease-move hover:text-ink"
                  >
                    Or drill one question
                  </Link>
                </div>
              </Card>
            )}

            <section className="flex flex-col gap-4">
              <SectionTitle>Your reports</SectionTitle>
              {reports.length === 0 ? (
                <EmptyState
                  image="/img/empty-reports.png"
                  title="No reports yet"
                  action={<ButtonLink href="/universities">Start your first mock</ButtonLink>}
                >
                  Your first report will appear here once you finish a mock interview.
                </EmptyState>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {reports.map((s) => (
                    <li key={s.id}>
                      <Row
                        href={s.resumeHref}
                        monogram={<Monogram name={s.university} />}
                        title={s.university}
                        meta={new Date(s.completedAt ?? s.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        chip={s.band ? <BandChip band={s.band} /> : undefined}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* ---------------------------------------------------------------
                BUY AGAIN. Quiet, bordered, at the BOTTOM, and never a popup —
                the client rejected the dismissible interstitial outright.
                N-4: a seat-backed student never sees a price. Their consultancy
                already paid, and asking them again is how we lose that
                consultancy.
                --------------------------------------------------------------- */}
            {!seatBacked && (
              <Card className="flex flex-col items-center gap-3 py-8 text-center">
                <Eyebrow>Top up</Eyebrow>
                <p className="font-serif text-title font-semibold text-ink">Need more practice?</p>
                <p className="max-w-sm text-ink-soft">
                  Your credits never expire. Add a pack whenever you want.
                </p>
                <ButtonLink href="/pricing" variant="tertiary" className="mt-2">
                  See the packs
                </ButtonLink>
              </Card>
            )}
          </>
        )}
      </Page>
      <SiteFooter />
    </>
  );
}
