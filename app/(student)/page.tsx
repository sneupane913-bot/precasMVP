import Link from 'next/link';
import { PricingPacks } from '@/components/PricingPacks';
import { SiteHeader } from '@/components/SiteHeader';
import { headerSession } from '@/lib/auth/header-session';
import { SiteFooter } from '@/components/SiteFooter';
import { TrustedBy } from '@/components/TrustedBy';
import { TRIAL_QUESTION_COUNT } from '@/lib/data/plans';

/**
 * Home page.
 *
 * The founder's instruction was explicit and it is binding: one button, nothing
 * competing with it. The competitor's dashboard leads with refer-and-earn,
 * vouchers, community and application tracking, and the reaction to it was that
 * none of it was wanted. A scared student wants one thing: to start.
 */
export default async function HomePage() {
  // Resolved on the server so the header never shows 'Sign in' to somebody
  // who is already signed in. See components/HeaderSession.tsx.
  const session = await headerSession();
  return (
    <>
      <SiteHeader session={session} />
      <main>
      {/* ---------------- Above the fold: one action ---------------- */}
      <section className="bg-ink px-5 pb-14 pt-12 text-white sm:pt-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 inline-block rounded-full bg-surface/10 px-4 py-1.5 text-sm font-medium">
            For Nepali students applying to the UK
          </p>
          <h1 className="mb-4 font-serif text-3xl leading-tight sm:text-5xl">
            Practise your UK interview before it counts
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-lg leading-relaxed text-white/75">
            Sit a real mock Pre-CAS interview for your own university. We listen to your answers and
            tell you exactly what to fix.
          </p>

          {/* QA B1: this pointed straight at /universities, which skipped the
              sign-in gate entirely. Sign-in comes first, then the catalogue. */}
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/start?next=/universities"
              className="inline-flex w-full items-center justify-center rounded-control bg-go px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-go active:scale-[0.98] sm:w-auto sm:px-10"
            >
              Start free practice
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-control px-6 py-4 text-lg font-semibold text-white/90 transition hover:text-white sm:w-auto"
            >
              <span aria-hidden>▸</span> See how it works
            </Link>
          </div>

          <p className="mt-4 text-sm text-white/60">
            No card, no payment. {TRIAL_QUESTION_COUNT} real questions free.
          </p>
        </div>
      </section>

      {/* ---------------- Trust strip: self-moving university slider ---------------- */}
      <TrustedBy />

      {/* ---------------- Three steps (design-reference/landing_page) ---------------- */}
      <section id="how-it-works" className="bg-surface px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center font-serif text-3xl font-bold text-ink">
            Three steps to interview readiness
          </h2>
          <p className="mb-10 text-center text-ink-soft">
            Built to calm your nerves and build real speaking habits.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                n: '1',
                t: 'Pick your university',
                d: 'Questions come from the credibility themes universities publish.',
              },
              {
                n: '2',
                t: 'Answer out loud',
                d: 'Camera on and timer running, exactly like the real interview.',
              },
              {
                n: '3',
                t: 'Get real feedback',
                d: 'We tell you what you actually said and how to say it better.',
              },
            ].map((s) => (
              <div key={s.n} className="rounded-card border border-line bg-surface p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-control bg-surface-sunk font-bold text-ink">
                  {s.n}
                </div>
                <h3 className="mb-2 font-serif text-lg font-bold text-ink">{s.t}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- The wedge, with the sample report card ----------------
          design-reference/landing_page pairs the claim with a visible example,
          because "feedback on what you said" means nothing until it is shown. */}
      <section className="bg-surface-sunk px-5 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-2">
          <div>
            <h2 className="mb-4 font-serif text-3xl font-bold leading-tight text-ink">
              Feedback in simple English, on what you actually said
            </h2>
            <p className="mb-6 leading-relaxed text-ink-soft">
              We do not just hand you a score. We show you your own words, tell you what to fix,
              and give you a better way to say it that you can actually use.
            </p>
            <ul className="space-y-3">
              {[
                'We quote your own words back to you, so you know we listened.',
                'If we cannot hear you, we say so and let you try again. We never score an answer we did not hear.',
                'A better answer in simple English you can say, not a paragraph to memorise.',
                'The one most important fix, explained in Nepali.',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-bold text-go-dark" aria-hidden>
                    ✓
                  </span>
                  <span className="leading-relaxed text-ink-soft">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Illustrative example of the report, clearly labelled as a sample. */}
          <div className="rounded-card bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <p className="text-micro font-semibold uppercase tracking-wider text-ink-quiet">
                Question analysis
              </p>
              <span className="rounded-md bg-go-tint px-2 py-1 text-micro font-bold text-go-dark">
                Sample
              </span>
            </div>
            <p className="mb-4 font-serif text-lg font-bold text-ink">
              Why did you choose to study in the UK?
            </p>
            <div className="mb-4 rounded-control bg-surface-sunk p-4">
              <p className="mb-1 text-micro font-semibold text-ink-quiet">What we heard you say</p>
              <p className="text-sm italic leading-relaxed text-ink-soft">
                I choose UK because it have very good education and the degree is recognize
                everywhere.
              </p>
            </div>
            <div className="rounded-control border-l-4 border-go bg-go-tint/50 p-4">
              <p className="mb-1 text-micro font-semibold text-go-dark">A better way to say it</p>
              <p className="text-sm leading-relaxed text-ink-soft">
                I chose the UK because it offers a world class education and the degree is
                recognised everywhere.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Price ----------------
          Client direction 2026-08-12: the home pricing block must be the SAME
          block as /pricing, which he approved. It is one shared component now
          (components/PricingPacks.tsx), so the two pages cannot drift apart.
          They did once: home advertised a monthly plan we never sold (QA-205). */}
      <section className="bg-surface px-5 py-14">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center font-serif text-3xl text-ink">
            Pay once, not monthly
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-center leading-relaxed text-ink-soft">
            Start with ten free questions. If it helps, buy a pack. Your credits do not expire and
            there is nothing to cancel.
          </p>

          <PricingPacks compact signedIn={Boolean(session?.signedIn)} />
        </div>
      </section>

      {/* ---------------- FAQ (B18) ----------------
          The four questions a nervous student actually asks before starting.
          Native details/summary so it works with no JavaScript. */}
      <section className="bg-surface px-5 py-16">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center font-serif text-3xl font-bold text-ink">
            Questions students ask
          </h2>
          <div className="space-y-3">
            {[
              {
                q: 'Is it really free to try?',
                a: `Yes. You get ${TRIAL_QUESTION_COUNT} real questions with real feedback, with no card and no payment. You only pay if you want to carry on after that.`,
              },
              {
                q: 'Are these the exact questions my university will ask?',
                a: 'No, and anyone who promises that is not being honest with you. Our questions are built from the credibility themes universities publish, so you practise the right subjects in the right way.',
              },
              {
                q: 'Who can see my answers?',
                a: 'Only you. Your answers cover family income, visa history and personal circumstances, so we never show them to a consultancy. They can see that you are practising, never what you said.',
              },
              {
                q: 'Can you get me a visa or a CAS?',
                a: 'No. We are not immigration advisers and nobody can promise that. This is practice, so you walk in able to explain your own true situation clearly.',
              },
            ].map((f) => (
              <details
                key={f.q}
                className="group rounded-card border border-line bg-surface p-5 open:bg-surface-sunk"
              >
                <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {f.q}
                    <span
                      className="shrink-0 text-ink-quiet transition group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      </main>
      <SiteFooter />
    </>
  );
}
