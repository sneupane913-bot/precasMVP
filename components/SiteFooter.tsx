import Link from 'next/link';
import { supportWhatsapp } from '@/lib/support';

/**
 * Global footer for the public marketing pages (home, universities, pricing,
 * legal). NOT used inside the interview room or results, where a footer would
 * distract. Compose it at the end of a marketing page.
 *
 * Why this exists: a missing footer is one of the fastest signals that a site
 * is unfinished and not safe to pay through. This gives the product the legal,
 * contact and trust anchor that every real product has. See docs/UX_AUDIT.md G3.
 */
/**
 * D-1/D-2/D-4. The footer is SYNC. The async part is the wrapper below.
 *
 * This component was `async` for exactly one reason, `await supportWhatsapp()`,
 * and eleven pages import it. On the three that carry `'use client'` --
 * `/account`, `/practice` and `/universities` -- React cannot render an async
 * component at all. The result was not a cosmetic warning:
 *
 *   - `/account` rendered nothing but an error overlay.
 *   - `/universities` re-suspended forever, roughly one console error per
 *     second, which is the client's "glitching a lot a lot" and the 480 errors
 *     he saw. On a low-end Android that is a flat battery.
 *   - The footer's own "Message us on WhatsApp" link silently hydrated to
 *     `/pricing`, so the escape to a human went to the sales page.
 *
 * Taking the one await out makes it renderable everywhere. The number is now a
 * prop, so a client page passes what it has and a server page uses the wrapper.
 */
export function SiteFooterView({ whatsappDigits = '' }: { whatsappDigits?: string }) {
  const year = new Date().getFullYear();
  const waDigits = (whatsappDigits ?? '').replace(/\D/g, '');
  const waHref = waDigits ? `https://wa.me/${waDigits}` : '/pricing';

  const columns: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: 'Practise',
      links: [
        { label: 'Choose your university', href: '/universities' },
        { label: 'Practise one question', href: '/practice' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Start free', href: '/start' },
        // WALK 1.16. On a shared consultancy machine this is the most important
        // link on the page, and it is here rather than only in the header
        // because it must be findable without JavaScript and easy to say out
        // loud over the phone.
        { label: 'Sign out', href: '/signout' },
      ],
    },
    {
      title: 'Help',
      links: [
        { label: 'How it works', href: '/#how-it-works' },
        { label: 'Questions and answers', href: '/pricing#faq' },
        { label: 'Message us on WhatsApp', href: waHref, external: true },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy policy', href: '/privacy' },
        { label: 'Terms of use', href: '/terms' },
        { label: 'Refunds', href: '/refund' },
      ],
    },
  ];

  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand block */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-control bg-go font-black text-white">
                P
              </span>
              <span className="font-serif text-lg">PreCAS Practice</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
              Practise your UK Pre-CAS interview and find out exactly what to fix, before it counts.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/40">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/75 transition hover:text-white"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-white/75 transition hover:text-white">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Honesty disclaimer, kept from the original home page */}
        <div className="mt-10 rounded-card bg-surface/5 p-5 text-sm leading-relaxed text-white/60">
          <p className="mb-2">
            This is practice only. We help you explain your own true situation clearly. We do not
            write answers for you and we never suggest saying anything untrue.
          </p>
          <p>
            We are not immigration advisers and we cannot promise any CAS or visa outcome. Always
            check official facts with your university and a licensed adviser.
          </p>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
          <p>© {year} PreCAS Practice. All rights reserved.</p>
          <p>For Nepali students applying to the UK.</p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Server wrapper. Reads the super admin's support number, then renders the view.
 *
 * Kept as the default thing a SERVER page imports so those eight pages did not
 * have to change at all. The three client pages import `SiteFooterView`
 * directly and pass the number they already hold.
 */
export async function SiteFooter() {
  const digits = await supportWhatsapp();
  return <SiteFooterView whatsappDigits={digits} />;
}
