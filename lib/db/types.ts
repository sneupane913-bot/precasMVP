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

/**
 * ONE canonical shape for a Nepali mobile number, used everywhere it is
 * compared.
 *
 * `9864835552`, `+9779864835552` and `09864835552` are one number and one
 * person. Comparing them as typed is what let the same phone sit on two
 * accounts while the duplicate check looked straight at them and saw two
 * different strings. Returns null when there is nothing worth comparing, so a
 * missing number never matches another missing number.
 */
export function normaliseWhatsapp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '').replace(/^0+/, '');
  const local = digits.replace(/^977/, '');
  return local.length >= 9 ? local : null;
}
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
  /**
   * N-22. Bachelor or masters. Changes what a good answer looks like, so the
   * evaluator needs it and the super admin wants it for segmentation.
   */
  level?: 'bachelor' | 'masters' | null;
  /** N-22. Which university they are actually applying to. */
  targetUniversity?: string | null;
  /**
   * N-22. Their WhatsApp number, and whether it REALLY has WhatsApp.
   *
   * Asked, never assumed. Half the support plan is a WhatsApp link, and a
   * number that turns out not to be on WhatsApp is a student we cannot reach
   * on the day their payment goes wrong.
   */
  whatsappNumber?: string | null;
  whatsappConfirmed?: boolean | null;
  /**
   * N-23. CITY only, asked at payment, optional, with the reason shown.
   *
   * Not GPS and not silent. A mock interview does not need a student's
   * location, and holding precise location beside transcripts about family
   * income and visa refusals turns a breach into a scandal. City is enough for
   * sales, and it is the most we should ever hold.
   */
  city?: string | null;

  source: StudentSource;
  /** Consultancy slug, or 'marketing'. */
  createdVia: string;

  status: StudentStatus;
  disabledAt: string | null;
  disabledBy: string | null;
  /**
   * WHY it was disabled, in words the student themselves will read.
   *
   * A disabled account used to be a silent dead end: sign in with Google,
   * succeed, and then find every page refusing you with no reason given. The
   * commonest reason by far is a second account on a phone number that already
   * has one, and that student is not a fraudster to be stonewalled — they are
   * one sentence away from understanding they should use their other Gmail.
   */
  disabledReason?: string | null;

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
    | 'refund'
    /**
     * A coupon was redeemed before the free trial was ever sat. The pack is
     * what the student gets, the free try was "try before you buy", and they
     * bought. Recorded as its own line so the ledger says why the trial
     * credit went, rather than silently netting it off.
     */
    | 'trial_superseded'
    /**
     * The credits a verified payment granted, handed back because that payment
     * was voided. Always carries the `orderId` it reverses, so the pair can be
     * read as one event years later.
     */
    | 'payment_voided';
  sessionId: string | null;
  orderId: string | null;
  note: string | null;
  createdAt: string;
}

/**
 * 'voided' is a VERIFIED payment taken back (12 September 2026).
 *
 * Until now an approved payment was final: `rejectPayment` refuses to touch a
 * verified order on purpose, because un-granting credits as a side effect of
 * clicking reject is how a ledger and a money record start disagreeing. That
 * was right, and it left the owner with no way at all to undo a payment
 * recorded against the wrong account — which is exactly what happened when one
 * student held two Google accounts on one phone number and was credited twice.
 *
 * So the undo is its own state and its own deliberate act: the order stops
 * counting as revenue, and the credits it granted are handed back through
 * matching NEGATIVE ledger lines rather than by deleting anything. The ledger
 * stays append-only, so the history still says a pack was granted and then
 * taken back, and why.
 */
export type OrderState = 'created' | 'submitted' | 'verified' | 'rejected' | 'expired' | 'voided';

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
  actorRole: 'super_admin' | 'admin' | 'owner' | 'system' | 'student';
  actorId: string;
  action:
    | 'approve_payment'
    | 'reject_payment'
    | 'correct_amount'
    /** A verified payment taken back out of the books. See voidPayment(). */
    | 'void_payment'
    | 'create_consultancy'
    | 'set_allowlisted_ips'
    | 'approve_consultancy'
    | 'suspend_consultancy'
    | 'approve_admin_student'
    /** A super admin adding credit by hand. Its own act, its own name. */
    | 'grant_credit'
    /**
     * A payment that never went through the checkout (QR sent on WhatsApp,
     * cash in the office), written into the payment system by the super admin
     * so revenue counts it. The pack is granted through the same path an
     * approval uses. 11 September 2026.
     */
    | 'record_payment'
    /**
     * Somebody chose their own passcode. The passcode itself is NEVER written
     * here, only that it changed and who changed it. An audit trail that
     * records secrets is a second copy of the secret.
     */
    | 'change_passcode'
    | 'grant_trial_override'
    | 'decline_trial_override'
    | 'enable_student'
    | 'disable_student'
    | 'owner_platform_off'
    | 'owner_platform_on'
    | 'reward_rule_change'
    /** J3: the student exercised their own right to be deleted. */
    | 'delete_my_data'
    /** N-11. Payment or support details changed by the super admin. */
    | 'set_payment_settings'
    /** N-18. A device soft-blocked or released by the super admin. */
    | 'set_device_block'
    /** N-25. A question added to the live bank. */
    | 'add_question'
    /** Coupons issued to a consultancy, against money already received. */
    | 'issue_coupons'
    /** A student turned a coupon into a pack. */
    | 'redeem_coupon'
    /**
     * The super admin issued a consultancy a fresh handover code because they
     * forgot theirs. The code itself is never written here.
     */
    | 'reset_passcode'
    /**
     * A consultancy removed outright. Only ever one whose coupons were never
     * used and that has no students, which in practice means a test entry or
     * a mistake; anything with real students is suspended, never deleted.
     */
    | 'delete_consultancy';
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
  /**
   * N-1. How many mocks THIS seat carried when it was taken.
   *
   * Stored on the allocation rather than read from the consultancy, because a
   * consultancy can change its seat size between one student and the next, and
   * a student who was given a 10-mock seat must keep 10 even if the next batch
   * is bought at 3. Reading it live would silently rewrite history.
   */
  mocks: number;
  practice: number;
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

/**
 * A COUPON. One coupon, one pack, one student, once.
 *
 * This is how a consultancy buys for its students from 3 September 2026. The
 * consultancy pays us in advance at the wholesale price, the super admin
 * issues that many coupons, the consultancy hands a coupon to a student, and
 * the student enters it on the pricing page to have the pack switched on
 * instantly. No approval queue, no QR for the student, no seat arithmetic.
 *
 * The code is 12 characters from a 32-letter alphabet with no O/0 or I/1, so
 * there are about 10^18 of them: like a recharge card, it cannot be guessed,
 * and the redeem route is rate limited as well. Redemption is a single atomic
 * write (a claim key on blobs, a conditional UPDATE on Postgres), so two
 * students entering the same code in the same second produce exactly one
 * winner.
 *
 * `wholesaleNpr` is copied onto the coupon at issue time. Prices change; what
 * a consultancy paid for THIS coupon must not.
 */
export interface Coupon {
  id: string;
  /** Canonical form: upper case, no separators. Shown grouped in fours. */
  code: string;
  consultancyId: string;
  /** Which pack it switches on. A public plan code, e.g. 'prep' or 'serious'. */
  packCode: string;
  /** What the consultancy paid us for this coupon. */
  wholesaleNpr: number;
  /** Groups the coupons issued in one purchase. */
  batchId: string;
  issuedAt: string;
  issuedBy: string;
  redeemedAt: string | null;
  redeemedByStudentId: string | null;
}
