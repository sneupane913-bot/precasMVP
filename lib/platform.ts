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
export interface PlatformSettings {
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceMessage: string;
  contactName: string;
  contactPhone: string;
  enabledAt: string | null;
  enabledBy: string | null;
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

export function isSuperAdmin(key: string | undefined | null): boolean {
  const expected = process.env.SUPER_ADMIN_PASSCODE;
  if (!expected) return process.env.NODE_ENV !== 'production' && key === 'super-dev';
  return Boolean(key) && key === expected;
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
