import Link from 'next/link';
import {
  publicPlans,
  getPlan,
  FULL_MOCK_QUESTION_COUNT,
  TRIAL_QUESTION_COUNT,
  ENTRY_PLAN,
  COMPETITOR_ENTRY,
} from '@/lib/data/plans';

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
  /**
   * Whether anybody is signed in, resolved by the SERVER page that renders
   * this. Passed in rather than fetched here, because a price button that
   * changes its destination a second after the page paints is a button
   * somebody has already tapped.
   */
  signedIn = false,
}: {
  compact?: boolean;
  signedIn?: boolean;
}) {
  const paid = publicPlans();
  const trial = getPlan('trial')!;

  return (
    <>
      {/* Free trial, deliberately first. The strongest thing we have is that a
          student can find out whether this is any good without paying. */}
      <section className="mb-8 rounded-card border-2 border-go bg-go-tint p-6 text-center">
        <p className="mb-1 inline-block rounded-full bg-go px-3 py-1 text-micro font-bold uppercase tracking-wide text-white">
          Start here
        </p>
        <h2 className="mt-2 text-2xl font-black text-ink">
          {trial.maxQuestionsPerMock} real questions, free
        </h2>
        <p className="mx-auto mb-5 mt-2 max-w-md leading-relaxed text-go-dark">
          A real mock interview with real feedback. No payment, no account. Find out if this is any
          good before you spend a rupee.
        </p>
        <Link
          href="/universities"
          className="inline-flex w-full items-center justify-center rounded-control bg-ink px-8 py-4 text-lg font-bold text-white transition active:scale-[0.98] sm:w-auto"
        >
          Start free
        </Link>
        <p className="mt-3 text-sm text-go-dark">
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
                  ? 'relative flex flex-col rounded-card bg-ink p-7 text-white shadow-2xl ring-1 ring-ink sm:p-8 lg:scale-[1.04]'
                  : 'flex flex-col rounded-card border-2 border-line bg-surface p-6'
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
                  <p className={`text-sm ${hero ? 'text-white/60' : 'text-ink-quiet'}`}>
                    {p.tagline}
                  </p>
                </div>
                {p.badge && (
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-micro font-bold ${
                      hero ? 'bg-go text-ink' : 'bg-surface-sunk text-ink-soft'
                    }`}
                  >
                    {p.badge}
                  </span>
                )}
              </div>

              <p className={`font-black ${hero ? 'text-5xl text-white' : 'text-3xl text-ink'}`}>
                NPR {p.priceNpr.toLocaleString()}
                <span
                  className={`text-sm font-medium ${hero ? 'text-white/60' : 'text-ink-quiet'}`}
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
              <p className={`mb-5 text-sm ${hero ? 'text-go' : 'text-ink-quiet'}`}>
                {p.mockInterviews} full interviews and {p.practiceSessions} practice questions
              </p>

              <ul className="mb-6 flex-1 space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className={hero ? 'font-bold text-go' : 'font-bold text-go-dark'}>
                    ✓
                  </span>
                  <span className={hero ? 'text-white/90' : 'text-ink-soft'}>
                    <strong>{p.mockInterviews} full mock interviews</strong>
                    <br />
                    <span className={hero ? 'text-white/50' : 'text-ink-quiet'}>
                      {FULL_MOCK_QUESTION_COUNT} questions each, camera on, real exam conditions
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className={hero ? 'font-bold text-go' : 'font-bold text-go-dark'}>
                    ✓
                  </span>
                  <span className={hero ? 'text-white/90' : 'text-ink-soft'}>
                    <strong>{p.practiceSessions} practice sessions</strong>
                    <br />
                    <span className={hero ? 'text-white/50' : 'text-ink-quiet'}>
                      drill one question at a time
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className={hero ? 'font-bold text-go' : 'font-bold text-go-dark'}>
                    ✓
                  </span>
                  <span className={hero ? 'text-white/90' : 'text-ink-soft'}>
                    Feedback in English and Nepali
                  </span>
                </li>
              </ul>

              {/* --------------------------------------------------------------
                  "Choose Prep" sent EVERY student to /start, which is the
                  sign-in page, which then bounced a signed-in student to
                  /universities. So the one button on the site whose entire job
                  is to take money went to the catalogue instead of checkout —
                  including for a student who had used all ten free questions
                  and was explicitly trying to pay us. The client found it in
                  under a minute and was right to be annoyed.

                  A signed-in student goes straight to checkout for the pack
                  they picked. A signed-out student signs in and is carried on
                  to that same checkout, so the choice survives the detour.
                  Nobody who taps a price button lands somewhere that is not
                  about paying.
                  -------------------------------------------------------------- */}
              <Link
                href={
                  signedIn
                    ? `/checkout?pack=${p.code}`
                    : `/start?next=${encodeURIComponent(`/checkout?pack=${p.code}`)}`
                }
                className={`inline-flex w-full items-center justify-center rounded-control px-5 font-bold transition active:scale-[0.98] ${
                  hero
                    ? 'bg-go py-4 text-base text-ink hover:bg-go'
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
 * compares the two things that are genuinely comparable and are the client's
 * own argument: the ENTRY PRICE of each platform, and whether you can try it
 * before paying. M-12 withdrew the per-mock rate — at NPR 449 for 3 mocks we
 * are NPR 150 against their 143-160, so printing a per-mock number would have
 * invited the one comparison we lose, and turned a true claim into a false one.
 */
export function PriceComparison() {
  return (
    <section className="mb-8 overflow-hidden rounded-card border border-line bg-surface">
      <div className="border-b border-line p-5">
        <h2 className="font-bold text-ink">What it costs to start</h2>
        <p className="text-sm text-ink-soft">
          Most students want a few real rehearsals before one interview, not a big package.
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-sunk text-micro uppercase tracking-wide text-ink-quiet">
          <tr>
            <th className="px-5 py-2.5 font-semibold">Platform</th>
            <th className="px-3 py-2.5 font-semibold">Entry pack</th>
            <th className="px-5 py-2.5 font-semibold">Try before paying</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          <tr className="bg-go-tint/50">
            <td className="px-5 py-3 font-semibold text-ink">PreCAS Practice</td>
            <td className="px-3 py-3 font-bold tabular-nums text-go-dark">
              {/* Ours. Derived — a hand-typed price is one the next price change misses. */}
              NPR {ENTRY_PLAN.priceNpr}
            </td>
            <td className="px-5 py-3 font-semibold text-go-dark">
              {TRIAL_QUESTION_COUNT} real questions, free
            </td>
          </tr>
          <tr>
            <td className="px-5 py-3 text-ink-soft">Another Nepali platform</td>
            <td className="px-3 py-3 tabular-nums text-ink-soft">
              {/* Theirs, not ours — and the same digits as our Serious pack, which is
                  exactly why it is named rather than typed. See COMPETITOR_ENTRY. */}
              NPR {COMPETITOR_ENTRY.priceNpr}
            </td>
            <td className="px-5 py-3 text-ink-soft">—</td>
          </tr>
        </tbody>
      </table>
      <p className="border-t border-line px-5 py-3 text-micro leading-relaxed text-ink-quiet">
        Competitor prices taken from {COMPETITOR_ENTRY.where} on {COMPETITOR_ENTRY.checkedOn}. Packs contain different
        numbers of interviews, so this compares only the entry price and the free trial rather than
        claiming a cheaper rate per interview. Prices change, so please check theirs before you
        decide.
      </p>
    </section>
  );
}
