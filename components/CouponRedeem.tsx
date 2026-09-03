'use client';

import { useState } from 'react';
import { Button, ButtonLink, Banner, Field, Input, Spinner } from '@/components/ui';

/**
 * THE COUPON BOX. The second way to pay, beside the QR.
 *
 * A consultancy buys coupons from us in advance and hands one to a student.
 * The student types it here and the pack is switched on at once: no QR, no
 * transaction number, no waiting for approval. It is shown to EVERY signed-in
 * student, direct or not, because any student may be handed a coupon at any
 * point; the server decides what the coupon opens and refuses anything it does
 * not recognise.
 *
 * Only the code is sent. Which pack, for whom it was bought, and whether it is
 * still unused are all decided on the server from the coupon record.
 */
interface Redeemed {
  packName: string;
  mocks: number;
  practice: number;
  consultancyName: string;
  message: string;
  alreadyRedeemed: boolean;
  trialSuperseded: boolean;
}

/** Upper case, grouped in fours, as the consultancy sees it. */
function pretty(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  return clean.replace(/(.{4})(?=.)/g, '$1-');
}

export function CouponRedeem({
  signedIn,
  /** Where sign-in should bring them back to. */
  next = '/pricing#coupon',
  /** Fired after a successful redemption, so a host page can refresh itself. */
  onRedeemed,
  title = 'Have a coupon from your consultancy?',
}: {
  signedIn: boolean;
  next?: string;
  onRedeemed?: (r: Redeemed) => void;
  title?: string;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Redeemed | null>(null);

  const clean = code.replace(/-/g, '');
  const looksComplete = clean.length === 12;

  async function apply() {
    if (!looksComplete || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeemCoupon', code: clean }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error?.userMessage ?? 'That coupon could not be used. Please check it and try again.');
        return;
      }
      setDone(json.data as Redeemed);
      onRedeemed?.(json.data as Redeemed);
    } catch {
      setError('We could not check that coupon. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Banner
        tone="go"
        eyebrow={done.alreadyRedeemed ? 'Already on your account' : 'Coupon applied'}
        title={`${done.packName} pack switched on`}
        action={<ButtonLink href="/dashboard">Go to my dashboard</ButtonLink>}
      >
        <p>
          {done.mocks} mock interviews and {done.practice} practice questions, from{' '}
          {done.consultancyName}.
          {done.trialSuperseded ? ' Your free try is included in the pack.' : ''}
        </p>
      </Banner>
    );
  }

  return (
    <div id="coupon" className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-lg font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Enter the code they gave you and your pack is switched on straight away. No payment,
          no waiting.
        </p>
      </div>

      {!signedIn ? (
        <ButtonLink href={`/start?next=${encodeURIComponent(next)}`} variant="secondary" full>
          Sign in to use a coupon
        </ButtonLink>
      ) : (
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void apply();
          }}
        >
          <div className="flex-1">
            <Field label="Coupon code" id="coupon-code" error={error}>
              <Input
                id="coupon-code"
                value={code}
                onChange={(e) => setCode(pretty(e.target.value))}
                placeholder="XXXX-XXXX-XXXX"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                className="font-mono tracking-wider"
                aria-describedby="coupon-help"
              />
            </Field>
          </div>
          <Button type="submit" variant="secondary" disabled={!looksComplete || busy}>
            {busy ? (
              <>
                <Spinner />
                Checking...
              </>
            ) : (
              'Apply coupon'
            )}
          </Button>
        </form>
      )}
      <p id="coupon-help" className="text-micro text-ink-quiet">
        A coupon is twelve letters and numbers. It works once, for one student.
      </p>
    </div>
  );
}
