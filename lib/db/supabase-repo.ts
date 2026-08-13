import type {
  Repo,
  Student,
  TrialClaim,
  LedgerEntry,
  PaymentOrder,
  SeatAllocation,
  ApprovalAudit,
  AdminNotification,
  RewardRule,
  StudentOffer,
} from './index';

/**
 * Postgres-backed repository (J2).
 *
 * Why this replaces the blob store: the blob store did read-modify-write, so
 * two people acting in the same second could silently overwrite each other, and
 * the write that vanished could be a payment. Rows cannot do that.
 *
 * It talks to Supabase over PostgREST with the SERVICE ROLE key, from the
 * server only. Every table has row level security on with no public policy, so
 * the anon key can read nothing; authorisation is decided in our API routes,
 * where the rules already live and are already tested.
 *
 * No client library on purpose. This is plain fetch against the REST endpoint,
 * which keeps the dependency surface at zero and behaves predictably inside a
 * Netlify function.
 *
 * Schema: supabase/schema.sql. Run it once before switching this on.
 */

const URL_BASE = () => (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function supabaseConfigured(): boolean {
  return Boolean(URL_BASE() && KEY());
}

type Row = Record<string, unknown>;

async function rest(
  path: string,
  init: RequestInit & { prefer?: string } = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    apikey: KEY(),
    Authorization: `Bearer ${KEY()}`,
    'Content-Type': 'application/json',
    ...(init.prefer ? { Prefer: init.prefer } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  };
  return fetch(`${URL_BASE()}/rest/v1/${path}`, { ...init, headers, cache: 'no-store' });
}

async function selectRows(path: string): Promise<Row[]> {
  const res = await rest(path);
  if (!res.ok) return [];
  return (await res.json()) as Row[];
}

async function selectOne(path: string): Promise<Row | null> {
  const rows = await selectRows(path);
  return rows[0] ?? null;
}

async function insert(table: string, row: Row): Promise<Row | null> {
  const res = await rest(table, {
    method: 'POST',
    body: JSON.stringify(row),
    prefer: 'return=representation',
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Row[];
  return rows[0] ?? null;
}

async function patch(table: string, filter: string, row: Row): Promise<Row | null> {
  const res = await rest(`${table}?${filter}`, {
    method: 'PATCH',
    body: JSON.stringify(row),
    prefer: 'return=representation',
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Row[];
  return rows[0] ?? null;
}

// ---------------------------------------------------------------- mapping --
// snake_case in Postgres, camelCase in the app. Kept explicit rather than
// clever, because a silent mapping bug here is a lost payment.

const toStudent = (r: Row): Student => ({
  id: r.id as string,
  authProviderId: r.auth_provider_id as string,
  authProvider: r.auth_provider as Student['authProvider'],
  email: (r.email as string) ?? null,
  name: (r.name as string) ?? null,
  phoneE164: (r.phone_e164 as string) ?? null,
  phoneVerifiedAt: (r.phone_verified_at as string) ?? null,
  consultancyId: (r.consultancy_id as string) ?? null,
  attributionConsultancy: (r.attribution_consultancy as string) ?? null,
  source: r.source as Student['source'],
  createdVia: r.created_via as string,
  status: r.status as Student['status'],
  disabledAt: (r.disabled_at as string) ?? null,
  disabledBy: (r.disabled_by as string) ?? null,
  referralCode: r.referral_code as string,
  referredByCode: (r.referred_by_code as string) ?? null,
  consentVersion: (r.consent_version as string) ?? null,
  consentAt: (r.consent_at as string) ?? null,
  createdAt: r.created_at as string,
  lastSeenAt: r.last_seen_at as string,
});

const fromStudent = (s: Partial<Student>): Row => {
  const r: Row = {};
  if (s.id !== undefined) r.id = s.id;
  if (s.authProviderId !== undefined) r.auth_provider_id = s.authProviderId;
  if (s.authProvider !== undefined) r.auth_provider = s.authProvider;
  if (s.email !== undefined) r.email = s.email;
  if (s.name !== undefined) r.name = s.name;
  if (s.phoneE164 !== undefined) r.phone_e164 = s.phoneE164;
  if (s.phoneVerifiedAt !== undefined) r.phone_verified_at = s.phoneVerifiedAt;
  if (s.consultancyId !== undefined) r.consultancy_id = s.consultancyId;
  if (s.attributionConsultancy !== undefined) r.attribution_consultancy = s.attributionConsultancy;
  if (s.source !== undefined) r.source = s.source;
  if (s.createdVia !== undefined) r.created_via = s.createdVia;
  if (s.status !== undefined) r.status = s.status;
  if (s.disabledAt !== undefined) r.disabled_at = s.disabledAt;
  if (s.disabledBy !== undefined) r.disabled_by = s.disabledBy;
  if (s.referralCode !== undefined) r.referral_code = s.referralCode;
  if (s.referredByCode !== undefined) r.referred_by_code = s.referredByCode;
  if (s.consentVersion !== undefined) r.consent_version = s.consentVersion;
  if (s.consentAt !== undefined) r.consent_at = s.consentAt;
  if (s.createdAt !== undefined) r.created_at = s.createdAt;
  if (s.lastSeenAt !== undefined) r.last_seen_at = s.lastSeenAt;
  return r;
};

const toClaim = (r: Row): TrialClaim => ({
  id: r.id as string,
  studentId: r.student_id as string,
  authProviderId: r.auth_provider_id as string,
  fingerprintHash: (r.fingerprint_hash as string) ?? null,
  ip: (r.ip as string) ?? null,
  outcome: r.outcome as TrialClaim['outcome'],
  riskScore: (r.risk_score as number) ?? 0,
  riskReasons: (r.risk_reasons as string[]) ?? [],
  claimedAt: r.claimed_at as string,
  overriddenBy: (r.overridden_by as string) ?? null,
  overriddenAt: (r.overridden_at as string) ?? null,
});

const toLedger = (r: Row): LedgerEntry => ({
  id: r.id as string,
  studentId: r.student_id as string,
  kind: r.kind as LedgerEntry['kind'],
  delta: r.delta as number,
  reason: r.reason as LedgerEntry['reason'],
  sessionId: (r.session_id as string) ?? null,
  orderId: (r.order_id as string) ?? null,
  note: (r.note as string) ?? null,
  createdAt: r.created_at as string,
});

const toOrder = (r: Row): PaymentOrder => ({
  id: r.id as string,
  studentId: r.student_id as string,
  consultancyId: (r.consultancy_id as string) ?? null,
  packCode: r.pack_code as string,
  amountNpr: r.amount_npr as number,
  walletTxnId: (r.wallet_txn_id as string) ?? null,
  payerName: (r.payer_name as string) ?? null,
  payerPhoneSuffix: (r.payer_phone_suffix as string) ?? null,
  screenshotUrl: (r.screenshot_url as string) ?? null,
  state: r.state as PaymentOrder['state'],
  verifiedBy: (r.verified_by as string) ?? null,
  verifiedAt: (r.verified_at as string) ?? null,
  allocatedAt: (r.allocated_at as string) ?? null,
  rejectedReason: (r.rejected_reason as string) ?? null,
  createdAt: r.created_at as string,
  expiresAt: (r.expires_at as string) ?? null,
});

const fromOrder = (o: Partial<PaymentOrder>): Row => {
  const r: Row = {};
  if (o.id !== undefined) r.id = o.id;
  if (o.studentId !== undefined) r.student_id = o.studentId;
  if (o.consultancyId !== undefined) r.consultancy_id = o.consultancyId;
  if (o.packCode !== undefined) r.pack_code = o.packCode;
  if (o.amountNpr !== undefined) r.amount_npr = o.amountNpr;
  if (o.walletTxnId !== undefined) r.wallet_txn_id = o.walletTxnId;
  if (o.payerName !== undefined) r.payer_name = o.payerName;
  if (o.payerPhoneSuffix !== undefined) r.payer_phone_suffix = o.payerPhoneSuffix;
  if (o.screenshotUrl !== undefined) r.screenshot_url = o.screenshotUrl;
  if (o.state !== undefined) r.state = o.state;
  if (o.verifiedBy !== undefined) r.verified_by = o.verifiedBy;
  if (o.verifiedAt !== undefined) r.verified_at = o.verifiedAt;
  if (o.allocatedAt !== undefined) r.allocated_at = o.allocatedAt;
  if (o.rejectedReason !== undefined) r.rejected_reason = o.rejectedReason;
  if (o.createdAt !== undefined) r.created_at = o.createdAt;
  if (o.expiresAt !== undefined) r.expires_at = o.expiresAt;
  return r;
};

const toRule = (r: Row): RewardRule => ({
  id: r.id as string,
  code: r.code as string,
  kind: r.kind as RewardRule['kind'],
  name: r.name as string,
  publicReason: r.public_reason as string,
  active: Boolean(r.active),
  bonusMocksByPack: (r.bonus_mocks_by_pack as Record<string, number>) ?? {},
  endsAt: (r.ends_at as string) ?? null,
  windowMinutes: (r.window_minutes as number) ?? null,
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
  updatedBy: (r.updated_by as string) ?? null,
});

const toOffer = (r: Row): StudentOffer => ({
  id: r.id as string,
  studentId: r.student_id as string,
  ruleId: r.rule_id as string,
  startedAt: r.started_at as string,
  endsAt: r.ends_at as string,
  consumedAt: (r.consumed_at as string) ?? null,
});

// ------------------------------------------------------------------- repo --

export class SupabaseRepo implements Repo {
  readonly name = 'supabase' as const;

  // students
  async createStudent(s: Student): Promise<Student> {
    const row = await insert('students', fromStudent(s));
    return row ? toStudent(row) : s;
  }
  async getStudent(id: string) {
    const r = await selectOne(`students?id=eq.${id}&limit=1`);
    return r ? toStudent(r) : null;
  }
  async getStudentByAuthId(authProviderId: string) {
    const r = await selectOne(
      `students?auth_provider_id=eq.${encodeURIComponent(authProviderId)}&limit=1`
    );
    return r ? toStudent(r) : null;
  }
  async getStudentByReferralCode(code: string) {
    const r = await selectOne(`students?referral_code=eq.${encodeURIComponent(code)}&limit=1`);
    return r ? toStudent(r) : null;
  }
  async updateStudent(id: string, p: Partial<Student>) {
    const r = await patch('students', `id=eq.${id}`, fromStudent(p));
    return r ? toStudent(r) : null;
  }
  async listStudents(filter?: { consultancyId?: string | null }) {
    let q = 'students?select=*&order=created_at.desc';
    if (filter?.consultancyId === null) q += '&consultancy_id=is.null';
    else if (filter?.consultancyId)
      q += `&consultancy_id=eq.${encodeURIComponent(filter.consultancyId)}`;
    return (await selectRows(q)).map(toStudent);
  }

  // trial
  async createTrialClaim(c: TrialClaim): Promise<TrialClaim> {
    const row = await insert('trial_claims', {
      id: c.id,
      student_id: c.studentId,
      auth_provider_id: c.authProviderId,
      fingerprint_hash: c.fingerprintHash,
      ip: c.ip,
      outcome: c.outcome,
      risk_score: c.riskScore,
      risk_reasons: c.riskReasons,
      claimed_at: c.claimedAt,
      overridden_by: c.overriddenBy,
      overridden_at: c.overriddenAt,
    });
    return row ? toClaim(row) : c;
  }
  async getTrialClaimByAuthId(authProviderId: string) {
    const r = await selectOne(
      `trial_claims?auth_provider_id=eq.${encodeURIComponent(authProviderId)}&limit=1`
    );
    return r ? toClaim(r) : null;
  }
  async updateTrialClaim(id: string, p: Partial<TrialClaim>) {
    const row: Row = {};
    if (p.outcome !== undefined) row.outcome = p.outcome;
    if (p.overriddenBy !== undefined) row.overridden_by = p.overriddenBy;
    if (p.overriddenAt !== undefined) row.overridden_at = p.overriddenAt;
    const r = await patch('trial_claims', `id=eq.${id}`, row);
    return r ? toClaim(r) : null;
  }
  async listTrialClaims(filter?: { outcome?: TrialClaim['outcome'] }) {
    let q = 'trial_claims?select=*&order=claimed_at.desc';
    if (filter?.outcome) q += `&outcome=eq.${filter.outcome}`;
    return (await selectRows(q)).map(toClaim);
  }
  async countClaimsByFingerprint(hash: string, sinceIso: string) {
    const rows = await selectRows(
      `trial_claims?select=auth_provider_id&fingerprint_hash=eq.${encodeURIComponent(
        hash
      )}&claimed_at=gte.${encodeURIComponent(sinceIso)}`
    );
    return new Set(rows.map((r) => r.auth_provider_id as string)).size;
  }

  // ledger
  async appendLedger(e: LedgerEntry): Promise<LedgerEntry> {
    const row = await insert('ledger', {
      id: e.id,
      student_id: e.studentId,
      kind: e.kind,
      delta: e.delta,
      reason: e.reason,
      session_id: e.sessionId,
      order_id: e.orderId,
      note: e.note,
      created_at: e.createdAt,
    });
    return row ? toLedger(row) : e;
  }
  async listLedger(studentId: string) {
    return (
      await selectRows(`ledger?student_id=eq.${studentId}&select=*&order=created_at.asc`)
    ).map(toLedger);
  }
  async balance(studentId: string, kind: LedgerEntry['kind']) {
    const rows = await selectRows(
      `ledger?student_id=eq.${studentId}&kind=eq.${kind}&select=delta`
    );
    return rows.reduce((sum, r) => sum + ((r.delta as number) ?? 0), 0);
  }

  // orders
  async createOrder(o: PaymentOrder): Promise<PaymentOrder> {
    const row = await insert('payment_orders', fromOrder(o));
    return row ? toOrder(row) : o;
  }
  async getOrder(id: string) {
    const r = await selectOne(`payment_orders?id=eq.${id}&limit=1`);
    return r ? toOrder(r) : null;
  }
  async updateOrder(id: string, p: Partial<PaymentOrder>) {
    const r = await patch('payment_orders', `id=eq.${id}`, fromOrder(p));
    return r ? toOrder(r) : null;
  }
  async listOrders(filter?: { state?: PaymentOrder['state']; consultancyId?: string }) {
    let q = 'payment_orders?select=*&order=created_at.desc';
    if (filter?.state) q += `&state=eq.${filter.state}`;
    if (filter?.consultancyId)
      q += `&consultancy_id=eq.${encodeURIComponent(filter.consultancyId)}`;
    return (await selectRows(q)).map(toOrder);
  }

  /**
   * THE control against a reused screenshot. wallet_txn_id carries a UNIQUE
   * constraint, so the second writer is rejected by Postgres itself rather than
   * by a check that two racing requests could both pass.
   */
  async claimWalletTxnId(walletTxnId: string, orderId: string): Promise<boolean> {
    const res = await rest(`payment_orders?id=eq.${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ wallet_txn_id: walletTxnId }),
      prefer: 'return=representation',
    });
    if (!res.ok) return false; // 409 from the unique index means already claimed
    const rows = (await res.json()) as Row[];
    return rows.length > 0;
  }

  // seats
  async allocateSeat(a: SeatAllocation, seatsTotal: number) {
    const existing = await selectRows(
      `seat_allocations?consultancy_id=eq.${encodeURIComponent(a.consultancyId)}&select=id`
    );
    if (existing.length >= seatsTotal) return { ok: false, seatsUsed: existing.length };

    const row = await insert('seat_allocations', {
      id: a.id,
      consultancy_id: a.consultancyId,
      student_id: a.studentId,
      allocated_by: a.allocatedBy,
      allocated_at: a.allocatedAt,
      revoked_at: a.revokedAt,
    });
    // The unique (consultancy_id, student_id) index makes a double allocation
    // to the same student impossible, so a null here is that, not an error.
    const used = await selectRows(
      `seat_allocations?consultancy_id=eq.${encodeURIComponent(a.consultancyId)}&select=id`
    );
    return { ok: Boolean(row), seatsUsed: used.length };
  }
  async listSeats(consultancyId: string): Promise<SeatAllocation[]> {
    const rows = await selectRows(
      `seat_allocations?consultancy_id=eq.${encodeURIComponent(consultancyId)}&select=*`
    );
    return rows.map((r) => ({
      id: r.id as string,
      consultancyId: r.consultancy_id as string,
      studentId: r.student_id as string,
      allocatedBy: (r.allocated_by as string) ?? '',
      allocatedAt: r.allocated_at as string,
      revokedAt: (r.revoked_at as string) ?? null,
    }));
  }

  // audit and notifications
  async appendAudit(a: ApprovalAudit): Promise<void> {
    await insert('approvals_audit', {
      id: a.id,
      actor_role: a.actorRole,
      actor_id: a.actorId,
      action: a.action,
      subject_id: a.subjectId,
      before_state: a.before,
      after_state: a.after,
      note: a.note,
      created_at: a.createdAt,
    });
  }
  async listAudit(limit = 200): Promise<ApprovalAudit[]> {
    const rows = await selectRows(
      `approvals_audit?select=*&order=created_at.desc&limit=${limit}`
    );
    return rows.map((r) => ({
      id: r.id as string,
      actorRole: r.actor_role as ApprovalAudit['actorRole'],
      actorId: r.actor_id as string,
      action: r.action as ApprovalAudit['action'],
      subjectId: r.subject_id as string,
      before: (r.before_state as string) ?? null,
      after: (r.after_state as string) ?? null,
      note: (r.note as string) ?? null,
      createdAt: r.created_at as string,
    }));
  }
  async addNotification(n: AdminNotification): Promise<void> {
    await insert('admin_notifications', {
      id: n.id,
      consultancy_id: n.consultancyId,
      message: n.message,
      created_at: n.createdAt,
      read_at: n.readAt,
    });
  }
  async listNotifications(consultancyId: string): Promise<AdminNotification[]> {
    const rows = await selectRows(
      `admin_notifications?consultancy_id=eq.${encodeURIComponent(
        consultancyId
      )}&select=*&order=created_at.desc&limit=50`
    );
    return rows.map((r) => ({
      id: r.id as string,
      consultancyId: r.consultancy_id as string,
      message: r.message as string,
      createdAt: r.created_at as string,
      readAt: (r.read_at as string) ?? null,
    }));
  }

  // rewards
  async listRewardRules(): Promise<RewardRule[]> {
    return (await selectRows('reward_rules?select=*')).map(toRule);
  }
  async upsertRewardRule(r: RewardRule): Promise<RewardRule> {
    const res = await rest('reward_rules', {
      method: 'POST',
      body: JSON.stringify({
        id: r.id,
        code: r.code,
        kind: r.kind,
        name: r.name,
        public_reason: r.publicReason,
        active: r.active,
        bonus_mocks_by_pack: r.bonusMocksByPack,
        ends_at: r.endsAt,
        window_minutes: r.windowMinutes,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        updated_by: r.updatedBy,
      }),
      prefer: 'resolution=merge-duplicates,return=representation',
    });
    if (!res.ok) return r;
    const rows = (await res.json()) as Row[];
    return rows[0] ? toRule(rows[0]) : r;
  }
  async createOffer(o: StudentOffer): Promise<StudentOffer> {
    const row = await insert('student_offers', {
      id: o.id,
      student_id: o.studentId,
      rule_id: o.ruleId,
      started_at: o.startedAt,
      ends_at: o.endsAt,
      consumed_at: o.consumedAt,
    });
    return row ? toOffer(row) : o;
  }
  async listOffers(studentId: string): Promise<StudentOffer[]> {
    return (
      await selectRows(`student_offers?student_id=eq.${studentId}&select=*&order=started_at.desc`)
    ).map(toOffer);
  }
  async updateOffer(id: string, p: Partial<StudentOffer>) {
    const row: Row = {};
    if (p.consumedAt !== undefined) row.consumed_at = p.consumedAt;
    if (p.endsAt !== undefined) row.ends_at = p.endsAt;
    const r = await patch('student_offers', `id=eq.${id}`, row);
    return r ? toOffer(r) : null;
  }
}
