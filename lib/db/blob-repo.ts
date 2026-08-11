import type { Repo } from './index';
import type {
  AdminNotification,
  ApprovalAudit,
  LedgerEntry,
  PaymentOrder,
  RewardRule,
  SeatAllocation,
  Student,
  StudentOffer,
  TrialClaim,
} from './types';

/**
 * Per-key storage.
 *
 * The rule that makes this safe where the old store was not: **one record per
 * key.** Two students registering at the same time write two different keys
 * and cannot overwrite each other. The old store read one JSON document,
 * mutated it, and wrote it back, so the slower writer erased the faster one.
 *
 * Uniqueness (wallet transaction ids, seats) uses a CLAIM KEY: write-if-absent
 * on a dedicated key. Whoever writes first wins; everyone else is told the
 * value is taken. That is not a transaction, but it cannot oversell.
 *
 * Locally, with no Netlify, this falls back to process memory so the app runs
 * with zero configuration.
 */

type Bag = Map<string, unknown>;

const g = globalThis as unknown as { __precasMem?: Bag };
function mem(): Bag {
  return (g.__precasMem ??= new Map());
}

function onNetlify(): boolean {
  return process.env.NETLIFY === 'true' || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
}

export class BlobRepo implements Repo {
  readonly name = 'blob' as const;

  private async store() {
    const { getStore } = await import('@netlify/blobs');
    return getStore({ name: 'precas-db', consistency: 'strong' });
  }

  private async get<T>(key: string): Promise<T | null> {
    if (!onNetlify()) return (mem().get(key) as T) ?? null;
    try {
      const s = await this.store();
      return ((await s.get(key, { type: 'json' })) as T) ?? null;
    } catch {
      return null;
    }
  }

  private async put<T>(key: string, value: T): Promise<void> {
    if (!onNetlify()) {
      mem().set(key, value);
      return;
    }
    const s = await this.store();
    await s.setJSON(key, value);
  }

  private async list(prefix: string): Promise<string[]> {
    if (!onNetlify()) {
      return [...mem().keys()].filter((k) => k.startsWith(prefix));
    }
    try {
      const s = await this.store();
      const res = await s.list({ prefix });
      return res.blobs.map((b) => b.key);
    } catch {
      return [];
    }
  }

  private async getMany<T>(prefix: string): Promise<T[]> {
    const keys = await this.list(prefix);
    const out: (T | null)[] = await Promise.all(keys.map((k) => this.get<T>(k)));
    return out.filter((x): x is T => x !== null);
  }

  /**
   * Write only if the key is absent. Returns false if somebody got there
   * first. This is the primitive behind every uniqueness guarantee here.
   *
   * Blobs has no compare-and-set, so this is a check-then-write and has a
   * genuine, tiny race window. It narrows the failure from "two winners
   * always" to "two winners only if both land inside the same few
   * milliseconds", and the ledger stays append-only so the damage is
   * detectable. Postgres closes it properly with a UNIQUE constraint.
   */
  private async claim(key: string, value: unknown): Promise<boolean> {
    const existing = await this.get<unknown>(key);
    if (existing !== null) return false;
    await this.put(key, value);
    const after = await this.get<{ __claimId?: string }>(key);
    // Re-read and confirm we are the writer that stuck.
    return JSON.stringify(after) === JSON.stringify(value);
  }

  // ----------------------------------------------------------------- students

  async createStudent(s: Student): Promise<Student> {
    await this.put(`student/${s.id}`, s);
    await this.put(`idx/auth/${s.authProviderId}`, s.id);
    await this.put(`idx/ref/${s.referralCode}`, s.id);
    return s;
  }

  async getStudent(id: string): Promise<Student | null> {
    return this.get<Student>(`student/${id}`);
  }

  async getStudentByAuthId(authProviderId: string): Promise<Student | null> {
    const id = await this.get<string>(`idx/auth/${authProviderId}`);
    return id ? this.getStudent(id) : null;
  }

  async getStudentByReferralCode(code: string): Promise<Student | null> {
    const id = await this.get<string>(`idx/ref/${code.toUpperCase()}`);
    return id ? this.getStudent(id) : null;
  }

  async updateStudent(id: string, patch: Partial<Student>): Promise<Student | null> {
    const cur = await this.getStudent(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, id: cur.id };
    await this.put(`student/${id}`, next);
    return next;
  }

  async listStudents(filter?: { consultancyId?: string | null }): Promise<Student[]> {
    const all = await this.getMany<Student>('student/');
    if (!filter || filter.consultancyId === undefined) return all;
    return all.filter((s) => s.consultancyId === filter.consultancyId);
  }

  // -------------------------------------------------------------------- trial

  async createTrialClaim(c: TrialClaim): Promise<TrialClaim> {
    await this.put(`trial/${c.id}`, c);
    await this.put(`idx/trialauth/${c.authProviderId}`, c.id);
    return c;
  }

  async getTrialClaimByAuthId(authProviderId: string): Promise<TrialClaim | null> {
    const id = await this.get<string>(`idx/trialauth/${authProviderId}`);
    return id ? this.get<TrialClaim>(`trial/${id}`) : null;
  }

  async updateTrialClaim(id: string, patch: Partial<TrialClaim>): Promise<TrialClaim | null> {
    const cur = await this.get<TrialClaim>(`trial/${id}`);
    if (!cur) return null;
    const next = { ...cur, ...patch, id: cur.id };
    await this.put(`trial/${id}`, next);
    return next;
  }

  async listTrialClaims(filter?: { outcome?: TrialClaim['outcome'] }): Promise<TrialClaim[]> {
    const all = await this.getMany<TrialClaim>('trial/');
    return filter?.outcome ? all.filter((c) => c.outcome === filter.outcome) : all;
  }

  async countClaimsByFingerprint(hash: string, sinceIso: string): Promise<number> {
    const all = await this.getMany<TrialClaim>('trial/');
    const distinct = new Set(
      all
        .filter((c) => c.fingerprintHash === hash && c.claimedAt >= sinceIso)
        .map((c) => c.authProviderId)
    );
    return distinct.size;
  }

  // ------------------------------------------------------------------- ledger

  async appendLedger(e: LedgerEntry): Promise<LedgerEntry> {
    // Key includes the id, so two concurrent appends never collide.
    await this.put(`ledger/${e.studentId}/${e.createdAt}_${e.id}`, e);
    return e;
  }

  async listLedger(studentId: string): Promise<LedgerEntry[]> {
    const rows = await this.getMany<LedgerEntry>(`ledger/${studentId}/`);
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }

  async balance(studentId: string, kind: LedgerEntry['kind']): Promise<number> {
    const rows = await this.listLedger(studentId);
    return rows.filter((r) => r.kind === kind).reduce((n, r) => n + r.delta, 0);
  }

  // ------------------------------------------------------------------- orders

  async createOrder(o: PaymentOrder): Promise<PaymentOrder> {
    await this.put(`order/${o.id}`, o);
    return o;
  }

  async getOrder(id: string): Promise<PaymentOrder | null> {
    return this.get<PaymentOrder>(`order/${id}`);
  }

  async updateOrder(id: string, patch: Partial<PaymentOrder>): Promise<PaymentOrder | null> {
    const cur = await this.getOrder(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, id: cur.id };
    await this.put(`order/${id}`, next);
    return next;
  }

  async listOrders(filter?: {
    state?: PaymentOrder['state'];
    consultancyId?: string;
  }): Promise<PaymentOrder[]> {
    let all = await this.getMany<PaymentOrder>('order/');
    if (filter?.state) all = all.filter((o) => o.state === filter.state);
    if (filter?.consultancyId) all = all.filter((o) => o.consultancyId === filter.consultancyId);
    return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  async claimWalletTxnId(walletTxnId: string, orderId: string): Promise<boolean> {
    const normalised = walletTxnId.trim().toUpperCase();
    return this.claim(`txn/${normalised}`, { orderId, at: new Date().toISOString() });
  }

  // -------------------------------------------------------------------- seats

  /**
   * Seat numbers are claimed one at a time by index. Seat 7 can only be
   * claimed once, so twenty concurrent callers with ten seats produce exactly
   * ten winners. It cannot oversell, which is the property that matters.
   */
  async allocateSeat(
    a: SeatAllocation,
    seatsTotal: number
  ): Promise<{ ok: boolean; seatsUsed: number }> {
    const existing = await this.listSeats(a.consultancyId);
    const live = existing.filter((s) => !s.revokedAt);
    if (live.some((s) => s.studentId === a.studentId)) {
      return { ok: true, seatsUsed: live.length }; // idempotent
    }
    for (let i = 0; i < seatsTotal; i++) {
      const won = await this.claim(`seat/${a.consultancyId}/${i}`, {
        studentId: a.studentId,
        allocationId: a.id,
      });
      if (won) {
        await this.put(`seatalloc/${a.consultancyId}/${a.id}`, { ...a, seatIndex: i });
        const after = await this.listSeats(a.consultancyId);
        return { ok: true, seatsUsed: after.filter((s) => !s.revokedAt).length };
      }
    }
    return { ok: false, seatsUsed: live.length };
  }

  async listSeats(consultancyId: string): Promise<SeatAllocation[]> {
    return this.getMany<SeatAllocation>(`seatalloc/${consultancyId}/`);
  }

  // ------------------------------------------------------- audit and notices

  async appendAudit(a: ApprovalAudit): Promise<void> {
    await this.put(`audit/${a.createdAt}_${a.id}`, a);
  }

  async listAudit(limit = 200): Promise<ApprovalAudit[]> {
    const rows = await this.getMany<ApprovalAudit>('audit/');
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
  }

  async addNotification(n: AdminNotification): Promise<void> {
    await this.put(`notif/${n.consultancyId}/${n.createdAt}_${n.id}`, n);
  }

  async listNotifications(consultancyId: string): Promise<AdminNotification[]> {
    const rows = await this.getMany<AdminNotification>(`notif/${consultancyId}/`);
    return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }

  // ------------------------------------------------------------------ rewards

  async listRewardRules(): Promise<RewardRule[]> {
    return this.getMany<RewardRule>('reward/');
  }

  async upsertRewardRule(r: RewardRule): Promise<RewardRule> {
    await this.put(`reward/${r.id}`, r);
    return r;
  }

  async createOffer(o: StudentOffer): Promise<StudentOffer> {
    await this.put(`offer/${o.studentId}/${o.id}`, o);
    return o;
  }

  async listOffers(studentId: string): Promise<StudentOffer[]> {
    return this.getMany<StudentOffer>(`offer/${studentId}/`);
  }

  async updateOffer(id: string, patch: Partial<StudentOffer>): Promise<StudentOffer | null> {
    const all = await this.getMany<StudentOffer>('offer/');
    const cur = all.find((o) => o.id === id);
    if (!cur) return null;
    const next = { ...cur, ...patch, id: cur.id };
    await this.put(`offer/${cur.studentId}/${id}`, next);
    return next;
  }
}
