'use client';

import { useCallback, useState } from 'react';
import { PasscodeInput } from '@/components/PasscodeInput';
import { PasscodeChangeForm } from '@/components/PasscodeChangeForm';
// Never type a price, a mock count or a practice count by hand. `copy-check`
// fails the build for it, and rightly: the seat copy said "12 mock interviews
// and 30 practice questions ... NPR 799" as literal text, so changing the
// Serious pack would have left this page quietly lying to consultancies.
import { SEAT_GRANT, getPlan } from '@/lib/data/plans';

/**
 * Consultancy portal, rebuilt to docs/design-reference/consultancy_admin_dashboard.
 *
 * Two rules this page must never break:
 *  1. A consultancy sees ONLY its own students. The server filters by the
 *     consultancy id it authenticated as, so there is no field here that could
 *     name another consultancy.
 *  2. No transcript, answer or feedback content. Engagement and entitlement
 *     only. That is the client's stated privacy rule for admins.
 */

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string;
  mocksLeft: number;
  practiceLeft: number;
}

interface Notification {
  id: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

/**
 * A payment one of their own students has sent, waiting on them.
 * WALK 5.6: this used to exist on the server and never reach this page.
 */
interface Order {
  id: string;
  studentName: string | null;
  studentEmail: string | null;
  packCode: string;
  amountNpr: number;
  walletTxnId: string | null;
  payerName: string | null;
  payerPhoneSuffix: string | null;
  screenshotUrl: string | null;
  state: string;
  rejectedReason: string | null;
  createdAt: string;
  verifiedAt: string | null;
}

interface Bundle {
  code: string;
  name: string;
  seats: number;
  priceNpr: number;
}

/** What buySeats hands back: the amount, and where to send it. */
interface SeatOrder {
  orderId: string;
  amountNpr: number;
  seats: number;
  bundleName: string;
  payTo: { walletName: string; walletNumber: string; qrImageUrl: string | null };
  supportWhatsapp: string;
}

interface AdminData {
  /** True while they are still on the handover code we set for them. */
  passcodeIsTemporary?: boolean;
  consultancy: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    status: string;
    seatsTotal: number;
  };
  students: Student[];
  notifications: Notification[];
  orders: Order[];
  /** Their OWN seat purchases. Never theirs to approve. */
  seatOrders: Order[];
  bundles: Bundle[];
  stats: {
    studentCount: number;
    activeStudents: number;
    seatsTotal: number;
    seatsUsed: number;
    seatsLeft: number;
    paidOrders: number;
    ordersAwaiting: number;
    seatPaymentPending: boolean;
  };
}

export default function AdminPage() {
  const [slug, setSlug] = useState('');
  const [passcode, setPasscode] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** The seat purchase in flight on this screen, if they have started one. */
  const [seatOrder, setSeatOrder] = useState<SeatOrder | null>(null);
  const [seatTxn, setSeatTxn] = useState('');
  const [seatPayer, setSeatPayer] = useState('');
  const [seatSuffix, setSeatSuffix] = useState('');
  const [renewing, setRenewing] = useState<string | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');
  const [colour, setColour] = useState('#0d1b2a');

  /**
   * One place every call goes through.
   *
   * It clears BOTH banners at the start. The super admin screen showed
   * "Too many attempts" directly above "Payment verified", because a reload set
   * the error while the success was still on screen, and two contradictory
   * outcomes at once is worse than either alone. This page must not repeat it.
   */
  const call = useCallback(
    async (body: Record<string, unknown>): Promise<unknown | null> => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, passcode, ...body }),
        });
        const json = await res.json();
        if (!json.ok) {
          setError(json.error.userMessage);
          setNotice(null);
          return null;
        }
        return json.data;
      } catch {
        setError('Could not reach the server. Check your connection and try again.');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [slug, passcode]
  );

  const changePasscode = useCallback(
    async (newPasscode: string): Promise<boolean> => {
      const ok = (await call({ action: 'changePasscode', newPasscode })) as { message?: string } | null;
      if (!ok) return false;
      // The passcode in state is now wrong; every later call would 403.
      setPasscode(newPasscode);
      setMustChange(false);

      /**
       * Re-read everything with the NEW passcode before showing the portal.
       *
       * While the handover code is in force the server deliberately sends a
       * hollow payload: no students, no orders, and zero seats, because the
       * secret is still shared and none of that is theirs alone yet. Without
       * this refetch the portal renders that hollow payload as though it were
       * real, and the first thing a new consultancy sees is "Seats left 0" when
       * they have just paid for four.
       *
       * The new passcode is passed explicitly rather than read from state,
       * because `setPasscode` above has not been applied yet on this pass.
       */
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, passcode: newPasscode, action: 'login' }),
      });
      const json = await res.json();
      if (json.ok) {
        setData(json.data as AdminData);
        setLogoUrl(json.data.consultancy.logoUrl ?? '');
        setColour(json.data.consultancy.primaryColor || '#0d1b2a');
      }

      setNotice(ok.message ?? 'Saved. Use your new passcode from now on.');
      return true;
    },
    [call, slug]
  );

  /**
   * D-29. Take a seat back from a student who should not have had one.
   *
   * The student link is a public URL and a seat is granted automatically to
   * anyone who signs up through it, so a link forwarded into a Facebook group
   * spends seats the consultancy paid for on strangers. `revokedAt` existed on
   * the allocation and was read in six places to count live seats, and nothing
   * anywhere could set it.
   */
  const revokeSeat = useCallback(
    async (student: Student) => {
      if (
        !window.confirm(
          `Take your seat back from ${student.name || student.email || 'this student'}?\n\n` +
            'The seat becomes available again. Anything they have already used stays with them, ' +
            'and they keep their reports.'
        )
      )
        return;
      const ok = (await call({ action: 'revokeSeat', studentId: student.id })) as
        | { message?: string }
        | null;
      if (ok) {
        setNotice(ok.message ?? 'Seat taken back.');
        await login();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [call]
  );

  const login = useCallback(async () => {
    const d = (await call({ action: 'login' })) as AdminData | null;
    if (d) {
      setData(d);
      setMustChange(Boolean(d.passcodeIsTemporary));
      setLogoUrl(d.consultancy.logoUrl ?? '');
      setColour(d.consultancy.primaryColor || '#0d1b2a');
    }
  }, [call]);

  /**
   * Approve or reject one of their own students' payments.
   *
   * The confirmation wording is deliberate and is not boilerplate. The money
   * for these orders lands in OUR wallet, not theirs, so the admin is asserting
   * something they cannot see for themselves. They should be asked to mean it.
   */
  const decide = useCallback(
    async (order: Order, approve: boolean) => {
      const reason = approve
        ? null
        : window.prompt(
            'Why can this payment not be approved? Your student will be shown this, so please be plain.'
          );
      if (!approve && (!reason || reason.trim().length < 3)) return;
      if (
        approve &&
        !window.confirm(
          `Approve NPR ${order.amountNpr.toLocaleString()} from ${order.payerName ?? 'this student'}?\n\nTransaction ${order.walletTxnId}\n\nOnly approve this if you have seen the money yourself. Their credits switch on straight away and this is recorded against your name.`
        )
      )
        return;

      setDeciding(order.id);
      const ok = await call(
        approve
          ? { action: 'approvePayment', orderId: order.id, confirmedReceived: true }
          : { action: 'rejectPayment', orderId: order.id, reason: reason?.trim() }
      );
      setDeciding(null);
      if (ok) {
        await login(); // refresh the queue so it cannot show a stale state
        setNotice(
          approve
            ? 'Approved. Your student can carry on straight away.'
            : 'Marked as not confirmed. Your student has been asked to check their number.'
        );
      }
    },
    [call, login]
  );

  /**
   * N-5. Top a student back up out of the consultancy's own seats.
   *
   * Confirmed first, and the confirmation says the price in SEATS, because
   * that is the currency the admin actually spends here. "Renew" reads free.
   */
  const renew = useCallback(
    async (student: Student) => {
      if (
        !window.confirm(
          `Top up ${student.name || student.email || 'this student'}?\n\nThis uses ONE of your seats and cannot be undone. You have ${data?.stats.seatsLeft ?? 0} left.`
        )
      )
        return;
      setRenewing(student.id);
      const ok = await call({ action: 'renewStudent', studentId: student.id });
      setRenewing(null);
      if (ok) {
        await login();
        setNotice(`${student.name || 'Your student'} has been topped up. One seat used.`);
      }
    },
    [call, login, data?.stats.seatsLeft]
  );

  /** N-6, first half: pick a bundle and see where to send the money. */
  const startSeatPurchase = useCallback(
    async (bundleCode: string) => {
      const d = (await call({ action: 'buySeats', bundleCode })) as SeatOrder | null;
      if (d) {
        setSeatOrder(d);
        setSeatTxn('');
        setSeatPayer('');
        setSeatSuffix('');
      }
    },
    [call, slug]
  );

  /** N-6, second half: tell us the transaction number. */
  const submitSeatPayment = useCallback(async () => {
    if (!seatOrder) return;
    const ok = (await call({
      action: 'submitSeatPayment',
      orderId: seatOrder.orderId,
      walletTxnId: seatTxn.trim(),
      payerName: seatPayer.trim(),
      payerPhoneSuffix: seatSuffix.trim(),
    })) as { message?: string } | null;
    if (ok) {
      setSeatOrder(null);
      await login();
      setNotice(ok.message ?? 'Thank you. We are checking your payment now.');
    }
  }, [call, login, seatOrder, seatTxn, seatPayer, seatSuffix]);

  const saveBranding = useCallback(async () => {
    const ok = await call({
      action: 'updateBranding',
      logoUrl: logoUrl.trim() || null,
      primaryColor: colour,
    });
    if (ok) {
      await login();
      setBrandOpen(false);
      setNotice('Saved. Your students see this on your own link straight away.');
    }
  }, [call, login, logoUrl, colour]);

  // ------------------------------------------------------------- sign in ---
  /**
   * The handover code got them in. Nothing else happens until they replace it.
   *
   * Deliberately a whole screen and not a dismissible banner. A banner leaves
   * the shared secret in force for as long as they ignore it, and the server
   * refuses every other action anyway, so a portal behind a banner would just
   * throw errors at them with no explanation.
   */
  if (data && mustChange) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-5 py-10">
        <div className="w-full max-w-md">
          <p className="mb-1 font-serif text-xl font-bold text-ink">{data.consultancy.name}</p>
          <p className="mb-6 text-sm text-slate-500">One thing before you start</p>
          {error && (
            <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
              {error}
            </p>
          )}
          <PasscodeChangeForm
            forced
            title="Choose your own passcode"
            explanation="We set the first one for you, which means we know it. Your student list should be yours alone, so please pick a passcode only your team knows. You will use it with your short name from now on."
            minLength={8}
            busy={busy}
            onSave={changePasscode}
          />
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-5">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 font-serif text-2xl font-bold text-ink">Consultancy portal</h1>
          <p className="mb-6 text-slate-600">Sign in to see your own students.</p>

          <label className="mb-1 block text-sm font-semibold text-ink">Your short name</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="for example kathmandu-hub"
            className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
          />

          <label className="mb-1 block text-sm font-semibold text-ink">Passcode</label>
          <PasscodeInput
            value={passcode}
            onChange={setPasscode}
            onEnter={() => slug && passcode && login()}
            placeholder="Passcode"
            label="Consultancy passcode"
                      name="consultancy-passcode"
          />

          {error && <p className="mb-3 font-medium text-red-600">{error}</p>}

          <button
            onClick={login}
            disabled={!slug || !passcode || busy}
            className="w-full rounded-xl bg-ink px-6 py-3.5 font-bold text-white disabled:bg-slate-300"
          >
            {busy ? 'Checking...' : 'Sign in'}
          </button>
          {(!slug || !passcode) && (
            <p className="mt-2 text-sm font-semibold text-red-600">
              Enter both your short name and your passcode.
            </p>
          )}
        </div>
      </main>
    );
  }

  const s = data.stats;
  const waiting = (data.orders ?? []).filter((o) => o.state === 'submitted');
  const settled = (data.orders ?? []).filter((o) => o.state !== 'submitted' && o.state !== 'created');
  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/c/${data.consultancy.slug}`
      : `/c/${data.consultancy.slug}`;

  return (
    <div className="min-h-screen bg-paper">
      {/* ------------------------------------------------------- top bar --- */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-serif text-xl font-bold text-ink">{data.consultancy.name}</p>
            <p className="text-sm text-slate-500">Consultancy portal</p>
          </div>
          <button
            onClick={login}
            disabled={busy}
            className="rounded-xl border-2 border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {busy ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* Never both at once. `call()` clears each before it sets the other. */}
        {error && (
          <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
            {notice}
          </p>
        )}

        {/* Notifications, including "super admin approved this for you". */}
        {data.notifications.length > 0 && (
          <section className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
            <h2 className="mb-2 font-bold text-emerald-900">Messages for you</h2>
            <ul className="space-y-1.5">
              {data.notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="text-sm text-emerald-900">
                  {n.message}
                  <span className="ml-2 text-emerald-700/70">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ------------------------------------------- payments waiting ---
            WALK 5.6. The client's rule is that a student who signed up through
            this consultancy's link is approved by this consultancy. That rule
            was unreachable until this section existed: the server could approve
            and the screen had no button. Put first, above everything else,
            because a student is sitting waiting on it. */}
        {waiting.length > 0 && (
          <section className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50">
            <div className="border-b border-amber-200 p-5">
              <h2 className="font-serif text-lg font-bold text-amber-900">
                {waiting.length === 1
                  ? '1 student is waiting for you'
                  : `${waiting.length} students are waiting for you`}
              </h2>
              <p className="text-sm text-amber-900/80">
                They have paid and sent us the transaction number. Approve it only if you have seen
                the money yourself. Their credits switch on the moment you do.
              </p>
            </div>
            <ul className="divide-y divide-amber-200">
              {waiting.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-4 bg-white/60 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">
                      {o.studentName || o.payerName || 'Unnamed student'}
                      <span className="ml-2 font-serif text-lg">
                        NPR {o.amountNpr.toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600">
                      {o.studentEmail || 'no email'} · paid as {o.payerName || 'unknown'} · number
                      ending {o.payerPhoneSuffix || '----'}
                    </p>
                    <p className="mt-1 font-mono text-sm text-ink">
                      Transaction {o.walletTxnId}
                    </p>
                    <p className="text-xs text-slate-500">
                      Sent {new Date(o.createdAt).toLocaleString()}
                    </p>
                    {o.screenshotUrl && (
                      <a
                        href={o.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-ink underline"
                      >
                        See their receipt
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(o, true)}
                      disabled={deciding === o.id}
                      className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                    >
                      {deciding === o.id ? 'Working...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => decide(o, false)}
                      disabled={deciding === o.id}
                      className="rounded-xl border-2 border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Cannot confirm
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Stats */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Seats bought" value={String(s.seatsTotal)} hint="your bundle" />
          <Stat label="Seats used" value={String(s.seatsUsed)} hint="given to students" />
          <Stat
            label="Seats left"
            value={String(s.seatsLeft)}
            hint={s.seatsLeft === 0 ? 'none left' : 'still available'}
            accent={s.seatsLeft === 0}
          />
          <Stat
            label="Your students"
            value={String(s.studentCount)}
            hint={`${s.activeStudents} active`}
          />
        </section>

        {/* --------------------------------------------------- buy seats ---
            N-6. The server could create a seat order from the day it was
            written and no screen ever called it, so a consultancy could not buy
            seats at all without us doing it for them. The second half, telling
            us the transaction number, did not exist on the server either: they
            could be shown a QR, send NPR 9,000, and have no way to say so.

            Deliberately the SAME shape as a student paying: QR, wallet number,
            transaction id, super admin approval. One approval queue and one set
            of money guarantees, rather than a special B2B path where a
            different mistake could happen. */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-serif text-lg font-bold text-ink">Buy more seats</h2>
            <span className={`text-sm font-semibold ${s.seatsLeft === 0 ? 'text-amber-700' : 'text-slate-500'}`}>
              {s.seatsLeft} of {s.seatsTotal} left
            </span>
          </div>

          {s.seatPaymentPending ? (
            <div className="rounded-xl border-2 border-sky-200 bg-sky-50 p-4">
              <p className="font-bold text-sky-900">We are checking your seat payment</p>
              <p className="mt-1 text-sm leading-relaxed text-sky-900/90">
                A person checks this against our bank record, so it can take a little while. Your
                seats appear here the moment it is approved. There is no need to send it again.
              </p>
            </div>
          ) : seatOrder ? (
            <div className="rounded-xl border-2 border-ink p-4">
              <p className="mb-1 text-sm text-slate-500">
                {seatOrder.bundleName}, {seatOrder.seats} seats
              </p>
              <p className="mb-4 text-3xl font-black text-ink">
                NPR {seatOrder.amountNpr.toLocaleString()}
              </p>

              {seatOrder.payTo.qrImageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={seatOrder.payTo.qrImageUrl}
                  alt={`${seatOrder.payTo.walletName} payment QR code`}
                  className="mx-auto mb-3 h-48 w-48 rounded-xl border-2 border-slate-200 bg-white object-contain p-2"
                />
              )}
              <div className="mb-4 rounded-xl bg-slate-50 p-4 text-sm">
                <p className="text-slate-500">
                  {seatOrder.payTo.qrImageUrl ? 'Or send to' : 'Send to'}
                </p>
                <p className="font-bold text-ink">{seatOrder.payTo.walletName}</p>
                <p className="font-mono text-lg font-bold text-ink">
                  {seatOrder.payTo.walletNumber || 'contact us for details'}
                </p>
              </div>

              <p className="mb-3 text-sm leading-relaxed text-slate-600">
                After you have sent it, copy the transaction number from your receipt. eSewa calls it
                a Transaction Code, a bank calls it a Transaction ID or Reference Code. Any of those
                is the right one.
              </p>
              <input
                value={seatTxn}
                onChange={(e) => setSeatTxn(e.target.value)}
                placeholder="Transaction number, e.g. 1NOH8C2"
                className="mb-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-mono outline-none focus:border-ink"
              />
              <input
                value={seatPayer}
                onChange={(e) => setSeatPayer(e.target.value)}
                placeholder="Name you paid with"
                className="mb-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
              />
              <input
                value={seatSuffix}
                onChange={(e) => setSeatSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Last 4 digits of your phone number"
                className="mb-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={submitSeatPayment}
                  disabled={busy || seatTxn.trim().length < 4 || !seatPayer.trim() || seatSuffix.length < 2}
                  className="flex-1 rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white disabled:bg-slate-300"
                >
                  {busy ? 'Sending...' : 'I have paid'}
                </button>
                <button
                  onClick={() => setSeatOrder(null)}
                  className="rounded-xl border-2 border-slate-300 px-5 py-3.5 font-semibold text-slate-700"
                >
                  Not now
                </button>
              </div>
              {(seatTxn.trim().length < 4 || !seatPayer.trim() || seatSuffix.length < 2) && (
                <p className="mt-2 text-sm font-semibold text-red-600">
                  Fill in the transaction number, the name you paid with, and the last 4 digits.
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                A seat gives one student the full pack: {SEAT_GRANT.mocks} mock interviews and{' '}
                {SEAT_GRANT.practice} practice questions, exactly what a student gets for NPR{' '}
                {(getPlan('serious')?.priceNpr ?? 0).toLocaleString()} on their own.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(data.bundles ?? []).map((b) => (
                  <button
                    key={b.code}
                    onClick={() => startSeatPurchase(b.code)}
                    disabled={busy}
                    className="rounded-xl border-2 border-slate-200 p-4 text-left transition hover:border-ink disabled:opacity-50"
                  >
                    <p className="font-bold text-ink">{b.name}</p>
                    <p className="font-serif text-2xl font-black text-ink">
                      NPR {b.priceNpr.toLocaleString()}
                    </p>
                    <p className="text-sm text-slate-500">
                      NPR {Math.round(b.priceNpr / b.seats)} a seat
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}

          {(data.seatOrders ?? []).filter((o) => o.state === 'verified').length > 0 && (
            <p className="mt-4 text-xs text-slate-500">
              {(data.seatOrders ?? []).filter((o) => o.state === 'verified').length} seat purchase(s)
              approved so far.
            </p>
          )}
        </section>

        {/* Share link */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-serif text-lg font-bold text-ink">Your student link</h2>
          <p className="mb-4 text-sm text-slate-600">
            Give this to your students. Anyone who signs up through it belongs to you and appears
            below.
          </p>
          <div className="flex flex-wrap gap-2">
            <code className="flex-1 truncate rounded-xl bg-[#eff4ff] px-4 py-3 text-sm text-ink">
              {link}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>

          {/* Branding. `updateBranding` has existed since the portal was first
              written and no screen ever called it, so every consultancy's own
              landing page carried our default navy and no logo. It is their
              link, given to their students, with their name on it. */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            {!brandOpen ? (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setBrandOpen(true)}
                  className="text-sm font-semibold text-ink underline underline-offset-2"
                >
                  Change how your page looks
                </button>
                <button
                  onClick={() => setPassOpen((v) => !v)}
                  className="text-sm font-semibold text-ink underline underline-offset-2"
                >
                  {passOpen ? 'Hide passcode settings' : 'Change your passcode'}
                </button>
              </div>
            ) : (
              <>
                <p className="mb-3 text-sm text-slate-600">
                  This is what your students see on your own link. Leave the logo blank and we show
                  your name instead.
                </p>
                <label className="mb-1 block text-sm font-semibold text-ink">
                  Logo web address <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://your-site.com/logo.png"
                  className="mb-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm outline-none focus:border-ink"
                />
                <label className="mb-1 block text-sm font-semibold text-ink">Your colour</label>
                <div className="mb-4 flex items-center gap-3">
                  <input
                    type="color"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="h-11 w-16 cursor-pointer rounded-lg border-2 border-slate-200"
                    aria-label="Your brand colour"
                  />
                  <code className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink">{colour}</code>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    onClick={saveBranding}
                    disabled={busy}
                    className="rounded-xl bg-ink px-5 py-3 font-bold text-white disabled:opacity-50"
                  >
                    {busy ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setBrandOpen(false);
                      setLogoUrl(data.consultancy.logoUrl ?? '');
                      setColour(data.consultancy.primaryColor || '#0d1b2a');
                    }}
                    className="rounded-xl border-2 border-slate-300 px-5 py-3 font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {passOpen && (
              <div className="mt-5">
                <PasscodeChangeForm
                  title="Change your passcode"
                  explanation="Do this whenever somebody leaves your team, or if you have read it out to anybody. You stay signed in on this screen."
                  minLength={8}
                  busy={busy}
                  onSave={changePasscode}
                />
              </div>
            )}
          </div>
        </section>

        {/* Students */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-serif text-lg font-bold text-ink">Your students</h2>
            <p className="text-sm text-slate-600">
              How much they are practising and what they have left. We never show you what a student
              said in an interview.
            </p>
          </div>

          {data.students.length === 0 ? (
            <div className="p-10 text-center">
              <p className="mb-2 font-semibold text-ink">No students yet</p>
              <p className="text-sm text-slate-500">
                Share your link above. Students appear here the moment they sign up through it.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-3 py-3 font-semibold">Mocks left</th>
                    <th className="px-3 py-3 font-semibold">Practice left</th>
                    <th className="px-3 py-3 font-semibold">Last active</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Top up</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.map((st) => (
                    <tr key={st.id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink">{st.name || 'Unnamed'}</p>
                        <p className="text-xs text-slate-500">{st.email || 'no email'}</p>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">{st.mocksLeft}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">{st.practiceLeft}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {new Date(st.lastSeenAt).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            st.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                      {/* N-5. The consultancy tops a student back up out of
                          their own seats. `renewStudent` worked on the server
                          from the day it was written and no screen called it,
                          so when a seat-backed student ran out the only route
                          was to message us. Disabled with a REASON when there
                          are no seats, never a bare grey button. */}
                      <td className="px-5 py-3">
                        {st.mocksLeft > 0 ? (
                          <span className="text-xs text-slate-400">not needed yet</span>
                        ) : s.seatsLeft > 0 ? (
                          <button
                            onClick={() => renew(st)}
                            disabled={renewing === st.id || busy}
                            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                          >
                            {renewing === st.id ? 'Working...' : 'Use a seat'}
                          </button>
                        ) : (
                          <span className="text-xs font-semibold text-amber-700">
                            no seats left
                          </span>
                        )}
                        {/* D-29. The way back. Only shown for a student who is
                            actually holding one of their seats. */}
                        {st.mocksLeft > 0 && (
                          <button
                            onClick={() => revokeSeat(st)}
                            disabled={busy}
                            className="ml-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
                          >
                            Take seat back
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Settled payments, so an admin can answer "what happened to mine?"
            without messaging us. Deliberately below the students table: it is
            a record, not a task. */}
        {settled.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Payments already decided</h2>
              <p className="text-sm text-slate-600">
                Approved by you or by us. Nothing here needs doing.
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {settled.slice(0, 25).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {o.studentName || o.payerName || 'Unnamed'} · NPR{' '}
                      {o.amountNpr.toLocaleString()}
                    </p>
                    <p className="font-mono text-xs text-slate-500">{o.walletTxnId}</p>
                    {o.rejectedReason && (
                      <p className="text-xs text-amber-800">Not confirmed: {o.rejectedReason}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      o.state === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {o.state === 'verified' ? 'approved' : o.state}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="mb-2 text-sm text-slate-600">{label}</p>
      <p className="font-serif text-3xl font-black text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
