'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Sign in with Google, through Firebase Auth.
 *
 * TWO FAILURES FIXED HERE, both found on the live site:
 *
 * 1. The catch block discarded the Firebase error code and showed a generic
 *    "please try again". That told the student nothing and told us nothing.
 *    Unmapped codes are now surfaced in small print so a failure is always
 *    diagnosable.
 *
 * 2. Popup sign-in fails in Firefox with Enhanced Tracking Protection on, and
 *    in Safari, because both block the cross-site storage the popup needs. The
 *    error surfaces as an unhelpful internal error rather than anything named.
 *    We now fall back to a full-page redirect, which is the documented route
 *    for browsers that block third-party storage. Popup is still tried first
 *    because it keeps the student on the page when it works.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

/** Codes that mean "this browser will not allow the popup". */
/**
 * V-9. iOS Safari, and every in-app browser (Facebook, Instagram, TikTok),
 * either block the popup or lose the storage it depends on. Our students reach
 * us from exactly those places, so on those browsers we do not attempt a popup
 * at all — we go straight to redirect, which always works.
 *
 * Trying the popup first there produces the worst outcome: a button that looks
 * like it did nothing.
 */
function popupIsUnreliable(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|Instagram|Line|Twitter|TikTok|WebView|wv\)/i.test(ua);
  return iOS || inApp;
}

const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/web-storage-unsupported',
  'auth/operation-not-supported-in-this-environment',
  'auth/internal-error',
  'auth/missing-or-invalid-nonce',
]);

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

async function loadFirebase(config: FirebaseWebConfig) {
  const [{ initializeApp, getApps }, authMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
  ]);
  const app = getApps().length ? getApps()[0]! : initializeApp(config);
  const auth = authMod.getAuth(app);
  auth.useDeviceLanguage();
  return { authMod, auth };
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
  const [detail, setDetail] = useState<string | null>(null);
  const [devHandle, setDevHandle] = useState('');
  const [ready, setReady] = useState(false);

  const exchange = useCallback(
    async (idToken: string) => {
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
          | { ok: false; error: { code: string; userMessage: string } };
        if (!json.ok) {
          setError(json.error.userMessage);
          setDetail(`server: ${json.error.code}`);
          return;
        }
        onSignedIn(json.data);
      } catch {
        setError('We could not reach our server. Check your connection and try again.');
        setDetail('network: fetch failed');
      } finally {
        setBusy(false);
      }
    },
    [referralCode, via, onSignedIn]
  );

  // A redirect sign-in finishes here, on the way back.
  useEffect(() => {
    setReady(true);
    if (!config) return;

    let cancelled = false;
    (async () => {
      try {
        const { authMod, auth } = await loadFirebase(config);
        const result = await authMod.getRedirectResult(auth);
        if (!cancelled && result?.user) {
          const idToken = await result.user.getIdToken();
          await exchange(idToken);
        }
      } catch (e) {
        if (cancelled) return;
        const code = (e as { code?: string }).code ?? 'unknown';
        setError('We could not finish signing you in with Google.');
        setDetail(`redirect: ${code}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [config, exchange]);

  function describe(code: string): string {
    switch (code) {
      case 'auth/unauthorized-domain':
        return 'This web address has not been allowed in our Google settings yet.';
      case 'auth/operation-not-allowed':
        return 'Google sign-in is not switched on for this project yet.';
      case 'auth/configuration-not-found':
        return 'Our Google sign-in settings are incomplete.';
      case 'auth/network-request-failed':
        return 'Your internet connection dropped during sign-in.';
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid':
        return 'Our Google settings have a wrong key.';
      default:
        return 'We could not sign you in with Google.';
    }
  }

  async function signIn() {
    if (!config) return;
    setBusy(true);
    setError(null);
    setDetail(null);

    try {
      const { authMod, auth } = await loadFirebase(config);
      const provider = new authMod.GoogleAuthProvider();
      // Always offer the chooser. On a shared consultancy machine, silently
      // reusing the previous student's Google session would drop student B
      // inside student A's account.
      provider.setCustomParameters({ prompt: 'select_account' });

      // Straight to redirect where popups are known to fail.
      if (popupIsUnreliable()) {
        setDetail('this browser blocks sign-in popups, using redirect');
        await authMod.signInWithRedirect(auth, provider);
        return;
      }

      try {
        const cred = await authMod.signInWithPopup(auth, provider);
        const idToken = await cred.user.getIdToken();
        await exchange(idToken);
        return;
      } catch (popupError) {
        const code = (popupError as { code?: string }).code ?? 'unknown';

        // They changed their mind. Not an error.
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          setBusy(false);
          return;
        }

        // Firefox with tracking protection, and Safari, block the storage the
        // popup relies on. Redirect is the documented route for those.
        if (REDIRECT_FALLBACK_CODES.has(code)) {
          setError('Opening Google in this window instead...');
          setDetail(`popup blocked by browser (${code}), switching to redirect`);
          await authMod.signInWithRedirect(auth, provider);
          return; // the page navigates away
        }

        /**
         * Anything else we did not anticipate ALSO tries redirect before
         * giving up. The previous version showed an error for any code not on
         * the known list, which on an unusual browser reads as "this product
         * does not work" when redirect would have signed them in fine.
         */
        try {
          setError('Opening Google in this window instead...');
          setDetail(`popup failed (${code}), trying redirect`);
          await authMod.signInWithRedirect(auth, provider);
          return;
        } catch {
          setError(describe(code));
          setDetail(`popup: ${code}, redirect also failed`);
          setBusy(false);
        }
      }
    } catch (e) {
      const code = (e as { code?: string }).code ?? 'unknown';
      const message = (e as { message?: string }).message ?? '';
      setError(describe(code));
      // NEVER swallow the code again. Without it, neither the student nor we
      // can tell a blocked popup from a misconfigured project.
      setDetail(`${code}${message ? ` — ${message.slice(0, 120)}` : ''}`);
      setBusy(false);
    }
  }

  // Never render an invisible placeholder. A student staring at empty space
  // has no way to know whether the page is loading or broken (V-9).
  if (!ready) {
    return (
      <button
        disabled
        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-slate-200 bg-white px-6 py-4 text-lg font-bold text-slate-400"
      >
        Getting ready...
      </button>
    );
  }

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
        onClick={signIn}
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
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-center">
          <p className="font-medium text-red-700">{error}</p>
          <p className="mt-1 text-xs text-red-500">
            If this keeps happening, send us this: <span className="font-mono">{detail}</span>
          </p>
        </div>
      )}
    </div>
  );
}
