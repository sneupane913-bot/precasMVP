import Link from 'next/link';
import { publicPlans, getPlan, perMockNpr, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = { title: 'Price | PreCAS Practice' };

export default function PricingPage() {
  // QA-207: Starter and Pro were rendered despite being hidden by the client.
  // publicPlans() is the only permitted source for public pages.
  const paid = publicPlans();
  const trial = getPlan('trial')!;

  return (
    <>
      <SiteHeader />
      <main className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-center font-serif text-3xl text-ink">Price</h1>
        <p className="mx-auto mb-8 max-w-lg text-center leading-relaxed text-slate-600">
          Pay once. No monthly bill, nothing to cancel. Your credits do not expire.
        </p>

        {/* Free trial, deliberately first */}
        <section className="mb-8 rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center">
          <p className="mb-1 inline-block rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Start here
          </p>
          <h2 className="mt-2 text-2xl font-black text-ink">
            {trial.mockInterviews > 0 ? `${trial.maxQuestionsPerMock} real questions, free` : 'Free'}
          </h2>
          <p className="mx-auto mb-5 mt-2 max-w-md leading-relaxed text-emerald-900">
            A real mock interview with real feedback. No payment, no account. Find out if this is
            any good before you spend a rupee.
          </p>
          <Link
            href="/universities"
            className="inline-flex w-full items-center justify-center rounded-xl bg-ink px-8 py-4 text-lg font-bold text-white sm:w-auto"
          >
            Start free
          </Link>
          {/* Removed "no other platform lets you try free": a competitor now
              offers a free first attempt, so that claim was untrue. */}
          <p className="mt-3 text-sm text-emerald-800">
            Ten real questions with real feedback. No card, no account.
          </p>
        </section>

        {/* Paid packs.
            Client direction (higgsfield.ai reference): the packs must not look
            flat. NPR 799 is the focal card, larger, lifted, dark, with the
            brightest badge. NPR 449 sits smaller and lighter beside it, so the
            eye lands on 799 first. */}
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
                    className={`text-lg font-bold uppercase tracking-wide ${hero ? 'text-white' : 'text-ink'}`}
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

              <p
                className={`font-black ${hero ? 'text-5xl text-white' : 'text-3xl text-ink'}`}
              >
                NPR {p.priceNpr.toLocaleString()}
                <span
                  className={`text-sm font-medium ${hero ? 'text-white/60' : 'text-slate-500'}`}
                >
                  {' '}
                  one time
                </span>
              </p>
              <p className={`mb-5 text-sm ${hero ? 'text-emerald-300' : 'text-slate-500'}`}>
                about NPR {perMockNpr(p)} per mock interview
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

        {/*
          QA rewrote this section. The earlier copy said "60% cheaper for the
          same thing" while comparing our 12 mocks against a competitor's 14,
          and claimed they had no free trial when one exists. Comparing our
          per-mock price is defensible. Claiming an identical pack was not.
        */}
        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-bold text-ink">What one mock interview costs</h2>
            <p className="text-sm text-slate-600">
              The fairest way to compare is the price of a single mock interview, because packs
              contain different numbers.
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Pack</th>
                <th className="px-3 py-2.5 font-semibold">Mocks</th>
                <th className="px-5 py-2.5 font-semibold">Price per mock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-emerald-50/50">
                <td className="px-5 py-3 font-semibold text-ink">Ours, NPR 449</td>
                <td className="px-3 py-3 tabular-nums">6</td>
                <td className="px-5 py-3 font-bold text-emerald-700">NPR 75</td>
              </tr>
              <tr className="bg-emerald-50/50">
                <td className="px-5 py-3 font-semibold text-ink">Ours, NPR 799</td>
                <td className="px-3 py-3 tabular-nums">12</td>
                <td className="px-5 py-3 font-bold text-emerald-700">NPR 67</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-600">Another Nepali platform, NPR 799</td>
                <td className="px-3 py-3 tabular-nums text-slate-600">5</td>
                <td className="px-5 py-3 font-semibold text-slate-600">NPR 160</td>
              </tr>
              <tr>
                <td className="px-5 py-3 text-slate-600">Another Nepali platform, NPR 1,999</td>
                <td className="px-3 py-3 tabular-nums text-slate-600">14</td>
                <td className="px-5 py-3 font-semibold text-slate-600">NPR 143</td>
              </tr>
            </tbody>
          </table>
          <p className="border-t border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
            Competitor prices taken from their public checkout pages on 6 August 2026. Packs differ
            in what they include, so compare the per-mock price rather than the headline number.
            Prices change, so please check theirs before deciding.
          </p>
        </section>

        {/*
          QA-G7 / spec §17: the consultancy wholesale block (NPR 240 per seat)
          was removed from this public student page. A student must never see a
          lower per-seat price and feel overcharged. B2B pricing now lives only
          on the unlisted /consultancy page, reached by typing the URL.
        */}
      </div>
    </main>
      <SiteFooter />
    </>
  );
}
