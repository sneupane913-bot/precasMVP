'use client';

import Link from 'next/link';
import { ENTRY_PLAN } from '@/lib/data/plans';

/**
 * The gate after question 10 (D13, D14, D15).
 *
 * This is the single most important screen in the funnel. The student has just
 * answered ten real questions and has felt whatever value there is. Everything
 * about this screen follows from two client decisions:
 *
 *   1. Two clear choices, not one. "See my report" is offered as a real,
 *      equal option, not a grey escape hatch. The report they get is the SAME
 *      report a paying student gets for those ten answers. Weakening the free
 *      report to force a sale would be the kind of bait the product exists to
 *      be the opposite of.
 *   2. Locked things say plainly why they are locked, and what unlocks them.
 *      A frightened student who cannot tell what happened will leave.
 *
 * No countdown here. Urgency on this screen would be a dark pattern: they have
 * not seen their result yet, so any timer would be pressure applied before
 * value. The honest post-trial offer belongs after the report, with a real
 * per-student deadline.
 */
export function TrialGate({
  answered,
  askedCount,
  total,
  remaining,
  onSeeReport,
}: {
  answered: number;
  /** How many free questions this sitting actually offered. */
  askedCount: number;
  total: number;
  /** Questions of this same sitting that paying would unlock. */
  remaining: number;
  onSeeReport: () => void;
}) {
  // D-28. A student who ended early has NOT finished the trial, and telling
  // them they have on the screen that asks for money is the worst place in the
  // product to be wrong.
  const finishedThem = answered >= askedCount;
  return (
    <div className="mx-auto max-w-lg px-5 py-10">
      <div className="mb-6 text-center">
        <p className="mb-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-800">
          {finishedThem ? 'Free questions finished' : 'Interview ended'}
        </p>
        <h1 className="font-serif text-2xl leading-snug text-ink sm:text-3xl">
          {finishedThem
            ? `You answered all ${answered} free questions`
            : `You answered ${answered} of ${askedCount} free questions`}
        </h1>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-slate-600">
          {finishedThem
            ? 'That is the whole free trial, and you finished it. Your report is ready now, whatever you decide next.'
            : 'You ended the interview early. Your report covers the answers you did give, and it is ready now.'}
        </p>
      </div>

      {/* The report first. It is free, it is ready, and it is the same report a
          paying student gets for these ten answers. */}
      <div className="mb-4 rounded-2xl border-2 border-ink bg-white p-6">
        <h2 className="mb-1 text-lg font-bold text-ink">See my report</h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-600">
          Free, ready now, and it is the same report a paying student gets for{' '}
          {answered === 1 ? 'this answer' : `these ${answered} answers`}. Nothing is held back from
          it.
        </p>
        <button
          onClick={onSeeReport}
          className="w-full rounded-xl bg-ink px-6 py-4 text-lg font-bold text-white transition active:scale-[0.98]"
        >
          See my report
        </button>
      </div>

      {/* Then the paid path, stated plainly. */}
      <div className="mb-6 rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200">
        <h2 className="mb-1 text-lg font-bold text-ink">Finish the whole interview</h2>
        <p className="mb-4 text-sm leading-relaxed text-emerald-900">
          A real Pre-CAS interview is {total} questions. Buying a pack unlocks the remaining{' '}
          {remaining} of this same sitting, and gives you more full interviews to practise with.
        </p>
        <Link
          href="/pricing"
          className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-6 py-4 text-lg font-bold text-white transition active:scale-[0.98]"
        >
          See the packs
        </Link>
        {/* Was hard-coded "From NPR 449". Derived now — see ENTRY_PLAN. */}
        <p className="mt-3 text-center text-xs text-emerald-800">
          From NPR {ENTRY_PLAN.priceNpr}. Pay once, nothing to cancel.
        </p>
      </div>

      <p className="text-center text-sm text-slate-500">
        You can look around the rest of the site freely. Only the paid questions are locked.
      </p>
    </div>
  );
}

/**
 * Shown wherever a paid-only action is offered to a student who has not paid.
 *
 * Always says what is locked, why, and exactly what unlocks it. Never a bare
 * disabled control: a student who cannot tell whether the product is broken or
 * simply not paid for will assume broken.
 */
export function LockedNotice({
  what,
  className = '',
}: {
  what: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border-2 border-slate-200 bg-slate-50 p-5 ${className}`}>
      <p className="mb-1 font-bold text-ink">{what} is part of a pack</p>
      <p className="mb-4 text-sm leading-relaxed text-slate-600">
        You have used your free questions. This is not broken and nothing has gone wrong. Buying a
        pack switches it back on straight away.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link
          href="/pricing"
          className="flex-1 rounded-xl bg-ink px-5 py-3.5 text-center font-bold text-white"
        >
          See the packs
        </Link>
        <Link
          href="/universities"
          className="flex-1 rounded-xl border-2 border-slate-300 px-5 py-3.5 text-center font-semibold text-slate-700"
        >
          Look around first
        </Link>
      </div>
    </div>
  );
}
