'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * An HONEST countdown (I9).
 *
 * Every rule this follows exists because the dishonest version is so common:
 *
 *  - `endsAt` comes from the server. This component never computes a deadline,
 *    so it cannot quietly restart on reload. That is the single difference
 *    between a real offer and a dark pattern.
 *  - When it reaches zero it renders NOTHING and stays gone. The offer is not
 *    reissued on the next visit.
 *  - The reason is stated in plain words, because a deadline with no reason is
 *    just pressure.
 *  - It adds mocks, it never discounts, so nobody who paid last week was
 *    overcharged.
 *
 * If there is no offer, this renders nothing at all. No offer beats a fake one.
 */

export interface Offer {
  code: string;
  name: string;
  publicReason: string;
  endsAt: string;
  bonusMocksByPack: Record<string, number>;
}

function remaining(endsAt: string): { done: boolean; label: string } {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return { done: true, label: '' };
  const mins = Math.floor(ms / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    return { done: false, label: `${hrs} hour${hrs === 1 ? '' : 's'} left` };
  }
  return { done: false, label: `${mins}:${String(secs).padStart(2, '0')} left` };
}

export function OfferCountdown({ offer }: { offer: Offer | null }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!offer) return null;

  // `tick` only forces a re-render; the maths is always against the server time.
  void tick;
  const { done, label } = remaining(offer.endsAt);
  if (done) return null;

  const best = Math.max(0, ...Object.values(offer.bonusMocksByPack));

  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-emerald-900">{offer.name}</p>
        <span className="rounded-full bg-emerald-600 px-3 py-1 text-sm font-bold tabular-nums text-white">
          {label}
        </span>
      </div>

      <p className="mb-4 leading-relaxed text-emerald-900/90">
        {offer.publicReason}
        {best > 0 && (
          <>
            {' '}
            Buy a pack before the time is up and we add up to {best} extra mock
            {best === 1 ? '' : 's'}, free.
          </>
        )}
      </p>

      <Link
        href="/pricing"
        className="inline-flex w-full items-center justify-center rounded-xl bg-ink px-6 py-3.5 font-bold text-white sm:w-auto"
      >
        See the packs
      </Link>

      <p className="mt-3 text-xs text-emerald-800/80">
        The price never changes. This adds mocks, it does not discount.
      </p>
    </div>
  );
}
