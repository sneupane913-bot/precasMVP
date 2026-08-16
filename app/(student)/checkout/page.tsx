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
    <Suspense fallback={<main className="p-8 text-center text-ink-quiet">Loading...</main>}>
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
  /** D-17. Survives a failed `create`, so the way to a human never disappears. */
  const [fallbackWhatsapp, setFallbackWhatsapp] = useState<string>('');
  const [state, setState] = useState<'choosing' | 'paying' | 'submitted' | 'verified' | 'rejected'>(
    'choosing'
  );
  const [txn, setTxn] = useState('');
  const [payerName, setPayerName] = useState('');
  const [suffix, setSuffix] = useState('');
  /**
   * D-19. The number the client can actually ring.
   *
   * Held as digits only. Accepts a bare 10-digit Nepali mobile, or the same
   * number with a 977 country code, because students type both and refusing one
   * of them at a payment screen would be absurd.
   */
  const [whatsapp, setWhatsapp] = useState('');
  const whatsappDigits = whatsapp.replace(/\D/g, '');
  const whatsappLooksRight = /^(977)?9[678]\d{8}$/.test(whatsappDigits);
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

  /**
   * D-17. A number to ring, held independently of the order.
   *
   * When `create` failed, `order` stayed null, and every contact card on this
   * page is fed from `order.supportWhatsapp` — so the screen where a student
   * has money in flight lost its phone number at the exact moment it mattered.
   * This fetch does not depend on the order existing.
   */
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/platform');
        const json = await res.json();
        if (json?.ok && json.data?.supportWhatsapp) setFallbackWhatsapp(json.data.supportWhatsapp);
      } catch {
        /* A missing fallback must never break the page it exists to protect. */
      }
    })();
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
          // D-19. The fields the API has always accepted and this screen never
          // sent. Without these the payments queue can only ever say
          // "not given", for every student, for ever.
          whatsappNumber: whatsappDigits,
          whatsappConfirmed: true,
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
      // D-17. Was every 8 seconds against a payment budget of 10 an hour, so
      // the waiting screen locked the student out of paying after 80 seconds.
      // The limiter no longer charges `status` at all, and this is slower
      // anyway: approval is a human checking a bank ledger, so polling faster
      // than once a minute buys nothing and only burns the student's data.
    }, 60000);
    return () => clearInterval(id);
  }, [state, order]);

  if (state === 'verified') {
    return (
      <main className="mx-auto max-w-md px-5 py-12 text-center">
        <div className="mb-4 text-5xl">✓</div>
        <h1 className="mb-2 font-serif text-2xl text-ink">Payment approved</h1>
        <p className="mb-6 leading-relaxed text-ink-soft">
          Your credits have been added. You can finish the questions you started and take your full
          mock interviews.
        </p>
        <a
          href="/universities"
          className="inline-flex w-full items-center justify-center rounded-control bg-go px-6 py-4 text-lg font-bold text-white"
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
          <span className="grid h-8 w-8 place-items-center rounded-control bg-go font-black text-white">
            P
          </span>
          <span className="font-serif text-base text-ink">PreCAS Practice</span>
        </Link>
        <Link href="/pricing" className="text-sm font-semibold text-ink-quiet hover:text-ink">
          Back to packs
        </Link>
      </div>

      <h1 className="mb-1 font-serif text-2xl text-ink">Pay to continue</h1>
      {order && (
        <p className="mb-4 text-ink-soft">
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
        <fieldset className="mb-6 rounded-card border border-line bg-surface p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Which pack?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PACK_CHOICES.map((p) => {
              const on = pack === p.code;
              return (
                <label
                  key={p.code}
                  className={`flex cursor-pointer items-start gap-3 rounded-control border-2 p-3 transition ${
                    on ? 'border-go bg-go-tint' : 'border-line hover:border-line-strong'
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
                    <span className="block text-sm text-ink-soft">
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
        <div className="mb-4">
          <p className="rounded-control border-2 border-stop/30 bg-stop-tint px-4 py-3 font-medium text-stop">
            {error}
          </p>
          {/* D-17. When `create` failed the page collapsed to a pack picker and
              this red box, and the "Talk to a person" card went with it, because
              every contact card was fed from the order that had just failed to
              exist. A student with money already sent was left with a refusal
              and no phone number. Never again: if we cannot serve the page, the
              first thing we still offer is a human. */}
          {!order && (
            <ContactUs
              className="mt-3"
              whatsapp={fallbackWhatsapp}
              message="Hello, I am trying to pay for a PreCAS Practice pack and the checkout is not working."
              urgent
            />
          )}
        </div>
      )}

      {state === 'submitted' && (
        <div className="rounded-card border-2 border-line-strong bg-surface-sunk p-5">
          <p className="mb-1 font-bold text-brand-light">We have your payment details</p>
          <p className="mb-3 text-sm leading-relaxed text-brand-light/90">
            A person checks this against our bank record, so please allow up to{' '}
            <strong>{order?.waitHours ?? 4} hours</strong>. You do not need to pay again, and you do
            not need to stay on this page. Your credits switch on by themselves the moment it is
            approved.
          </p>
          {/* The client's point: a student who has sent real money and heard
              nothing has exactly one question — "who do I call" — and this
              screen did not answer it. */}
          <ol className="mb-4 space-y-1 text-sm text-brand-light/90">
            <li>✓ Payment details received</li>
            <li>• Checking our bank record</li>
            <li>• Credits added</li>
          </ol>

          {/* Their own copy of what we hold. A student who has paid and can
              quote a reference back to us is a student who does not feel
              cheated while they wait. */}
          {order && (
            <dl className="mb-4 rounded-control bg-surface/70 p-4 text-sm">
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="text-brand-light/70">Amount</dt>
                <dd className="font-bold text-brand-light">NPR {order.amountNpr.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="text-brand-light/70">Transaction number</dt>
                <dd className="font-mono font-bold text-brand-light">{txn.trim()}</dd>
              </div>
              <div className="flex justify-between gap-3 py-0.5">
                <dt className="text-brand-light/70">Reference</dt>
                <dd className="font-mono text-brand-light">{order.orderId.slice(0, 8)}</dd>
              </div>
            </dl>
          )}
          <p className="mb-4 text-micro leading-relaxed text-brand-light/70">
            Keep this reference. If anything goes wrong, quoting it lets us find your payment
            straight away.
          </p>
          {/* Was a bare link reading the ENV VAR, not the super admin's
              setting — so changing the support number in /super would not have
              changed it here. And no number written anywhere. Both fixed by
              using the order's own supportWhatsapp through ContactUs. */}
          <ContactUs
            whatsapp={order?.supportWhatsapp || fallbackWhatsapp}
            message={order?.supportMessage ?? undefined}
            urgent
          />
        </div>
      )}

      {state === 'rejected' && (
        <div className="rounded-card border-2 border-warn/40 bg-warn-tint p-5">
          <p className="mb-1 font-bold text-warn">We could not match that payment yet</p>

          {/* The approver's own words. "The number is one digit short" is
              something a student can act on; "we could not match it" is not. */}
          {rejectedReason && (
            <p className="mb-3 rounded-control bg-surface/70 px-4 py-3 text-sm font-medium text-warn">
              What we found: {rejectedReason}
            </p>
          )}

          <p className="mb-4 text-sm leading-relaxed text-warn/90">
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
            className="mb-3 w-full rounded-control bg-ink px-5 py-3 font-bold text-white"
          >
            Check the number and try again
          </button>

          {/* A refusal must never be a dead end. This is the client's rule:
              always a soft rejection, never one they cannot work around. */}
          {order && (
            <ContactUs
              urgent
              whatsapp={order.supportWhatsapp || fallbackWhatsapp}
              message={order.supportMessage ?? undefined}
            />
          )}
        </div>
      )}

      {state === 'paying' && order && (
        <>
          <div className="mb-5 rounded-card border-2 border-ink bg-surface p-5 text-center">
            <p className="text-sm text-ink-quiet">Amount to pay</p>
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
                      className="mx-auto h-56 w-56 rounded-control border-2 border-line bg-surface object-contain p-2"
                    />
                    <p className="mt-2 text-micro text-ink-quiet">
                      Scan with your wallet app, then type the amount yourself.
                    </p>
                  </div>
                )}
                <div className="rounded-control bg-surface-sunk p-4 text-left text-sm">
                  <p className="text-ink-quiet">
                    {order.payTo.qrImageUrl ? 'Or send to' : 'Send to'}
                  </p>
                  <p className="font-bold text-ink">{order.payTo.walletName}</p>
                  <p className="font-mono text-lg font-bold text-ink">{order.payTo.walletNumber}</p>
                  <p className="mb-3 text-ink-soft">{order.payTo.accountName}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(order.payTo.walletNumber);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="w-full rounded-control border-2 border-line-strong px-4 py-2 text-sm font-semibold text-ink-soft"
                  >
                    {copied ? 'Copied' : 'Copy the number'}
                  </button>
                </div>
              </>
            ) : (
              <p className="rounded-control bg-warn-tint p-4 text-sm text-warn">
                Payment details are not set up yet. Please contact us on WhatsApp to pay.
              </p>
            )}
          </div>

          <div className="rounded-card border border-line bg-surface p-5">
            <h2 className="mb-1 font-bold text-ink">After you have paid</h2>
            <p className="mb-4 text-sm leading-relaxed text-ink-soft">
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
            <p className="mb-2 text-micro leading-relaxed text-ink-quiet">
              On your receipt this may be called <strong>Transaction Code</strong>,{' '}
              <strong>Transaction ID</strong> or <strong>Reference Code</strong>. They are all the
              same thing. Examples: <span className="font-mono">1NOH8C2</span> from eSewa, or{' '}
              <span className="font-mono">697873804</span> from a bank transfer.
            </p>
            <input
              value={txn}
              onChange={(e) => setTxn(e.target.value)}
              placeholder="1NOH8C2  or  697873804"
              className="mb-3 w-full rounded-control border-2 border-line px-4 py-3 font-mono outline-none focus:border-ink"
            />

            <label className="mb-1 block text-sm font-semibold text-ink">Name you paid with</label>
            <input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="mb-3 w-full rounded-control border-2 border-line px-4 py-3 outline-none focus:border-ink"
            />

            {/*
              D-19. THE WHOLE NUMBER, not four digits.
              ------------------------------------------------------------------
              This field used to ask for the last 4 digits only, so the platform
              never captured a number anyone could ring. The payments queue said
              "not given" for every student, and the super admin directory had
              five permanently empty columns, because nothing in the product ever
              collected them. The API had accepted `whatsappNumber` all along and
              this screen simply never sent it.

              Why it has to be the full number, in the client's own words: about
              twenty payments a day, and students will type "I have paid" with no
              screenshot, because the screenshot is optional and must stay
              optional. The transaction number is what we verify, but when it
              cannot be matched the only way to settle it is to ring the student
              or find their WhatsApp. Without a number that is impossible, so a
              student who really paid waits hours, and somebody who did not pay
              slips through in the crowd.

              Asking once for the whole number is also LESS work for the student
              than asking for four digits: the last four are derived from it
              below, so there is one field where there were two.
            */}
            <label className="mb-1 block text-sm font-semibold text-ink">
              Your WhatsApp number
            </label>
            <p className="mb-2 text-micro leading-relaxed text-ink-quiet">
              The number your wallet is registered to. We use it only to confirm this payment, and to
              reach you if we cannot find it. Ten digits, for example{' '}
              <span className="font-mono">9843205222</span>.
            </p>
            <input
              value={whatsapp}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '').slice(0, 13);
                setWhatsapp(digits);
                // The wallet match still uses the last four, derived rather
                // than asked for a second time.
                setSuffix(digits.slice(-4));
              }}
              inputMode="numeric"
              placeholder="9843205222"
              aria-label="Your WhatsApp number"
              className="mb-1 w-full rounded-control border-2 border-line px-4 py-3 font-mono outline-none focus:border-ink"
            />
            <p className="mb-4 text-micro leading-relaxed text-ink-quiet">
              {whatsappLooksRight
                ? 'We will send your confirmation to this number.'
                : 'Please type the full number, including the 98 or 97 at the start.'}
            </p>

            {/* Optional, and labelled optional. Asking for a screenshot as a
                requirement would strand every student whose phone storage is
                full or whose connection drops on a 2 MB upload. */}
            <label className="mb-1 block text-sm font-semibold text-ink">
              Picture of the receipt <span className="font-normal text-ink-quiet">(optional)</span>
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadShot(f);
              }}
              className="mb-1 w-full rounded-control border-2 border-dashed border-line px-4 py-3 text-sm file:mr-3 file:rounded-control file:border-0 file:bg-surface-sunk file:px-3 file:py-2 file:text-sm file:font-semibold file:text-ink"
            />
            <p className="mb-4 text-micro leading-relaxed text-ink-quiet">
              {shotNote
                ? `${shotName ? shotName + ' — ' : ''}${shotNote}`
                : 'It helps us find your payment faster, but the transaction number above is what we actually check. You can skip this.'}
            </p>

            <button
              onClick={submit}
              disabled={busy || txn.trim().length < 4 || !payerName.trim() || !whatsappLooksRight}
              className="w-full rounded-control bg-go px-5 py-4 text-lg font-bold text-white disabled:bg-line-strong"
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
              whatsapp={order.supportWhatsapp || fallbackWhatsapp}
              message={order.supportMessage ?? undefined}
              className="mt-4"
            />

            {(txn.trim().length < 4 || !payerName.trim() || !whatsappLooksRight) && (
              <p className="mt-2 text-sm font-semibold text-stop">
                Fill in the transaction number, the name you paid with, and your WhatsApp number.
              </p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
