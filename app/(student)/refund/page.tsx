import { SiteHeader } from '@/components/SiteHeader';
import { headerSession } from '@/lib/auth/header-session';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = { title: 'Refunds | PreCAS Practice' };

/** Working draft. Confirm the exact refund rule with the client before launch. */
export default async function RefundPage() {
  // Resolved on the server so the header never shows 'Sign in' to somebody
  // who is already signed in. See components/HeaderSession.tsx.
  const session = await headerSession();
  return (
    <>
      <SiteHeader session={session} />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-2 font-serif text-3xl text-ink">Refunds</h1>
        <p className="mb-8 text-sm text-ink-quiet">Working version. Last updated August 2026.</p>

        <div className="space-y-6 leading-relaxed text-ink-soft">
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Try before you pay</h2>
            <p>
              You get ten real questions with real feedback for free, with no card and no payment, so
              you can find out if the product is right for you before you spend anything.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">If something goes wrong</h2>
            <p>
              If you paid for a pack and a technical problem on our side stopped you using it, message
              us on WhatsApp with your payment details and we will make it right, either by fixing the
              problem or by refunding the mocks you could not use.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Credits do not expire</h2>
            <p>
              Your mocks and practice questions stay in your account until you use them, so you never
              lose what you paid for.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Contact</h2>
            <p>Message us on WhatsApp using the number in the footer and we will help.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
