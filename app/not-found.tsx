import Link from 'next/link';

/**
 * QA round 2, M1: an unknown URL showed the bare Next.js 404 with no branding
 * and no way back, and an expired result link dropped the student there. A
 * frightened student must never hit a screen with no way forward.
 */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-16">
      <div className="w-full max-w-md text-center">
        <Link href="/" className="mb-10 inline-block font-serif text-xl font-bold text-ink">
          PreCAS Practice
        </Link>

        <h1 className="mb-3 font-serif text-3xl font-bold text-ink">We could not find that page</h1>
        <p className="mb-8 leading-relaxed text-slate-600">
          The link may be old, or the practice you are looking for may have finished. Nothing you
          have paid for is lost.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/universities"
            className="inline-flex w-full items-center justify-center rounded-xl bg-ink px-6 py-4 font-bold text-white"
          >
            Choose a university and practise
          </Link>
          <Link
            href="/"
            className="inline-flex w-full items-center justify-center rounded-xl border-2 border-slate-300 px-6 py-4 font-semibold text-slate-700"
          >
            Go to the home page
          </Link>
        </div>
      </div>
    </main>
  );
}
