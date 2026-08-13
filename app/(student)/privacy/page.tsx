import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

export const metadata = { title: 'Privacy policy | PreCAS Practice' };

/**
 * Working draft, grounded in the data decisions already recorded in HANDOFF.md
 * and docs/MONEY.md. It must be reviewed by a Nepali legal adviser before a
 * public paid launch (Privacy Act 2075). Do not present as final legal advice.
 */
export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="mb-2 font-serif text-3xl text-ink">Privacy policy</h1>
        <p className="mb-8 text-sm text-slate-500">Working version. Last updated August 2026.</p>

        <div className="space-y-6 leading-relaxed text-slate-700">
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">What we collect</h2>
            <p>
              When you sign in with Google we receive your name, email and a Google account id, so we
              know it is you and can keep your practice history. During a mock interview we record
              your spoken answers and turn them into text. We also keep the feedback you receive and
              simple usage information such as which university you chose and how far you got.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">How we use it</h2>
            <p>
              We use your answers only to give you feedback and to keep your own history. We never
              post anything, and we never see your Google password. We do not sell your data.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Who processes it</h2>
            <p>
              To turn speech into text and to write feedback we use trusted service providers. Your
              audio is deleted after it is turned into text. We keep the text of your answers and
              your feedback so you can look back at them.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">How long we keep it</h2>
            <p className="mb-3">
              We keep your practice history for 90 days after you last use the product, then delete
              it.
            </p>
            <p>
              You do not have to wait for that. Open{' '}
              <a href="/account" className="font-semibold text-ink underline">
                your practice page
              </a>{' '}
              and press "Delete my data", and every interview and every answer you have given us is
              removed straight away. We keep only the record of any payment, because we are required
              to, and your name and email are stripped from it.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Your choices</h2>
            <p>
              You can ask to see or delete your data by messaging us. A consultancy that shares a
              link with you can see whether you are active and what you have bought, but not the text
              of your answers, unless you choose to share it.
            </p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-bold text-ink">Contact</h2>
            <p>Message us on WhatsApp using the number in the footer, and we will help.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
