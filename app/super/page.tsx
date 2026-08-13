'use client';

import { useCallback, useState } from 'react';
import { PasscodeInput } from '@/components/PasscodeInput';
import { PaySettingsForm, type PaySettings } from '@/components/PaySettingsForm';

/**
 * Super admin, rebuilt to docs/design-reference/super_admin_dashboard.
 *
 * It now talks to /api/super, which is the current model (students, payment
 * orders, flagged trials, attribution, referral leaderboard, audit). The old
 * page talked to /api/platform and therefore could not see any of it.
 *
 * Privacy: the API returns engagement and entitlement only, never transcript
 * or answer content, and never a passcode. Keep it that way.
 */

interface Overview {
  counts: {
    students: number;
    paying: number;
    consultancies: number;
    pendingConsultancies: number;
    ordersAwaiting: number;
  };
  revenueNpr: number;
  students: {
    id: string;
    name: string | null;
    email: string | null;
    source: string;
    createdVia: string | null;
    consultancyId: string | null;
    attributionConsultancy: string | null;
    status: string;
    referralCode: string;
    referredByCode: string | null;
    createdAt: string;
    lastSeenAt: string;
    phone: string | null;
    whatsappConfirmed: boolean | null;
  }[];
  paySettings: PaySettings;
  attribution: { name: string; count: number }[];
  referralLeaderboard: { code: string; name: string | null; paid: number }[];
  build?: { shortSha: string; context: string; builtAt: string; branch: string };
}

interface Order {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  packCode: string;
  amountNpr: number;
  walletTxnId: string | null;
  payerName: string | null;
  /** The student's own number, so an approver can ring them. N-13. */
  payerPhone: string | null;
  /** Last 4 they typed, to check against the wallet ledger. */
  payerPhoneSuffix: string | null;
  state: string;
  createdAt: string;
}

interface FlaggedTrial {
  id: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  reason: string | null;
  createdAt: string;
}

type Tab = 'dashboard' | 'students' | 'payments' | 'flagged' | 'settings';

export default function SuperAdminPage() {
  const [key, setKey] = useState('');
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [flagged, setFlagged] = useState<FlaggedTrial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const call = useCallback(
    async (body: Record<string, unknown>): Promise<unknown | null> => {
      setBusy(true);
      // Clear BOTH. The client saw "Too many attempts. Please wait five
      // minutes." sitting directly above "Payment verified and the pack was
      // added to that student." — two banners contradicting each other, with
      // no way to tell which was current. A screen showing two mutually
      // exclusive outcomes at once is worse than a screen showing neither.
      setError(null);
      setNotice(null);
      try {
        const res = await fetch('/api/super', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ superKey: key, ...body }),
        });
        const json = (await res.json()) as
          | { ok: true; data: unknown }
          | { ok: false; error: { userMessage: string } };
        if (!json.ok) {
          setError(json.error.userMessage);
          setNotice(null);
          return null;
        }
        return json.data;
      } catch {
        setError('Could not reach the server. Check your connection and try again.');
        return null;
      } finally {
        setBusy(false);
      }
    },
    [key]
  );

  const loadAll = useCallback(async () => {
    const d = (await call({ action: 'overview' })) as Overview | null;
    if (!d) return;
    setData(d);
    const o = (await call({ action: 'orders' })) as Order[] | null;
    if (o) setOrders(o);
    const f = (await call({ action: 'flaggedTrials' })) as FlaggedTrial[] | null;
    if (f) setFlagged(f);
  }, [call]);

  async function savePaySettings(next: PaySettings): Promise<boolean> {
    const ok = await call({ action: 'setPaymentSettings', ...next });
    if (ok) {
      setNotice('Payment details saved. Students see them straight away.');
      await loadAll();
      return true;
    }
    return false;
  }

  async function verify(orderId: string) {
    const ok = await call({ action: 'verifyPayment', orderId, confirmedInWalletLedger: true });
    if (ok) {
      setNotice('Payment verified and the pack was added to that student.');
      await loadAll();
    }
  }

  async function reject(orderId: string) {
    const reason = window.prompt('Why are you rejecting this payment?');
    if (!reason || reason.trim().length < 3) return;
    const ok = await call({ action: 'rejectPayment', orderId, reason: reason.trim() });
    if (ok) {
      setNotice('Payment rejected. The student can submit a new one.');
      await loadAll();
    }
  }

  async function resolveFlag(claimId: string, grant: boolean) {
    const ok = await call({ action: 'resolveTrialFlag', claimId, grant });
    if (ok) {
      setNotice(grant ? 'Free questions switched on for that student.' : 'Flag kept in place.');
      await loadAll();
    }
  }

  async function setStudentStatus(studentId: string, status: 'active' | 'disabled') {
    const ok = await call({ action: 'setStudentStatus', studentId, status });
    if (ok) {
      setNotice(status === 'disabled' ? 'Student disabled.' : 'Student enabled.');
      await loadAll();
    }
  }

  function exportCsv() {
    if (!data) return;
    // Engagement and entitlement only. Never transcripts, never secrets.
    const head = [
      'name',
      'email',
      'source',
      'created_via',
      'named_consultancy',
      'status',
      'referral_code',
      'referred_by',
      'created_at',
      'last_seen_at',
    ];
    const rows = data.students.map((s) =>
      [
        s.name ?? '',
        s.email ?? '',
        s.source,
        s.createdVia ?? '',
        s.attributionConsultancy ?? '',
        s.status,
        s.referralCode,
        s.referredByCode ?? '',
        s.createdAt,
        s.lastSeenAt,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([[head.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `precas-students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ------------------------------------------------------------ sign in ---
  if (!data) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper px-5">
        <div className="w-full max-w-sm">
          <h1 className="mb-1 font-serif text-2xl font-bold text-ink">Super admin</h1>
          <p className="mb-6 text-slate-600">Everything across the platform.</p>
          {/* Readable on request. The client was locked out of his own back
              office by a masked field he could not check. See PasscodeInput. */}
          <PasscodeInput
            value={key}
            onChange={setKey}
            onEnter={loadAll}
            placeholder="Super admin passcode"
            autoFocus
          />
          {error && <p className="mb-3 font-medium text-red-600">{error}</p>}
          <button
            onClick={loadAll}
            disabled={!key || busy}
            className="w-full rounded-xl bg-ink px-6 py-3.5 font-bold text-white disabled:bg-slate-300"
          >
            {busy ? 'Checking...' : 'Open'}
          </button>
          {!key && (
            <p className="mt-2 text-sm font-semibold text-red-600">Enter the passcode to continue.</p>
          )}
        </div>
      </main>
    );
  }

  const c = data.counts;
  const direct = data.students.filter((s) => !s.consultancyId).length;
  const viaConsultancy = data.students.length - direct;
  const awaiting = orders.filter((o) => o.state === 'submitted');
  // G4: a running tally, so the super admin can see what they have decided
  // rather than only what is still waiting.
  const approvedCount = orders.filter((o) => o.state === 'verified').length;
  const rejectedCount = orders.filter((o) => o.state === 'rejected').length;

  const nav: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'students', label: 'Students' },
    { id: 'payments', label: `Payments${awaiting.length ? ` (${awaiting.length})` : ''}` },
    { id: 'flagged', label: `Flagged${flagged.length ? ` (${flagged.length})` : ''}` },
    { id: 'settings', label: 'Payment details' },
  ];

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* ---------------------------------------------------- side nav --- */}
      <aside className="border-b border-slate-200 bg-[#eff4ff] px-5 py-5 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
        <div className="mb-6">
          <p className="font-serif text-xl font-bold text-ink">Admin portal</p>
          <p className="text-sm text-slate-500">PreCAS Practice</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                tab === n.id ? 'bg-emerald-400 text-ink' : 'text-slate-600 hover:bg-white'
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ------------------------------------------------------- content --- */}
      <main className="flex-1 px-5 py-8 lg:px-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold text-ink">System overview</h1>
            <p className="text-slate-600">Analytics and approvals</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              disabled={busy}
              className="rounded-xl border-2 border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              {busy ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={exportCsv}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-bold text-white"
            >
              Export to CSV
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 font-medium text-red-800">
            {error}
          </p>
        )}
        {notice && (
          <p className="mb-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3 font-medium text-emerald-800">
            {notice}
          </p>
        )}

        {/* ------------------------------------------------- dashboard --- */}
        {tab === 'dashboard' && (
          <>
            <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Stat label="Total students" value={String(c.students)} hint={`${c.paying} have paid`} />
              <Stat
                label="Active consultancies"
                value={String(c.consultancies)}
                hint={`${c.pendingConsultancies} waiting`}
              />
              <Stat
                label="Total revenue"
                value={`NPR ${data.revenueNpr.toLocaleString()}`}
                hint="verified payments only"
              />
              <Stat
                label="Pending approvals"
                value={String(c.ordersAwaiting)}
                hint={c.ordersAwaiting ? 'Requires attention' : 'Nothing waiting'}
                accent={c.ordersAwaiting > 0}
              />
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 bg-white lg:col-span-2">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-serif text-lg font-bold text-ink">Where students come from</h2>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#eff4ff] p-4">
                    <p className="text-sm text-slate-600">Direct students</p>
                    <p className="text-2xl font-black text-ink">{direct}</p>
                  </div>
                  <div className="rounded-xl bg-[#eff4ff] p-4">
                    <p className="text-sm text-slate-600">Through a consultancy</p>
                    <p className="text-2xl font-black text-ink">{viaConsultancy}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 p-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Consultancies our direct students named
                  </p>
                  {data.attribution.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nothing yet. This fills up as students tell us who they are applying through,
                      and it is the list of consultancies worth approaching.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.attribution.slice(0, 8).map((a) => (
                        <li key={a.name} className="flex justify-between text-sm">
                          <span className="capitalize text-slate-700">{a.name}</span>
                          <span className="font-bold text-emerald-700">{a.count} students</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-5">
                  <h2 className="font-serif text-lg font-bold text-ink">Referral leaders</h2>
                  <p className="text-sm text-slate-600">Counted only when the friend paid.</p>
                </div>
                <div className="p-5">
                  {data.referralLeaderboard.length === 0 ? (
                    <p className="text-sm text-slate-500">No paid referrals yet.</p>
                  ) : (
                    <ol className="space-y-2">
                      {data.referralLeaderboard.slice(0, 10).map((l, i) => (
                        <li
                          key={l.code}
                          className="flex items-center justify-between rounded-lg bg-[#eff4ff] px-3 py-2 text-sm"
                        >
                          <span className="text-slate-700">
                            <span className="mr-2 font-bold text-slate-400">#{i + 1}</span>
                            {l.name || l.code}
                          </span>
                          <span className="font-bold text-emerald-700">{l.paid}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </section>
            </div>
          </>
        )}

        {/* -------------------------------------------------- students --- */}
        {tab === 'students' && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Students</h2>
              <p className="text-sm text-slate-600">
                Engagement and entitlement only. Answers are never shown here.
              </p>
            </div>
            {data.students.length === 0 ? (
              <p className="p-10 text-center text-slate-500">
                No students yet. They appear the moment somebody signs in.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Student</th>
                      <th className="px-3 py-3 font-semibold">Phone</th>
                      <th className="px-3 py-3 font-semibold">Source</th>
                      <th className="px-3 py-3 font-semibold">Applying through</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.students.map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-ink">{s.name || 'Unnamed'}</p>
                          <p className="text-xs text-slate-500">{s.email || 'no email'}</p>
                        </td>
                        {/* Tappable. If the only way to act on a row is to
                            copy a number out by hand, the row is a list entry
                            and not a tool. */}
                        <td className="px-3 py-3 text-slate-600">
                          {s.phone ? (
                            <a href={`tel:${s.phone}`} className="font-medium text-ink underline underline-offset-2">
                              {s.phone}
                            </a>
                          ) : (
                            <span className="text-slate-400">not given</span>
                          )}
                          {s.phone && s.whatsappConfirmed === false && (
                            <span className="ml-1 block text-[11px] font-semibold text-amber-700">
                              not on WhatsApp
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {s.consultancyId ? 'Consultancy' : 'Direct'}
                        </td>
                        <td className="px-3 py-3 capitalize text-slate-600">
                          {s.attributionConsultancy || '—'}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              s.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() =>
                              setStudentStatus(s.id, s.status === 'active' ? 'disabled' : 'active')
                            }
                            className="rounded-lg border-2 border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700"
                          >
                            {s.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* -------------------------------------------------- payments --- */}
        {tab === 'payments' && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Payments</h2>
              <p className="mb-3 text-sm text-slate-600">
                Check the transaction id in the receiver&apos;s own wallet ledger before approving. A
                screenshot is evidence, never proof.
              </p>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                  {awaiting.length} waiting
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
                  {approvedCount} approved
                </span>
                <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
                  {rejectedCount} rejected
                </span>
              </div>
            </div>
            {orders.length === 0 ? (
              <p className="p-10 text-center text-slate-500">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Student</th>
                      <th className="px-3 py-3 font-semibold">Pack</th>
                      <th className="px-3 py-3 font-semibold">Amount</th>
                      <th className="px-3 py-3 font-semibold">Transaction id</th>
                      <th className="px-3 py-3 font-semibold">Phone</th>
                      <th className="px-3 py-3 font-semibold">State</th>
                      <th className="px-5 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-ink">{o.studentName || 'Unnamed'}</p>
                          <p className="text-xs text-slate-500">{o.payerName || o.studentEmail || ''}</p>
                        </td>
                        <td className="px-3 py-3 uppercase text-slate-600">{o.packCode}</td>
                        <td className="px-3 py-3 tabular-nums">NPR {o.amountNpr.toLocaleString()}</td>
                        <td className="px-3 py-3 font-mono text-xs text-slate-600">
                          {o.walletTxnId || '—'}
                        </td>
                        {/* N-13. When money has not landed, the only useful next
                            step is to ring them. Making the approver look the
                            number up elsewhere is how a payment sits overnight
                            while a student assumes they were robbed. The last 4
                            they typed sits underneath, because that is what you
                            check against the wallet ledger. */}
                        <td className="px-3 py-3 text-xs">
                          {o.payerPhone ? (
                            <a href={`tel:${o.payerPhone}`} className="font-semibold text-ink underline underline-offset-2">
                              {o.payerPhone}
                            </a>
                          ) : (
                            <span className="text-slate-400">not given</span>
                          )}
                          {o.payerPhoneSuffix && (
                            <span className="block text-[11px] text-slate-500">
                              paid from ...{o.payerPhoneSuffix}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                              o.state === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.state === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {o.state}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {o.state === 'submitted' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => verify(o.id)}
                                disabled={busy}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => reject(o.id)}
                                disabled={busy}
                                className="rounded-lg border-2 border-red-300 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">done</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------- payment details --- */}
        {tab === 'settings' && data && (
          <PaySettingsForm initial={data.paySettings} onSave={savePaySettings} busy={busy} />
        )}

        {/* --------------------------------------------------- flagged --- */}
        {tab === 'flagged' && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Flagged free trials</h2>
              <p className="text-sm text-slate-600">
                These students were held back automatically. They can still browse and buy. If they
                look genuine, switch their free questions on.
              </p>
            </div>
            {flagged.length === 0 ? (
              <p className="p-10 text-center text-slate-500">Nothing flagged. </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {flagged.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="font-semibold text-ink">{f.studentName || 'Unnamed student'}</p>
                      <p className="text-xs text-slate-500">{f.studentEmail || ''}</p>
                      <p className="mt-1 text-sm text-red-700">
                        {f.reason || 'Flagged automatically'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolveFlag(f.id, true)}
                        disabled={busy}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Switch free questions on
                      </button>
                      <button
                        onClick={() => resolveFlag(f.id, false)}
                        disabled={busy}
                        className="rounded-lg border-2 border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                      >
                        Keep held
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* A12 / LIVE-004: prove which revision is live, so an audit is never
            run against a stale deploy again. */}
        {data.build && (
          <p className="mt-10 text-center text-xs text-slate-400">
            Build {data.build.shortSha} · {data.build.context} · {data.build.branch} · built{' '}
            {new Date(data.build.builtAt).toLocaleString()}
          </p>
        )}
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
        accent ? 'border-emerald-300 bg-emerald-100' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="mb-2 text-sm text-slate-600">{label}</p>
      <p className="font-serif text-3xl font-black text-ink">{value}</p>
      <p className={`mt-1 text-xs ${accent ? 'font-semibold text-emerald-800' : 'text-slate-500'}`}>
        {hint}
      </p>
    </div>
  );
}
