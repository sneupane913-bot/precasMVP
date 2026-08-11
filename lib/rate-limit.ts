/**
 * Rate limiting and the spend breaker.
 *
 * QA measured 600 to 4,300 requests per minute against endpoints that cost
 * money, with nothing stopping them. That is the single largest financial hole
 * in the product and it must be closed before a real speech key is set.
 *
 * HONEST LIMITATION: this counter lives in the process. Netlify runs several
 * instances, so the real ceiling is roughly (limit x instances). It converts an
 * unbounded hole into a bounded one, which is the difference between a runaway
 * bill and a survivable one. Durable limits need Postgres or Redis and are
 * listed as a known limitation, not hidden.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const g = globalThis as unknown as { __precasRate?: Map<string, Bucket> };
function buckets(): Map<string, Bucket> {
  return (g.__precasRate ??= new Map());
}

export interface Limit {
  /** Requests allowed in the window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
}

/** Tuned to be generous to a real student and hostile to a script. */
export const LIMITS = {
  /** Starting interviews. A student cannot legitimately start 10 a minute. */
  sessionCreate: { max: 10, windowSec: 60 },
  /** The expensive one. 22 answers per mock, so this allows about 2 mocks. */
  answer: { max: 45, windowSec: 60 },
  /** Login attempts. This is what makes passcode brute force impractical. */
  auth: { max: 5, windowSec: 300 },
  /** OTP costs real money per message. */
  otpSend: { max: 3, windowSec: 3600 },
  /** Payment submissions. */
  payment: { max: 10, windowSec: 3600 },
  /** Cheap telemetry, but must not be unbounded. */
  flag: { max: 300, windowSec: 60 },
} as const satisfies Record<string, Limit>;

export interface RateResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: Limit): RateResult {
  const now = Date.now();
  const b = buckets().get(key);

  if (!b || now >= b.resetAt) {
    buckets().set(key, { count: 1, resetAt: now + limit.windowSec * 1000 });
    return { allowed: true, remaining: limit.max - 1, retryAfterSec: 0 };
  }

  if (b.count >= limit.max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }

  b.count += 1;
  return { allowed: true, remaining: limit.max - b.count, retryAfterSec: 0 };
}

/** Best-effort client address. Never used alone for a hard block. */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get('x-nf-client-connection-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    'unknown'
  );
}

// --------------------------------------------------------------- spend breaker

/**
 * Global kill switch on paid provider calls.
 *
 * Counts transcription calls in the current month against a configured
 * ceiling. When it trips, paid calls stop and the student is told plainly. QA
 * set the pilot ceiling at NPR 1,500; at roughly NPR 6 per mock that is about
 * 250 mocks, so the default cap is deliberately conservative.
 */
const g2 = globalThis as unknown as { __precasSpend?: { month: string; calls: number } };

export function spendState(): { month: string; calls: number } {
  const month = new Date().toISOString().slice(0, 7);
  const cur = (g2.__precasSpend ??= { month, calls: 0 });
  if (cur.month !== month) {
    cur.month = month;
    cur.calls = 0;
  }
  return cur;
}

export function maxPaidCallsPerMonth(): number {
  return Number(process.env.MAX_PAID_CALLS_PER_MONTH ?? 6000);
}

export function spendBreakerTripped(): boolean {
  return spendState().calls >= maxPaidCallsPerMonth();
}

export function recordPaidCall(): void {
  spendState().calls += 1;
}

/** Per account per day, so one student cannot drain the month alone. */
export function maxMocksPerDay(): number {
  return Number(process.env.MAX_MOCKS_PER_ACCOUNT_PER_DAY ?? 12);
}
