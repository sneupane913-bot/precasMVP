'use client';

import { useState } from 'react';
import type { Consultancy, StudentRecord } from '@/lib/platform';
import { BUNDLES } from '@/lib/data/plans';

interface Overview {
  consultancies: Consultancy[];
  students: StudentRecord[];
  revenue: {
    totalNpr: number;
    fromConsultancies: number;
    fromStudents: number;
    consultancyCount: number;
    pendingCount: number;
    studentCount: number;
    payingStudentCount: number;
  };
}

/**
 * Super admin. Sees everything, approves consultancies, reads revenue.
 * Deliberately CANNOT reach the owner switch: that is a different secret.
 */
export default function SuperAdminPage() {
  const [key, setKey] = useState('');
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [nName, setNName] = useState('');
  const [nSlug, setNSlug] = useState('');
  const [nContact, setNContact] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [nSeats, setNSeats] = useState(20);
  const [nPaid, setNPaid] = useState(6000);
  const [nPass, setNPass] = useState('');

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ superKey: key, ...body }),
      });
      const json = (await res.json()) as
        | { ok: true; data: unknown }
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

  async function load() {
    const d = (await call({ action: 'overview' })) as Overview | null;
    if (d) setData(d);
  }

  async function setStatus(id: string, status: 'approved' | 'suspended' | 'pending') {
    await call({ action: 'setConsultancyStatus', consultancyId: id, status });
    await load();
  }

  async function create() {
    const ok = await call({
      action: 'createConsultancy',
      name: nName,
      slug: nSlug,
      contactName: nContact,
      contactPhone: nPhone,
      seatsTotal: nSeats,
      paidNpr: nPaid,
      passcode: nPass,
    });
    if (ok) {
      setShowNew(false);
      setNName('');
      setNSlug('');
      setNPass('');
      await load();
    }
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-sm p-6 sm:p-10">
        <h1 className="mb-1 text-2xl font-bold text-ink">Super admin</h1>
        <p className="mb-6 text-slate-600">Everything across the platform.</p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && key && load()}
          placeholder="Super admin passcode"
          className="mb-3 w-full rounded-xl border-2 border-slate-200 px-4 py-3 outline-none focus:border-ink"
        />
        {error && <p className="mb-3 font-medium text-red-600">{error}</p>}
        <button
          onClick={load}
          disabled={!key || busy}
          className="w-full rounded-xl bg-ink px-6 py-3.5 font-bold text-white disabled:bg-slate-300"
        >
          {busy ? 'Checking...' : 'Open'}
        </button>
      </main>
    );
  }

  const r = data.revenue;

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Super admin</h1>
          <p className="text-slate-600">Everything, in one place.</p>
        </div>
        <button
          onClick={load}
          className="rounded-xl border-2 border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Refresh
        </button>
      </div>

      {/* Revenue */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Total revenue', `NPR ${r.totalNpr.toLocaleString()}`, 'everything collected'],
          ['From consultancies', `NPR ${r.fromConsultancies.toLocaleString()}`, `${r.consultancyCount} approved`],
          ['From students', `NPR ${r.fromStudents.toLocaleString()}`, `${r.payingStudentCount} paid`],
          ['Students', String(r.studentCount), `${r.pendingCount} consultancies waiting`],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-xl font-black text-ink">{value}</p>
            <p className="text-xs text-slate-500">{hint}</p>
          </div>
        ))}
      </section>

      {error && (
        <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
          {error}
        </p>
      )}

      {/* Consultancies */}
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-bold text-ink">Consultancies</h2>
            <p className="text-sm text-slate-600">Approve, suspend, or add a new one.</p>
          </div>
          <button
            onClick={() => setShowNew(!showNew)}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"
          >
            {showNew ? 'Cancel' : 'Add'}
          </button>
        </div>

        {showNew && (
          <div className="border-b border-slate-200 bg-slate-50 p-5">
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <input value={nName} onChange={(e) => setNName(e.target.value)} placeholder="Consultancy name" className="rounded-lg border-2 border-slate-200 px-3 py-2.5" />
              <input value={nSlug} onChange={(e) => setNSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="short-name-for-link" className="rounded-lg border-2 border-slate-200 px-3 py-2.5" />
              <input value={nContact} onChange={(e) => setNContact(e.target.value)} placeholder="Contact person" className="rounded-lg border-2 border-slate-200 px-3 py-2.5" />
              <input value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="Phone" className="rounded-lg border-2 border-slate-200 px-3 py-2.5" />
              <input type="number" value={nSeats} onChange={(e) => setNSeats(Number(e.target.value))} placeholder="Seats" className="rounded-lg border-2 border-slate-200 px-3 py-2.5" />
              <input type="number" value={nPaid} onChange={(e) => setNPaid(Number(e.target.value))} placeholder="Paid NPR" className="rounded-lg border-2 border-slate-200 px-3 py-2.5" />
              <input value={nPass} onChange={(e) => setNPass(e.target.value)} placeholder="Their portal passcode" className="rounded-lg border-2 border-slate-200 px-3 py-2.5 sm:col-span-2" />
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Bundles: {BUNDLES.map((b) => `${b.name} NPR ${b.priceNpr.toLocaleString()} for ${b.seats} seats`).join(' · ')}
            </p>
            <button
              onClick={create}
              disabled={!nName || !nSlug || nPass.length < 4 || busy}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:bg-slate-300"
            >
              Create
            </button>
            {(!nName || !nSlug || nPass.length < 4) && (
              <p className="mt-2 text-sm font-semibold text-red-600">
                Name, short name, and a passcode of at least 4 characters are all required.
              </p>
            )}
          </div>
        )}

        {data.consultancies.length === 0 ? (
          <p className="p-8 text-center text-slate-500">
            No consultancies yet. Add your first one above.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Name</th>
                <th className="px-3 py-2.5 font-semibold">Seats</th>
                <th className="px-3 py-2.5 font-semibold">Paid</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.consultancies.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">{c.name}</p>
                    <p className="text-xs text-slate-500">/c/{c.slug} · {c.contactPhone || 'no phone'}</p>
                  </td>
                  <td className="px-3 py-3 tabular-nums">{c.seatsUsed}/{c.seatsTotal}</td>
                  <td className="px-3 py-3 tabular-nums">NPR {c.paidNpr.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        c.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {c.status !== 'approved' && (
                        <button onClick={() => setStatus(c.id, 'approved')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                          Approve
                        </button>
                      )}
                      {c.status !== 'suspended' && (
                        <button onClick={() => setStatus(c.id, 'suspended')} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white">
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Students */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5">
          <h2 className="font-bold text-ink">Students</h2>
          <p className="text-sm text-slate-600">Every student on the platform.</p>
        </div>
        {data.students.length === 0 ? (
          <p className="p-8 text-center text-slate-500">
            No students yet. They appear here as soon as anyone starts an interview.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-2.5 font-semibold">Student</th>
                <th className="px-3 py-2.5 font-semibold">Consultancy</th>
                <th className="px-3 py-2.5 font-semibold">Plan</th>
                <th className="px-3 py-2.5 font-semibold">Left</th>
                <th className="px-5 py-2.5 font-semibold">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.students.map((s) => (
                <tr key={s.id}>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">{s.name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500">{s.phone || 'no phone'}</p>
                  </td>
                  <td className="px-3 py-3 text-slate-600">
                    {data.consultancies.find((c) => c.id === s.consultancyId)?.name ?? 'Direct'}
                  </td>
                  <td className="px-3 py-3 text-slate-600">{s.planCode}</td>
                  <td className="px-3 py-3 tabular-nums text-slate-600">
                    {s.mocksRemaining} mocks · {s.practiceRemaining} practice
                  </td>
                  <td className="px-5 py-3 tabular-nums">NPR {s.paidNpr.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
