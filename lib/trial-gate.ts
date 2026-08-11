import { repo } from '@/lib/db';
import { platform } from '@/lib/platform';

/**
 * The trial gate.
 *
 * The design bias is stated in HANDOFF (spec 5B) and is the opposite of most
 * anti-fraud work: **minimise false positives even at the cost of letting some
 * abusers through.** A blocked real student is lost revenue and lost trust. An
 * abuser who slips through costs bounded transcription, capped by the spend
 * breaker. So this errs toward letting people in.
 *
 * What it must never do is punish a consultancy lab: thirty real students share
 * one Wi-Fi and sometimes one machine. That is normal, not fraud.
 *
 * The outcome is never a ban. The worst case is a SOFT DENY: the student keeps
 * full browsing, can still buy a pack, and has a human to appeal to.
 */

export interface RiskInput {
  authProviderId: string;
  fingerprintHash: string | null;
  ip: string | null;
}

export interface GateDecision {
  outcome: 'granted' | 'soft_denied' | 'already_claimed';
  riskScore: number;
  reasons: string[];
  /** Shown to the student. Calm, never accusatory, never a dead end. */
  message: string | null;
}

/** Distinct accounts on one device before we even start to wonder. */
const DEVICE_SOFT_THRESHOLD = 4;
/** On an allow-listed consultancy network, labs legitimately go far higher. */
const DEVICE_ALLOWLISTED_THRESHOLD = 40;
const WINDOW_HOURS = 24;

async function ipIsAllowlisted(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  const consultancies = await platform.listConsultancies();
  return consultancies.some(
    (c) =>
      c.status === 'approved' &&
      Array.isArray((c as { allowlistedIps?: string[] }).allowlistedIps) &&
      ((c as { allowlistedIps?: string[] }).allowlistedIps ?? []).includes(ip)
  );
}

export async function evaluateTrial(input: RiskInput): Promise<GateDecision> {
  const r = repo();

  // One trial per Google account. This is the actual gate; everything else is
  // a secondary signal.
  const existing = await r.getTrialClaimByAuthId(input.authProviderId);
  if (existing) {
    return {
      outcome: 'already_claimed',
      riskScore: 0,
      reasons: ['trial already claimed by this account'],
      message:
        'You have already used your free questions with this Google account. Buy a pack to keep practising.',
    };
  }

  const reasons: string[] = [];
  let score = 0;

  const allowlisted = await ipIsAllowlisted(input.ip);
  if (allowlisted) reasons.push('network is an approved consultancy');

  if (input.fingerprintHash) {
    const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();
    const distinctAccounts = await r.countClaimsByFingerprint(input.fingerprintHash, since);

    const threshold = allowlisted ? DEVICE_ALLOWLISTED_THRESHOLD : DEVICE_SOFT_THRESHOLD;
    if (distinctAccounts >= threshold) {
      score += 60;
      reasons.push(
        `${distinctAccounts} different accounts claimed on this device in ${WINDOW_HOURS}h (limit ${threshold})`
      );
    } else if (distinctAccounts >= Math.max(2, threshold - 1)) {
      // Noted, not acted on. A family sharing a laptop lands here and must pass.
      score += 15;
      reasons.push(`${distinctAccounts} accounts on this device, within normal range`);
    }
  } else {
    // No fingerprint is mildly unusual but is also just a privacy browser.
    score += 5;
    reasons.push('no device signal available');
  }

  // Deliberately NOT scored: IP on its own. A consultancy lab, a hostel, a
  // cyber cafe and a family all share one address. Blocking on IP alone is the
  // single easiest way to lose thirty real students at once.

  const softDenied = score >= 60;

  return {
    outcome: softDenied ? 'soft_denied' : 'granted',
    riskScore: score,
    reasons,
    message: softDenied
      ? 'We could not automatically confirm you are a new student on this device. You can still look around and buy a pack. To switch on your free questions, message us on WhatsApp and we will turn them on.'
      : null,
  };
}
