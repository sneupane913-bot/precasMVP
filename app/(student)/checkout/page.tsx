'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface CreatedOrder {
  orderId: string;
  amountNpr: number;
  packName: string;
  mocks: number;
  practice: number;
  expiresAt: string;
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
  const pack = params.get('pack') ?? 'prep';

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

  useEffect(() => {
    void createOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      if (json.ok && json.data.state === 'rejected') setState('rejected');
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
        <p className="mb-6 text-slate-600">
          {order.packName}: {order.mocks} mock interviews and {order.practice} practice sessions.
        </p>
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
            We are checking your transaction number against our bank record. This is a person, not a
            machine, so it can take a little time. You do not need to pay again, and you do not need
            to stay on this page.
          </p>
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
          <a
            href={`https://wa.me/${(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '').replace(/\D/g, '')}`}
            className="block rounded-xl border-2 border-sky-300 bg-white px-5 py-3 text-center font-semibold text-sky-900"
          >
            Message us if it takes too long
          </a>
        </div>
      )}

      {state === 'rejected' && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <p className="mb-1 font-bold text-amber-900">We could not match that payment</p>
          <p className="mb-4 text-sm leading-relaxed text-amber-900/90">
            This usually means the transaction number was typed slightly wrong. Nothing has been
            taken from you by us. Please check the number in your wallet app and try again.
          </p>
          <button
            onClick={() => {
              setState('choosing');
              setTxn('');
              void createOrder();
            }}
            className="w-full rounded-xl bg-ink px-5 py-3 font-bold text-white"
          >
            Try again
          </button>
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
            <input
              value={txn}
              onChange={(e) => setTxn(e.target.value)}
              placeholder="e.g. 0011ABCD2233"
              className="mb-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 font-mono outline-none focus:border-ink"
            />

            <label className="mb-1 block text-sm font-semibold text-ink">Name you paid with</label>
            <input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="mb-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
            />

            <label className="mb-1 block text-sm font-semibold text-ink">
              Last 4 digits of the number you paid from
            </label>
            <input
              value={suffix}
              onChange={(e) => setSuffix(e.target.value.replace(/\D/g, '').slice(0, 4))}
              className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
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
            {order.supportWhatsapp && (
              <a
                href={`https://wa.me/${order.supportWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(order.supportMessage ?? '')}`}
                className="mt-3 block rounded-xl border-2 border-emerald-300 bg-emerald-50 px-5 py-3 text-center text-sm font-semibold text-emerald-900"
              >
                Something wrong? Message us on WhatsApp
              </a>
            )}

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
