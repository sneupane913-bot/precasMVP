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
      {/* ------------------------------------------------------------------
          THE HERO. Full-bleed photograph with an ink gradient, per the Stitch
          system and REDESIGN.md Block 1.

          The image is positioned so the LEFT half stays calm on desktop and the
          TOP half on mobile, because that is where this text sits. The gradient
          is not decoration: it is what keeps the headline above 4.5:1 against a
          photograph whose brightness we do not control.

          If the file is not there yet the section is simply ink, exactly as it
          was before — a missing photograph must never cost a student the
          headline.
          ------------------------------------------------------------------ */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div
          aria-hidden
          className="absolute inset-0 -z-20 bg-cover bg-center opacity-70"
          style={{ backgroundImage: "image-set(url('/img/hero-desktop.png') 1x)" }}
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/95 via-ink/80 to-ink/95 md:bg-gradient-to-r md:from-ink md:via-ink/85 md:to-ink/40"
        />
        <div className="mx-auto max-w-[1120px] px-4 pb-16 pt-14 md:px-10 md:pb-24 md:pt-24">
        <div className="max-w-2xl md:text-left text-center mx-auto md:mx-0">
          <p className="mb-5 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur">
            For Nepali students applying to the UK
          </p>
          <h1 className="mb-5 font-serif text-[2.25rem] font-bold leading-[1.08] tracking-tight sm:text-[3.25rem]">
            Practise your UK interview before it counts
          </h1>
          <p className="mb-9 max-w-lg text-lg leading-relaxed text-white/80">
            Sit a real mock Pre-CAS interview for your own university. We listen to your answers and
            tell you exactly what to fix.
          </p>

          {/* QA B1: this pointed straight at /universities, which skipped the
              sign-in gate entirely. Sign-in comes first, then the catalogue. */}
          <div className="flex flex-col items-stretch gap-3 sm:flex-row md:items-center">
            <Link
              href="/start?next=/universities"
              className="inline-flex min-h-tap items-center justify-center rounded-control bg-go px-9 py-4 text-lg font-bold text-white transition-colors duration-tap ease-move hover:bg-go-dark active:scale-[0.99]"
            >
              Start free practice
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex min-h-tap items-center justify-center gap-2 rounded-control border border-white/25 px-7 py-4 text-lg font-semibold text-white/90 transition-colors duration-tap ease-move hover:bg-white/10 hover:text-white"
            >
              See how it works
            </Link>
          </div>

          <p className="mt-5 text-sm text-white/60">
            No card, no payment. {TRIAL_QUESTION_COUNT} real questions free.
          </p>
        </div>
        </div>
      </section>

      {/* ---------------- Trust strip: self-moving university slider ---------------- */}
      <TrustedBy />

      {/* ---------------- Three steps (design-reference/landing_page) ---------------- */}
      <section id="how-it-works" className="bg-surface px-4 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-[1120px]">
          <h2 className="text-center font-serif text-[2rem] font-bold tracking-tight text-ink md:text-display">
            Three steps to interview readiness
          </h2>
          <p className="mb-12 mt-3 text-center text-lg text-ink-soft">
            Built to calm your nerves and build real speaking habits.
          </p>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                n: '1',
                t: 'Pick your university',
                d: 'Questions come from the credibility themes universities publish.',
                img: '/img/step-1-choose.png',
              },
              {
                n: '2',
                t: 'Answer out loud',
                d: 'Camera on and timer running, exactly like the real interview.',
                img: '/img/step-2-speak.png',
              },
              {
                n: '3',
                t: 'Get real feedback',
                d: 'We tell you what you actually said and how to say it better.',
                img: '/img/dashboard-welcome.png',
              },
            ].map((s) => (
              /* One person's journey across three photographs, so the section
                 reads as a sequence rather than three unrelated stock shots.
                 The tinted panel behind each image means a missing file leaves
                 a considered block of colour, not a broken frame. */
              <div
                key={s.n}
                className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
              >
                <div className="aspect-[4/3] w-full bg-surface-sunk">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.img}
                    alt=""
                    width={1200}
                    height={900}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="mb-4 grid h-9 w-9 place-items-center rounded-full bg-ink text-micro font-bold text-white">
                    {s.n}
                  </div>
                  <h3 className="mb-2 font-serif text-lg font-bold text-ink">{s.t}</h3>
                  <p className="leading-relaxed text-ink-soft">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- The wedge, with the sample report card ----------------
          design-reference/landing_page pairs the claim with a visible example,
          because "feedback on what you said" means nothing until it is shown. */}
      <section className="bg-surface-sunk px-4 py-16 md:px-10 md:py-24">
        <div className="mx-auto grid max-w-[1120px] items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-5 font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
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
