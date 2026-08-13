import { SiteHeader } from '@/components/SiteHeader';
import { headerSession } from '@/lib/auth/header-session';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = { title: 'Terms of use | PreCAS Practice' };

/** Working draft. Review with a Nepali legal adviser before a paid launch. */
export default async function TermsPage() {
  // Resolved on the server so the header never shows 'Sign in' to somebody
  // who is already signed in. See components/HeaderSession.tsx.
  const session = await headerSession();
  return (
    <>
      <SiteHeader session={session} />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-2 font-serif text-3xl text-ink">Terms of use</h1>
        <p className="mb-8 text-sm text-slate-500">Working version. Last updated August 2026.</p>

        <div className="space-y-6 leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">What this is</h2>
            <p>
              PreCAS Practice is a tool to help you practise a UK Pre-CAS credibility interview and
              get feedback. It is practice only. We help you explain your own true situation clearly.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">What this is not</h2>
            <p>
              We are not immigration advisers. We cannot promise any CAS or visa outcome, and nothing
              here is legal advice. Always check official facts with your university and a licensed
              adviser. We never help you say anything untrue.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Using it fairly</h2>
            <p>
              Your account is for you. Please do not try to break, copy or resell the service, or
              create many accounts to take the free trial more than once.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Payments</h2>
            <p>
              Packs are a one time payment and your credits do not expire. Payment is confirmed by us
              before your pack is added. See the refunds page for how refunds work.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Contact</h2>
            <p>Message us on WhatsApp using the number in the footer if anything is unclear.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
