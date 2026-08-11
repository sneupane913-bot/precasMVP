'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FirebaseSignIn, type FirebaseWebConfig } from '@/components/FirebaseSignIn';

export default function StartPage() {
  return (
    <Suspense fallback={<main className="p-8 text-center text-slate-500">Loading...</main>}>
      <StartInner />
    </Suspense>
  );
}

/**
 * The light gate.
 *
 * One Google button and nothing else. The marketing analyst pushed back hard
 * against a registration form before the trial, and the client agreed: full
 * details are captured at the report, once the student has felt some value.
 * Anything added to this page fights that decision.
 */
function StartInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [config, setConfig] = useState<FirebaseWebConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [softDenied, setSoftDenied] = useState<string | null>(null);

  const ref = params.get('ref') ?? undefined;
  const via = params.get('via') ?? undefined;
  const next = params.get('next') ?? '/universities';

  useEffect(() => {
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((j) => setConfig(j.data?.firebase ?? null))
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <h1 className="mb-2 text-center font-serif text-2xl text-ink">
        Sign in to start your free questions
      </h1>
      <p className="mx-auto mb-8 max-w-sm text-center leading-relaxed text-slate-600">
        One tap with Google. No password, no form, no payment.
      </p>

      {loading ? (
        <p className="text-center text-slate-400">Loading...</p>
      ) : (
        <FirebaseSignIn
          config={config}
          referralCode={ref}
          via={via}
          onSignedIn={(r) => {
            // Soft deny is never a dead end: they keep browsing and can buy.
            if (r.trial.outcome === 'soft_denied' && r.trial.message) {
              setSoftDenied(r.trial.message);
              return;
            }
            router.push(next);
          }}
        />
      )}

      {softDenied && (
        <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <p className="mb-1 font-bold text-amber-900">We need to check one thing</p>
          <p className="mb-4 text-sm leading-relaxed text-amber-900/90">{softDenied}</p>
          <div className="flex flex-col gap-2">
            <a
              href={`https://wa.me/${(process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? '').replace(/\D/g, '')}`}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-center font-bold text-white"
            >
              Message us on WhatsApp
            </a>
            <button
              onClick={() => router.push('/pricing')}
              className="rounded-xl border-2 border-slate-300 px-5 py-3 font-semibold text-slate-700"
            >
              Look at the packs instead
            </button>
          </div>
        </div>
      )}

      {ref && (
        <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
          A friend invited you. When you buy a pack, they get a free mock too.
        </p>
      )}

      <p className="mt-8 text-center text-xs leading-relaxed text-slate-400">
        We use your Google account only to know it is you and to keep your practice history. We
        never post anything, and we never see your password.
      </p>
    </main>
  );
}
