/**
 * The money-and-identity data model.
 *
 * Every entity here is stored as its OWN record, never inside a shared JSON
 * document. QA demonstrated that the previous single-blob store silently loses
 * writes under concurrency, and these are the records where a lost write means
 * a lost payment or an oversold seat.
 *
 * Field names match `supabase/schema.sql` so the Postgres swap is mechanical.
 */

export type StudentStatus = 'active' | 'disabled';
export type StudentSource = 'direct' | 'consultancy';

export interface Student {
  id: string;
  /** Identity from the auth provider. Google `sub` in production. */
  authProviderId: string;
  authProvider: 'google' | 'dev';
  email: string | null;
  name: string | null;

  /** Verified at PAYMENT, not at trial. Null until then. */
  phoneE164: string | null;
  phoneVerifiedAt: string | null;

  /** The consultancy that owns this student via an admin link. Binding. */
  consultancyId: string | null;
  /**
   * Free text the student typed: which consultancy they are applying through.
   * This is the lead-generation field and is NOT a binding relationship.
   * Never use it for access control.
   */
  attributionConsultancy: string | null;

  source: StudentSource;
  /** Consultancy slug, or 'marketing'. */
  createdVia: string;

  status: StudentStatus;
  disabledAt: string | null;
  disabledBy: string | null;

  /** Their own code, which they give to friends. */
  referralCode: string;
  /** The code they arrived with, if any. */
  referredByCode: string | null;

  consentVersion: string | null;
  consentAt: string | null;

  createdAt: string;
  lastSeenAt: string;
}

/** One row per claimed trial. The gate is the auth account, not the device. */
export interface TrialClaim {
  id: string;
  studentId: string;
  authProviderId: string;
  fingerprintHash: string | null;
  ip: string | null;
  /** 'granted' normally, 'soft_denied' when composite risk was high. */
  outcome: 'granted' | 'soft_denied';
  riskScore: number;
  riskReasons: string[];
  claimedAt: string;
  /** Set when a super admin overrides a soft deny. */
  overriddenBy: string | null;
  overriddenAt: string | null;
}

/**
 * Append-only. Balance is SUM(delta), never a stored mutable number.
 * A mutable balance column is exactly the field that drifts under concurrency.
 */
export interface LedgerEntry {
  id: string;
  studentId: string;
  /** 'mock' or 'practice'. Two separate currencies. */
  kind: 'mock' | 'practice';
  delta: number;
  reason:
    | 'trial_grant'
    | 'pack_purchase'
    | 'referral_reward'
    | 'post_trial_bonus'
    | 'campaign_bonus'
    | 'session_consumed'
    | 'super_admin_grant'
    | 'seat_allocation'
    | 'refund';
  sessionId: string | null;
  orderId: string | null;
  note: string | null;
  createdAt: string;
}

export type OrderState = 'created' | 'submitted' | 'verified' | 'rejected' | 'expired';

export interface PaymentOrder {
  id: string;
  studentId: string;
  consultancyId: string | null;
  packCode: string;
  /** Set by the SERVER from the plan table. The client never sends a price. */
  amountNpr: number;

  /** The anti-double-claim control. Unique across all orders. */
  walletTxnId: string | null;
  payerName: string | null;
  payerPhoneSuffix: string | null;
  screenshotUrl: string | null;

  state: OrderState;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectedReason: string | null;

  /** Credits actually granted, so re-verifying cannot double-allocate. */
  allocatedAt: string | null;

  createdAt: string;
  expiresAt: string;
}

export interface ApprovalAudit {
  id: string;
  actorRole: 'super_admin' | 'admin' | 'owner' | 'system';
  actorId: string;
  action:
    | 'approve_payment'
    | 'reject_payment'
    | 'approve_consultancy'
    | 'suspend_consultancy'
    | 'approve_admin_student'
    | 'grant_trial_override'
    | 'decline_trial_override'
    | 'enable_student'
    | 'disable_student'
    | 'owner_platform_off'
    | 'owner_platform_on'
    | 'reward_rule_change';
  subjectId: string;
  before: string | null;
  after: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminNotification {
  id: string;
  consultancyId: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

/** Explicit rows so seats used is exact and cannot drift. */
export interface SeatAllocation {
  id: string;
  consultancyId: string;
  studentId: string;
  allocatedBy: string;
  allocatedAt: string;
  revokedAt: string | null;
}

/**
 * A reward rule the super admin controls. Countdowns are honest: `endsAt` is a
 * real server timestamp tied to a named reason, never regenerated per visit.
 */
export interface RewardRule {
  id: string;
  code: string;
  kind: 'post_trial_window' | 'campaign' | 'referral';
  name: string;
  /** Shown to students. Must name a real reason for a real deadline. */
  publicReason: string;
  active: boolean;
  bonusMocksByPack: Record<string, number>;
  /** Campaign only. A fixed instant, set once. */
  endsAt: string | null;
  /** Post-trial window only, in minutes from finishing question 10. */
  windowMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
}

/** A per-student offer instance, so the deadline is real and personal. */
export interface StudentOffer {
  id: string;
  studentId: string;
  ruleId: string;
  startedAt: string;
  /** A real instant. Once past, the offer is gone and is never silently reissued. */
  endsAt: string;
  consumedAt: string | null;
}
