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
 * Repository over the money-and-identity records.
 *
 * Two implementations:
 *
 *  - `BlobRepo`     Netlify Blobs, ONE KEY PER RECORD, plus explicit index
 *                   keys. Replaces the single shared JSON document that QA
 *                   proved loses writes. Uniqueness and counters use a
 *                   claim-key pattern (write-if-absent) rather than
 *                   read-modify-write, so races resolve to one winner.
 *
 *  - `SupabaseRepo` Postgres. Activates automatically when the credentials
 *                   exist. This is the decided destination: only a database
 *                   gives real transactions, and seat allocation and credit
 *                   debit genuinely need them.
 *
 * HONEST LIMITATION, stated because QA will test it: per-key blob storage
 * removes the *cross-entity* lost update, which was the severe bug. It does
 * NOT give multi-row transactions. Seat allocation under blobs uses a claim
 * key so it cannot oversell, but a crash mid-sequence can strand a claim.
 * Postgres removes that residue. Do not treat blobs as the end state.
 */
export interface Repo {
  readonly name: 'blob' | 'supabase';

  // students
  createStudent(s: Student): Promise<Student>;
  getStudent(id: string): Promise<Student | null>;
  getStudentByAuthId(authProviderId: string): Promise<Student | null>;
  getStudentByReferralCode(code: string): Promise<Student | null>;
  updateStudent(id: string, patch: Partial<Student>): Promise<Student | null>;
  listStudents(filter?: { consultancyId?: string | null }): Promise<Student[]>;

  // trial
  createTrialClaim(c: TrialClaim): Promise<TrialClaim>;
  getTrialClaimByAuthId(authProviderId: string): Promise<TrialClaim | null>;
  updateTrialClaim(id: string, patch: Partial<TrialClaim>): Promise<TrialClaim | null>;
  listTrialClaims(filter?: { outcome?: TrialClaim['outcome'] }): Promise<TrialClaim[]>;
  /** Distinct accounts that claimed on this device inside the window. */
  countClaimsByFingerprint(hash: string, sinceIso: string): Promise<number>;

  // ledger, append only
  appendLedger(e: LedgerEntry): Promise<LedgerEntry>;
  listLedger(studentId: string): Promise<LedgerEntry[]>;
  balance(studentId: string, kind: LedgerEntry['kind']): Promise<number>;

  // orders
  createOrder(o: PaymentOrder): Promise<PaymentOrder>;
  getOrder(id: string): Promise<PaymentOrder | null>;
  updateOrder(id: string, patch: Partial<PaymentOrder>): Promise<PaymentOrder | null>;
  listOrders(filter?: { state?: PaymentOrder['state']; consultancyId?: string }): Promise<PaymentOrder[]>;
  /**
   * Atomically reserve a wallet transaction id. Returns false when it is
   * already claimed. This is THE control against a screenshot being reused.
   */
  claimWalletTxnId(walletTxnId: string, orderId: string): Promise<boolean>;

  // seats
  allocateSeat(a: SeatAllocation, seatsTotal: number): Promise<{ ok: boolean; seatsUsed: number }>;
  listSeats(consultancyId: string): Promise<SeatAllocation[]>;

  // audit and notifications
  appendAudit(a: ApprovalAudit): Promise<void>;
  listAudit(limit?: number): Promise<ApprovalAudit[]>;
  addNotification(n: AdminNotification): Promise<void>;
  listNotifications(consultancyId: string): Promise<AdminNotification[]>;

  // rewards
  listRewardRules(): Promise<RewardRule[]>;
  upsertRewardRule(r: RewardRule): Promise<RewardRule>;
  createOffer(o: StudentOffer): Promise<StudentOffer>;
  listOffers(studentId: string): Promise<StudentOffer[]>;
  updateOffer(id: string, patch: Partial<StudentOffer>): Promise<StudentOffer | null>;
}

import { BlobRepo } from './blob-repo';
import { SupabaseRepo, supabaseConfigured } from './supabase-repo';

let cached: Repo | null = null;

export function repo(): Repo {
  if (cached) return cached;
  // J2. Postgres the moment it is configured, because rows cannot overwrite
  // each other and a single JSON document can. Falls back to the per-key blob
  // repo so local development and any environment without credentials still
  // runs, rather than failing closed on a database that is not there yet.
  //
  // Switching is one environment variable, and switching back is removing it.
  cached = supabaseConfigured() ? new SupabaseRepo() : new BlobRepo();
  return cached;
}

/** Surfaced in the super admin so it is obvious which store is live. */
export function repoName(): Repo['name'] {
  return repo().name;
}

export function repoIsTransactional(): boolean {
  return repo().name === 'supabase';
}

export * from './types';
