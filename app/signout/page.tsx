import Link from 'next/link';
import { currentStudent } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * The sign out page.
 *
 * WALK 1.16 found there was no way to sign out anywhere in the product. That is
 * worst exactly where this product is used most: a consultancy lab, a handful
 * of shared machines, a session cookie that lasts ninety days. The next student
 * to sit down was already signed in as the last one, could read their report,
 * and could spend the credits they paid for.
 *
 * A real page rather than only a button, so it works with no JavaScript, can be
 * reached from the footer of every page, and can be given to a student over the
 * phone as "go to slash signout".
 */
export default async function SignOutPage() {
  const student = await currentStudent();

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <div className="w-full">
        {student ? (
          <>
            <h1 className="mb-2 font-serif text-2xl text-ink">Sign out?</h1>
            <p className="mb-6 leading-relaxed text-ink-soft">
              You are signed in as{' '}
              <span className="font-semibold text-ink">
                {student.name || student.email || 'this account'}
              </span>
              . Signing out keeps everything you have done. You can sign back in with the same
              Google account whenever you like and it will all still be here.
            </p>

            {/* A plain form, so this still works if the JavaScript never loads. */}
            <form action="/api/signout" method="post">
              <button
                type="submit"
                className="w-full rounded-control bg-ink px-6 py-4 text-lg font-bold text-white"
              >
                Sign out
              </button>
            </form>

            <Link
              href="/account"
              className="mt-3 block rounded-control border-2 border-line-strong px-6 py-3.5 text-center font-semibold text-ink-soft"
            >
              Stay signed in
            </Link>

            <p className="mt-6 text-sm leading-relaxed text-ink-quiet">
              If you are on a shared computer at your consultancy, please sign out before you leave
              it. Otherwise the next person can see your report.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 font-serif text-2xl text-ink">You are signed out</h1>
            <p className="mb-6 leading-relaxed text-ink-soft">
              Nobody is signed in on this browser.
            </p>
            <Link
              href="/start"
              className="block rounded-control bg-ink px-6 py-4 text-center text-lg font-bold text-white"
            >
              Sign in
            </Link>
            <Link
              href="/"
              className="mt-3 block rounded-control border-2 border-line-strong px-6 py-3.5 text-center font-semibold text-ink-soft"
            >
              Go to the home page
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
