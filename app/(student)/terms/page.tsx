import { SiteHeader } from '@/components/SiteHeader';
import { headerSession } from '@/lib/auth/header-session';
import { SiteFooter } from '@/components/SiteFooter';
import { Page, Card, SectionTitle } from '@/components/ui';
import { BRAND_NAME } from '@/lib/branding';

export const metadata = { title: `Terms of use | ${BRAND_NAME}` };

/**
 * Working draft. Review with a Nepali legal adviser before a paid launch.
 *
 * ON THE REDESIGN: layout only. The wording is untouched — a design pass is not
 * the place to edit terms.
 */
export default async function TermsPage() {
  // Resolved on the server so the header never shows 'Sign in' to somebody
  // who is already signed in. See components/HeaderSession.tsx.
  const session = await headerSession();
  return (
    <>
      <SiteHeader session={session} />
      <Page>
        <article className="mx-auto flex w-full max-w-[680px] flex-col gap-10">
          <header className="text-center">
            <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
              Terms of use
            </h1>
            <p className="mt-2 text-sm text-ink-quiet">
              Working version. Last updated August 2026.
            </p>
          </header>

          {/* The single most important line on the page, and the one a student
              is most likely to misunderstand if they only skim. It is said once,
              here, before anything else. */}
          <Card tone="sunk" className="text-center">
            <p className="font-serif text-lg leading-relaxed text-ink">
              This is practice, not immigration advice. We help you explain your own true
              situation clearly, and we never help you say anything untrue.
            </p>
          </Card>

          <div className="flex flex-col gap-8 text-ink-soft">
            <section className="flex flex-col gap-3">
              <SectionTitle>What this is</SectionTitle>
              <p>
                {BRAND_NAME} is a tool to help you practise a UK Pre-CAS credibility interview and
                get feedback. It is practice only. We help you explain your own true situation clearly.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>What this is not</SectionTitle>
              <p>
                We are not immigration advisers. We cannot promise any CAS or visa outcome, and nothing
                here is legal advice. Always check official facts with your university and a licensed
                adviser. We never help you say anything untrue.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>Using it fairly</SectionTitle>
              <p>
                Your account is for you. Please do not try to break, copy or resell the service, or
                create many accounts to take the free trial more than once.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>Payments</SectionTitle>
              <p>
                Packs are a one time payment and your credits do not expire. Payment is confirmed by us
                before your pack is added. See the{' '}
                <a
                  href="/refund"
                  className="font-semibold text-ink underline underline-offset-4 transition-colors duration-tap ease-move hover:text-go-dark"
                >
                  refunds page
                </a>{' '}
                for how refunds work.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>Contact</SectionTitle>
              <p>Message us on WhatsApp using the number in the footer if anything is unclear.</p>
            </section>
          </div>
        </article>
      </Page>
      <SiteFooter />
    </>
  );
}
