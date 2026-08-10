'use client';

import { useState } from 'react';
import type { Consultancy, StudentRecord } from '@/lib/platform';
import { BUNDLES } from '@/lib/data/plans';

interface AdminData {
  consultancy: Omit<Consultancy, 'passcode'>;
  students: StudentRecord[];
  stats: {
    studentCount: number;
    seatsLeft: number;
    interviewsCompleted: number;
    averageScore: number;
  };
  recentSessions: {
    id: string;
    status: string;
    createdAt: string;
    score: number | null;
    band: string | null;
    answered: number;
    total: number;
  }[];
}

/** Consultancy portal. Sees its own students only, never another's. */
export default function AdminPage() {
  const [slug, setSlug] = useState('');
  const [pass, setPass] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [color, setColor] = useState('#0d1b2a');
  const [logo, setLogo] = useState('');
  const [saved, setSaved] = useState(false);

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, passcode: pass, ...body }),
      });
      const json = (await res.json()) as
        | { ok: true; data: AdminData }
        | { ok: false; error: { userMessage: string } };
      if (!json.ok) {
        setError(json.error.userMessage);
        return null;
      }
      return json.data;
    } catch {
      setError('Could not reach the server.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function login() {
    const d = await call({ action: 'login' });
    if (d) {
      setData(d);
      setColor(d.consultancy.primaryColor);
      setLogo(d.consultancy.logoUrl ?? '');
    }
  }

  async function saveBranding() {
    setSaved(false);
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateBranding',
        slug,
        passcode: pass,
        logoUrl: logo.trim() || null,
        primaryColor: color,
      }),
    });
    const json = await res.json();
    if (json.ok) setSaved(true);
    else setError(json.error?.userMessage ?? 'Could not save.');
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-sm p-6 sm:p-10">
        <h1 className="mb-1 text-2xl font-bold text-ink">Consultancy portal</h1>
        <p className="mb-6 leading-relaxed text-slate-600">
          Sign in to see your students and put your own logo on the interview.
        </p>

        <label className="mb-1 block text-sm font-semibold text-ink">Your short name</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().trim())}
          placeholder="e.g. himalaya-education"
          className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
        />

        <label className="mb-1 block text-sm font-semibold text-ink">Passcode</label>
        <input
          type="password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && slug && pass && login()}
          className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
        />

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 font-medium text-red-700">{error}</p>
        )}

        <button
          onClick={login}
          disabled={!slug || !pass || busy}
          className="w-full rounded-xl bg-ink px-6 py-3.5 font-bold text-white disabled:bg-slate-300"
        >
          {busy ? 'Checking...' : 'Sign in'}
        </button>
        {(!slug || !pass) && (
          <p className="mt-2 text-sm font-semibold text-red-600">
            Enter both your short name and your passcode.
          </p>
        )}

        <div className="mt-8 rounded-2xl bg-white p-5">
          <h2 className="mb-2 font-bold text-ink">Not signed up yet?</h2>
          <p className="mb-3 text-sm leading-relaxed text-slate-600">
            Buy seats in bulk, resell to your students under your own name, keep the difference.
          </p>
          <ul className="space-y-1 text-sm text-slate-700">
            {BUNDLES.map((b) => (
              <li key={b.code}>
                <strong>{b.name}</strong>: NPR {b.priceNpr.toLocaleString()} for {b.seats} students,
                about NPR {Math.round(b.priceNpr / b.seats)} each
              </li>
            ))}
          </ul>
        </div>
      </main>
    );
  }

  const c = data.consultancy;
  const s = data.stats;

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">{c.name}</h1>
          <p className="text-slate-600">Your students and their results.</p>
        </div>
        <button
          onClick={login}
          className="rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Refresh
        </button>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Students', String(s.studentCount)],
          ['Seats left', String(s.seatsLeft)],
          ['Interviews done', String(s.interviewsCompleted)],
          ['Average score', s.averageScore ? `${s.averageScore}%` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-2xl font-black text-ink">{value}</p>
          </div>
        ))}
      </section>

      {/* Branded link */}
      <section className="mb-6 rounded-2xl border-2 border-ink bg-white p-5">
        <h2 className="mb-1 font-bold text-ink">Your student link</h2>
        <p className="mb-3 text-sm text-slate-600">
          Send this to your students. It shows your logo and your colours.
        </p>
        <code className="block break-all rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-ink">
          {typeof window !== 'undefined' ? window.location.origin : ''}/c/{c.slug}
        </code>
      </section>

      {/* Branding */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-bold text-ink">Your branding</h2>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Logo image address</label>
            <input
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink">Main colour</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-full rounded-lg border-2 border-slate-200"
            />
          </div>
        </div>
        <button
          onClick={saveBranding}
          className="rounded-xl bg-ink px-5 py-3 font-bold text-white"
        >
          Save
        </button>
        {saved && <span className="ml-3 font-semibold text-emerald-700">Saved.</span>}
      </section>

      {/* Students */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-bold text-ink">Your students</h2>
        </div>
        {data.students.length === 0 ? (
          <p className="p-8 text-center leading-relaxed text-slate-500">
            No students yet. Share your link above and they will appear here as soon as they start
            an interview.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Student</th>
                <th className="px-3 py-2.5 font-semibold">Plan</th>
                <th className="px-5 py-2.5 font-semibold">Credits left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.map((st) => (
                <tr key={st.id}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">{st.name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500">{st.phone || 'no phone'}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{st.planCode}</td>
                  <td className="px-5 py-3 tabular-nums text-slate-600">
                    {st.mocksRemaining} mocks · {st.practiceRemaining} practice
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
