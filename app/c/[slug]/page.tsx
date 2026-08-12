import Link from 'next/link';
import { notFound } from 'next/navigation';
import { platform } from '@/lib/platform';
import { SiteFooter } from '@/components/SiteFooter';
import { TrustedBy } from '@/components/TrustedBy';

/**
 * Branded consultancy entry point.
 *
 * A consultancy shares /c/their-name. A student who signs up through it is
 * bound to that consultancy on the server (see app/api/auth/firebase), so they
 * appear on that consultancy's dashboard and nobody else's.
 *
 * A pending or suspended consultancy shows nothing, so a suspended partner
 * cannot keep recruiting students under our name.
 */
export const dynamic = 'force-dynamic';

export default async function ConsultancyEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await platform.getConsultancy(slug);

  if (!c || c.status !== 'approved') notFound();

  const accent = c.primaryColor || '#0d1b2a';

  return (
    <>
      <main>
        {/* Branded header. Their logo, their colour, our product. */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              {c.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logoUrl} alt={c.name} className="h-9 w-auto object-contain" />
              ) : (
                <span
                  className="grid h-9 w-9 place-items-center rounded-lg font-black text-white"
                  style={{ backgroundColor: accent }}
                >
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="font-serif text-lg text-ink">{c.name}</span>
            </div>
            <Link
              href={`/start?via=${encodeURIComponent(c.slug)}&next=/universities`}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              Start free
            </Link>
          </div>
        </header>

        <section className="px-5 py-14 text-center" style={{ backgroundColor: '#eff4ff' }}>
          <div className="mx-auto max-w-2xl">
            <p className="mb-4 inline-block rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-600">
              Provided to you by {c.name}
            </p>
            <h1 className="mb-4 font-serif text-3xl font-bold leading-tight text-ink sm:text-4xl">
              Practise your UK interview before it counts
            </h1>
            <p className="mx-auto mb-8 max-w-lg leading-relaxed text-slate-600">
              Sit a real mock Pre-CAS interview for your own university. We listen to your answers
              and tell you exactly what to fix.
            </p>
            <Link
              href={`/start?via=${encodeURIComponent(c.slug)}&next=/universities`}
              className="inline-flex w-full items-center justify-center rounded-xl px-8 py-4 text-lg font-bold text-white shadow-lg transition active:scale-[0.98] sm:w-auto sm:px-10"
              style={{ backgroundColor: accent }}
            >
              Start free practice
            </Link>
            <p className="mt-4 text-sm text-slate-500">
              No card, no payment. 10 real questions free.
            </p>
          </div>
        </section>

        <TrustedBy />

        <section className="px-5 py-14">
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
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
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[#eff4ff] font-bold text-ink">
                  {s.n}
                </div>
                <h3 className="mb-2 font-serif text-lg font-bold text-ink">{s.t}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
