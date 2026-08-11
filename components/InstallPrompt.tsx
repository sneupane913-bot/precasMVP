'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'precas_install_dismissed_until';

/**
 * Add to Home Screen.
 *
 * QA-211 / LIVE-010: the manifest was live but there was no install path at
 * all, and iPhone has no `beforeinstallprompt` event, so Safari users need
 * written instructions or they will never install.
 *
 * Shown only AFTER a student has finished something. A prompt on arrival asks
 * for commitment before any value has been delivered.
 */
export function InstallPrompt({ show }: { show: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;

    const until = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    if (Date.now() < until) return;

    // Already installed, so there is nothing to ask for.
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    const nav = navigator as Navigator & { standalone?: boolean };
    if (nav.standalone) return;

    const ua = window.navigator.userAgent;
    const iosLike = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIos(iosLike);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);

    // Safari never fires the event, so offer the manual route instead.
    if (iosLike) setVisible(true);

    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [show]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setVisible(false);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border-2 border-ink bg-white p-4 shadow-xl sm:left-auto sm:right-4 sm:w-96">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-ink text-lg font-black text-white">
          P
        </span>
        <div className="min-w-0">
          <p className="font-bold leading-tight text-ink">Keep this on your phone</p>
          <p className="text-sm leading-snug text-slate-600">
            Add it to your home screen so you can practise in one tap.
          </p>
        </div>
      </div>

      {isIos ? (
        <ol className="mb-3 space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <li>
            1. Tap the <strong>Share</strong> button at the bottom of Safari
          </li>
          <li>
            2. Scroll down and tap <strong>Add to Home Screen</strong>
          </li>
          <li>
            3. Tap <strong>Add</strong>
          </li>
        </ol>
      ) : (
        <button
          onClick={install}
          className="mb-2 w-full rounded-xl bg-ink px-5 py-3 font-bold text-white"
        >
          Add to home screen
        </button>
      )}

      <button
        onClick={dismiss}
        className="w-full rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600"
      >
        Not now
      </button>
    </div>
  );
}
