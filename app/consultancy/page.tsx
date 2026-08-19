import Link from 'next/link';
import { BUNDLES, SEAT_GRANT, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';
import { SiteFooter } from '@/components/SiteFooter';
import { supportWhatsapp } from '@/lib/support';
import { Page, Card, SectionTitle, Eyebrow, ButtonLink, Check } from '@/components/ui';
import { BRAND_NAME } from '@/lib/branding';

export const metadata = {
  title: 'Partner pricing',
  // Unlisted, so keep it out of search results too.
  robots: { index: false, follow: false },
};

/**
 * Partner (B2B) pricing.
 *
 * Deliberately UNLISTED: no link from any student-facing navigation, reached by
 * typing the URL. Bulk seat prices on a student page invite the question "am I
 * paying more than a consultancy pays?", and create channel conflict with the
 * partners we most want.
 *
 * Unlisted is not secret. Anyone with the URL can read it. That is fine for a
 * price list; add a passcode if the client ever wants real privacy.
 *
 * ON THE CONVERSION TO THE KIT: layout only. In particular SEAT_GRANT stays the
 * source of the seat contents. It is READ, never typed, because this page
 * promised a consultancy 12 mocks a seat while the ledger granted 10 for a
 * week, and the fix is that the promise and the grant are the same expression.
 */
export default async function ConsultancyPage() {
  const wa = (await supportWhatsapp()).replace(/\D/g, '');
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
              Give your students the practice
            </h1>
            <p className="max-w-xl text-lg text-ink-soft">
              Buy seats in bulk, put your own logo on it, and give your students their own link. You
              keep the difference between what you pay and what you charge them.
            </p>
          </header>

          {/* The column count follows the DATA, not a guess at it. A fixed
              three-column grid holding two bundles leaves a third of the row
              empty and reads as a card that failed to load — which on a page
              whose whole job is to be trusted with NPR 9,000 is not a small
              thing. Capped at three so six bundles never become six columns. */}
          <div
            className={`grid gap-4 ${
              BUNDLES.length === 1
                ? 'sm:grid-cols-1'
                : BUNDLES.length === 2
                  ? 'sm:grid-cols-2'
                  : 'sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {BUNDLES.map((b) => (
              <Card key={b.code} className="flex flex-col gap-1">
                <h2 className="text-sm font-bold uppercase tracking-wide text-ink-quiet">
                  {b.name}
                </h2>
                <p className="font-serif text-title font-bold text-ink">
                  NPR {b.priceNpr.toLocaleString()}
                </p>
                <p className="mb-2 text-sm text-ink-quiet">one time</p>
                <p className="font-semibold text-ink">{b.seats} student seats</p>
                <p className="text-sm text-ink-quiet">
                  about NPR {Math.round(b.priceNpr / b.seats)} per student
                </p>
              </Card>
            ))}
          </div>

          <Card className="flex flex-col gap-4">
            <SectionTitle>What each seat gives a student</SectionTitle>
            {/* M-10. These two numbers were HARD-CODED at 12 and 30 — the pre-13-Aug
                pack — and stayed wrong after the price change, so this page promised
                a consultancy 12 mocks a seat while the ledger granted 10. Over a
                30-seat bundle that is 60 mocks sold and not delivered, on the page
                somebody reads before spending NPR 9,000.

                M-10 says a seat is DERIVED from the 799 pack so it can never drift.
                That was enforced in the entitlement code and not here, which is
                exactly how a page can lie while every suite stays green. Read from
                SEAT_GRANT so the promise and the grant are the same number. */}
            <ul className="flex flex-col gap-3 text-ink-soft">
              <li className="flex gap-2">
                <Check />
                <span>
                  {SEAT_GRANT.mocks} full mock interviews of {FULL_MOCK_QUESTION_COUNT} questions
                  each, camera on, timed
                </span>
              </li>
              <li className="flex gap-2">
                <Check />
                <span>{SEAT_GRANT.practice} practice sessions for drilling single questions</span>
              </li>
              <li className="flex gap-2">
                <Check />
                <span>Feedback on what they actually said, in English with a Nepali summary</span>
              </li>
              <li className="flex gap-2">
                <Check />
                <span>Your logo and colours on the pages your students see</span>
              </li>
            </ul>
          </Card>

          <Card tone="sunk" className="flex flex-col gap-4">
            <SectionTitle>What you can and cannot see</SectionTitle>
            <p className="text-ink-soft">
              You see which of your students are practising, how much of their pack is left, and how
              they are progressing overall.
            </p>
            <p className="text-ink-soft">
              You do <strong className="text-ink">not</strong> see what they actually said. Their
              answers cover family income, visa history and personal circumstances, and those belong
              to the student. We think that is the right line, and we would rather tell you plainly
              than let you find out later.
            </p>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`https://wa.me/${wa}`} className="flex-1">
              Talk to us on WhatsApp
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
