import Link from 'next/link';
import { BUNDLES, SEAT_GRANT, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';
import { SiteFooter } from '@/components/SiteFooter';
import { supportWhatsapp } from '@/lib/support';

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
 */
export default async function ConsultancyPage() {
  const wa = (await supportWhatsapp()).replace(/\D/g, '');
  return (
    <>
      {/* B21: this page had no shell at all, so a partner who landed here could
          not get anywhere. It deliberately does NOT use SiteHeader, because that
          header sells to students; this one is for a business buyer. */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500 font-black text-white">
              P
            </span>
            <span className="font-serif text-lg text-ink">PreCAS Practice</span>
          </Link>
          <Link href="/admin" className="text-sm font-semibold text-ink hover:opacity-70">
            Partner sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
      <p className="mb-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
        For consultancies
      </p>
      <h1 className="mb-2 font-serif text-3xl text-ink">Give your students the practice</h1>
      <p className="mb-8 max-w-xl leading-relaxed text-slate-600">
        Buy seats in bulk, put your own logo on it, and give your students their own link. You keep
        the difference between what you pay and what you charge them.
      </p>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {BUNDLES.map((b) => (
          <div key={b.code} className="rounded-2xl border-2 border-slate-200 bg-white p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{b.name}</h2>
            <p className="mt-1 text-3xl font-black text-ink">NPR {b.priceNpr.toLocaleString()}</p>
            <p className="mb-3 text-sm text-slate-500">one time</p>
            <p className="font-semibold text-ink">{b.seats} student seats</p>
            <p className="text-sm text-slate-500">
              about NPR {Math.round(b.priceNpr / b.seats)} per student
            </p>
          </div>
        ))}
      </div>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="mb-3 font-bold text-ink">What each seat gives a student</h2>
        {/* M-10. These two numbers were HARD-CODED at 12 and 30 — the pre-13-Aug
            pack — and stayed wrong after the price change, so this page promised
            a consultancy 12 mocks a seat while the ledger granted 10. Over a
            30-seat bundle that is 60 mocks sold and not delivered, on the page
            somebody reads before spending NPR 9,000.

            M-10 says a seat is DERIVED from the 799 pack so it can never drift.
            That was enforced in the entitlement code and not here, which is
            exactly how a page can lie while every suite stays green. Read from
            SEAT_GRANT so the promise and the grant are the same number. */}
        <ul className="space-y-2 text-slate-700">
          <li>
            {SEAT_GRANT.mocks} full mock interviews of {FULL_MOCK_QUESTION_COUNT} questions each,
            camera on, timed
          </li>
          <li>{SEAT_GRANT.practice} practice sessions for drilling single questions</li>
          <li>Feedback on what they actually said, in English with a Nepali summary</li>
          <li>Your logo and colours on the pages your students see</li>
        </ul>
      </section>

      <section className="mb-8 rounded-2xl bg-paper p-6">
        <h2 className="mb-3 font-bold text-ink">What you can and cannot see</h2>
        <p className="mb-3 leading-relaxed text-slate-700">
          You see which of your students are practising, how much of their pack is left, and how
          they are progressing overall.
        </p>
        <p className="leading-relaxed text-slate-700">
          You do <strong>not</strong> see what they actually said. Their answers cover family
          income, visa history and personal circumstances, and those belong to the student. We think
          that is the right line, and we would rather tell you plainly than let you find out later.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a
          href={`https://wa.me/${wa}`}
          className="flex-1 rounded-xl bg-emerald-600 px-6 py-4 text-center text-lg font-bold text-white"
        >
          Talk to us on WhatsApp
        </a>
        <Link
          href="/admin"
          className="flex-1 rounded-xl border-2 border-ink px-6 py-4 text-center text-lg font-bold text-ink"
        >
          I already have an account
        </Link>
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
