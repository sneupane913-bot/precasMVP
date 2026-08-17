'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useRouter } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooterView } from '@/components/SiteFooter';
import { useSupportNumber } from '@/lib/useSupportNumber';
import { OfferCountdown, type Offer } from '@/components/OfferCountdown';
import {
  Page,
  Card,
  SectionTitle,
  Eyebrow,
  Button,
  ButtonLink,
  Banner,
  BandChip,
  EmptyState,
  Spinner,
} from '@/components/ui';

/**
 * The student's own account.
 *
 * D19: their practice history, so the product remembers them and they can go
 * back to a report.
 * J3: the delete-my-data button, which actually deletes.
 *
 * ---------------------------------------------------------------------------
 * ON THE CONVERSION TO THE KIT
 *
 * Layout only: the DB-1 redirect, `load()`, `deleteEverything()` and every
 * N-4 / N-14 / N-15 / S-41 branch are unchanged.
 *
 * One thing that is NOT merely layout, and it should be called out rather than
 * slipped in. This file carried its own `BAND_LABEL` map, and it DISAGREED with
 * the kit's: the same stored band rendered as "Needs work" here and "At risk"
 * on the report and the dashboard. That is F-2 exactly — one value, two homes,
 * free to drift — and it had already drifted. The local map is gone and
 * `BandChip` is used, so a band now has one name across the whole product.
 * ---------------------------------------------------------------------------
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
  /** N-14. Always offered to a paying student. */
  offerUpgrade?: boolean;
  /** N-15. Turns on at two mocks or fewer. */
  offerRenew?: boolean;
  lastPayer?: { name: string | null; phoneSuffix: string | null } | null;
}

export default function AccountPage() {

  // D-1/D-2/D-4. The footer is sync now; the number comes from here.
  const supportNumber = useSupportNumber();
  const router = useRouter();
  /**
   * DB-1, enforced on EVERY path, not just sign-in.
   *
   * The client paid and still landed on the old page, because the only
   * redirect lived in /start. Anyone already signed in — arriving from
   * checkout, from a bookmark, from the header — never passed through it. So
   * the dashboard existed and he could not get to it, which made it useless.
   *
   * A paying student's home is the dashboard, from wherever they arrive.
   */
  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.entitlement?.hasPaid) router.replace('/dashboard');
      })
      .catch(() => {});
  }, [router]);

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
      <Page>
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8">
          <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
            Your practice
          </h1>

          {loading && (
            <Card className="flex items-center gap-3 text-ink-soft">
              <Spinner className="text-ink-quiet" />
              <span>Loading...</span>
            </Card>
          )}

          {error && <Banner tone="stop" title={error} />}

          {data && (
            <>
              {/* I9. Only rendered when the server says there is a real, unexpired
                  offer. Never invented here. */}
              {data.offer && <OfferCountdown offer={data.offer} />}

              {/* N-4. A seat-backed student is told where their mocks came from
                  and what to do when they run out, instead of being sold to. */}
              {data.seatBacked && (
                <Banner tone="go" title="Your consultancy is covering this">
                  You do not pay us anything. When your interviews run out, ask your consultancy to
                  add more — they can do it in a moment.
                </Banner>
              )}

              {/* N-16. The dashboard is the page a student comes BACK to, so it
                  is the right place to offer the install. The report is seen
                  once; this is seen every time. */}
              <InstallPrompt show />

              {/* What they have left */}
              <section className="grid gap-4 sm:grid-cols-2">
                <Card>
                  <p className="text-sm text-ink-soft">Mock interviews left</p>
                  <p className="font-serif text-display font-bold text-ink">
                    {data.entitlement.mocksLeft}
                  </p>
                </Card>
                <Card>
                  <p className="text-sm text-ink-soft">Practice questions left</p>
                  <p className="font-serif text-display font-bold text-ink">
                    {data.entitlement.practiceLeft}
                  </p>
                </Card>
              </section>

              {/* S-41 and S-42. Progress, and the one thing to work on next.
                  S-44: nothing here is a number the student cannot act on, so
                  the whole block is hidden until there is something real to say. */}
              {data.progress && data.progress.sittings > 0 && (
                <section className="grid gap-4 sm:grid-cols-2">
                  <Card>
                    <p className="mb-1 text-sm text-ink-soft">Your progress</p>
                    {data.progress.trend === null ? (
                      <>
                        <p className="font-serif text-title font-bold text-ink">
                          {data.progress.sittings === 1
                            ? 'One interview done'
                            : `${data.progress.sittings} done`}
                        </p>
                        {/* Honest: we will not draw a trend from a single point. */}
                        <p className="mt-1 text-sm text-ink-quiet">
                          Do one more and we will show you whether you are improving.
                        </p>
                      </>
                    ) : (
                      <>
                        {/* D-9. The direction is a WORD as well as a colour, so a
                            student who cannot separate green from amber still
                            learns which way they are going. */}
                        <p
                          className={`font-serif text-display font-bold ${
                            data.progress.trend > 0
                              ? 'text-go-dark'
                              : data.progress.trend < 0
                                ? 'text-warn'
                                : 'text-ink'
                          }`}
                        >
                          {data.progress.trend > 0 ? '+' : ''}
                          {data.progress.trend}%
                        </p>
                        <p className="mt-1 text-sm text-ink-quiet">
                          {data.progress.trend > 0
                            ? `Better than your first interview. You are at ${data.progress.latest}% now.`
                            : data.progress.trend < 0
                              ? `Down from your first interview. That happens. The questions get harder as you go further in.`
                              : `The same as your first interview. You are at ${data.progress.latest}%.`}
                        </p>
                      </>
                    )}
                  </Card>

                  {data.progress.weakest && (
                    <Card tone="go" className="flex flex-col gap-1">
                      <Eyebrow tone="go">Work on this next</Eyebrow>
                      <p className="font-serif text-lg font-bold text-ink">
                        {data.progress.weakest.label}
                      </p>
                      <p className="mb-3 text-sm text-go-dark">{data.progress.weakest.advice}</p>
                      <ButtonLink href="/practice" className="self-start">
                        Practise one question
                      </ButtonLink>
                    </Card>
                  )}
                </section>
              )}

              {/* N-15 first, N-14 second. A student who is nearly out needs the
                  top-up, not the shop. Ordering them the other way round is how a
                  nearly-empty student ends up comparing packs while their
                  interview is next week. */}
              {data.offerRenew && (
                <Card className="flex flex-col gap-2">
                  <Eyebrow tone="go">
                    {data.entitlement.mocksLeft === 0 ? 'You have none left' : 'Nearly out'}
                  </Eyebrow>
                  <h2 className="font-serif text-title font-bold text-ink">
                    {data.entitlement.mocksLeft === 0
                      ? 'Top up to keep practising'
                      : `Only ${data.entitlement.mocksLeft} mock interview${data.entitlement.mocksLeft === 1 ? '' : 's'} left`}
                  </h2>
                  <p className="mb-3 text-ink-soft">
                    {data.lastPayer?.name
                      ? 'Your details are already filled in, so this takes a moment.'
                      : 'It takes a moment, and your interviews never expire.'}
                  </p>
                  <ButtonLink href="/checkout?pack=prep&renew=1" variant="secondary" className="self-start">
                    Top up
                  </ButtonLink>
                </Card>
              )}

              {data.offerUpgrade && !data.offerRenew && (
                <p className="text-center text-sm text-ink-quiet">
                  Want more interviews?{' '}
                  <Link
                    href="/pricing"
                    className="font-semibold text-ink underline underline-offset-4 transition-colors duration-tap ease-move hover:text-go-dark"
                  >
                    See the bigger pack
                  </Link>
                </p>
              )}

              {/* History */}
              <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
                <header className="border-b border-line p-5">
                  <h2 className="font-serif text-title font-semibold text-ink">
                    Everything you have done
                  </h2>
                  <p className="text-sm text-ink-soft">
                    Only you can see these. We never show your answers to a consultancy.
                  </p>
                </header>

                {data.sessions.length === 0 ? (
                  <div className="p-5">
                    <EmptyState
                      title="You have not practised yet"
                      action={<ButtonLink href="/universities">Start practising</ButtonLink>}
                    >
                      Your first ten questions are free.
                    </EmptyState>
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.sessions.map((s) => (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-5"
                      >
                        <div className="min-w-0">
                          <p className="font-serif text-lg font-semibold text-ink">
                            {s.university}
                          </p>
                          <p className="text-sm text-ink-quiet">
                            {new Date(s.createdAt).toLocaleDateString()} · {s.answered} of {s.total}{' '}
                            answered
                          </p>
                          {/* The band, from the kit, so it is named the same
                              here as it is on the report. */}
                          {s.band && (
                            <span className="mt-2 inline-block">
                              <BandChip band={s.band} />
                            </span>
                          )}
                        </div>
                        {s.status === 'completed' ? (
                          <ButtonLink href={`/results/${s.id}`} variant="tertiary">
                            See report
                          </ButtonLink>
                        ) : (
                          <ButtonLink href={`/interview/${s.id}`} variant="secondary">
                            Carry on
                          </ButtonLink>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Referral */}
              <Card className="flex flex-col gap-4">
                <div>
                  <SectionTitle>Invite a friend</SectionTitle>
                  <p className="mt-3 text-sm text-ink-soft">
                    When a friend buys a pack using your link, you get one extra mock interview.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-control bg-surface-sunk px-4 py-3 text-sm text-ink">
                    {referralLink}
                  </code>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard?.writeText(referralLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? 'Copied' : 'Copy link'}
                  </Button>
                </div>
              </Card>

              {/* Delete, J3 */}
              <Card tone="stop" className="flex flex-col gap-4">
                <div>
                  <h2 className="font-serif text-lg font-bold text-stop">Delete everything</h2>
                  <p className="mt-1 text-ink-soft">
                    This removes every interview and every answer you have given us, for good. We
                    cannot get them back afterwards. Your payment records stay, because we are
                    required to keep a record of money, but your name and email are removed from
                    them.
                  </p>
                </div>

                {!confirming ? (
                  <Button variant="danger" onClick={() => setConfirming(true)} className="self-start">
                    Delete my data
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      variant="danger"
                      onClick={deleteEverything}
                      disabled={deleting}
                      className="flex-1"
                    >
                      {deleting ? (
                        <>
                          <Spinner />
                          Deleting...
                        </>
                      ) : (
                        'Yes, delete everything'
                      )}
                    </Button>
                    <Button variant="tertiary" onClick={() => setConfirming(false)} className="flex-1">
                      Keep my data
                    </Button>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </Page>
      <SiteFooterView whatsappDigits={supportNumber} />
    </>
  );
}
