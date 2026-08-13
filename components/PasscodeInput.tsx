'use client';

import { useState } from 'react';

/**
 * A passcode field you can actually read back.
 *
 * 14 Aug. The client sat in front of /super typing what he believed was the
 * right passcode, got "Not allowed", and had no way to see what he had
 * actually typed. He could not tell a wrong passcode from a typo, a stuck
 * modifier key, or a keyboard layout swallowing a character — and the only
 * feedback available was two words of red text.
 *
 * A masked field with no reveal is a field that cannot be debugged by the
 * person using it. On these three screens the threat model does not justify
 * it either: /super, /owner and /admin are typed by one or two people who are
 * usually alone, and the realistic failure is not a shoulder-surfer, it is the
 * owner locked out of his own back office at one in the morning.
 *
 * Masked by DEFAULT, revealed only on a deliberate press, and it says which
 * state it is in. Never revealed automatically.
 *
 * Not used for anything a student types: students have no passwords anywhere
 * in this product, and they never will (N-2).
 */
export function PasscodeInput({
  value,
  onChange,
  onEnter,
  placeholder,
  label,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter?: () => void;
  placeholder: string;
  /** Screen-reader name. Defaults to the placeholder. */
  label?: string;
  autoFocus?: boolean;
}) {
  const [shown, setShown] = useState(false);

  return (
    <div className="relative mb-3">
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value && onEnter) onEnter();
        }}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        autoFocus={autoFocus}
        // Never offer to save or autofill a shared back-office passcode into a
        // browser profile that may not belong to the person holding it.
        autoComplete="off"
        spellCheck={false}
        // pr-24 leaves room for the button so a long passcode cannot run
        // underneath it and become unreadable at the very moment you need it.
        className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 pr-24 outline-none focus:border-ink"
      />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        // Deliberately says what pressing it will DO, not what the state is.
        // "Hide"/"Show" as a bare label is ambiguous about which it means.
        aria-pressed={shown}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-ink"
      >
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
