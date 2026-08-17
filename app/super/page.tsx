'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PasscodeInput } from '@/components/PasscodeInput';
import { PaySettingsForm, type PaySettings } from '@/components/PaySettingsForm';
import { PasscodeChangeForm } from '@/components/PasscodeChangeForm';
import { Card, Button, Banner, Status, Pill, type Tone } from '@/components/ui';

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
  /** The post-trial offer actually in force, not the defaults. */
  rewardRule: {
    active: boolean;
    windowMinutes: number;
    publicReason: string;
    bonusPrep: number;
    bonusSerious: number;
  };
  attribution: { name: string; count: number }[];
  referralLeaderboard: { code: string; name: string | null; paid: number }[];
  /** Is the AI switched on, and what has it cost this month. Never a key. */
  ai: {
    sttLive: boolean;
    evaluatorLive: boolean;
    sttProvider: string | null;
    callsThisMonth: number;
    callCap: number;
  };
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
  /** Null when they never told us either way. False means they said no. */
  payerPhoneWhatsappConfirmed?: boolean | null;
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
  /** The API spreads the whole claim, so these arrive already. */
  fingerprintHash?: string | null;
  riskReasons?: string[];
  ip?: string | null;
}

/** N-21, N-24. The richer view, from the `directory` action. */
interface DirectoryStudent {
  id: string;
  name: string | null;
  email: string | null;
  level: string | null;
  targetUniversity: string | null;
  whatsappNumber: string | null;
  whatsappConfirmed: boolean | null;
  city: string | null;
  source: string;
  consultancyId: string | null;
  status: string;
  createdAt: string;
  lastSeenAt: string;
  mocksLeft: number;
}

interface DirectoryConsultancy {
  id: string;
  name: string;
  slug: string;
  status: string;
  seatsTotal: number;
  seatsGivenOut: number;
  seatsLeft: number;
  renewals: number;
  studentsFromLink: number;
  paidNpr: number;
}

interface Directory {
  students: DirectoryStudent[];
  consultancies: DirectoryConsultancy[];
  directPaidOrders: number;
}

interface AuditRow {
  id: string;
  actorRole: string;
  actorId: string;
  action: string;
  subjectId: string;
  before: string | null;
  after: string | null;
  note: string | null;
  createdAt: string;
}

type Tab = 'dashboard' | 'students' | 'payments' | 'flagged' | 'consultancies' | 'questions' | 'audit' | 'settings';

/**
 * D-32. THE STATUS DOTS, GIVEN WORDS.
 *
 * The defect was recorded as "super admin status dots unclear", and there were
 * two things wrong rather than one.
 *
 * The first is D-9: a coloured pill carries its meaning in its colour, and
 * green against amber is the pair roughly one man in twelve cannot separate.
 * Every one of these now renders through `Status`, which cannot be drawn
 * without a word beside the dot.
 *
 * The second is the one that actually made them unclear to the CLIENT, who has
 * no trouble seeing colour. The pills printed the RAW STORED VALUE — "submitted",
 * "verified", "active" — which are names chosen for a database, not for the
 * person deciding whether to approve a payment. "submitted" says who did
 * something; it does not say that the row is waiting for HIM. So the words
 * below are what the state means to the reader, and the mapping lives here,
 * once, rather than as three copies of a ternary inside three tables.
 */
const ORDER_STATE: Record<string, { label: string; tone: Tone }> = {
  submitted: { label: 'Waiting for you to check', tone: 'warn' },
  verified: { label: 'Approved', tone: 'go' },
  rejected: { label: 'Not matched', tone: 'stop' },
  created: { label: 'Not paid yet', tone: 'neutral' },
  expired: { label: 'Expired', tone: 'neutral' },
};

const STUDENT_STATE: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'go' },
  blocked: { label: 'Blocked', tone: 'stop' },
  suspended: { label: 'Suspended', tone: 'stop' },
};

const CONSULTANCY_STATE: Record<string, { label: string; tone: Tone }> = {
  approved: { label: 'Approved', tone: 'go' },
  pending: { label: 'Waiting for approval', tone: 'warn' },
  paused: { label: 'Paused', tone: 'stop' },
  rejected: { label: 'Rejected', tone: 'stop' },
};

/**
 * Falls back to the raw value rather than to a blank or a guess. An unknown
 * state is a real thing that can happen after a schema change, and showing its
 * name is how somebody finds out; showing nothing is how it hides.
 */
function stateOf(
  map: Record<string, { label: string; tone: Tone }>,
  value: string
): { label: string; tone: Tone } {
  return map[value] ?? { label: value, tone: 'neutral' };
}

export default function SuperAdminPage() {
  /**
   * D-9. Hold the passcode for THIS TAB only.
   *
   * There was no session at all, so every reload signed the super admin out.
   * The client hit it constantly: "I should not be signed out this way
   * rigorously... this is happening again and again." It was made far worse by
   * the QR bug, because every failed save pushed him to reload and every reload
   * threw him out.
   *
   * `sessionStorage`, deliberately, not `localStorage` and not a cookie:
   *   - it dies when the tab closes, so a shared machine does not keep it;
   *   - it is not sent with any request, so it cannot be stolen by CSRF;
   *   - it is per tab, so it cannot leak into another window.
   *
   * Security is not improved by making the real admin type a passcode twenty
   * times a day. That only trains them to choose a short one.
   */
  const [key, setKey] = useState(() => {
    if (typeof window === 'undefined') return '';
    try {
      return window.sessionStorage.getItem('precas-super-key') ?? '';
    } catch {
      return '';
    }
  });

  function rememberKey(k: string) {
    setKey(k);
    try {
      if (k) window.sessionStorage.setItem('precas-super-key', k);
      else window.sessionStorage.removeItem('precas-super-key');
    } catch {
      /* private mode: fall back to typing it each time */
    }
  }
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<Overview | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [flagged, setFlagged] = useState<FlaggedTrial[]>([]);
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
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
    /**
     * The `directory` action has existed since N-21 and no screen ever called
     * it, so the richer view the client asked for - level, target university,
     * city, and the per-consultancy seat rollups - was built and unreachable.
     */
    const dir = (await call({ action: 'directory' })) as Directory | null;
    if (dir) setDirectory(dir);
    const au = (await call({ action: 'audit' })) as AuditRow[] | null;
    if (au) setAuditRows(au);
  }, [call]);

  /**
   * D-42. RELOADING /super SIGNED THE SUPER ADMIN OUT.
   *
   * The passcode itself was already being kept, in `sessionStorage`, from the
   * D-9 work. What was missing is subtler and is the whole defect: the gate
   * below is `if (!data)`, and `data` only exists once `loadAll()` has run.
   * Nothing ran it on mount. So after a reload the page held a perfectly good
   * passcode and still drew the passcode box, because it had never asked the
   * server anything with it.
   *
   * That is F-1 in the shape this project keeps meeting: a CONCLUSION ("you are
   * signed out") rendered where a STATE ("we have a key and have not used it
   * yet") was the truth. The client's complaint — "I should not be signed out
   * this way rigorously... this is happening again and again" — was describing
   * a screen that was wrong, not a policy that was strict.
   *
   * So: if a key survived the reload, use it. `attempted` makes this run once,
   * so a passcode the server rejects lands on the box with the reason showing
   * rather than retrying for ever.
   */
  const restoreAttempted = useRef(false);
  useEffect(() => {
    if (restoreAttempted.current) return;
    if (!key) return;
    restoreAttempted.current = true;
    void loadAll();
  }, [key, loadAll]);

  /**
   * D-42, the other half. There was no way OUT.
   *
   * A back office that holds every student record we have, on a machine that
   * may be shared in an office, with no log out, is not a small omission. The
   * key is dropped from `sessionStorage` and every loaded record is dropped
   * from memory, so the next person sees the passcode box and nothing else.
   */
  function logOut() {
    rememberKey('');
    setData(null);
    setOrders([]);
    setFlagged([]);
    setDirectory(null);
    setAuditRows([]);
    setError(null);
    setNotice(null);
    restoreAttempted.current = false;
  }

  // -------------------------------------------------------- consultancies --
  //
  // `createConsultancy` and `setConsultancyStatus` live on /api/platform and
  // had no screen at all, which meant the entire consultancy channel could
  // only be opened by someone hand-writing an HTTP request. That is not a
  // missing nicety on a product whose growth plan IS consultancies.
  const platformCall = useCallback(
    async (body: Record<string, unknown>): Promise<unknown | null> => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch('/api/platform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ superKey: key, ...body }),
        });
        const json = await res.json();
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

  /**
   * D-31. Mark a consultancy's network as a lab.
   *
   * `lib/trial-gate.ts` allows 4 distinct accounts per device normally and 40
   * on an allowlisted network, and that 40 exists for exactly one purpose: a
   * consultancy lab with a few shared machines must not have its students
   * refused their free trial. The field was read there through an `as` cast and
   * written NOWHERE, so the branch was dead and the fifth student to sit at a
   * shared machine was always soft-denied. At the client's most important kind
   * of customer.
   */
  async function setLabNetworks(c: DirectoryConsultancy) {
    const current = window.prompt(
      `Which networks does ${c.name} use?\n\n` +
        'Type the public IP addresses of their office or lab, separated by commas. ' +
        'Students on those networks can share a machine without losing their free questions. ' +
        'Leave it empty to go back to the normal limit.',
      ''
    );
    if (current === null) return;
    const ips = current
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    const ok = (await platformCall({
      action: 'setAllowlistedIps',
      consultancyId: c.id,
      ips,
    })) as { message?: string } | null;
    if (ok) {
      setNotice(ok.message ?? 'Saved.');
      await loadAll();
    }
  }

  async function setConsultancyStatus(c: DirectoryConsultancy, status: string) {
    const verb = status === 'approved' ? 'Approve' : status === 'suspended' ? 'Suspend' : 'Set back to pending for';
    if (
      !window.confirm(
        `${verb} ${c.name}?\n\n` +
          (status === 'approved'
            ? 'Their link starts working, their students bind to them, and seats can be taken.'
            : status === 'suspended'
              ? 'Their portal stops opening immediately. Students who already signed up keep everything they have.'
              : 'They lose access until you approve them again.')
      )
    )
      return;
    const ok = await platformCall({ action: 'setConsultancyStatus', consultancyId: c.id, status });
    if (ok) {
      await loadAll();
      setNotice(`${c.name} is now ${status}.`);
    }
  }

  /**
   * Change the one passcode that opens every student record we hold.
   *
   * `key` is updated in state the moment it succeeds, because every later call
   * on this screen sends it and would otherwise start returning 403 while the
   * admin sat looking at a working-looking dashboard.
   */
  async function changeSuperPasscode(newPasscode: string): Promise<boolean> {
    const ok = (await call({ action: 'changeSuperPasscode', newPasscode })) as
      | { message?: string }
      | null;
    if (!ok) return false;
    // Keep the tab signed in with the NEW passcode, or the next click 403s.
    rememberKey(newPasscode);
    setNotice(ok.message ?? 'Saved. Use the new passcode from now on.');
    return true;
  }

  async function blockDevice(fingerprint: string, who: string | null) {
    if (
      !window.confirm(
        `Stop free trials from this device?\n\n` +
          `Seen on ${who || 'this account'}.\n\n` +
          'Nobody is banned. This device simply stops receiving free questions. Anyone on it can still look around and buy a pack, which matters because it may be a shared consultancy machine with real students on it tomorrow.'
      )
    )
      return;
    const ok = await call({ action: 'setDeviceBlock', fingerprint, blocked: true });
    if (ok) {
      await loadAll();
      setNotice('That device will not be given free trials. It can still browse and buy.');
    }
  }

  async function grantCredit(studentId: string, name: string) {
    const kind = window.prompt(`Give ${name} credit.\n\nType "mock" or "practice".`, 'mock');
    if (!kind || (kind !== 'mock' && kind !== 'practice')) return;
    const raw = window.prompt(`How many ${kind} credits? (1 to 50)`, '1');
    const amount = Number(raw);
    if (!Number.isInteger(amount) || amount < 1 || amount > 50) return;
    const note = window.prompt('Why? This is recorded in the audit trail.', 'support fix');
    if (!note) return;
    const ok = await call({ action: 'grantCredit', studentId, kind, amount, note });
    if (ok) {
      await loadAll();
      setNotice(`Gave ${name} ${amount} ${kind} credit. Recorded against you.`);
    }
  }

  async function savePaySettings(next: PaySettings): Promise<boolean> {
    const ok = await call({ action: 'setPaymentSettings', ...next });
    if (ok) {
      setNotice('Payment details saved. Students see them straight away.');
      await loadAll();
      return true;
    }
    return false;
  }

  async function verify(orderId: string, order?: Order) {
    /**
     * D-20. Ask the person, do not answer for them.
     *
     * The API requires `confirmedInWalletLedger: z.literal(true)`, and the only
     * reason that flag exists is to make the approver assert they have seen the
     * money arrive. This screen hardcoded `true`, so the assertion was made by
     * the code on the admin's behalf and meant nothing. The page even prints
     * the instruction, "Check the transaction id in the receiver's own wallet
     * ledger before approving. A screenshot is evidence, never proof", and then
     * approved on one click with no confirmation of any kind.
     *
     * The inversion was the tell: approving a CONSULTANCY, which moves no
     * money, showed a confirm dialog. Approving a PAYMENT, which grants credits
     * against money that may never have arrived, showed nothing.
     *
     * It matters most at volume. At roughly twenty payments a day, one careless
     * click on a row that was never paid is a pack given away, and the student
     * who really paid is still waiting.
     */
    const txn = order?.walletTxnId ?? 'this transaction';
    const amount = order ? `NPR ${order.amountNpr.toLocaleString()}` : 'this amount';
    if (
      !window.confirm(
        `Have you found ${txn} in the eSewa ledger for ${amount}?\n\n` +
          'Approve only if you have SEEN the money arrive. A screenshot from the student is not proof. ' +
          'Approving adds the pack immediately and cannot be undone.'
      )
    )
      return;

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
      <main className="grid min-h-screen place-items-center bg-paper px-4">
        <Card className="w-full max-w-sm">
          <h1 className="font-serif text-title font-bold text-ink">Super admin</h1>
          <p className="mb-6 mt-1 text-ink-soft">Everything across the platform.</p>
          {/* Readable on request. The client was locked out of his own back
              office by a masked field he could not check. See PasscodeInput. */}
          <PasscodeInput
            value={key}
            onChange={rememberKey}
            onEnter={loadAll}
            placeholder="Super admin passcode"
            autoFocus
            name="super-passcode"
          />
          {error && (
            <p className="mb-3 text-sm font-semibold text-stop" role="alert">
              {error}
            </p>
          )}
          <Button variant="secondary" onClick={loadAll} disabled={!key || busy} full>
            {busy ? 'Checking...' : 'Open'}
          </Button>
          {!key && (
            <p className="mt-2 text-sm font-semibold text-stop">Enter the passcode to continue.</p>
          )}
        </Card>
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
  const pendingConsultancies = (directory?.consultancies ?? []).filter(
    (c) => c.status === 'pending'
  ).length;

  const nav: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'students', label: 'Students' },
    { id: 'payments', label: `Payments${awaiting.length ? ` (${awaiting.length})` : ''}` },
    { id: 'flagged', label: `Flagged${flagged.length ? ` (${flagged.length})` : ''}` },
    {
      id: 'consultancies',
      label: `Consultancies${pendingConsultancies ? ` (${pendingConsultancies})` : ''}`,
    },
    { id: 'questions', label: 'Questions' },
    { id: 'audit', label: 'Audit' },
    { id: 'settings', label: 'Payment details' },
  ];

  return (
    <div className="min-h-screen bg-paper lg:flex">
      {/* ---------------------------------------------------- side nav --- */}
      <aside className="border-b border-line bg-surface-sunk px-5 py-5 lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
        <div className="mb-6">
          <p className="font-serif text-lg font-bold text-ink">Admin portal</p>
          <p className="text-sm text-ink-quiet">PreCAS Practice</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              aria-current={tab === n.id ? 'page' : undefined}
              className={`min-h-tap whitespace-nowrap rounded-control px-4 py-2.5 text-left text-sm font-semibold transition-colors duration-tap ease-move ${
                tab === n.id ? 'bg-go text-white' : 'text-ink-soft hover:bg-surface'
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
            <h1 className="font-serif text-[2rem] font-bold leading-tight tracking-tight text-ink md:text-display">
              System overview
            </h1>
            <p className="text-ink-soft">Analytics and approvals</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="tertiary" onClick={loadAll} disabled={busy}>
              {busy ? 'Loading...' : 'Refresh'}
            </Button>
            <Button variant="secondary" onClick={exportCsv}>
              Export to CSV
            </Button>
            {/* D-42. There was no way out of a screen holding every student
                record we have, on a machine that may be shared in an office. */}
            <Button variant="tertiary" onClick={logOut}>
              Log out
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-4">
            <Banner tone="stop" title={error} />
          </div>
        )}
        {notice && (
          <div className="mb-4">
            <Banner tone="go" title={notice} />
          </div>
        )}

        {/* ------------------------------------------------- dashboard --- */}
        {tab === 'dashboard' && data.ai && !data.ai.sttLive && (
          /* The loudest thing on the page when it matters, and gone entirely
             when it does not. A student in demo mode is shown sample text and
             told plainly it is not their voice, but the OWNER should never
             find that out from a student. */
          <section className="mb-6 rounded-card border-2 border-warn/40 bg-warn-tint p-5">
            <h2 className="mb-1 font-bold text-warn">
              The AI is not switched on yet
            </h2>
            <p className="text-sm leading-relaxed text-warn/90">
              Nobody is being listened to. Students see clearly marked sample text instead of their
              own words, and no score is ever invented from it. To switch it on, set{' '}
              <code className="rounded bg-surface/70 px-1 font-mono">GROQ_API_KEY</code> for speech and{' '}
              <code className="rounded bg-surface/70 px-1 font-mono">GEMINI_API_KEY</code> for the
              feedback, then redeploy. Keys live in the host, never in this screen, so nobody who
              gets into this dashboard can read or steal them.
            </p>
          </section>
        )}

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

            {/* What the AI is doing and what it is costing. The spend counter
                is what stands between a runaway and a real bill, so it belongs
                where the owner already looks rather than in a log file. */}
            {data.ai && (
              <section className="mb-6 grid gap-4 sm:grid-cols-3">
                <Stat
                  label="Speech to text"
                  value={data.ai.sttLive ? 'Live' : 'Not on'}
                  hint={data.ai.sttProvider ?? 'students see sample text, clearly marked'}
                  accent={!data.ai.sttLive}
                />
                <Stat
                  label="Feedback"
                  value={data.ai.evaluatorLive ? 'Live' : 'Not on'}
                  hint={
                    data.ai.evaluatorLive
                      ? 'real marking'
                      : 'sample feedback, never a made-up score'
                  }
                  accent={!data.ai.evaluatorLive}
                />
                <Stat
                  label="Paid calls this month"
                  value={`${data.ai.callsThisMonth} of ${data.ai.callCap}`}
                  hint={
                    data.ai.callsThisMonth >= data.ai.callCap
                      ? 'ceiling reached, paid calls are paused'
                      : 'counted per server, so the true figure may be higher'
                  }
                  accent={data.ai.callsThisMonth >= data.ai.callCap}
                />
              </section>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <section className="rounded-card border border-line bg-surface shadow-card lg:col-span-2">
                <div className="border-b border-line p-5">
                  <h2 className="font-serif text-lg font-bold text-ink">Where students come from</h2>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <div className="rounded-control bg-surface-sunk p-4">
                    <p className="text-sm text-ink-soft">Direct students</p>
                    <p className="font-serif text-title font-bold text-ink">{direct}</p>
                  </div>
                  <div className="rounded-control bg-surface-sunk p-4">
                    <p className="text-sm text-ink-soft">Through a consultancy</p>
                    <p className="font-serif text-title font-bold text-ink">{viaConsultancy}</p>
                  </div>
                </div>
                <div className="border-t border-line p-5">
                  <p className="mb-3 text-micro font-semibold uppercase tracking-wide text-ink-quiet">
                    Consultancies our direct students named
                  </p>
                  {data.attribution.length === 0 ? (
                    <p className="text-sm text-ink-quiet">
                      Nothing yet. This fills up as students tell us who they are applying through,
                      and it is the list of consultancies worth approaching.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {data.attribution.slice(0, 8).map((a) => (
                        <li key={a.name} className="flex justify-between text-sm">
                          <span className="capitalize text-ink-soft">{a.name}</span>
                          <span className="font-bold text-go-dark">{a.count} students</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="rounded-card border border-line bg-surface shadow-card">
                <div className="border-b border-line p-5">
                  <h2 className="font-serif text-lg font-bold text-ink">Referral leaders</h2>
                  <p className="text-sm text-ink-soft">Counted only when the friend paid.</p>
                </div>
                <div className="p-5">
                  {data.referralLeaderboard.length === 0 ? (
                    <p className="text-sm text-ink-quiet">No paid referrals yet.</p>
                  ) : (
                    <ol className="space-y-2">
                      {data.referralLeaderboard.slice(0, 10).map((l, i) => (
                        <li
                          key={l.code}
                          className="flex items-center justify-between rounded-control bg-surface-sunk px-3 py-2 text-sm"
                        >
                          <span className="text-ink-soft">
                            <span className="mr-2 font-bold text-ink-quiet">#{i + 1}</span>
                            {l.name || l.code}
                          </span>
                          <span className="font-bold text-go-dark">{l.paid}</span>
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
          <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <div className="border-b border-line p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Students</h2>
              <p className="text-sm text-ink-soft">
                Engagement and entitlement only. Answers are never shown here.
              </p>
            </div>
            {data.students.length === 0 ? (
              <p className="p-10 text-center text-ink-quiet">
                No students yet. They appear the moment somebody signs in.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-sunk text-micro font-bold uppercase tracking-[0.08em] text-ink-quiet">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Student</th>
                      <th className="px-3 py-3 font-semibold">Phone</th>
                      <th className="px-3 py-3 font-semibold">Source</th>
                      <th className="px-3 py-3 font-semibold">Applying through</th>
                      <th className="px-3 py-3 font-semibold">Mocks left</th>
                      <th className="px-3 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.students.map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-ink">{s.name || 'Unnamed'}</p>
                          <p className="text-micro text-ink-quiet">{s.email || 'no email'}</p>
                        </td>
                        {/* Tappable. If the only way to act on a row is to
                            copy a number out by hand, the row is a list entry
                            and not a tool. */}
                        <td className="px-3 py-3 text-ink-soft">
                          {s.phone ? (
                            <a href={`tel:${s.phone}`} className="font-medium text-ink underline underline-offset-2">
                              {s.phone}
                            </a>
                          ) : (
                            <span className="text-ink-quiet">not given</span>
                          )}
                          {s.phone && s.whatsappConfirmed === false && (
                            <span className="ml-1 block text-micro font-semibold text-warn">
                              not on WhatsApp
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-ink-soft">
                          {s.consultancyId ? 'Consultancy' : 'Direct'}
                        </td>
                        <td className="px-3 py-3 capitalize text-ink-soft">
                          {s.attributionConsultancy || 'not said'}
                        </td>
                        {/* Giving credit without seeing what they already
                            have is guessing. This comes from the directory,
                            which is now loaded alongside the overview. */}
                        <td className="px-3 py-3 tabular-nums text-ink-soft">
                          {directory?.students.find((d) => d.id === s.id)?.mocksLeft ?? '-'}
                        </td>
                        <td className="px-3 py-3">
                          <Status tone={stateOf(STUDENT_STATE, s.status).tone}>
                            {stateOf(STUDENT_STATE, s.status).label}
                          </Status>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {/* The support fix. A student whose payment went
                                wrong, or who was soft-denied unfairly, could
                                only be helped by a redeploy before this. The
                                action existed the whole time. */}
                            <Button variant="primary" size="sm"
                              onClick={() => grantCredit(s.id, s.name || s.email || 'this student')}
                              disabled={busy}
                            >
                              Give credit
                            </Button>
                            <Button variant="tertiary" size="sm"
                              onClick={() =>
                                setStudentStatus(s.id, s.status === 'active' ? 'disabled' : 'active')
                              }
                            >
                              {s.status === 'active' ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
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
          <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <div className="border-b border-line p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Payments</h2>
              <p className="mb-3 text-sm text-ink-soft">
                Check the transaction id in the receiver&apos;s own wallet ledger before approving. A
                screenshot is evidence, never proof.
              </p>
              <div className="flex flex-wrap gap-4">
                <Status tone="warn">{awaiting.length} waiting for you</Status>
                <Status tone="go">{approvedCount} approved</Status>
                <Status tone="stop">{rejectedCount} not matched</Status>
              </div>
            </div>
            {orders.length === 0 ? (
              <p className="p-10 text-center text-ink-quiet">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-sunk text-micro font-bold uppercase tracking-[0.08em] text-ink-quiet">
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
                  <tbody className="divide-y divide-line">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-ink">{o.studentName || 'Unnamed'}</p>
                          <p className="text-micro text-ink-quiet">{o.payerName || o.studentEmail || ''}</p>
                        </td>
                        <td className="px-3 py-3 uppercase text-ink-soft">{o.packCode}</td>
                        <td className="px-3 py-3 tabular-nums">NPR {o.amountNpr.toLocaleString()}</td>
                        <td className="px-3 py-3 font-mono text-micro text-ink-soft">
                          {o.walletTxnId || '—'}
                        </td>
                        {/* N-13. When money has not landed, the only useful next
                            step is to ring them. Making the approver look the
                            number up elsewhere is how a payment sits overnight
                            while a student assumes they were robbed. The last 4
                            they typed sits underneath, because that is what you
                            check against the wallet ledger. */}
                        <td className="px-3 py-3 text-micro">
                          {o.payerPhone ? (
                            <>
                              <a href={`tel:${o.payerPhone}`} className="font-semibold text-ink underline underline-offset-2">
                                {o.payerPhone}
                              </a>
                              {/* D-19. One tap to the student's own WhatsApp
                                  thread, because that is where "I have paid"
                                  was actually sent. At twenty payments a day,
                                  hunting for the right chat by hand is the
                                  whole job; this makes it one click, with the
                                  transaction number already in the message so
                                  it can be compared against their receipt
                                  without typing anything. */}
                              <a
                                href={`https://wa.me/${o.payerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `Hello, this is about your PreCAS Practice payment of NPR ${o.amountNpr}. We are checking transaction number ${o.walletTxnId ?? ''}. Could you confirm this is yours?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 rounded-md bg-go-tint px-2 py-0.5 font-semibold text-go-dark"
                              >
                                WhatsApp
                              </a>
                            </>
                          ) : (
                            <span className="text-ink-quiet">not given</span>
                          )}
                          {o.payerPhoneSuffix && (
                            <span className="block text-micro text-ink-quiet">
                              paid from ...{o.payerPhoneSuffix}
                            </span>
                          )}
                          {/* Knowing the number is not the same as knowing it
                              will reach them. If they told us it is not on
                              WhatsApp, a message will vanish and the payment
                              sits unapproved while they wait. Ring it. */}
                          {o.payerPhone && o.payerPhoneWhatsappConfirmed === false && (
                            <span className="block text-micro font-semibold text-warn">
                              not on WhatsApp, call instead
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Status tone={stateOf(ORDER_STATE, o.state).tone}>
                            {stateOf(ORDER_STATE, o.state).label}
                          </Status>
                        </td>
                        <td className="px-5 py-3">
                          {o.state === 'submitted' ? (
                            <div className="flex gap-2">
                              <Button variant="primary" size="sm"
                                onClick={() => verify(o.id, o)}
                                disabled={busy}
                              >
                                Approve
                              </Button>
                              <Button variant="danger" size="sm"
                                onClick={() => reject(o.id)}
                                disabled={busy}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-micro text-ink-quiet">done</span>
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

        {/* -------------------------------------------- consultancies ---
            `createConsultancy` and `setConsultancyStatus` existed on the server
            with NO screen anywhere, so the only way to open the consultancy
            channel was to hand-write an HTTP request. On a product whose whole
            growth plan is consultancies, that is not a missing nicety. */}
        {tab === 'consultancies' && (
          <section>
            <div className="mb-6 rounded-card border border-line bg-surface p-5 shadow-card">
              <h2 className="mb-1 font-serif text-lg font-bold text-ink">Add a consultancy</h2>
              <p className="mb-4 text-sm leading-relaxed text-ink-soft">
                They get their own link and their own portal. Nothing works until you approve them
                below, so it is safe to set one up before the money arrives.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget as HTMLFormElement);
                  const ok = await platformCall({
                    action: 'createConsultancy',
                    name: String(f.get('name') ?? '').trim(),
                    slug: String(f.get('slug') ?? '').trim(),
                    contactName: String(f.get('contactName') ?? '').trim(),
                    contactPhone: String(f.get('contactPhone') ?? '').trim(),
                    seatsTotal: Number(f.get('seatsTotal') ?? 0),
                    paidNpr: Number(f.get('paidNpr') ?? 0),
                    passcode: String(f.get('passcode') ?? ''),
                  });
                  if (ok) {
                    (e.target as HTMLFormElement).reset();
                    await loadAll();
                    setNotice('Consultancy created, and waiting for you to approve it below.');
                  }
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <Field name="name" label="Their name" placeholder="Kathmandu Education Hub" required />
                <Field
                  name="slug"
                  label="Short name for their link"
                  placeholder="kathmandu-hub"
                  hint="lower case, letters, numbers and dashes"
                  required
                />
                <Field name="contactName" label="Who we deal with" placeholder="Sita Sharma" />
                <Field name="contactPhone" label="Their phone" placeholder="+977 98..." />
                <Field name="seatsTotal" label="Seats they have paid for" type="number" placeholder="0" />
                <Field name="paidNpr" label="What they paid, NPR" type="number" placeholder="0" />
                <Field
                  name="passcode"
                  label="Portal passcode"
                  placeholder="at least 4 characters"
                  hint="give this to them; they use it with their short name"
                  required
                />
                <div className="flex items-end">
                  <Button variant="secondary" size="md" full
                    type="submit"
                    disabled={busy}
                  >
                    {busy ? 'Working...' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>

            <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              <div className="border-b border-line p-5">
                <h2 className="font-serif text-lg font-bold text-ink">Consultancies</h2>
                <p className="text-sm text-ink-soft">
                  Seats given out, seats left, and how many students came through their link.
                </p>
              </div>
              {(directory?.consultancies ?? []).length === 0 ? (
                <p className="p-10 text-center text-ink-quiet">None yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-sunk text-micro font-bold uppercase tracking-[0.08em] text-ink-quiet">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Consultancy</th>
                        <th className="px-3 py-3 font-semibold">Seats</th>
                        <th className="px-3 py-3 font-semibold">Students</th>
                        <th className="px-3 py-3 font-semibold">Paid</th>
                        <th className="px-3 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {(directory?.consultancies ?? []).map((c) => (
                        <tr key={c.id}>
                          <td className="px-5 py-3">
                            <p className="font-semibold text-ink">{c.name}</p>
                            <p className="font-mono text-micro text-ink-quiet">/c/{c.slug}</p>
                          </td>
                          <td className="px-3 py-3 tabular-nums text-ink-soft">
                            {c.seatsGivenOut} of {c.seatsTotal}
                            <span className="block text-micro text-ink-quiet">
                              {c.seatsLeft} left
                              {c.renewals > 0 ? `, ${c.renewals} top ups` : ''}
                            </span>
                          </td>
                          <td className="px-3 py-3 tabular-nums text-ink-soft">
                            {c.studentsFromLink}
                          </td>
                          <td className="px-3 py-3 tabular-nums text-ink-soft">
                            NPR {c.paidNpr.toLocaleString()}
                          </td>
                          <td className="px-3 py-3">
                            <Status tone={stateOf(CONSULTANCY_STATE, c.status).tone}>
                              {stateOf(CONSULTANCY_STATE, c.status).label}
                            </Status>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap gap-2">
                              {c.status !== 'approved' && (
                                <Button variant="primary" size="sm"
                                  onClick={() => setConsultancyStatus(c, 'approved')}
                                  disabled={busy}
                                >
                                  Approve
                                </Button>
                              )}
                              {c.status === 'approved' && (
                                <Button variant="tertiary" size="sm"
                                  onClick={() => setConsultancyStatus(c, 'suspended')}
                                  disabled={busy}
                                >
                                  Suspend
                                </Button>
                              )}
                              {/* D-31. The switch that makes a lab work. */}
                              {c.status === 'approved' && (
                                <Button variant="tertiary" size="sm"
                                  onClick={() => setLabNetworks(c)}
                                  disabled={busy}
                                >
                                  Lab networks
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ------------------------------------------------- questions ---
            N-25. Add a question to the live bank with no deploy. The action
            worked from the day it was written; nothing ever called it. */}
        {tab === 'questions' && (
          <section className="rounded-card border border-line bg-surface p-5 shadow-card">
            <h2 className="mb-1 font-serif text-lg font-bold text-ink">Add a question</h2>
            <p className="mb-4 text-sm leading-relaxed text-ink-soft">
              It goes into the live bank straight away, with no deploy. Write what a real
              interviewer would ask, and say what a good answer has to show, because that is what
              the marking uses.
            </p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget as HTMLFormElement);
                const ok = (await call({
                  action: 'addQuestion',
                  category: String(f.get('category') ?? '').trim(),
                  text: String(f.get('text') ?? '').trim(),
                  intent: String(f.get('intent') ?? '').trim(),
                })) as { total?: number } | null;
                if (ok) {
                  (e.target as HTMLFormElement).reset();
                  setNotice(`Added. The bank now has ${ok.total ?? '?'} extra questions.`);
                }
              }}
            >
              <Field
                name="category"
                label="Category"
                placeholder="finances, course choice, intentions..."
                required
              />
              <label className="mb-1 mt-3 block text-sm font-semibold text-ink">The question</label>
              <textarea
                name="text"
                required
                minLength={10}
                maxLength={400}
                rows={2}
                placeholder="Who is paying for your studies, and how do you know they can?"
                className="mb-3 w-full rounded-control border-2 border-line px-4 py-3 outline-none focus:border-ink"
              />
              <label className="mb-1 block text-sm font-semibold text-ink">
                What a good answer must show
              </label>
              <textarea
                name="intent"
                required
                minLength={5}
                maxLength={300}
                rows={2}
                placeholder="A named person, their real occupation, and awareness of the actual amount."
                className="mb-4 w-full rounded-control border-2 border-line px-4 py-3 outline-none focus:border-ink"
              />
              <Button variant="secondary" size="md"
                type="submit"
                disabled={busy}
              >
                {busy ? 'Adding...' : 'Add to the bank'}
              </Button>
            </form>
          </section>
        )}

        {/* ----------------------------------------------------- audit ---
            Every approval, rejection, grant and status change, with who did
            it. The action existed and nothing displayed it, so the paper trail
            that justifies letting consultancies approve payments was invisible
            to the one person it protects. */}
        {tab === 'audit' && (
          <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <div className="border-b border-line p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Who did what</h2>
              <p className="text-sm text-ink-soft">
                Newest first. This is the record that makes letting a consultancy approve their own
                students safe to allow.
              </p>
            </div>
            {auditRows.length === 0 ? (
              <p className="p-10 text-center text-ink-quiet">Nothing recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-sunk text-micro font-bold uppercase tracking-[0.08em] text-ink-quiet">
                    <tr>
                      <th className="px-5 py-3 font-semibold">When</th>
                      <th className="px-3 py-3 font-semibold">Who</th>
                      <th className="px-3 py-3 font-semibold">Did what</th>
                      <th className="px-5 py-3 font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {auditRows.map((a) => (
                      <tr key={a.id}>
                        <td className="whitespace-nowrap px-5 py-3 text-micro text-ink-quiet">
                          {new Date(a.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-micro font-bold ${
                              a.actorRole === 'admin'
                                ? 'bg-warn-tint text-warn'
                                : 'bg-surface-sunk text-ink-soft'
                            }`}
                          >
                            {a.actorRole === 'admin' ? 'consultancy' : a.actorRole}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-medium text-ink">
                          {a.action.replace(/_/g, ' ')}
                          {a.before !== null && a.after !== null && (
                            <span className="block text-micro text-ink-quiet">
                              {a.before} to {a.after}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-micro text-ink-soft">{a.note}</td>
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
          <>
            <PaySettingsForm initial={data.paySettings} onSave={savePaySettings} busy={busy} />

            {/* -------------------------------------- your passcode ---
                It could previously only be changed by editing an environment
                variable and redeploying, which in practice means never: not
                when a laptop is lost, not when somebody leaves, not after it
                has been read out over the phone to unstick somebody. */}
            <div className="mt-6">
              <PasscodeChangeForm
                title="Change your passcode"
                explanation="This one passcode opens every student record we hold, so it is worth changing after anyone has seen it. If you ever forget it, change SUPER_ADMIN_PASSCODE in Netlify and redeploy, which clears this one and lets you back in."
                minLength={10}
                busy={busy}
                onSave={changeSuperPasscode}
              />
            </div>

            {/* ------------------------------------------ the offer ---
                `RewardRule` has said "a reward rule the super admin controls"
                since it was written, and `upsertRewardRule` had no callers, so
                the offer was frozen at the defaults and the super admin
                controlled nothing.

                The two limits below are not decoration. This is the honest
                countdown feature: the deadline a student sees is a real server
                timestamp tied to a named reason. A lever that could turn it
                into a fake urgency banner would be worse than no lever. */}
            <section className="mt-6 rounded-card border border-line bg-surface p-5 shadow-card">
              <h2 className="mb-1 font-serif text-lg font-bold text-ink">
                The offer after the free questions
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-ink-soft">
                When a student finishes their free ten, they get one real deadline and extra mocks if
                they buy inside it. The deadline is theirs, it is set once, and it is never reissued
                or restarted.
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget as HTMLFormElement);
                  const ok = await call({
                    action: 'setRewardRule',
                    active: f.get('active') === 'on',
                    windowMinutes: Number(f.get('windowMinutes')),
                    publicReason: String(f.get('publicReason') ?? '').trim(),
                    bonusPrep: Number(f.get('bonusPrep')),
                    bonusSerious: Number(f.get('bonusSerious')),
                  });
                  if (ok) {
                    await loadAll();
                    setNotice('Offer saved. Students who finish from now on see this.');
                  }
                }}
              >
                <label className="mb-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={data.rewardRule.active}
                    className="h-5 w-5 accent-go"
                  />
                  <span className="text-sm font-semibold text-ink">Offer switched on</span>
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="windowMinutes" className="mb-1 block text-sm font-semibold text-ink">
                      How long, in minutes
                    </label>
                    <input
                      id="windowMinutes"
                      name="windowMinutes"
                      type="number"
                      min={15}
                      max={1440}
                      defaultValue={data.rewardRule.windowMinutes}
                      className="w-full rounded-control border-2 border-line px-4 py-3 text-sm outline-none focus:border-ink"
                    />
                    <p className="mt-1 text-micro text-ink-quiet">
                      15 minutes to 24 hours. Shorter is pressure, longer is not a real deadline.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="bonusPrep" className="mb-1 block text-sm font-semibold text-ink">
                      Extra mocks with Prep
                    </label>
                    <input
                      id="bonusPrep"
                      name="bonusPrep"
                      type="number"
                      min={0}
                      max={10}
                      defaultValue={data.rewardRule.bonusPrep}
                      className="w-full rounded-control border-2 border-line px-4 py-3 text-sm outline-none focus:border-ink"
                    />
                  </div>
                  <div>
                    <label htmlFor="bonusSerious" className="mb-1 block text-sm font-semibold text-ink">
                      Extra mocks with Serious
                    </label>
                    <input
                      id="bonusSerious"
                      name="bonusSerious"
                      type="number"
                      min={0}
                      max={10}
                      defaultValue={data.rewardRule.bonusSerious}
                      className="w-full rounded-control border-2 border-line px-4 py-3 text-sm outline-none focus:border-ink"
                    />
                  </div>
                </div>

                <label htmlFor="publicReason" className="mb-1 mt-3 block text-sm font-semibold text-ink">
                  What the student is told
                </label>
                <textarea
                  id="publicReason"
                  name="publicReason"
                  rows={2}
                  minLength={10}
                  maxLength={300}
                  defaultValue={data.rewardRule.publicReason}
                  className="mb-1 w-full rounded-control border-2 border-line px-4 py-3 text-sm outline-none focus:border-ink"
                />
                <p className="mb-4 text-micro leading-relaxed text-ink-quiet">
                  This sits next to a real countdown, so it has to name a real reason. Never invent
                  scarcity, and never say a price is going up when it is not. We add value, we do
                  not discount, so a student who paid yesterday was not overcharged.
                </p>

                <Button variant="secondary" size="md"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? 'Saving...' : 'Save the offer'}
                </Button>
              </form>
            </section>
          </>
        )}

        {/* --------------------------------------------------- flagged --- */}
        {tab === 'flagged' && (
          <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <div className="border-b border-line p-5">
              <h2 className="font-serif text-lg font-bold text-ink">Flagged free trials</h2>
              <p className="text-sm text-ink-soft">
                These students were held back automatically. They can still browse and buy. If they
                look genuine, switch their free questions on.
              </p>
            </div>
            {flagged.length === 0 ? (
              <p className="p-10 text-center text-ink-quiet">Nothing flagged. </p>
            ) : (
              <ul className="divide-y divide-line">
                {flagged.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                    <div>
                      <p className="font-semibold text-ink">{f.studentName || 'Unnamed student'}</p>
                      <p className="text-micro text-ink-quiet">{f.studentEmail || ''}</p>
                      <p className="mt-1 text-sm text-stop">
                        {f.reason || (f.riskReasons ?? []).join('; ') || 'Flagged automatically'}
                      </p>
                      {f.fingerprintHash && (
                        <p className="mt-0.5 font-mono text-micro text-ink-quiet">
                          device {f.fingerprintHash.slice(0, 18)}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="primary" size="sm"
                        onClick={() => resolveFlag(f.id, true)}
                        disabled={busy}
                      >
                        Switch free questions on
                      </Button>
                      <Button variant="tertiary" size="sm"
                        onClick={() => resolveFlag(f.id, false)}
                        disabled={busy}
                      >
                        Keep held
                      </Button>
                      {/* N-18. Stop this DEVICE, not this person.
                          `setDeviceBlock` existed with no screen, so the only
                          answer to a farm running twenty accounts off one
                          laptop was to hold each account back one at a time,
                          for ever. This is still soft: a blocked device gets
                          no free trial and can still browse and buy, because
                          the machine may be a shared lab PC with real students
                          on it tomorrow. */}
                      {f.fingerprintHash && (
                        <Button variant="warn" size="sm"
                          onClick={() => blockDevice(f.fingerprintHash as string, f.studentName)}
                          disabled={busy}
                        >
                          Stop free trials from this device
                        </Button>
                      )}
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
          <p className="mt-10 text-center text-micro text-ink-quiet">
            Build {data.build.shortSha} · {data.build.context} · {data.build.branch} · built{' '}
            {new Date(data.build.builtAt).toLocaleString()}
          </p>
        )}
      </main>
    </div>
  );
}

/**
 * D-7. An accent that means "look at this" must not be GREEN.
 *
 * `accent` painted the card emerald, and it is used for exactly the states that
 * need attention: "Speech to text: Not on", "Feedback: Not on", orders waiting,
 * and the monthly call cap being reached. So the one colour that means "all
 * good" was being used to say the opposite, and at a glance the dashboard read
 * as though the AI was running when it was not.
 *
 * `tone` now says which it is. Green stays for genuinely good news; amber is
 * for something the owner has to act on.
 */
function Stat({
  label,
  value,
  hint,
  accent = false,
  tone = 'attention',
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  tone?: 'attention' | 'good';
}) {
  const good = tone === 'good';
  return (
    <div
      className={`rounded-card border p-5 ${
        accent
          ? good
            ? 'border-go/40 bg-go-tint'
            : 'border-warn/40 bg-warn-tint'
          : 'border-line bg-surface'
      }`}
    >
      <p className="mb-2 text-sm text-ink-soft">{label}</p>
      <p className="font-serif text-display font-bold text-ink">{value}</p>
      <p
        className={`mt-1 text-micro ${
          accent ? (good ? 'font-semibold text-go-dark' : 'font-semibold text-warn') : 'text-ink-quiet'
        }`}
      >
        {hint}
      </p>
    </div>
  );
}

/**
 * One labelled field. The forms above would otherwise repeat this markup a
 * dozen times, and the day somebody fixes the focus ring they would fix it in
 * one place and miss eleven.
 */
function Field({
  name,
  label,
  placeholder,
  hint,
  type = 'text',
  required = false,
}: {
  name: string;
  label: string;
  placeholder?: string;
  hint?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-sm font-semibold text-ink">
        {label}
        {!required && <span className="font-normal text-ink-quiet"> (optional)</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-control border-2 border-line px-4 py-3 text-sm outline-none focus:border-ink"
      />
      {hint && <p className="mt-1 text-micro text-ink-quiet">{hint}</p>}
    </div>
  );
}
