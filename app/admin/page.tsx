'use client';

import { useCallback, useState } from 'react';

/**
 * Consultancy portal, rebuilt to docs/design-reference/consultancy_admin_dashboard.
 *
 * Two rules this page must never break:
 *  1. A consultancy sees ONLY its own students. The server filters by the
 *     consultancy id it authenticated as, so there is no field here that could
 *     name another consultancy.
 *  2. No transcript, answer or feedback content. Engagement and entitlement
 *     only. That is the client's stated privacy rule for admins.
 */

interface Student {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string;
  mocksLeft: number;
  practiceLeft: number;
}

interface Notification {
  id: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

interface AdminData {
  consultancy: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
    primaryColor: string;
    status: string;
    seatsTotal: number;
  };
  students: Student[];
  notifications: Notification[];
  stats: {
    studentCount: number;
    activeStudents: number;
    seatsTotal: number;
    seatsUsed: number;
    seatsLeft: number;
    paidOrders: number;
  };
}

export default function AdminPage() {
  const [slug, setSlug] = useState('');
  const [passcode, setPasscode] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const login = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', slug, passcode }),
      });
      const json = (await res.json()) as
        | { ok: true; data: AdminData }
        | { ok: false; error: { userMessage: string } };
      if (!json.ok) {
        setError(json.error.userMessage);
        return;
      }
      setData(json.data);
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [slug, passcode]);

  // ------------------------------------------------------------- sign in ---
  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-5">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 font-serif text-2xl font-bold text-ink">Consultancy portal</h1>
          <p className="mb-6 text-slate-600">Sign in to see your own students.</p>

          <label className="mb-1 block text-sm font-semibold text-ink">Your short name</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="for example kathmandu-hub"
            className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
          />

          <label className="mb-1 block text-sm font-semibold text-ink">Passcode</label>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && slug && passcode && login()}
            className="mb-4 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
          />

          {error && <p className="mb-3 font-medium text-red-600">{error}</p>}

          <button
            onClick={login}
            disabled={!slug || !passcode || busy}
            className="w-full rounded-xl bg-ink px-6 py-3.5 font-bold text-white disabled:bg-slate-300"
          >
            {busy ? 'Checking...' : 'Sign in'}
          </button>
          {(!slug || !passcode) && (
            <p className="mt-2 text-sm font-semibold text-red-600">
              Enter both your short name and your passcode.
            </p>
          )}
        </div>
      </main>
    );
  }

  const s = data.stats;
  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/c/${data.consultancy.slug}`
      : `/c/${data.consultancy.slug}`;

  return (
    <div className="min-h-screen bg-paper">
      {/* ------------------------------------------------------- top bar --- */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-serif text-xl font-bold text-ink">{data.consultancy.name}</p>
            <p className="text-sm text-slate-500">Consultancy portal</p>
          </div>
          <button
            onClick={login}
            disabled={busy}
            className="rounded-xl border-2 border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            {busy ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {error && (
          <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
            {error}
          </p>
        )}

        {/* Notifications, including "super admin approved this for you". */}
        {data.notifications.length > 0 && (
          <section className="mb-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
            <h2 className="mb-2 font-bold text-emerald-900">Messages for you</h2>
            <ul className="space-y-1.5">
              {data.notifications.slice(0, 5).map((n) => (
                <li key={n.id} className="text-sm text-emerald-900">
                  {n.message}
                  <span className="ml-2 text-emerald-700/70">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Stats */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Seats bought" value={String(s.seatsTotal)} hint="your bundle" />
          <Stat label="Seats used" value={String(s.seatsUsed)} hint="given to students" />
          <Stat
            label="Seats left"
            value={String(s.seatsLeft)}
            hint={s.seatsLeft === 0 ? 'none left' : 'still available'}
            accent={s.seatsLeft === 0}
          />
          <Stat
            label="Your students"
            value={String(s.studentCount)}
            hint={`${s.activeStudents} active`}
          />
        </section>

        {/* Share link */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-1 font-serif text-lg font-bold text-ink">Your student link</h2>
          <p className="mb-4 text-sm text-slate-600">
            Give this to your students. Anyone who signs up through it belongs to you and appears
            below.
          </p>
          <div className="flex flex-wrap gap-2">
            <code className="flex-1 truncate rounded-xl bg-[#eff4ff] px-4 py-3 text-sm text-ink">
              {link}
            </code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white"
            >
              {copied ? 'Copied' : 'Copy link'}
            </button>
          </div>
        </section>

        {/* Students */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-serif text-lg font-bold text-ink">Your students</h2>
            <p className="text-sm text-slate-600">
              How much they are practising and what they have left. We never show you what a student
              said in an interview.
            </p>
          </div>

          {data.students.length === 0 ? (
            <div className="p-10 text-center">
              <p className="mb-2 font-semibold text-ink">No students yet</p>
              <p className="text-sm text-slate-500">
                Share your link above. Students appear here the moment they sign up through it.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-3 py-3 font-semibold">Mocks left</th>
                    <th className="px-3 py-3 font-semibold">Practice left</th>
                    <th className="px-3 py-3 font-semibold">Last active</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.students.map((st) => (
                    <tr key={st.id}>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink">{st.name || 'Unnamed'}</p>
                        <p className="text-xs text-slate-500">{st.email || 'no email'}</p>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">{st.mocksLeft}</td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">{st.practiceLeft}</td>
                      <td className="px-3 py-3 text-slate-600">
                        {new Date(st.lastSeenAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            st.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="mb-2 text-sm text-slate-600">{label}</p>
      <p className="font-serif text-3xl font-black text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
