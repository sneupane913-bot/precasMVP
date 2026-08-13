import Link from 'next/link';
import { publicPlans, getPlan, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';

/**
 * The pricing block, shared by `/pricing` and the home page.
 *
 * The client approved this specific treatment and asked for the home page to
 * use it too. Extracting it rather than copying it is the point: home and
 * /pricing showed different prices once before (QA-205, home still advertised
 * a monthly plan we did not sell). One component means that cannot recur.
 *
 * Hierarchy is deliberate, per the higgsfield.ai reference the client gave:
 * the free trial sits on top, NPR 799 is the dark focal card, NPR 449 is
 * smaller and lighter beside it. The eye lands on 799 first.
 *
 * Prices are never hardcoded here. They come from `lib/data/plans.ts`, and
 * `publicPlans()` is the only permitted source so the hidden Starter and Pro
 * packs can never leak onto a public page (QA-207).
 */

export function PricingPacks({
  /** Home shows a tighter version. The pricing page shows the full one. */
  compact = false,
}: {
  compact?: boolean;
}) {
  const paid = publicPlans();
  const trial = getPlan('trial')!;

  return (
    <>
      {/* Free trial, deliberately first. The strongest thing we have is that a
          student can find out whether this is any good without paying. */}
      <section className="mb-8 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center">
        <p className="mb-1 inline-block rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
          Start here
        </p>
        <h2 className="mt-2 text-2xl font-black text-ink">
          {trial.maxQuestionsPerMock} real questions, free
        </h2>
        <p className="mx-auto mb-5 mt-2 max-w-md leading-relaxed text-emerald-900">
          A real mock interview with real feedback. No payment, no account. Find out if this is any
          good before you spend a rupee.
        </p>
        <Link
          href="/universities"
          className="inline-flex w-full items-center justify-center rounded-xl bg-ink px-8 py-4 text-lg font-bold text-white transition active:scale-[0.98] sm:w-auto"
        >
          Start free
        </Link>
        <p className="mt-3 text-sm text-emerald-800">
          Ten real questions with real feedback. No card, no account.
        </p>
      </section>

      <div className="mb-8 grid items-center gap-4 sm:grid-cols-2 lg:gap-6">
        {paid.map((p) => {
          const hero = p.code === 'serious';
          return (
            <div
              key={p.code}
              className={
                hero
                  ? 'relative flex flex-col rounded-2xl bg-ink p-7 text-white shadow-2xl ring-1 ring-ink sm:p-8 lg:scale-[1.04]'
                  : 'flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-6'
              }
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3
                    className={`text-lg font-bold uppercase tracking-wide ${
                      hero ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {p.name}
                  </h3>
                  <p className={`text-sm ${hero ? 'text-white/60' : 'text-slate-500'}`}>
                    {p.tagline}
                  </p>
                </div>
                {p.badge && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      hero ? 'bg-emerald-400 text-ink' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {p.badge}
                  </span>
                )}
              </div>

              <p className={`font-black ${hero ? 'text-5xl text-white' : 'text-3xl text-ink'}`}>
                NPR {p.priceNpr.toLocaleString()}
                <span
                  className={`text-sm font-medium ${hero ? 'text-white/60' : 'text-slate-500'}`}
                >
                  {' '}
                  one time
                </span>
              </p>
              {/* M-12. The per-mock rate is deliberately NOT shown. At NPR 449
                  for 3 mocks it is NPR 150, against a competitor's 143-160, so
                  printing it would invite exactly the comparison we would lose
                  and would make the table below a false claim (G-9). What is
                  true and worth saying is the pack contents and the free
                  trial. */}
              <p className={`mb-5 text-sm ${hero ? 'text-emerald-300' : 'text-slate-500'}`}>
                {p.mockInterviews} full interviews and {p.practiceSessions} practice questions
              </p>

              <ul className="mb-6 flex-1 space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className={hero ? 'font-bold text-emerald-400' : 'font-bold text-emerald-600'}>
                    ✓
                  </span>
                  <span className={hero ? 'text-white/90' : 'text-slate-700'}>
                    <strong>{p.mockInterviews} full mock interviews</strong>
                    <br />
                    <span className={hero ? 'text-white/50' : 'text-slate-500'}>
                      {FULL_MOCK_QUESTION_COUNT} questions each, camera on, real exam conditions
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className={hero ? 'font-bold text-emerald-400' : 'font-bold text-emerald-600'}>
                    ✓
                  </span>
                  <span className={hero ? 'text-white/90' : 'text-slate-700'}>
                    <strong>{p.practiceSessions} practice sessions</strong>
                    <br />
                    <span className={hero ? 'text-white/50' : 'text-slate-500'}>
                      drill one question at a time
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className={hero ? 'font-bold text-emerald-400' : 'font-bold text-emerald-600'}>
                    ✓
                  </span>
                  <span className={hero ? 'text-white/90' : 'text-slate-700'}>
                    Feedback in English and Nepali
                  </span>
                </li>
              </ul>

              <Link
                href="/start"
                className={`inline-flex w-full items-center justify-center rounded-xl px-5 font-bold transition active:scale-[0.98] ${
                  hero
                    ? 'bg-emerald-400 py-4 text-base text-ink hover:bg-emerald-300'
                    : 'border-2 border-ink py-3.5 text-ink hover:bg-ink hover:text-white'
                }`}
              >
                Choose {p.name}
              </Link>
            </div>
          );
        })}
      </div>

      {/* On the home page we stop here and send them to /pricing for the
          comparison table, so the page does not turn into a second pricing
          page. */}
      {compact && (
        <p className="text-center">
          <Link
            href="/pricing"
            className="text-sm font-semibold text-ink underline underline-offset-4"
          >
            See how this compares with other Nepali platforms
          </Link>
        </p>
      )}
    </>
  );
}

/**
 * The per-mock comparison. Pricing page only.
 *
 * Every number here is checkable and dated. Two earlier claims had to be
 * retracted ("60% cheaper for the same thing" compared different pack sizes,
 * and "no other platform lets you try free" was simply untrue), so this
 * compares the one thing that is genuinely comparable: the price of a single
 * mock interview.
 */
export function PriceComparison() {
  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-5">
        <h2 className="font-bold text-ink">What it costs to start</h2>
        <p className="text-sm text-slate-600">
          Most students want a few real rehearsals before one interview, not a big package.
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-2.5 font-semibold">Platform</th>
            <th className="px-3 py-2.5 font-semibold">Entry pack</th>
            <th className="px-5 py-2.5 font-semibold">Try before paying</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          <tr className="bg-emerald-50/50">
            <td className="px-5 py-3 font-semibold text-ink">PreCAS Practice</td>
            <td className="px-3 py-3 font-bold tabular-nums text-emerald-700">NPR 449</td>
            <td className="px-5 py-3 font-semibold text-emerald-700">
              10 real questions, free
            </td>
          </tr>
          <tr>
            <td className="px-5 py-3 text-slate-600">Another Nepali platform</td>
            <td className="px-3 py-3 tabular-nums text-slate-600">NPR 799</td>
            <td className="px-5 py-3 text-slate-600">—</td>
          </tr>
        </tbody>
      </table>
      <p className="border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
        Competitor prices taken from their public checkout on 6 August 2026. Packs contain different
        numbers of interviews, so this compares only the entry price and the free trial rather than
        claiming a cheaper rate per interview. Prices change, so please check theirs before you
        decide.
      </p>
    </section>
  );
}
