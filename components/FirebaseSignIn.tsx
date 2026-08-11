'use client';

import { useEffect, useState } from 'react';

/**
 * Sign in with Google, through Firebase Auth.
 *
 * The SDK is loaded on demand rather than bundled, so a student who never signs
 * in never downloads it. On a mid-range Android over 4G that is the difference
 * between a fast first page and a slow one.
 *
 * The device signal is a coarse, non-identifying hash. It is a SOFT input to
 * the trial gate and never blocks anyone by itself, because a consultancy lab
 * legitimately shares devices.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

function deviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    String(screen.width),
    String(screen.height),
    String(screen.colorDepth),
    String(new Date().getTimezoneOffset()),
    String(navigator.hardwareConcurrency ?? 0),
  ].join('|');
  let h = 0;
  for (let i = 0; i < parts.length; i++) {
    h = (h << 5) - h + parts.charCodeAt(i);
    h |= 0;
  }
  return `fp_${Math.abs(h).toString(36)}`;
}

export function FirebaseSignIn({
  config,
  referralCode,
  via,
  onSignedIn,
}: {
  config: FirebaseWebConfig | null;
  referralCode?: string;
  via?: string;
  onSignedIn: (r: { isNew: boolean; trial: { outcome: string; message: string | null } }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devHandle, setDevHandle] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function exchange(idToken: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, fingerprint: deviceFingerprint(), ref: referralCode, via }),
      });
      const json = (await res.json()) as
        | { ok: true; data: { isNew: boolean; trial: { outcome: string; message: string | null } } }
        | { ok: false; error: { userMessage: string } };
      if (!json.ok) {
        setError(json.error.userMessage);
        return;
      }
      onSignedIn(json.data);
    } catch {
      setError('We could not sign you in. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    if (!config) return;
    setBusy(true);
    setError(null);
    try {
      const [{ initializeApp, getApps }, authMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
      ]);
      const app = getApps().length ? getApps()[0]! : initializeApp(config);
      const auth = authMod.getAuth(app);
      auth.useDeviceLanguage();

      const provider = new authMod.GoogleAuthProvider();
      // Always show the chooser. On a shared consultancy machine, silently
      // reusing the previous student's Google session would be a real privacy
      // failure: student B would land inside student A's account.
      provider.setCustomParameters({ prompt: 'select_account' });

      const cred = await authMod.signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      await exchange(idToken);
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError(null); // they changed their mind, not an error
      } else if (code === 'auth/popup-blocked') {
        setError('Your browser blocked the Google window. Allow pop-ups for this site and try again.');
      } else if (code === 'auth/unauthorized-domain') {
        setError('This website address is not allowed yet in the Google settings. Please tell us and we will fix it.');
      } else if (code === 'auth/network-request-failed') {
        setError('Your internet connection dropped. Please try again.');
      } else {
        setError('We could not sign you in with Google. Please try again.');
      }
      setBusy(false);
    }
  }

  if (!ready) return <div className="h-14" />;

  // ---- Development: no Firebase project configured yet -------------------
  if (!config) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
        <p className="mb-1 font-bold text-amber-900">Google sign-in is not switched on yet</p>
        <p className="mb-4 text-sm leading-relaxed text-amber-900/90">
          Add the Firebase keys to switch on the real button. Until then you can sign in with a test
          name so the rest of the flow works. This test route is refused in production.
        </p>
        <div className="flex gap-2">
          <input
            value={devHandle}
            onChange={(e) => setDevHandle(e.target.value.replace(/[^a-z0-9]/gi, ''))}
            placeholder="test name, e.g. sujan"
            className="flex-1 rounded-xl border-2 border-amber-200 px-3 py-2.5"
          />
          <button
            onClick={() => devHandle && exchange(`dev:${devHandle}`)}
            disabled={!devHandle || busy}
            className="rounded-xl bg-ink px-5 py-2.5 font-bold text-white disabled:bg-slate-300"
          >
            {busy ? '...' : 'Continue'}
          </button>
        </div>
        {error && <p className="mt-3 font-medium text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={signInWithGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-300 bg-white px-6 py-4 text-lg font-bold text-slate-700 transition active:scale-[0.99] disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
        {busy ? 'Signing you in...' : 'Continue with Google'}
      </button>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-center font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
