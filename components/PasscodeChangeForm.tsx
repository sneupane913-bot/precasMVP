'use client';

import { useState } from 'react';

/**
 * Choose your own passcode.
 *
 * Used by both back-office roles, because the rule is the same for both and two
 * copies of a password form is two places to get the confirmation check wrong.
 *
 * Why this exists at all: the super admin sets a consultancy's first passcode,
 * so the super admin knows it. A secret two organisations share is not a
 * password, because if a student list leaked neither side could say which of
 * them leaked it. The first code is a HANDOVER code that gets them in once, and
 * the portal shows them nothing until they replace it.
 *
 * The super admin's own passcode had the opposite problem: it could only be
 * changed by editing an environment variable and redeploying, which in practice
 * means it never gets changed. Not when a laptop is lost, not when somebody
 * leaves, not after it has been read out over the phone to unstick somebody.
 */
export function PasscodeChangeForm({
  title,
  explanation,
  minLength,
  forced = false,
  busy,
  onSave,
}: {
  title: string;
  explanation: string;
  minLength: number;
  /** True when nothing else works until this is done. Changes the tone. */
  forced?: boolean;
  busy: boolean;
  onSave: (newPasscode: string) => Promise<boolean>;
}) {
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Checked here as well as on the server. The server is the guard; this is so
  // a person is told before they submit rather than after.
  const tooShort = next.length > 0 && next.length < minLength;
  const digitsOnly = next.length > 0 && /^[0-9]+$/.test(next);
  const mismatch = again.length > 0 && next !== again;
  const ready = next.length >= minLength && !digitsOnly && next === again;

  async function submit() {
    setLocalError(null);
    if (!ready) return;
    const ok = await onSave(next);
    if (ok) {
      setNext('');
      setAgain('');
    }
  }

  return (
    <section
      className={`rounded-2xl border-2 p-5 ${
        forced ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <h2 className={`mb-1 font-serif text-lg font-bold ${forced ? 'text-amber-900' : 'text-ink'}`}>
        {title}
      </h2>
      <p className={`mb-4 text-sm leading-relaxed ${forced ? 'text-amber-900/90' : 'text-slate-600'}`}>
        {explanation}
      </p>

      <label htmlFor="newPasscode" className="mb-1 block text-sm font-semibold text-ink">
        New passcode
      </label>
      <input
        id="newPasscode"
        type={show ? 'text' : 'password'}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        className="mb-1 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
      />
      <p className="mb-3 text-xs text-slate-500">
        At least {minLength} characters, with letters as well as numbers.
      </p>

      <label htmlFor="againPasscode" className="mb-1 block text-sm font-semibold text-ink">
        Type it again
      </label>
      <input
        id="againPasscode"
        type={show ? 'text' : 'password'}
        value={again}
        onChange={(e) => setAgain(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && ready && submit()}
        autoComplete="new-password"
        className="mb-2 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
      />

      {/* Being able to see what you typed prevents the commonest lockout of
          all: a typo, entered identically twice, on a phone keyboard. */}
      <label className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="h-4 w-4 accent-ink"
        />
        Show what I typed
      </label>

      {/* One message at a time, naming the actual problem. */}
      {tooShort && (
        <p className="mb-3 text-sm font-semibold text-red-600">
          Too short. Use at least {minLength} characters.
        </p>
      )}
      {!tooShort && digitsOnly && (
        <p className="mb-3 text-sm font-semibold text-red-600">
          Numbers alone are guessed quickly. Add some letters.
        </p>
      )}
      {!tooShort && !digitsOnly && mismatch && (
        <p className="mb-3 text-sm font-semibold text-red-600">
          The two do not match yet.
        </p>
      )}
      {localError && <p className="mb-3 text-sm font-semibold text-red-600">{localError}</p>}

      <button
        onClick={submit}
        disabled={!ready || busy}
        className="w-full rounded-xl bg-ink px-6 py-3.5 font-bold text-white disabled:bg-slate-300"
      >
        {busy ? 'Saving...' : 'Save my passcode'}
      </button>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Write it down somewhere safe. We cannot read it back to you, and nobody
        here can see it once it is saved.
      </p>
    </section>
  );
}
