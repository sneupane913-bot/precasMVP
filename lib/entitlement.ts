import { repo, type LedgerEntry, type Student } from '@/lib/db';
import { getPlan, SEAT_GRANT, TRIAL_QUESTION_COUNT, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';

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
  practiceReason: string | null;
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
    /**
     * Practice needs its own sentence. The free trial contains no practice
     * questions at all, so telling that student they have "used all" of theirs
     * is simply untrue, and it reads like the product losing their credits.
     */
    practiceReason:
      practiceLeft > 0
        ? null
        : ledger.some((e) => e.kind === 'practice' && e.delta > 0)
          ? 'You have used all the practice questions in your pack.'
          : 'Practice questions come with a pack. Your free try is the ten question mock interview.',
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

/**
 * Take a seat for a student who arrived through an approved consultancy link,
 * and grant what the seat is worth (F7).
 *
 * Seats were being sold and never allocated: `allocateSeat` existed, correctly
 * written with per-index claim keys, and had no callers anywhere. So a
 * consultancy could buy a hundred seats, sign up two hundred students, and the
 * dashboard would show nothing used.
 *
 * Two guarantees this has to keep, and both are the repo's job, not ours:
 *
 *   1. Never oversold. Seat *n* is a claim key, written only if absent, so a
 *      hundred simultaneous signups against fifty seats produce exactly fifty
 *      winners. We do not read a count and then write one, because that read
 *      is where every overselling bug in this class lives.
 *   2. Never double granted. `allocateSeat` is idempotent per student, and the
 *      grant below is guarded on the ledger as well, so a retried signup takes
 *      one seat and pays out once.
 *
 * A student who arrives after the seats run out is NOT turned away. They keep
 * their free trial and can buy a pack like anybody else. Blocking them would
 * punish the student for their consultancy's purchasing.
 */
export async function grantSeat(
  studentId: string,
  consultancyId: string,
  seatsTotal: number,
  allocatedBy: string
): Promise<{ seated: boolean; mocks: number; practice: number }> {
  const r = repo();
  const res = await r.allocateSeat(
    {
      id: crypto.randomUUID(),
      consultancyId,
      studentId,
      allocatedBy,
      allocatedAt: new Date().toISOString(),
      revokedAt: null,
    },
    seatsTotal
  );
  if (!res.ok) return { seated: false, mocks: 0, practice: 0 };

  const ledger = await r.listLedger(studentId);
  if (ledger.some((e) => e.reason === 'seat_allocation')) {
    return { seated: true, mocks: 0, practice: 0 }; // seat already paid out
  }

  await r.appendLedger(
    entry(studentId, 'mock', SEAT_GRANT.mocks, 'seat_allocation', {
      note: `seat at ${consultancyId}`,
    })
  );
  await r.appendLedger(
    entry(studentId, 'practice', SEAT_GRANT.practice, 'seat_allocation', {
      note: `seat at ${consultancyId}`,
    })
  );
  return { seated: true, mocks: SEAT_GRANT.mocks, practice: SEAT_GRANT.practice };
}

/**
 * Consumption. Called from the server when a sitting actually starts, never
 * from the browser.
 *
 * "Actually starts" means the first answer the student records, not the moment
 * the session row is created. A student who opens the interview, fails the
 * device check and closes the tab has not used anything, and charging them for
 * that would be indefensible. The interview error screen promises exactly
 * this, so the promise and the code have to agree.
 *
 * Idempotent per session, and that is load-bearing rather than tidy. This runs
 * on every answer in the sitting, so without the guard a 17-question mock would
 * cost seventeen credits. One sitting, one debit, however many times it is
 * called.
 */
export async function consume(
  studentId: string,
  kind: LedgerEntry['kind'],
  sessionId: string
): Promise<boolean> {
  const r = repo();
  const ledger = await r.listLedger(studentId);
  const already = ledger.some(
    (e) => e.reason === 'session_consumed' && e.sessionId === sessionId && e.kind === kind
  );
  if (already) return true;

  const balance = ledger
    .filter((e) => e.kind === kind)
    .reduce((sum, e) => sum + e.delta, 0);
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

  // I8 fraud guard. Blocking only "same student id" catches nobody, because the
  // obvious abuse is one person making a second Google account and referring
  // themselves. Their trial claims are the only place we hold a device and an
  // IP, so compare those.
  //
  // Deliberately NOT blocking on IP alone: a consultancy lab, a household and a
  // shared hostel all sit behind one IP, and those referrals are real. A shared
  // DEVICE FINGERPRINT is the strong signal, so that blocks; a shared IP only
  // blocks when the two accounts were created close together, which is what
  // self-referral actually looks like.
  const claims = await r.listTrialClaims();
  const mine = claims.find((c) => c.studentId === referrerId);
  const theirs = claims.find((c) => c.studentId === referredStudentId);

  if (mine && theirs) {
    if (mine.fingerprintHash && mine.fingerprintHash === theirs.fingerprintHash) {
      return { rewarded: false, why: 'same device as the referrer' };
    }
    if (mine.ip && mine.ip === theirs.ip) {
      const hours =
        Math.abs(new Date(theirs.claimedAt).getTime() - new Date(mine.claimedAt).getTime()) /
        3_600_000;
      if (hours < 24) {
        return { rewarded: false, why: 'same network within 24 hours of the referrer' };
      }
    }
  }

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
