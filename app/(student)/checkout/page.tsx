'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ContactUs } from '@/components/ContactUs';
import { publicPlans } from '@/lib/data/plans';

/**
 * The packs offered on this page, read from plans.ts.
 *
 * Never a hand-written list. copy-check.js fails the build on a pack number
 * typed into a page, and the reason is the /consultancy bug: 12 mocks promised
 * where 10 were granted, because somebody typed the number once.
 */
const PACK_CHOICES = publicPlans().map((p) => ({
  code: p.code,
  priceNpr: p.priceNpr,
  mockInterviews: p.mockInterviews,
  practiceSessions: p.practiceSessions,
}));

interface CreatedOrder {
  orderId: string;
  amountNpr: number;
  packName: string;
  mocks: number;
  practice: number;
  expiresAt: string;
  /** How long a person takes to check a payment. Shown, not guessed at. */
  waitHours: number;
  /** N-12. Set by the super admin, with the message already written. */
  supportWhatsapp?: string;
  supportMessage?: string;
  payTo: {
    walletName: string;
    walletNumber: string;
    accountName: string;
    qrImageUrl: string | null;
  };
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-slate-500">Loading...</main>}>
      <Checkout />
    </Suspense>
  );
}

/**
 * Manual QR payment.
 *
 * The rule that shapes this whole screen: a screenshot is evidence submitted by
 * the buyer, never proof of payment. So the field that matters is the wallet
 * transaction id, which is unique in the database and is what the verifier
 * matches against the receiving wallet's own ledger.
 *
 * The other thing this screen must do is tell the student exactly where they
 * are. A student who has paid and sees nothing happen concludes they have been
 * cheated, and that is the biggest trust risk in the product.
 */
function Checkout() {
  const params = useSearchParams();
  const [pack, setPack] = useState(params.get('pack') ?? 'prep');

  /**
   * Change pack without leaving the page.
   *
   * The URL is kept in step with replaceState so a refresh does not silently
   * revert the choice — and so does not become a third source of truth beside
   * this state and the server's order.
   */
  function switchPack(code: string) {
    if (code === pack) return;
    setPack(code);
    window.history.replaceState(null, '', `/checkout?pack=${code}`);
  }

  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [state, setState] = useState<'choosing' | 'paying' | 'submitted' | 'verified' | 'rejected'>(
    'choosing'
  );
  const [txn, setTxn] = useState('');
  const [payerName, setPayerName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shotName, setShotName] = useState<string | null>(null);
  const [shotNote, setShotNote] = useState<string | null>(null);
  /** The approver's own words when a payment could not be matched. */
  const [rejectedReason, setRejectedReason] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /**
   * Upload the receipt picture.
   *
   * Deliberately fire-and-report: a failure here NEVER blocks the payment,
   * because the transaction number is what we actually verify against. The
   * worst outcome of a failed upload is that our verifier has one less piece of
   * context, so we tell the student that plainly instead of showing red.
   */
  async function uploadShot(file: File) {
    if (!order) return;
    setShotName(file.name);
    setShotNote('Sending your picture...');
    const fd = new FormData();
    fd.append('orderId', order.orderId);
    fd.append('screenshot', file);
    try {
      const res = await fetch('/api/payment/screenshot', { method: 'POST', body: fd });
      const json = await res.json();
      setShotNote(
        json.ok
          ? 'Picture attached.'
          : (json.error?.userMessage ??
              'We could not save the picture. Your transaction number is what we check, so carry on.')
      );
    } catch {
      setShotNote(
        'We could not save the picture. That is fine, your transaction number is what we check.'
      );
    }
  }

  async function createOrder() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Only the pack code. The price comes from the server.
        body: JSON.stringify({ action: 'create', packCode: pack }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error.userMessage);
        return;
      }
      setOrder(json.data);
      setState('paying');
    } catch {
      setError('We could not start your payment. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Re-price when the pack changes, as well as on first load.
   *
   * Without `pack` in the dependency list the radio would move and the amount
   * would not — a screen showing the Serious option selected above an NPR 449
   * total. That is the same defect as every other one found tonight: two
   * sources of truth allowed to disagree on screen.
   */
  useEffect(() => {
    void createOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack]);

  async function submit() {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          orderId: order.orderId,
          walletTxnId: txn.trim(),
          payerName: payerName.trim(),
          payerPhoneSuffix: suffix.trim(),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error.userMessage);
        return;
      }
      setState('submitted');
    } catch {
      setError('We could not send your payment details. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Poll so the student sees approval land without refreshing.
  useEffect(() => {
    if (state !== 'submitted' || !order) return;
    const id = setInterval(async () => {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', orderId: order.orderId }),
      });
      const json = await res.json();
      if (json.ok && json.data.state === 'verified') setState('verified');
      if (json.ok && json.data.state === 'rejected') {
        // The reason was already in this response and was thrown away, so a
        // rejected student saw a generic sentence while the approver's actual
        // words sat unused. Telling somebody no without telling them why is
        // what makes them message us instead of fixing it themselves.
        setRejectedReason(json.data.rejectedReason ?? null);
        setState('rejected');
      }
    }, 8000);
    return () => clearInterval(id);
  }, [state, order]);

  if (state === 'verified') {
    return (
      <main className="mx-auto max-w-md px-5 py-12 text-center">
        <div className="mb-4 text-5xl">✓</div>
        <h1 className="mb-2 font-serif text-2xl text-ink">Payment approved</h1>
        <p className="mb-6 leading-relaxed text-slate-600">
          Your credits have been added. You can finish the questions you started and take your full
          mock interviews.
        </p>
        <a
          href="/universities"
          className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white"
        >
          Continue practising
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-5 py-8">
      {/* B22: a student paying money had no branding and no way out of this
          page. Both matter most exactly here, at the moment they part with
          cash. Deliberately minimal so nothing competes with paying. */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 font-black text-white">
            P
          </span>
          <span className="font-serif text-base text-ink">PreCAS Practice</span>
        </Link>
        <Link href="/pricing" className="text-sm font-semibold text-slate-500 hover:text-ink">
          Back to packs
        </Link>
      </div>

      <h1 className="mb-1 font-serif text-2xl text-ink">Pay to continue</h1>
      {order && (
        <p className="mb-4 text-slate-600">
          {order.packName}: {order.mocks} mock interviews and {order.practice} practice sessions.
        </p>
      )}

      {/* ------------------------------------------------------------------
          SWITCH PACK HERE. Client's request, and it removes a real trap:
          changing your mind used to mean going Back to /pricing, which meant
          leaving a page you had already started filling in. Back is exactly
          the action that has cost this product a mock and a free trial
          tonight, so any screen that forces it is a screen to fix.

          The price is still decided entirely by the SERVER from the pack code
          (E2) — this only changes which code we ask about. Sizes and prices
          come from plans.ts so they cannot drift from the ledger.
          ------------------------------------------------------------------ */}
      {state === 'choosing' && (
        <fieldset className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Which pack?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PACK_CHOICES.map((p) => {
              const on = pack === p.code;
              return (
                <label
                  key={p.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition ${
                    on ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="pack"
                    checked={on}
                    onChange={() => switchPack(p.code)}
                    className="mt-1 h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    <span className="block font-bold text-ink">NPR {p.priceNpr}</span>
                    <span className="block text-sm text-slate-600">
                      {p.mockInterviews} mock interviews, {p.practiceSessions} practice
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {error && (
        <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
          {error}
        </p>
      )}

      {state === 'submitted' && (
        <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-5">
          <p className="mb-1 font-bold text-sky-900">We have your payment details</p>
          <p className="mb-3 text-sm leading-relaxed text-sky-900/90">
            A person checks this against our bank record, so please allow up to{' '}
            <strong>{order?.waitHours ?? 4} hours</strong>. You do not need to pay again, and you do
            not need to stay on this page. Your credits switch on by themselves the moment it is
            approved.
          </p>
          {/* The client's point: a student who has sent real money and heard
              nothing has exactly one question — "who do I call" — and this
              screen did not answer it. */}
          <ol className="mb-4 space-y-1 text-sm text-sky-900/90">
            <li>✓ Payment details received</li>
            <li>• Checking our bank record</li>
            <li>• Credits added</li>
          </ol>

          {/* Their own copy of what we hold. A student who has paid and can
              quote a reference back to us is a student who does not feel
              cheated while they wait. */}
          {order && (
            <dl className="mb-4 rounded-xl bg-white/70 p-4 text-sm">
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="text-sky-900/70">Amount</dt>
                <dd className="font-bold text-sky-900">NPR {order.amountNpr.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="text-sky-900/70">Transaction number</dt>
                <dd className="font-mono font-bold text-sky-900">{txn.trim()}</dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="text-sky-900/70">Reference</dt>
                <dd className="font-mono text-sky-900">{order.orderId.slice(0, 8)}</dd>
              </div>
            </dl>
          )}
          <p className="mb-4 text-xs leading-relaxed text-sky-900/70">
            Keep this reference. If anything goes wrong, quoting it lets us find your payment
            straight away.
          </p>
          {/* Was a bare link reading the ENV VAR, not the super admin's
              setting — so changing the support number in /super would not have
              changed it here. And no number written anywhere. Both fixed by
              using the order's own supportWhatsapp through ContactUs. */}
          <ContactUs
            whatsapp={order?.supportWhatsapp}
            message={order?.supportMessage ?? undefined}
            urgent
          />
        </div>
      )}

      {state === 'rejected' && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <p className="mb-1 font-bold text-amber-900">We could not match that payment yet</p>

          {/* The approver's own words. "The number is one digit short" is
              something a student can act on; "we could not match it" is not. */}
          {rejectedReason && (
            <p className="mb-3 rounded-xl bg-white/70 px-4 py-3 text-sm font-medium text-amber-900">
              What we found: {rejectedReason}
            </p>
          )}

          <p className="mb-4 text-sm leading-relaxed text-amber-900/90">
            This is almost always the transaction number typed slightly wrong. Nothing has been
            taken from you by us, and nothing is closed off. Check the number in your wallet app and
            send it again. If you are sure it is right, message or call us and we will look properly
            with you.
          </p>
          <button
            onClick={() => {
              setState('choosing');
              setTxn('');
              setRejectedReason(null);
              void createOrder();
            }}
            className="mb-3 w-full rounded-xl bg-ink px-5 py-3 font-bold text-white"
          >
            Check the number and try again
          </button>

          {/* A refusal must never be a dead end. This is the client's rule:
              always a soft rejection, never one they cannot work around. */}
          {order && (
            <ContactUs
              urgent
              whatsapp={order.supportWhatsapp}
              message={order.supportMessage ?? undefined}
            />
          )}
        </div>
      )}

      {state === 'paying' && order && (
        <>
          <div className="mb-5 rounded-2xl border-2 border-ink bg-white p-5 text-center">
            <p className="text-sm text-slate-500">Amount to pay</p>
            <p className="mb-4 text-4xl font-black text-ink">NPR {order.amountNpr.toLocaleString()}</p>
            {order.payTo.walletNumber ? (
              <>
                {/* The QR is a convenience, not the only route. Many students
                    scan from the same phone that shows this page, which cannot
                    work, so the number is always given as well and is always
                    copyable. */}
                {order.payTo.qrImageUrl && (
                  <div className="mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.payTo.qrImageUrl}
                      alt={`${order.payTo.walletName} payment QR code for ${order.payTo.accountName}`}
                      className="mx-auto h-56 w-56 rounded-xl border-2 border-slate-200 bg-white object-contain p-2"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Scan with your wallet app, then type the amount yourself.
                    </p>
                  </div>
                )}
                <div className="rounded-xl bg-slate-50 p-4 text-left text-sm">
                  <p className="text-slate-500">
                    {order.payTo.qrImageUrl ? 'Or send to' : 'Send to'}
                  </p>
                  <p className="font-bold text-ink">{order.payTo.walletName}</p>
                  <p className="font-mono text-lg font-bold text-ink">{order.payTo.walletNumber}</p>
                  <p className="mb-3 text-slate-600">{order.payTo.accountName}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(order.payTo.walletNumber);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full rounded-lg border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {copied ? 'Copied' : 'Copy the number'}
                  </button>
                </div>
              </>
            ) : (
              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                Payment details are not set up yet. Please contact us on WhatsApp to pay.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-1 font-bold text-ink">After you have paid</h2>
            <p className="mb-4 text-sm leading-relaxed text-slate-600">
              Open your wallet app and copy the transaction number from the receipt. That number is
              how we find your payment.
            </p>

            <label className="mb-1 block text-sm font-semibold text-ink">Transaction number</label>
            {/* --------------------------------------------------------------
                The placeholder used to read "0011ABCD2233", which matches no
                wallet anybody in Nepal actually uses. Three real receipts:

                  eSewa            Transaction Code   1NOH8C2      (7, letters and digits)
                  Nabil Bank       Transaction ID     697873804    (9 digits)
                  mobile banking   Reference Code     395407924    (9 digits)

                So the format varies, the LABEL varies, and a student hunting
                for "transaction number" on a receipt that says "Reference
                Code" will reasonably conclude they have the wrong screen.
                Naming all three names is what makes this findable, and real
                examples are what stop somebody typing the amount instead.
                -------------------------------------------------------------- */}
            <p className="mb-2 text-xs leading-relaxed text-slate-500">
              On your receipt this may be called <strong>Transaction Code</strong>,{' '}
              <strong>Transaction ID</strong> or <strong>Reference Code</strong>. They are all the
              same thing. Examples: <span className="font-mono">1NOH8C2</span> from eSewa, or{' '}
              <span className="font-mono">697873804</span> from a bank transfer.
            </p>
            <input
              value={txn}
              onChange={(e) => setTxn(e.target.value)}
              placeholder="1NOH8C2  or  697873804"
              className="mb-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-mono outline-none focus:border-ink"
            />

            <label className="mb-1 block text-sm font-semibold text-ink">Name you paid with</label>
            <input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="mb-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
            />

            <label className="mb-1 block text-sm font-semibold text-ink">
              Last 4 digits of your phone number
            </label>
            {/* "the number you paid from" was ambiguous between the phone
                number, the account number and the transaction number — three
                different numbers all present on the same receipt. A worked
                example removes the guess entirely. */}
            <p className="mb-2 text-xs leading-relaxed text-slate-500">
              The phone number your wallet is registered to. If it is{' '}
              <span className="font-mono">98432 05222</span>, type{' '}
              <span className="font-mono font-bold text-ink">5222</span>.
            </p>
            <input
              value={suffix}
              onChange={(e) => setSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              placeholder="5222"
              className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-mono outline-none focus:border-ink"
            />

            {/* Optional, and labelled optional. Asking for a screenshot as a
                requirement would strand every student whose phone storage is
                full or whose connection drops on a 2 MB upload. */}
            <label className="mb-1 block text-sm font-semibold text-ink">
              Picture of the receipt <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadShot(f);
              }}
              className="mb-1 w-full rounded-xl border-2 border-dashed border-slate-200 px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
            />
            <p className="mb-4 text-xs leading-relaxed text-slate-500">
              {shotNote
                ? `${shotName ? shotName + ' — ' : ''}${shotNote}`
                : 'It helps us find your payment faster, but the transaction number above is what we actually check. You can skip this.'}
            </p>

            <button
              onClick={submit}
              disabled={busy || txn.trim().length < 4 || !payerName.trim() || suffix.length < 2}
              className="w-full rounded-xl bg-emerald-600 px-5 py-4 text-lg font-bold text-white disabled:bg-slate-300"
            >
              {busy ? 'Sending...' : 'I have paid'}
            </button>
            {/* N-12. The escape hatch, under the button that might fail.
                A student who has sent money and hit a problem must not have to
                hunt for us, and must not have to compose the message. */}
            {/* Was a bare button with the number written nowhere. If WhatsApp
                does not open, or opens the wrong account, a button is nothing.
                ContactUs always shows the number as dialable text too. */}
            <ContactUs
              whatsapp={order.supportWhatsapp}
              message={order.supportMessage ?? undefined}
              className="mt-4"
            />

            {(txn.trim().length < 4 || !payerName.trim() || suffix.length < 2) && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                Fill in the transaction number, the name you paid with, and the last 4 digits.
              </p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
