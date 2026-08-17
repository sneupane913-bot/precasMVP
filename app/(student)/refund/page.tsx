import { SiteHeader } from '@/components/SiteHeader';
import { headerSession } from '@/lib/auth/header-session';
import { SiteFooter } from '@/components/SiteFooter';
import { Page, Card, SectionTitle } from '@/components/ui';

export const metadata = { title: 'Refunds | PreCAS Practice' };

/**
 * Working draft. Confirm the exact refund rule with the client before launch.
 *
 * ON THE REDESIGN: layout only, wording untouched.
 */
export default async function RefundPage() {
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
              Refunds
            </h1>
            <p className="mt-2 text-sm text-ink-quiet">
              Working version. Last updated August 2026.
            </p>
          </header>

          <Card tone="sunk" className="text-center">
            <p className="font-serif text-lg leading-relaxed text-ink">
              Ten real questions, free, before you pay anything. Your credits never expire.
            </p>
          </Card>

          <div className="flex flex-col gap-8 text-ink-soft">
            <section className="flex flex-col gap-3">
              <SectionTitle>Try before you pay</SectionTitle>
              <p>
                You get ten real questions with real feedback for free, with no card and no payment, so
                you can find out if the product is right for you before you spend anything.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>If something goes wrong</SectionTitle>
              <p>
                If you paid for a pack and a technical problem on our side stopped you using it, message
                us on WhatsApp with your payment details and we will make it right, either by fixing the
                problem or by refunding the mocks you could not use.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>Credits do not expire</SectionTitle>
              <p>
                Your mocks and practice questions stay in your account until you use them, so you never
                lose what you paid for.
              </p>
            </section>

            <section className="flex flex-col gap-3">
              <SectionTitle>Contact</SectionTitle>
              <p>Message us on WhatsApp using the number in the footer and we will help.</p>
            </section>
          </div>
        </article>
      </Page>
      <SiteFooter />
    </>
  );
}
