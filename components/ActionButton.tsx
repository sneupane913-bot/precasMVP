'use client';

import { useState, type ReactNode } from 'react';

/**
 * A button that can never appear to do nothing (G-10, E-6).
 *
 * This exists because of the single most damaging defect class in this
 * product. A student taps "I have paid", the request fails, nothing changes on
 * screen, and they conclude one of two things: the site is broken, or we took
 * their money and are hiding. Both are worse than an error message, and both
 * happen when a button is silent.
 *
 * So this component makes the three non-happy states impossible to forget:
 *
 *   working  — the label changes and the button locks, so a second tap cannot
 *              fire while the first is in flight. This is also the cheapest
 *              protection against a double payment there is.
 *   failed   — an error appears attached to the button that caused it, in plain
 *              words, and the button becomes pressable again.
 *   done     — a brief confirmation, because "it worked" is information too.
 *
 * Any control that changes something on the server should use this rather than
 * a bare `<button onClick>`. A bare button is fine only for navigation, where
 * the page changing IS the feedback.
 */
export function ActionButton({
  onAction,
  children,
  busyLabel = 'Working...',
  doneLabel,
  className = '',
  disabled = false,
  confirm,
}: {
  /** Return a message to show on success, or nothing. Throw to show an error. */
  onAction: () => Promise<string | void>;
  children: ReactNode;
  busyLabel?: string;
  doneLabel?: string;
  className?: string;
  disabled?: boolean;
  /** For irreversible actions: the question to ask before doing it. */
  confirm?: string;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    if (state === 'busy') return; // the lock, not just the styling
    if (confirm && !window.confirm(confirm)) return;

    setState('busy');
    setError(null);
    setMessage(null);
    try {
      const result = await onAction();
      setMessage(typeof result === 'string' ? result : (doneLabel ?? null));
      setState('done');
      // Return to idle so the control is usable again. Long enough to read.
      setTimeout(() => setState('idle'), 2500);
    } catch (e) {
      // Never a raw exception. A student cannot act on "TypeError".
      const msg =
        e instanceof Error && e.message && e.message.length < 200
          ? e.message
          : 'Something went wrong. Please try again.';
      setError(msg);
      setState('idle');
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={run}
        disabled={disabled || state === 'busy'}
        aria-busy={state === 'busy'}
        className={className || 'w-full rounded-xl bg-ink px-6 py-4 font-bold text-white disabled:opacity-60'}
      >
        {state === 'busy' ? busyLabel : state === 'done' && doneLabel ? doneLabel : children}
      </button>

      {/* Attached to the button that caused it, never floating at the top of
          the page where a student on a phone will not see it. */}
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {message && !error && (
        <p className="mt-2 text-sm font-medium text-emerald-700">{message}</p>
      )}
    </div>
  );
}
