'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

/**
 * V-9 said iOS blocks the popup, so iOS was sent straight to redirect. That was
 * backwards, and it is what broke sign-in on every iPhone.
 *
 * `signInWithRedirect` finishes by reading the credential out of a cross-origin
 * iframe on <project>.firebaseapp.com. Safari's tracking prevention — which is
 * every browser on iOS, Chrome included, because they are all WebKit — blocks
 * that read. The student picks their Google account, lands back on our page,
 * and `getRedirectResult` hands us null with no error at all: a button that
 * looks like it did nothing. Exactly the report.
 *
 * Google's documented remedy is `signInWithPopup`, which carries the credential
 * back through postMessage between the two windows and never touches
 * third-party storage. So the popup is now tried first everywhere.
 *
 * Only real in-app webviews (Facebook, Instagram, TikTok) still go straight to
 * redirect: they cannot open a second window at all.
 */
function mustUseRedirect(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /FBAN|FBAV|Instagram|Line|Twitter|TikTok|; wv\)/i.test(navigator.userAgent);
}

/**
 * Set just before we hand the page to Google, cleared when we come back with a
 * student. If it survives the round trip, the redirect was swallowed and we owe
 * them a message instead of silence.
 */
const PENDING_REDIRECT = 'etai.google.redirect';

function markPendingRedirect() {
  try {
    sessionStorage.setItem(PENDING_REDIRECT, String(Date.now()));
  } catch {
    /* private mode; the worst case is the old silent failure */
  }
}

function takePendingRedirect(): boolean {
  try {
    const at = sessionStorage.getItem(PENDING_REDIRECT);
    sessionStorage.removeItem(PENDING_REDIRECT);
    // Ten minutes. Older than that and this is a new visit, not a return trip.
    return at !== null && Date.now() - Number(at) < 10 * 60 * 1000;
  } catch {
    return false;
  }
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

type Firebase = Awaited<ReturnType<typeof loadFirebase>>;

/**
 * After a redirect, the SDK sometimes restores the session a beat after
 * `getRedirectResult` has already answered null. Give it that beat before
 * declaring the round trip lost.
 */
function firstUser({ authMod, auth }: Firebase, ms: number) {
  return new Promise<{ getIdToken(): Promise<string> } | null>((resolve) => {
    if (auth.currentUser) return resolve(auth.currentUser);
    const timer = setTimeout(() => {
      stop();
      resolve(null);
    }, ms);
    const stop = authMod.onAuthStateChanged(auth, (user) => {
      if (!user) return;
      clearTimeout(timer);
      stop();
      resolve(user);
    });
  });
}

export function FirebaseSignIn({
  config,
  referralCode,
  via,
  seat,
  onSignedIn,
}: {
  config: FirebaseWebConfig | null;
  referralCode?: string;
  via?: string;
  /** N-1. Seat size code from the consultancy link. */
  seat?: string;
  onSignedIn: (r: {
    isNew: boolean;
    /** N-30. No WhatsApp number on file yet. */
    needsProfile?: boolean;
    trial: { outcome: string; message: string | null };
  }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [devHandle, setDevHandle] = useState('');
  const [ready, setReady] = useState(false);
  const firebase = useRef<Firebase | null>(null);

  const exchange = useCallback(
    async (idToken: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/firebase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, fingerprint: deviceFingerprint(), ref: referralCode, via, seat }),
        });
        const json = (await res.json()) as
          | { ok: true; data: { isNew: boolean; trial: { outcome: string; message: string | null } } }
          | { ok: false; error: { code: string; userMessage: string; message?: string } };
        if (!json.ok) {
          setError(json.error.userMessage);
          // `message` carries the engineer-facing detail — which database, which
          // host, which error code. It was being thrown away in favour of the
          // bare code, so a store outage read as "server: STORE_UNAVAILABLE"
          // and the actual cause lived only in a log nobody was watching.
          setDetail(json.error.message ? `${json.error.code}: ${json.error.message}` : `server: ${json.error.code}`);
          return;
        }
        onSignedIn(json.data);
      } catch (e) {
        // This catch also fires when the server answered with something that is
        // not JSON — an unhandled 500 renders an HTML page, and `res.json()`
        // throws. Saying "check your connection" then points the student at
        // their own wifi for a fault that is entirely ours, so the real thrown
        // message is kept and shown.
        setError('We could not reach our server. Check your connection and try again.');
        setDetail(`network: ${(e as Error)?.message ?? 'fetch failed'}`);
      } finally {
        setBusy(false);
      }
    },
    [referralCode, via, seat, onSignedIn]
  );

  // A redirect sign-in finishes here, on the way back.
  //
  // This also warms the SDK up. The popup has to be opened inside the click
  // that asked for it — Safari blocks a window that opens after an await on a
  // module still downloading — so by the time the button is pressed, Firebase
  // is already loaded and `signInWithPopup` is reached in the same tick.
  useEffect(() => {
    setReady(true);
    if (!config) return;

    let cancelled = false;
    (async () => {
      try {
        const fb = await loadFirebase(config);
        if (cancelled) return;
        firebase.current = fb;

        const result = await fb.authMod.getRedirectResult(fb.auth);
        if (cancelled) return;

        const returning = takePendingRedirect();
        const user = result?.user ?? (returning ? await firstUser(fb, 2500) : null);
        if (cancelled) return;

        if (user) {
          await exchange(await user.getIdToken());
          return;
        }

        // We sent them to Google and got them back empty-handed. Say so. Before
        // this, the page just sat there looking untouched.
        if (returning) {
          setError('Google sent you back without finishing. Please tap the button once more.');
          setDetail('redirect returned no credential (browser blocked cross-site storage)');
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
      // Already warmed by the effect above on every real visit, so this resolves
      // without leaving the click's turn and the popup is allowed to open.
      const fb = firebase.current ?? (firebase.current = await loadFirebase(config));
      const { authMod, auth } = fb;
      const provider = new authMod.GoogleAuthProvider();
      // Always offer the chooser. On a shared consultancy machine, silently
      // reusing the previous student's Google session would drop student B
      // inside student A's account.
      provider.setCustomParameters({ prompt: 'select_account' });

      // In-app webviews cannot open a second window, so they get the redirect.
      if (mustUseRedirect()) {
        setDetail('in-app browser, using redirect');
        markPendingRedirect();
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
          markPendingRedirect();
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
          markPendingRedirect();
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
      setDetail(`${code}${message ? `: ${message.slice(0, 120)}` : ''}`);
      setBusy(false);
    }
  }

  // Never render an invisible placeholder. A student staring at empty space
  // has no way to know whether the page is loading or broken (V-9).
  if (!ready) {
    return (
      <button
        disabled
        className="flex w-full items-center justify-center gap-3 rounded-control border-2 border-line bg-surface px-6 py-4 text-lg font-bold text-ink-quiet"
      >
        Getting ready...
      </button>
    );
  }

  // Development sign-in must never be offered on the live site, even when
  // the config service successfully responds without a Firebase project.
  if (!config && process.env.NODE_ENV === 'production') {
    return (
      <div role="alert" className="rounded-card border border-line bg-surface p-5">
        <p className="mb-4 text-sm text-ink-soft">Sign-in is temporarily unavailable. Please try again shortly.</p>
        <button onClick={() => window.location.reload()} className="rounded-control bg-ink px-5 py-2.5 font-bold text-white">
          Try again
        </button>
      </div>
    );
  }

  // ---- Development: no Firebase project configured yet -------------------
  if (!config) {
    return (
      <div className="rounded-card border-2 border-dashed border-warn/40 bg-warn-tint p-5">
        <p className="mb-1 font-bold text-warn">Google sign-in is not switched on yet</p>
        <p className="mb-4 text-sm leading-relaxed text-warn/90">
          Add the Firebase keys to switch on the real button. Until then you can sign in with a test
          name so the rest of the flow works. This test route is refused in production.
        </p>
        <div className="flex gap-2">
          <input
            value={devHandle}
            onChange={(e) => setDevHandle(e.target.value.replace(/[^a-z0-9]/gi, ''))}
            placeholder="test name, e.g. sujan"
            className="flex-1 rounded-control border-2 border-warn/40 px-3 py-2.5"
          />
          <button
            onClick={() => devHandle && exchange(`dev:${devHandle}`)}
            disabled={!devHandle || busy}
            className="rounded-control bg-ink px-5 py-2.5 font-bold text-white disabled:bg-line-strong"
          >
            {busy ? '...' : 'Continue'}
          </button>
        </div>
        {error && <p className="mt-3 font-medium text-stop">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={signIn}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-control border-2 border-line-strong bg-surface px-6 py-4 text-lg font-bold text-ink-soft transition-colors duration-tap ease-move active:scale-[0.99] disabled:opacity-60"
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
        <div className="mt-3 rounded-control bg-stop-tint px-4 py-3 text-center">
          <p className="font-medium text-stop">{error}</p>
          <p className="mt-1 text-micro text-stop">
            If this keeps happening, send us this: <span className="font-mono">{detail}</span>
          </p>
        </div>
      )}
    </div>
  );
}
