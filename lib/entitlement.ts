import { repo, type LedgerEntry, type Student } from '@/lib/db';
import { getPlan, SEAT_GRANT, getSeatSize, DEFAULT_SEAT_SIZE, TRIAL_QUESTION_COUNT, FULL_MOCK_QUESTION_COUNT } from '@/lib/data/plans';

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
  /**
   * An unfinished sitting they can walk straight back into.
   *
   * THIS IS THE FIELD THE 14 AUG BUG NEEDED AND DID NOT HAVE.
   *
   * A credit is spent on the FIRST answer, not the last (see consume()), which
   * is correct — it stops one credit buying seventeen questions across
   * seventeen abandoned tabs. But it means an ABANDONED sitting and an
   * EXHAUSTED balance produce exactly the same number: mocksLeft = 0.
   *
   * The client answered ONE of his ten free questions, pressed Back by
   * mistake, and every page told him "You have used your free questions. Buy a
   * pack to keep going." His session was sitting there, whole, one click away.
   * The product told a student it had taken his free trial when it had not.
   *
   * It is the same defect as the header flash, one layer up: **we rendered a
   * conclusion where we should have rendered a state.** mocksLeft = 0 is not a
   * conclusion. "You have used your free questions" is, and it was wrong.
   */
  inProgress: InProgressSitting | null;
}

export interface InProgressSitting {
  sessionId: string;
  /** How many they have actually answered, so the offer can be specific. */
  answered: number;
  /** How many that sitting holds in total. */
  total: number;
  institutionId: string;
  /** Practice drills resume differently from a full mock. */
  isPractice: boolean;
}

export async function entitlementFor(student: Student): Promise<Entitlement> {
  const r = repo();
  const [mocksLeft, practiceLeft, ledger] = await Promise.all([
    r.balance(student.id, 'mock'),
    r.balance(student.id, 'practice'),
    r.listLedger(student.id),
  ]);

  const hasPaid = ledger.some((e) => e.reason === 'pack_purchase' || e.reason === 'seat_allocation');

  // The oldest unfinished sitting. Oldest, not newest, because the credit for
  // it was already spent and leaving it stranded is what cost the client his
  // trial. Never throws: a store hiccup here must not turn into "buy a pack".
  let inProgress: InProgressSitting | null = null;
  try {
    const { store } = await import('@/lib/store');
    const sessions = await store.listByStudent(student.id);
    const open = sessions
      .filter((x) => x.status === 'in_progress' || x.status === 'created')
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))[0];
    if (open) {
      inProgress = {
        sessionId: open.id,
        answered: Array.isArray(open.answers) ? open.answers.length : 0,
        total: Array.isArray(open.questionIds) ? open.questionIds.length : 0,
        institutionId: open.institutionId,
        isPractice: open.mode === 'practice',
      };
    }
  } catch {
    inProgress = null;
  }

  // The locked rule: the trial is the first 10 questions of the SAME
  // 17-question sitting. Paying unlocks the remaining 7 of that sitting and
  // grants a package of full 17-question mocks.
  const questionsAllowed = hasPaid ? FULL_MOCK_QUESTION_COUNT : TRIAL_QUESTION_COUNT;

  return {
    mocksLeft,
    practiceLeft,
    questionsAllowed,
    hasPaid,
    inProgress,
    // An unfinished sitting IS a startable mock — it is the one they already
    // paid for. Anything that gates on canStartMock must let them back in.
    canStartMock: mocksLeft > 0 || Boolean(inProgress && !inProgress.isPractice),
    canStartPractice: practiceLeft > 0 || Boolean(inProgress?.isPractice),
    reason:
      // Order matters. The resumable case is checked FIRST, because it is the
      // only case where "you have used your free questions" is a lie.
      inProgress
        ? null
        : mocksLeft > 0
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
  allocatedBy: string,
  /**
   * N-1. Which size of seat this student is being given. A consultancy may buy
   * 3, 6 and 10 mock seats in one order and hand them out as it likes.
   */
  sizeCode?: string
): Promise<{ seated: boolean; mocks: number; practice: number }> {
  const r = repo();
  const size = (sizeCode && getSeatSize(sizeCode)) || DEFAULT_SEAT_SIZE;

  const res = await r.allocateSeat(
    {
      id: crypto.randomUUID(),
      consultancyId,
      studentId,
      allocatedBy,
      allocatedAt: new Date().toISOString(),
      revokedAt: null,
      // Recorded on the allocation, not read back from the consultancy later.
      // A consultancy can change its seat size between one student and the
      // next, and a student given a 10-mock seat must keep 10 even if the next
      // batch is bought at 3. Reading it live would rewrite their history.
      mocks: size.mocks,
      practice: size.practice,
    },
    seatsTotal
  );
  if (!res.ok) return { seated: false, mocks: 0, practice: 0 };

  const ledger = await r.listLedger(studentId);
  if (ledger.some((e) => e.reason === 'seat_allocation')) {
    return { seated: true, mocks: 0, practice: 0 }; // seat already paid out
  }

  await r.appendLedger(
    entry(studentId, 'mock', size.mocks, 'seat_allocation', {
      note: `${size.label} seat at ${consultancyId}`,
    })
  );
  await r.appendLedger(
    entry(studentId, 'practice', size.practice, 'seat_allocation', {
      note: `${size.label} seat at ${consultancyId}`,
    })
  );
  return { seated: true, mocks: size.mocks, practice: size.practice };
}

/**
 * N-5. Top a student back up, consuming another seat.
 *
 * Distinct from `grantSeat` in one way that matters: `grantSeat` refuses to pay
 * out twice, because a retried SIGNUP must not hand over two seats. A renewal
 * is the opposite — it is a deliberate second grant, months later, decided by a
 * human at the consultancy. So the ledger guard is dropped here and the seat
 * claim itself is what stops it running away.
 *
 * Credits ADD to whatever is left rather than replacing it. A student with one
 * mock still unused who is topped up has eleven, not ten. Anything else would
 * quietly take something they already owned.
 */
export async function renewSeat(
  studentId: string,
  consultancyId: string,
  seatsTotal: number,
  allocatedBy: string,
  sizeCode?: string
): Promise<{ seated: boolean; mocks: number; practice: number }> {
  const r = repo();
  const size = (sizeCode && getSeatSize(sizeCode)) || DEFAULT_SEAT_SIZE;

  const res = await r.allocateSeat(
    {
      id: crypto.randomUUID(),
      consultancyId,
      studentId,
      allocatedBy,
      allocatedAt: new Date().toISOString(),
      revokedAt: null,
      mocks: size.mocks,
      practice: size.practice,
    },
    seatsTotal,
    { renewal: true }
  );
  if (!res.ok) return { seated: false, mocks: 0, practice: 0 };

  await r.appendLedger(
    entry(studentId, 'mock', size.mocks, 'seat_allocation', {
      note: `renewal: ${size.label} seat at ${consultancyId}`,
    })
  );
  await r.appendLedger(
    entry(studentId, 'practice', size.practice, 'seat_allocation', {
      note: `renewal: ${size.label} seat at ${consultancyId}`,
    })
  );
  return { seated: true, mocks: size.mocks, practice: size.practice };
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
