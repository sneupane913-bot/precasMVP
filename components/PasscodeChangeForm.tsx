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
      className={`rounded-card border-2 p-5 ${
        forced ? 'border-warn/40 bg-warn-tint' : 'border-line bg-surface'
      }`}
    >
      <h2 className={`mb-1 font-serif text-lg font-bold ${forced ? 'text-warn' : 'text-ink'}`}>
        {title}
      </h2>
      <p className={`mb-4 text-sm leading-relaxed ${forced ? 'text-warn/90' : 'text-ink-soft'}`}>
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
        className="mb-1 w-full rounded-control border-2 border-line px-4 py-3 outline-none focus:border-ink"
      />
      <p className="mb-3 text-micro text-ink-quiet">
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
        className="mb-2 w-full rounded-control border-2 border-line px-4 py-3 outline-none focus:border-ink"
      />

      {/* Being able to see what you typed prevents the commonest lockout of
          all: a typo, entered identically twice, on a phone keyboard. */}
      <label className="mb-4 flex items-center gap-2 text-sm text-ink-soft">
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
        <p className="mb-3 text-sm font-semibold text-stop">
          Too short. Use at least {minLength} characters.
        </p>
      )}
      {!tooShort && digitsOnly && (
        <p className="mb-3 text-sm font-semibold text-stop">
          Numbers alone are guessed quickly. Add some letters.
        </p>
      )}
      {!tooShort && !digitsOnly && mismatch && (
        <p className="mb-3 text-sm font-semibold text-stop">
          The two do not match yet.
        </p>
      )}
      {localError && <p className="mb-3 text-sm font-semibold text-stop">{localError}</p>}

      <button
        onClick={submit}
        disabled={!ready || busy}
        className="w-full rounded-control bg-ink px-6 py-3.5 font-bold text-white disabled:bg-line-strong"
      >
        {busy ? 'Saving...' : 'Save my passcode'}
      </button>

      <p className="mt-3 text-micro leading-relaxed text-ink-quiet">
        Write it down somewhere safe. We cannot read it back to you, and nobody
        here can see it once it is saved.
      </p>
    </section>
  );
}
