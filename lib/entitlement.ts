import { repo, type LedgerEntry, type Student } from '@/lib/db';
import { getPlan, TRIAL_QUESTION_COUNT, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';

/**
 * Entitlement: what a student is allowed to do right now.
 *
 * Every number here is computed on the SERVER from the ledger. The browser
 * never sends a plan, a price, a credit count or a question limit. That is the
 * LIVE-003 pattern, extended from session creation to the whole life cycle.
 */

export interface Entitlement {
  mocksLeft: number;
  practiceLeft: number;
  /** Questions allowed in the sitting they are about to start. */
  questionsAllowed: number;
  hasPaid: boolean;
  canStartMock: boolean;
  canStartPractice: boolean;
  reason: string | null;
}

export async function entitlementFor(student: Student): Promise<Entitlement> {
  const r = repo();
  const [mocksLeft, practiceLeft, ledger] = await Promise.all([
    r.balance(student.id, 'mock'),
    r.balance(student.id, 'practice'),
    r.listLedger(student.id),
  ]);

  const hasPaid = ledger.some((e) => e.reason === 'pack_purchase' || e.reason === 'seat_allocation');

  // The locked rule: the trial is the first 10 questions of the SAME
  // 17-question sitting. Paying unlocks the remaining 7 of that sitting and
  // grants a package of full 17-question mocks.
  const questionsAllowed = hasPaid ? FULL_MOCK_QUESTION_COUNT : TRIAL_QUESTION_COUNT;

  return {
    mocksLeft,
    practiceLeft,
    questionsAllowed,
    hasPaid,
    canStartMock: mocksLeft > 0,
    canStartPractice: practiceLeft > 0,
    reason:
      mocksLeft > 0
        ? null
        : hasPaid
          ? 'You have used all the mock interviews in your pack.'
          : 'You have used your free questions. Buy a pack to keep going.',
  };
}

function entry(
  studentId: string,
  kind: LedgerEntry['kind'],
  delta: number,
  reason: LedgerEntry['reason'],
  extra: Partial<LedgerEntry> = {}
): LedgerEntry {
  return {
    id: crypto.randomUUID(),
    studentId,
    kind,
    delta,
    reason,
    sessionId: null,
    orderId: null,
    note: null,
    createdAt: new Date().toISOString(),
    ...extra,
  };
}

/** The free trial: one mock credit, capped at 10 questions by entitlementFor. */
export async function grantTrial(studentId: string): Promise<void> {
  await repo().appendLedger(entry(studentId, 'mock', 1, 'trial_grant'));
}

/**
 * Grant a purchased pack.
 *
 * Idempotent by design: the caller passes the order id, and this refuses to
 * grant twice for the same order. Re-verifying a payment must never hand out a
 * second pack, and QA will test exactly that.
 */
export async function grantPack(
  studentId: string,
  packCode: string,
  orderId: string,
  bonusMocks = 0
): Promise<{ granted: boolean; mocks: number; practice: number }> {
  const r = repo();
  const plan = getPlan(packCode);
  if (!plan) return { granted: false, mocks: 0, practice: 0 };

  const ledger = await r.listLedger(studentId);
  if (ledger.some((e) => e.orderId === orderId && e.reason === 'pack_purchase')) {
    return { granted: false, mocks: 0, practice: 0 }; // already granted
  }

  const mocks = plan.mockInterviews + bonusMocks;

  await r.appendLedger(
    entry(studentId, 'mock', mocks, 'pack_purchase', {
      orderId,
      note: bonusMocks ? `${plan.mockInterviews} + ${bonusMocks} bonus` : plan.name,
    })
  );
  await r.appendLedger(
    entry(studentId, 'practice', plan.practiceSessions, 'pack_purchase', { orderId })
  );

  return { granted: true, mocks, practice: plan.practiceSessions };
}

/** Consumption. Called when a sitting actually starts, never from the browser. */
export async function consume(
  studentId: string,
  kind: LedgerEntry['kind'],
  sessionId: string
): Promise<boolean> {
  const r = repo();
  const balance = await r.balance(studentId, kind);
  if (balance <= 0) return false;
  await r.appendLedger(entry(studentId, kind, -1, 'session_consumed', { sessionId }));
  return true;
}

/**
 * Referral reward: +1 mock, paid only when the friend's order is verified.
 *
 * Guardrails from the locked decision: never self-referral, once per referred
 * student, and a lifetime cap so the liability is bounded.
 */
export async function rewardReferral(
  referrerId: string,
  referredStudentId: string
): Promise<{ rewarded: boolean; why: string }> {
  const r = repo();
  if (referrerId === referredStudentId) return { rewarded: false, why: 'self referral' };

  const ledger = await r.listLedger(referrerId);
  const already = ledger.some(
    (e) => e.reason === 'referral_reward' && e.note === referredStudentId
  );
  if (already) return { rewarded: false, why: 'already rewarded for this student' };

  const cap = Number(process.env.REFERRAL_LIFETIME_CAP ?? 20);
  const count = ledger.filter((e) => e.reason === 'referral_reward').length;
  if (count >= cap) return { rewarded: false, why: `lifetime cap of ${cap} reached` };

  await r.appendLedger(
    entry(referrerId, 'mock', 1, 'referral_reward', { note: referredStudentId })
  );
  return { rewarded: true, why: 'ok' };
}

/** Super admin manual grant. Always audited by the caller. */
export async function adminGrant(
  studentId: string,
  kind: LedgerEntry['kind'],
  amount: number,
  note: string
): Promise<void> {
  await repo().appendLedger(entry(studentId, kind, amount, 'super_admin_grant', { note }));
}
