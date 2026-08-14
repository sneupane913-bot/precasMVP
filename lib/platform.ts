import { timingSafeEqual } from 'crypto';
import type { InterviewSession } from '@/lib/types';

/**
 * Platform-wide state and the three-tier account model.
 *
 * Uses the same swappable storage as sessions: Netlify Blobs when deployed,
 * memory locally. See lib/store.ts.
 */

export type Role = 'student' | 'admin' | 'super_admin';

export interface Consultancy {
  id: string;
  slug: string;
  name: string;
  contactName: string;
  contactPhone: string;
  logoUrl: string | null;
  primaryColor: string;
  status: 'pending' | 'approved' | 'suspended';
  /** Seats bought, and seats handed to students. */
  seatsTotal: number;
  seatsUsed: number;
  bundleCode: string | null;
  /** What they paid us, for the super admin revenue view. */
  paidNpr: number;
  createdAt: string;
  approvedAt: string | null;
  /** Passcode for their admin portal. MVP only, replaced by real auth later. */
  passcode: string;
  /**
   * True until they have chosen their own passcode.
   *
   * The super admin sets the first one, which means the super admin knows it,
   * and a shared secret between two organisations is not a password. So the
   * first one is a HANDOVER CODE, not a passcode: it gets them in once, and
   * the portal then refuses to show them anything until they replace it.
   *
   * Undefined on consultancies created before this existed. Those are treated
   * as already changed, because forcing a change on somebody mid-pilot with no
   * warning would lock them out of their own students.
   */
  passcodeIsTemporary?: boolean;
  passcodeChangedAt?: string | null;
}

export interface StudentRecord {
  id: string;
  name: string;
  phone: string;
  consultancyId: string | null;
  planCode: string;
  mocksRemaining: number;
  practiceRemaining: number;
  paidNpr: number;
  createdAt: string;
  lastSeenAt: string;
  sessionIds: string[];
}

/**
 * Platform kill switch.
 *
 * This is standard maintenance mode, the same feature every hosted product
 * has. It is reachable only from /owner and only with OWNER_ACCESS_KEY, which
 * is a different secret from the super admin passcode. A super admin cannot
 * turn it on or off, and cannot see the page.
 */
/** One line per toggle, append only. QA H3: the switch had no history. */
export interface OwnerAuditEntry {
  at: string;
  action: 'paused' | 'resumed';
  /** Best-effort source, so a disputed pause has a record beyond "someone". */
  ip: string;
  userAgent: string;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  contactName: string;
  contactPhone: string;
  enabledAt: string | null;
  enabledBy: string | null;
  /**
   * The switch exists for a commercial dispute, so the record of who used it
   * and when may matter later. Newest first, capped so the document cannot
   * grow without bound.
   */
  ownerAudit?: OwnerAuditEntry[];

  /**
   * N-11, N-20. Payment and support details the SUPER ADMIN can change without
   * a deploy.
   *
   * Sales staff change, wallets change, and a phone number that needs a code
   * release to update is a number that will be wrong on the day it matters
   * most — while a student who has just sent money is trying to reach us.
   *
   * A consultancy admin can change NONE of these: the money arrives in our
   * wallet, so only we may say where it goes or who answers about it.
   */
  /**
   * The super admin's own passcode, once they have changed it.
   *
   * Absent means "still using the environment variable", which is how the
   * first login works and how the client recovers if they forget it: change
   * the env var and redeploy, which is a deliberate act only somebody with
   * host access can perform.
   *
   * Yes, this is a secret in the settings document. It is the same secret that
   * was already in an environment variable readable by the same code, so this
   * does not widen who can read it. What it does widen is who can CHANGE it,
   * which is the point: a password nobody can change is not a password.
   */
  superPasscode?: string;
  superPasscodeChangedAt?: string | null;
  /**
   * The DEPLOY key that was in force when the stored passcode was set.
   *
   * This is the whole recovery story, and without it the recovery story was a
   * lie. The comment used to say "if you forget it, change the environment
   * variable and redeploy". That would not have worked: the stored passcode
   * took precedence unconditionally, so changing the env var would have
   * changed nothing and the owner would have been locked out of their own
   * product with no way back in.
   *
   * Now the stored passcode is only honoured while the deploy key is still the
   * one it was set against. Change SUPER_ADMIN_PASSCODE in the host and the
   * stored one is ignored, which is exactly the "I have host access, let me
   * back in" escape hatch it was always claimed to be.
   */
  superPasscodeSetAgainst?: string | null;

  /**
   * How long a student should expect to wait for a person to check their
   * payment, in hours.
   *
   * A student who has sent real money and is told "this can take a little
   * time" has been told nothing. They cannot tell ten minutes from tomorrow,
   * so they message us, or worse, they pay again. A number they can plan
   * around is kinder AND cheaper than a vague reassurance.
   *
   * Editable without a deploy, because the honest answer changes: four hours
   * on a normal weekday, longer over Dashain.
   */
  approvalWaitHours?: number;

  payQrImageUrl?: string;
  payWalletName?: string;
  payWalletNumber?: string;
  payAccountName?: string;
  /** N-12, N-19. The number the pre-filled WhatsApp links open. */
  supportWhatsapp?: string;

  /**
   * N-18. Device fingerprints the super admin has SOFT-blocked.
   *
   * Soft, never a ban (G-7). A blocked device can still browse, still read a
   * report it already earned, and still buy a pack — what it cannot do is
   * claim another free trial. The student always gets a way back, because the
   * signal is a heuristic and heuristics are wrong about real people.
   */
  blockedDevices?: string[];

  /**
   * N-25. Questions added by the super admin WITHOUT a deploy.
   *
   * The bank is the product. Waiting for a code release to add a question a
   * student just reported from a real interview is how the bank goes stale,
   * and a stale bank is the one thing that would make this product useless
   * while still appearing to work.
   */
  extraQuestions?: {
    id: string;
    category: string;
    text: string;
    intent: string;
    addedAt: string;
    addedBy: string;
  }[];
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  maintenanceMode: false,
  maintenanceTitle: 'This service is temporarily unavailable',
  maintenanceMessage:
    'The platform is paused while a commercial matter is resolved. Students who have paid will not lose their credits. Please contact the number below for details.',
  contactName: '',
  contactPhone: '',
  enabledAt: null,
  enabledBy: null,
  ownerAudit: [],
  payQrImageUrl: '',
  payWalletName: '',
  payWalletNumber: '',
  payAccountName: '',
  supportWhatsapp: '',
  blockedDevices: [],
  extraQuestions: [],
};

export interface PlatformStore {
  getSettings(): Promise<PlatformSettings>;
  saveSettings(s: PlatformSettings): Promise<void>;
  listConsultancies(): Promise<Consultancy[]>;
  saveConsultancy(c: Consultancy): Promise<void>;
  getConsultancy(idOrSlug: string): Promise<Consultancy | null>;
  listStudents(): Promise<StudentRecord[]>;
  saveStudent(s: StudentRecord): Promise<void>;
}

// ---------------------------------------------------------------------------

interface Bucket {
  settings: PlatformSettings;
  consultancies: Consultancy[];
  students: StudentRecord[];
}

const seed = (): Bucket => ({
  settings: { ...DEFAULT_SETTINGS },
  consultancies: [],
  students: [],
});

class MemoryPlatform implements PlatformStore {
  private b: Bucket = seed();
  async getSettings() {
    return this.b.settings;
  }
  async saveSettings(s: PlatformSettings) {
    this.b.settings = s;
  }
  async listConsultancies() {
    return this.b.consultancies;
  }
  async saveConsultancy(c: Consultancy) {
    const i = this.b.consultancies.findIndex((x) => x.id === c.id);
    if (i === -1) this.b.consultancies.push(c);
    else this.b.consultancies[i] = c;
  }
  async getConsultancy(idOrSlug: string) {
    return this.b.consultancies.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }
  async listStudents() {
    return this.b.students;
  }
  async saveStudent(s: StudentRecord) {
    const i = this.b.students.findIndex((x) => x.id === s.id);
    if (i === -1) this.b.students.push(s);
    else this.b.students[i] = s;
  }
}

class BlobPlatform implements PlatformStore {
  private async blobs() {
    const { getStore } = await import('@netlify/blobs');
    return getStore({ name: 'precas-platform', consistency: 'strong' });
  }
  private async read(): Promise<Bucket> {
    try {
      const s = await this.blobs();
      return ((await s.get('bucket', { type: 'json' })) as Bucket | null) ?? seed();
    } catch {
      return seed();
    }
  }
  private async write(b: Bucket) {
    const s = await this.blobs();
    await s.setJSON('bucket', b);
  }
  async getSettings() {
    return (await this.read()).settings;
  }
  async saveSettings(settings: PlatformSettings) {
    const b = await this.read();
    await this.write({ ...b, settings });
  }
  async listConsultancies() {
    return (await this.read()).consultancies;
  }
  async saveConsultancy(c: Consultancy) {
    const b = await this.read();
    const i = b.consultancies.findIndex((x) => x.id === c.id);
    if (i === -1) b.consultancies.push(c);
    else b.consultancies[i] = c;
    await this.write(b);
  }
  async getConsultancy(idOrSlug: string) {
    const b = await this.read();
    return b.consultancies.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }
  async listStudents() {
    return (await this.read()).students;
  }
  async saveStudent(s: StudentRecord) {
    const b = await this.read();
    const i = b.students.findIndex((x) => x.id === s.id);
    if (i === -1) b.students.push(s);
    else b.students[i] = s;
    await this.write(b);
  }
}

function onNetlify(): boolean {
  return process.env.NETLIFY === 'true' || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
}

const g = globalThis as unknown as { __precasPlatform?: PlatformStore };
export const platform: PlatformStore =
  g.__precasPlatform ?? (g.__precasPlatform = onNetlify() ? new BlobPlatform() : new MemoryPlatform());

// --------------------------- access control --------------------------------

/** The owner switch has its own secret, separate from every other role. */
export function isOwner(key: string | undefined | null): boolean {
  const expected = process.env.OWNER_ACCESS_KEY;
  if (!expected) return process.env.NODE_ENV !== 'production' && key === 'owner-dev';
  return Boolean(key) && key === expected;
}

/**
 * The super admin passcode.
 *
 * It can now be CHANGED from the dashboard, so it is no longer read straight
 * from the environment. The order is deliberate:
 *
 *   1. A passcode stored in settings, if one has ever been set. Changing it
 *      must actually change it, otherwise the button is a lie.
 *   2. Otherwise the environment variable, which is how the very first login
 *      happens and how the client recovers if they forget it: change the env
 *      var, redeploy, and the stored one is cleared by that same act.
 *   3. Otherwise the dev fallback, never in production.
 *
 * Compared with timingSafeEqual rather than ===, because a passcode is a short
 * secret and === leaks its length and prefix through timing. That is a small
 * risk and a smaller cost to remove.
 */
export async function isSuperAdminAsync(key: string | undefined | null): Promise<boolean> {
  if (!key) return false;
  const s = await platform.getSettings();

  const deployKey = process.env.SUPER_ADMIN_PASSCODE ?? '';
  const storedIsCurrent =
    Boolean(s.superPasscode) && (s.superPasscodeSetAgainst ?? '') === deployKey;

  // A passcode they chose, and the deploy key has not been rotated since.
  if (storedIsCurrent) return secretEquals(key, s.superPasscode as string);

  // Either they never changed it, or somebody with host access rotated the
  // deploy key to get back in. Either way the environment wins.
  return isSuperAdmin(key);
}

/** Constant-time compare that does not throw on differing lengths. */
export function secretEquals(a: string, b: string): boolean {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // Still burn a comparison so the early return is not itself a signal.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function isSuperAdmin(key: string | undefined | null): boolean {
  const expected = process.env.SUPER_ADMIN_PASSCODE;
  if (!expected) return process.env.NODE_ENV !== 'production' && key === 'super-dev';
  return Boolean(key) && secretEquals(String(key), expected);
}

/**
 * Called at the top of every student-facing API route.
 *
 * The layout gate only hides the pages. Without this, someone holding a URL
 * could still drive the whole product through the API while the site looked
 * dark, and every call would still cost money. The switch has to stop the
 * machine, not just the shop front.
 */
export async function platformDown(): Promise<null | {
  code: string;
  message: string;
  userMessage: string;
}> {
  const s = await platform.getSettings();
  if (!s.maintenanceMode) return null;

  const contact = [s.contactName, s.contactPhone].filter(Boolean).join(', ');
  return {
    code: 'PLATFORM_DOWN',
    message: 'maintenance mode is on',
    userMessage: contact
      ? `${s.maintenanceTitle}. Please contact ${contact}.`
      : s.maintenanceTitle,
  };
}

/** Revenue view for the super admin, built from what has actually been recorded. */
export function revenueSummary(cs: Consultancy[], ss: StudentRecord[]) {
  const fromConsultancies = cs.reduce((n, c) => n + c.paidNpr, 0);
  const fromStudents = ss.reduce((n, s) => n + s.paidNpr, 0);
  return {
    totalNpr: fromConsultancies + fromStudents,
    fromConsultancies,
    fromStudents,
    consultancyCount: cs.filter((c) => c.status === 'approved').length,
    pendingCount: cs.filter((c) => c.status === 'pending').length,
    studentCount: ss.length,
    payingStudentCount: ss.filter((s) => s.paidNpr > 0).length,
  };
}

export function sessionsForConsultancy(
  all: InterviewSession[],
  students: StudentRecord[],
  consultancyId: string
): InterviewSession[] {
  const ids = new Set(
    students.filter((s) => s.consultancyId === consultancyId).flatMap((s) => s.sessionIds)
  );
  return all.filter((s) => ids.has(s.id));
}
