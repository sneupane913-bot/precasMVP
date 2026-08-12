'use client';

import { useState } from 'react';

/**
 * Owner control. Not linked from anywhere in the product.
 *
 * This is maintenance mode, the same switch every hosted product has. What is
 * unusual here is only who holds it: OWNER_ACCESS_KEY is a separate secret from
 * SUPER_ADMIN_PASSCODE, so a super admin can run the whole business and still
 * cannot reach this page or flip this switch.
 */
export default function OwnerPage() {
  const [key, setKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState('This service is temporarily unavailable');
  const [message, setMessage] = useState(
    'The platform is paused while a commercial matter is resolved. Students who have paid will not lose their credits. Please contact the number below for details.'
  );
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // QA H3: the switch had no history. Every toggle is now recorded and shown.
  const [audit, setAudit] = useState<
    { at: string; action: string; ip: string; userAgent: string }[]
  >([]);

  async function apply(turnOn: boolean) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setMaintenance',
          ownerKey: key,
          enabled: turnOn,
          title,
          message,
          contactName,
          contactPhone,
        }),
      });
      const json = (await res.json()) as
        | {
            ok: true;
            data: {
              maintenanceMode: boolean;
              ownerAudit?: { at: string; action: string; ip: string; userAgent: string }[];
            };
          }
        | { ok: false; error: { userMessage: string } };

      if (!json.ok) {
        setError(json.error.userMessage || 'That key was not accepted.');
      } else {
        setEnabled(json.data.maintenanceMode);
        setAudit(json.data.ownerAudit ?? []);
        setResult(
          json.data.maintenanceMode
            ? 'The platform is now OFF. Every student sees your message.'
            : 'The platform is back ON. Everything works normally.'
        );
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-5 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold text-ink">Owner control</h1>
      <p className="mb-6 text-slate-600">
        This page is not linked from anywhere. Only your owner key opens it.
      </p>

      <label className="mb-1 block text-sm font-semibold text-ink">Owner key</label>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Your owner key"
        className="mb-6 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
      />

      <div className="mb-6 rounded-2xl border-2 border-slate-200 bg-white p-5">
        <h2 className="mb-1 font-bold text-ink">Message students will see</h2>
        <p className="mb-4 text-sm text-slate-600">
          Shown on every page while the platform is off.
        </p>

        <label className="mb-1 block text-sm font-semibold text-ink">Heading</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
        />

        <label className="mb-1 block text-sm font-semibold text-ink">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Contact name</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Contact number</label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="98XXXXXXXX"
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
          {error}
        </p>
      )}
      {result && (
        <p className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-900">
          {result}
        </p>
      )}

      {!confirming ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setConfirming(true)}
            disabled={!key || busy}
            className="w-full rounded-xl bg-red-600 px-6 py-4 text-lg font-bold text-white disabled:bg-slate-300"
          >
            Turn the platform OFF
          </button>
          <button
            onClick={() => apply(false)}
            disabled={!key || busy}
            className="w-full rounded-xl border-2 border-slate-300 px-6 py-3.5 text-base font-semibold text-slate-700 disabled:opacity-40"
          >
            Turn the platform back ON
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <p className="mb-1 font-bold text-red-900">Turn the whole platform off?</p>
          <p className="mb-4 text-sm leading-relaxed text-red-900/90">
            Every student, every consultancy, everyone. They will see your message and your phone
            number. You can turn it back on from this page at any time. Nothing is deleted.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => apply(true)}
              disabled={busy}
              className="flex-1 rounded-xl bg-red-600 px-5 py-3.5 font-bold text-white"
            >
              {busy ? 'Working...' : 'Yes, turn it off now'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl border-2 border-slate-300 bg-white px-5 py-3.5 font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* QA H3: a switch whose stated purpose is a commercial dispute needs a
          record, because later somebody will ask who paused it and when. */}
      {audit.length > 0 && (
        <section className="mt-8 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-bold text-ink">History of this switch</h2>
            <p className="text-sm text-slate-600">Newest first. Kept as a record.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {audit.map((a, i) => (
              <li key={`${a.at}-${i}`} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                <span
                  className={`font-semibold ${
                    a.action === 'paused' ? 'text-red-700' : 'text-emerald-700'
                  }`}
                >
                  {a.action === 'paused' ? 'Platform paused' : 'Platform resumed'}
                </span>
                <span className="text-sm text-slate-500">
                  {new Date(a.at).toLocaleString()} · {a.ip || 'unknown source'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-xs leading-relaxed text-slate-400">
        Current state in this browser: {enabled ? 'OFF' : 'ON'}. Reload to confirm against the
        server.
      </p>
    </main>
  );
}
