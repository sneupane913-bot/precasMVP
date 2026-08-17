import { SiteHeader } from '@/components/SiteHeader';
import { headerSession } from '@/lib/auth/header-session';
import { SiteFooter } from '@/components/SiteFooter';
import { Page, Card, SectionTitle } from '@/components/ui';

export const metadata = { title: 'Privacy policy | PreCAS Practice' };

/**
 * Working draft, grounded in the data decisions already recorded in HANDOFF.md
 * and docs/MONEY.md. It must be reviewed by a Nepali legal adviser before a
 * public paid launch (Privacy Act 2075). Do not present as final legal advice.
 *
 * ON THE REDESIGN: layout only. Not one word of this policy was rewritten to
 * fit the new components, because the words are the part with legal weight and
 * a design pass is not the place to edit them.
 *
 * The measure is narrower than `Page` gives by default. Legal prose read at a
 * full 1120px is a wall; the line length here is held near 70 characters, which
 * is the only reason anybody finishes a privacy policy.
 */
export default async function PrivacyPage() {
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
              Privacy policy
            </h1>
            <p className="mt-2 text-sm text-ink-quiet">
              Working version. Last updated August 2026.
            </p>
          </header>

          {/* The one thing a frightened student actually wants to know, said
              first and plainly, before the sections that explain it. */}
          <Card tone="sunk" className="text-center">
            <p className="font-serif text-lg leading-relaxed text-ink">
              Your answers are yours. We use them to give you feedback and to keep your own
              history, and for nothing else.
            </p>
          </Card>

          <div className="flex flex-col gap-8 text-ink-soft">
            <section className="flex flex-col gap-3">
              <SectionTitle>What we collect</SectionTitle>
              <p>
                When you sign in with Google we receive your name, email and a Google account id, so we
                know it is you and can keep your practice history. During a mock interview we record
                your spoken answers and turn them into text. We also keep the feedback you receive and
                simple usage information such as which university you chose and how far you got.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>How we use it</SectionTitle>
              <p>
                We use your answers only to give you feedback and to keep your own history. We never
                post anything, and we never see your Google password. We do not sell your data.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>Who processes it</SectionTitle>
              <p>
                To turn speech into text and to write feedback we use trusted service providers. Your
                audio is deleted after it is turned into text. We keep the text of your answers and
                your feedback so you can look back at them.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>How long we keep it</SectionTitle>
              <p>
                We keep your practice history for 90 days after you last use the product, then delete
                it.
              </p>
              <p>
                You do not have to wait for that. Open{' '}
                <a
                  href="/account"
                  className="font-semibold text-ink underline underline-offset-4 transition-colors duration-tap ease-move hover:text-go-dark"
                >
                  your practice page
                </a>{' '}
                and press &ldquo;Delete my data&rdquo;, and every interview and every answer you have
                given us is removed straight away. We keep only the record of any payment, because we
                are required to, and your name and email are stripped from it.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>Your choices</SectionTitle>
              <p>
                You can ask to see or delete your data by messaging us. A consultancy that shares a
                link with you can see whether you are active and what you have bought, but not the text
                of your answers, unless you choose to share it.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>Contact</SectionTitle>
              <p>Message us on WhatsApp using the number in the footer, and we will help.</p>
            </section>
          </div>
        </article>
      </Page>
      <SiteFooter />
    </>
  );
}
