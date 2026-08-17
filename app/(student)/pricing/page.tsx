import { PricingPacks, PriceComparison } from '@/components/PricingPacks';
import { SiteHeader } from '@/components/SiteHeader';
import { headerSession } from '@/lib/auth/header-session';
import { SiteFooter } from '@/components/SiteFooter';
import { Page } from '@/components/ui';

export const metadata = { title: 'Price | PreCAS Practice' };

/**
 * The cards and the comparison table now live in `components/PricingPacks.tsx`
 * so the home page renders the identical block. Home and /pricing showing
 * different prices was a real defect once (QA-205); sharing the component
 * makes it impossible rather than merely unlikely.
 *
 * The consultancy wholesale block (NPR 240 per seat) is deliberately NOT here.
 * A student must never see a lower per-seat price and feel overcharged. B2B
 * pricing lives only on the unlisted /consultancy page.
 */
export default async function PricingPage() {
  // Resolved on the server so the header never shows 'Sign in' to somebody
  // who is already signed in. See components/HeaderSession.tsx.
  const session = await headerSession();
  return (
    <>
      <SiteHeader session={session} />
      <Page>
        <div className="mx-auto flex w-full max-w-[900px] flex-col gap-10">
          <header className="text-center">
            <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
              Price
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-ink-soft">
              Pay once. No monthly bill, nothing to cancel. Your credits do not expire.
            </p>
          </header>

          <PricingPacks signedIn={Boolean(session?.signedIn)} />
          <PriceComparison />
        </div>
      </Page>
      <SiteFooter />
    </>
  );
}
