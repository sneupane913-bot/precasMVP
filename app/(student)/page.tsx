import Link from 'next/link';
import { publicInstitutions } from '@/lib/data/institutions';
import { publicPlans, perMockNpr, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';

/**
 * Home page.
 *
 * The founder's instruction was explicit and it is binding: one button, nothing
 * competing with it. The competitor's dashboard leads with refer-and-earn,
 * vouchers, community and application tracking, and the reaction to it was that
 * none of it was wanted. A scared student wants one thing: to start.
 */
export default function HomePage() {
  return (
    <main>
      {/* ---------------- Above the fold: one action ---------------- */}
      <section className="bg-ink px-5 pb-14 pt-12 text-white sm:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium">
            For Nepali students applying to the UK
          </p>
          <h1 className="mb-4 font-serif text-3xl leading-tight sm:text-5xl">
            Practise your UK interview before it counts
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-lg leading-relaxed text-white/75">
            Sit a real mock Pre-CAS interview for your own university. We listen to your answers and
            tell you exactly what to fix.
          </p>

          <Link
            href="/universities"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-8 py-5 text-xl font-bold text-white shadow-lg transition active:scale-[0.98] sm:w-auto sm:px-14"
          >
            Start your free mock interview
          </Link>

          <p className="mt-4 text-sm text-white/60">
            No account needed. Takes about 15 minutes. Free for your first try.
          </p>
        </div>
      </section>

      {/* ---------------- Their own university ---------------- */}
      <section className="border-b border-slate-200 bg-white px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <p className="mb-5 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
            Practise for your university
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {publicInstitutions().map((i) => (
              <Link
                key={i.id}
                href={`/universities?q=${encodeURIComponent(i.shortName)}`}
                className="flex items-center gap-2.5 rounded-xl border border-slate-200 px-4 py-2.5 transition hover:border-slate-400"
              >
                <span
                  className="grid h-8 w-8 place-items-center rounded-md text-xs font-black text-white"
                  style={{ backgroundColor: i.accent }}
                >
                  {i.monogram}
                </span>
                <span className="text-sm font-semibold text-ink">{i.shortName}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="px-5 py-12">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            { n: '1', t: 'Pick your university', d: 'Based on the credibility themes universities publish.' },
            { n: '2', t: 'Answer out loud', d: 'Camera on, timer running, just like the real one.' },
            { n: '3', t: 'Get real feedback', d: 'We tell you what you said and how to say it better.' },
          ].map((s) => (
            <div key={s.n} className="text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-ink text-lg font-bold text-white">
                {s.n}
              </div>
              <h3 className="mb-1 text-lg font-bold text-ink">{s.t}</h3>
              <p className="text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- The wedge, stated plainly ---------------- */}
      <section className="bg-white px-5 py-12">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-center font-serif text-2xl text-ink sm:text-3xl">
            Feedback on what you actually said
          </h2>
          <div className="space-y-3">
            {[
              'We quote your own words back to you, so you know we listened.',
              'If we cannot hear you, we say so and let you try again. We never give you a score for an answer we did not hear.',
              'We show you a better answer written in simple English you can actually say, not a paragraph to memorise.',
              'We tell you the one most important fix in Nepali, so nothing is lost.',
            ].map((line) => (
              <div key={line} className="flex gap-3 rounded-xl bg-paper p-4">
                <span className="mt-0.5 font-bold text-emerald-600">✓</span>
                <p className="leading-relaxed text-slate-700">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Price ----------------
          QA-205: this advertised "Rs 500 / month", a plan we do not sell, and
          an undated competitor comparison. Home and /pricing must agree, and
          both are driven from lib/data/plans.ts. */}
      <section className="px-5 py-12">
        <div className="mx-auto max-w-2xl">
          <p className="mb-1 text-center text-sm font-semibold uppercase tracking-wide text-slate-500">
            After your free questions
          </p>
          <h2 className="mb-6 text-center font-serif text-2xl text-ink">Pay once, not monthly</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {publicPlans().map((p) => (
              <div
                key={p.code}
                className={`rounded-2xl border-2 bg-white p-6 text-center ${
                  p.badge === 'MOST POPULAR' ? 'border-ink' : 'border-slate-200'
                }`}
              >
                <p className="text-3xl font-black text-ink">NPR {p.priceNpr.toLocaleString()}</p>
                <p className="mb-3 text-sm text-slate-500">one time</p>
                <p className="font-semibold text-ink">
                  {p.mockInterviews} mocks + {p.practiceSessions} practice
                </p>
                <p className="text-sm text-slate-500">
                  {FULL_MOCK_QUESTION_COUNT} questions per mock, about NPR {perMockNpr(p)} each
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 text-center">
            <Link href="/pricing" className="text-sm font-semibold text-ink underline">
              See how this compares with other Nepali platforms
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------- Guardrail footer ---------------- */}
      <footer className="border-t border-slate-200 bg-white px-5 py-8">
        <div className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-slate-500">
          <p className="mb-2">
            This is practice only. We help you explain your own true situation clearly. We do not
            write answers for you and we never suggest saying anything untrue.
          </p>
          <p>
            We are not immigration advisers and we cannot guarantee any CAS or visa outcome. Always
            check official facts with your university and a licensed adviser.
          </p>
        </div>
      </footer>
    </main>
  );
}
