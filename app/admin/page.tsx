'use client';

import { useCallback, useState } from 'react';
import { PasscodeInput } from '@/components/PasscodeInput';

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

/**
 * A payment one of their own students has sent, waiting on them.
 * WALK 5.6: this used to exist on the server and never reach this page.
 */
interface Order {
  id: string;
  studentName: string | null;
  studentEmail: string | null;
  packCode: string;
  amountNpr: number;
  walletTxnId: string | null;
  payerName: string | null;
  payerPhoneSuffix: string | null;
  screenshotUrl: string | null;
  state: string;
  rejectedReason: string | null;
  createdAt: string;
  verifiedAt: string | null;
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
  orders: Order[];
  stats: {
    studentCount: number;
    activeStudents: number;
    seatsTotal: number;
    seatsUsed: number;
    seatsLeft: number;
    paidOrders: number;
    ordersAwaiting: number;
  };
}

export default function AdminPage() {
  const [slug, setSlug] = useState('');
  const [passcode, setPasscode] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

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

  /**
   * Approve or reject one of their own students' payments.
   *
   * The confirmation wording is deliberate and is not boilerplate. The money
   * for these orders lands in OUR wallet, not theirs, so the admin is asserting
   * something they cannot see for themselves. They should be asked to mean it.
   */
  const decide = useCallback(
    async (order: Order, approve: boolean) => {
      const reason = approve
        ? null
        : window.prompt(
            'Why can this payment not be approved? Your student will be shown this, so please be plain.'
          );
      if (!approve && (!reason || reason.trim().length < 3)) return;
      if (
        approve &&
        !window.confirm(
          `Approve NPR ${order.amountNpr.toLocaleString()} from ${order.payerName ?? 'this student'}?\n\nTransaction ${order.walletTxnId}\n\nOnly approve this if you have seen the money yourself. Their credits switch on straight away and this is recorded against your name.`
        )
      )
        return;

      setDeciding(order.id);
      setError(null);
      try {
        const res = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            approve
              ? { action: 'approvePayment', slug, passcode, orderId: order.id, confirmedReceived: true }
              : { action: 'rejectPayment', slug, passcode, orderId: order.id, reason: reason?.trim() }
          ),
        });
        const json = await res.json();
        if (!json.ok) {
          setError(json.error.userMessage);
          return;
        }
        await login(); // refresh the queue so it cannot show a stale state
      } catch {
        setError('Could not reach the server. Check your connection and try again.');
      } finally {
        setDeciding(null);
      }
    },
    [slug, passcode, login]
  );

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
          <PasscodeInput
            value={passcode}
            onChange={setPasscode}
            onEnter={() => slug && passcode && login()}
            placeholder="Passcode"
            label="Consultancy passcode"
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
  const waiting = (data.orders ?? []).filter((o) => o.state === 'submitted');
  const settled = (data.orders ?? []).filter((o) => o.state !== 'submitted' && o.state !== 'created');
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

        {/* ------------------------------------------- payments waiting ---
            WALK 5.6. The client's rule is that a student who signed up through
            this consultancy's link is approved by this consultancy. That rule
            was unreachable until this section existed: the server could approve
            and the screen had no button. Put first, above everything else,
            because a student is sitting waiting on it. */}
        {waiting.length > 0 && (
          <section className="mb-6 overflow-hidden rounded-2xl border-2 border-amber-300 bg-amber-50">
            <div className="border-b border-amber-200 p-5">
              <h2 className="font-serif text-lg font-bold text-amber-900">
                {waiting.length === 1
                  ? '1 student is waiting for you'
                  : `${waiting.length} students are waiting for you`}
              </h2>
              <p className="text-sm text-amber-900/80">
                They have paid and sent us the transaction number. Approve it only if you have seen
                the money yourself. Their credits switch on the moment you do.
              </p>
            </div>
            <ul className="divide-y divide-amber-200">
              {waiting.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-4 bg-white/60 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">
                      {o.studentName || o.payerName || 'Unnamed student'}
                      <span className="ml-2 font-serif text-lg">
                        NPR {o.amountNpr.toLocaleString()}
                      </span>
                    </p>
                    <p className="text-sm text-slate-600">
                      {o.studentEmail || 'no email'} · paid as {o.payerName || 'unknown'} · number
                      ending {o.payerPhoneSuffix || '----'}
                    </p>
                    <p className="mt-1 font-mono text-sm text-ink">
                      Transaction {o.walletTxnId}
                    </p>
                    <p className="text-xs text-slate-500">
                      Sent {new Date(o.createdAt).toLocaleString()}
                    </p>
                    {o.screenshotUrl && (
                      <a
                        href={o.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-ink underline"
                      >
                        See their receipt
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(o, true)}
                      disabled={deciding === o.id}
                      className="rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white disabled:opacity-50"
                    >
                      {deciding === o.id ? 'Working...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => decide(o, false)}
                      disabled={deciding === o.id}
                      className="rounded-xl border-2 border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 disabled:opacity-50"
                    >
                      Cannot confirm
                    </button>
                  </div>
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

        {/* Settled payments, so an admin can answer "what happened to mine?"
            without messaging us. Deliberately below the students table: it is
            a record, not a task. */}
        {settled.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Payments already decided</h2>
              <p className="text-sm text-slate-600">
                Approved by you or by us. Nothing here needs doing.
              </p>
            </div>
            <ul className="divide-y divide-slate-100">
              {settled.slice(0, 25).map((o) => (
                <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {o.studentName || o.payerName || 'Unnamed'} · NPR{' '}
                      {o.amountNpr.toLocaleString()}
                    </p>
                    <p className="font-mono text-xs text-slate-500">{o.walletTxnId}</p>
                    {o.rejectedReason && (
                      <p className="text-xs text-amber-800">Not confirmed: {o.rejectedReason}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      o.state === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {o.state === 'verified' ? 'approved' : o.state}
                  </span>
                </li>
              ))}
            </ul>
          </section>
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
        accent ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p className="mb-2 text-sm text-slate-600">{label}</p>
      <p className="font-serif text-3xl font-black text-ink">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}
