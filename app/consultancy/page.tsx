import Link from 'next/link';
import { couponPacks, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';
import { SiteFooter } from '@/components/SiteFooter';
import { supportWhatsapp } from '@/lib/support';
import { Page, Card, SectionTitle, Eyebrow, ButtonLink, Check } from '@/components/ui';
import { BRAND_NAME } from '@/lib/branding';

export const metadata = {
  title: 'Partner pricing',
  // Unlisted, so keep it out of search results too.
  robots: { index: false, follow: false },
};

// The support number is a super admin setting and can change without a
// deploy, so this page must be rendered per request, never at build time.
export const dynamic = 'force-dynamic';

/**
 * Partner (B2B) pricing: THE COUPON MODEL, from 3 September 2026.
 *
 * This is the page a marketer sends a consultancy after the first call. It has
 * to answer every question they will ask, in order: what do I get, what does
 * it cost me, what does my student get, what can I see, and how do I start.
 *
 * Deliberately UNLISTED: no link from any student-facing navigation, reached
 * by typing the URL. Wholesale prices on a student page invite the question
 * "am I paying more than a consultancy pays?", and create channel conflict
 * with the partners we most want. Unlisted is not secret; that is fine for a
 * price list.
 *
 * EVERY NUMBER IS DERIVED. The wholesale price, the retail price, the margin,
 * the pack contents and the question count all come from `lib/data/plans.ts`.
 * This page once promised 12 mocks a seat while the ledger granted 10, because
 * somebody typed the number; `qa/copy-check.js` fails the build on a typed
 * price or count here.
 */
export default async function ConsultancyPage() {
  const wa = (await supportWhatsapp()).replace(/\D/g, '');
  const packs = couponPacks();
  const enquiry = encodeURIComponent(
    `Hello, I run a consultancy and I would like to buy ${BRAND_NAME} coupons for my students. Please tell me how to pay.`
  );
  const waHref = wa ? `https://wa.me/${wa}?text=${enquiry}` : '/admin';

  return (
    <>
      {/* B21: this page had no shell at all, so a partner who landed here could
          not get anywhere. It deliberately does NOT use SiteHeader, because that
          header sells to students; this one is for a business buyer. */}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[900px] items-center justify-between px-4 py-4 md:px-10">
          <Link href="/" className="flex min-h-tap items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-control bg-go font-serif font-bold text-white">
              E
            </span>
            <span className="font-serif text-lg font-semibold text-ink">{BRAND_NAME}</span>
          </Link>
          <Link
            href="/admin"
            className="inline-flex min-h-tap items-center px-2 text-sm font-semibold text-ink transition-colors duration-tap ease-move hover:text-go-dark"
          >
            Partner sign in
          </Link>
        </div>
      </header>

      <Page>
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-10">
          <header className="flex flex-col gap-3">
            <Eyebrow>For consultancies</Eyebrow>
            <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
              Buy coupons. Give your students the practice.
            </h1>
            <p className="max-w-xl text-lg text-ink-soft">
              You buy coupons from us at the partner price. You hand a coupon to a student, they
              enter it on our pricing page, and their pack is switched on at once. You charge them
              whatever you like up to the public price and keep the difference.
            </p>
          </header>

          {/* The column count follows the DATA, not a guess at it. */}
          <div className={`grid gap-4 ${packs.length === 1 ? 'sm:grid-cols-1' : 'sm:grid-cols-2'}`}>
            {packs.map((p) => (
              <Card key={p.code} className="flex flex-col gap-1">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-quiet">
                  {p.name} coupon
                </h2>
                <p className="font-serif text-title font-bold text-ink">
                  NPR {p.wholesaleNpr.toLocaleString()}
                </p>
                <p className="mb-3 text-sm text-ink-quiet">what you pay us, per coupon</p>
                <dl className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">A student pays on their own</dt>
                    <dd className="font-semibold tabular-nums text-ink">
                      NPR {p.retailNpr.toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Yours to keep, per student</dt>
                    <dd className="font-semibold tabular-nums text-go-dark">
                      up to NPR {p.marginNpr.toLocaleString()}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">
                  Gives the student {p.mocks} full mock interviews and {p.practice} practice
                  questions.
                </p>
              </Card>
            ))}
          </div>

          <Card className="flex flex-col gap-4">
            <SectionTitle>How it works</SectionTitle>
            <ol className="flex flex-col gap-3 text-ink-soft">
              {[
                'Tell us how many coupons of each kind you want. Mix them however you like.',
                'Pay us by QR. We send you the QR on WhatsApp.',
                'We set up your partner account and send you a sign-in. You choose your own passcode the first time you sign in.',
                'Your coupons are waiting in your portal. Copy one and send it to a student.',
                `The student signs in at ${BRAND_NAME}, opens the pricing page, enters the coupon, and starts practising straight away.`,
                'When you need more coupons, message us and pay for the next batch. They appear in your portal the same day.',
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-sunk text-sm font-bold text-ink">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card className="flex flex-col gap-4">
            <SectionTitle>What each coupon gives a student</SectionTitle>
            <ul className="flex flex-col gap-3 text-ink-soft">
              <li className="flex gap-2">
                <Check />
                <span>
                  Full mock interviews of {FULL_MOCK_QUESTION_COUNT} questions each, camera on,
                  timed, for their own university
                </span>
              </li>
              <li className="flex gap-2">
                <Check />
                <span>Practice sessions for drilling single questions</span>
              </li>
              <li className="flex gap-2">
                <Check />
                <span>Feedback on what they actually said, in English with a Nepali summary</span>
              </li>
              <li className="flex gap-2">
                <Check />
                <span>
                  Exactly what a student who pays us directly gets. Your students never receive a
                  lesser product.
                </span>
              </li>
            </ul>
          </Card>

          <Card tone="sunk" className="flex flex-col gap-4">
            <SectionTitle>What you can and cannot see</SectionTitle>
            <p className="text-ink-soft">
              In your portal you see every coupon you have bought, which are still unused, which
              student used each one, their phone number and target university, how many mocks they
              have done and how many they have left. Nobody else sees your students, and you never
              see another consultancy&apos;s.
            </p>
            <p className="text-ink-soft">
              You do <strong className="text-ink">not</strong> see what they actually said. Their
              answers cover family income, visa history and personal circumstances, and those belong
              to the student. We think that is the right line, and we would rather tell you plainly
              than let you find out later.
            </p>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={waHref} className="flex-1">
              Ask about coupons on WhatsApp
            </ButtonLink>
            <ButtonLink href="/admin" variant="tertiary" className="flex-1">
              I already have an account
            </ButtonLink>
          </div>
        </div>
      </Page>
      <SiteFooter />
    </>
  );
}
