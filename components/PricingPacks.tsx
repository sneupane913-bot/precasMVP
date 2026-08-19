import Link from 'next/link';
import {
  publicPlans,
  getPlan,
  FULL_MOCK_QUESTION_COUNT,
  TRIAL_QUESTION_COUNT,
  ENTRY_PLAN,
  COMPETITOR_ENTRY,
} from '@/lib/data/plans';
import { BRAND_NAME } from '@/lib/branding';
import {
  Card,
  Chip,
  Eyebrow,
  ButtonLink,
  Check,
  TableCard,
  Table,
  THead,
  TBody,
  TH,
  TD,
} from '@/components/ui';

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
 *
 * ---------------------------------------------------------------------------
 * ON THE CONVERSION TO THE KIT
 *
 * Layout only. Every price, every count and every destination is byte for byte
 * what it was — including the `signedIn` branch on the pack button, which is
 * the fix for "Choose Prep sent a student who was trying to PAY US to the
 * catalogue instead of the checkout".
 *
 * One thing genuinely changed, and it is a rule rather than a taste: there is
 * now exactly ONE green button on this page. Green means GO in this product,
 * and three of them means it means nothing. The free trial takes `secondary`
 * (which is the solid ink it always was), the focal pack keeps `primary`, and
 * the lighter pack takes `tertiary`.
 * ---------------------------------------------------------------------------
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
    <div className="flex flex-col gap-8">
      {/* Free trial, deliberately first. The strongest thing we have is that a
          student can find out whether this is any good without paying. */}
      <Card tone="go" className="flex flex-col items-center gap-3 py-8 text-center">
        <Eyebrow tone="go">Start here</Eyebrow>
        <h2 className="font-serif text-title font-bold text-ink md:text-display">
          {trial.maxQuestionsPerMock} real questions, free
        </h2>
        <p className="mx-auto max-w-md text-go-dark">
          A real mock interview with real feedback. No payment, no account. Find out if this is any
          good before you spend a rupee.
        </p>
        <ButtonLink href="/universities" variant="secondary" className="mt-2 w-full sm:w-auto">
          Start free
        </ButtonLink>
        <p className="text-sm text-go-dark">
          Ten real questions with real feedback. No card, no account.
        </p>
      </Card>

      <div className="grid items-center gap-4 sm:grid-cols-2 lg:gap-6">
        {paid.map((p) => {
          const hero = p.code === 'serious';
          return (
            <Card
              key={p.code}
              tone={hero ? 'ink' : 'default'}
              className={`flex flex-col ${hero ? 'lg:scale-[1.04]' : ''}`}
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
                {p.badge &&
                  (hero ? (
                    <span className="shrink-0 rounded-full bg-go px-3 py-1 text-micro font-bold text-white">
                      {p.badge}
                    </span>
                  ) : (
                    <Chip>{p.badge}</Chip>
                  ))}
              </div>

              <p
                className={`font-serif font-bold ${
                  hero ? 'text-display text-white' : 'text-title text-ink'
                }`}
              >
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

              <ul className="mb-6 flex flex-1 flex-col gap-3 text-sm">
                <li className="flex gap-2">
                  <Check className={hero ? 'text-go' : 'text-go-dark'} />
                  <span className={hero ? 'text-white/90' : 'text-ink-soft'}>
                    <strong>{p.mockInterviews} full mock interviews</strong>
                    <br />
                    <span className={hero ? 'text-white/50' : 'text-ink-quiet'}>
                      {FULL_MOCK_QUESTION_COUNT} questions each, camera on, real exam conditions
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check className={hero ? 'text-go' : 'text-go-dark'} />
                  <span className={hero ? 'text-white/90' : 'text-ink-soft'}>
                    <strong>{p.practiceSessions} practice sessions</strong>
                    <br />
                    <span className={hero ? 'text-white/50' : 'text-ink-quiet'}>
                      drill one question at a time
                    </span>
                  </span>
                </li>
                <li className="flex gap-2">
                  <Check className={hero ? 'text-go' : 'text-go-dark'} />
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
              <ButtonLink
                href={
                  signedIn
                    ? `/checkout?pack=${p.code}`
                    : `/start?next=${encodeURIComponent(`/checkout?pack=${p.code}`)}`
                }
                variant={hero ? 'primary' : 'tertiary'}
                full
              >
                Choose {p.name}
              </ButtonLink>
            </Card>
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
            className="inline-flex min-h-tap items-center justify-center px-2 text-sm font-semibold text-ink underline underline-offset-4 transition-colors duration-tap ease-move hover:text-go-dark"
          >
            See how this compares with other Nepali platforms
          </Link>
        </p>
      )}
    </div>
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
    <TableCard
      title="What it costs to start"
      note={
        <>
          Competitor prices taken from {COMPETITOR_ENTRY.where} on {COMPETITOR_ENTRY.checkedOn}.
          Packs contain different numbers of interviews, so this compares only the entry price and
          the free trial rather than claiming a cheaper rate per interview. Prices change, so please
          check theirs before you decide.
        </>
      }
    >
      <Table>
        <THead>
          <tr>
            <TH>Platform</TH>
            <TH>Entry pack</TH>
            <TH>Try before paying</TH>
          </tr>
        </THead>
        <TBody>
          <tr className="bg-go-tint">
            <TD className="font-semibold text-ink">{BRAND_NAME}</TD>
            <TD className="font-bold tabular-nums text-go-dark">
              {/* Ours. Derived — a hand-typed price is one the next price change misses. */}
              NPR {ENTRY_PLAN.priceNpr}
            </TD>
            <TD className="font-semibold text-go-dark">
              {TRIAL_QUESTION_COUNT} real questions, free
            </TD>
          </tr>
          <tr>
            <TD>Another Nepali platform</TD>
            <TD className="tabular-nums">
              {/* Theirs, not ours — and the same digits as our Serious pack, which is
                  exactly why it is named rather than typed. See COMPETITOR_ENTRY. */}
              NPR {COMPETITOR_ENTRY.priceNpr}
            </TD>
            <TD>
              {/* An em dash, not a blank cell. A blank cell reads as "we did not
                  check", which is a different claim from "they do not offer it". */}
              <span aria-hidden>—</span>
              <span className="sr-only">No free trial</span>
            </TD>
          </tr>
        </TBody>
      </Table>
    </TableCard>
  );
}
