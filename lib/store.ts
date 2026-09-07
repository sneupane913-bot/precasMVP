import type { InterviewSession } from '@/lib/types';

/**
 * Session persistence.
 *
 * Two adapters behind one interface.
 *
 *  - MemoryStore  : local development only. Fast, zero setup, loses everything
 *                   on restart, and is WRONG on serverless because separate
 *                   function invocations do not share memory.
 *  - BlobStore    : Netlify Blobs. Persistent key/value storage that is built
 *                   into Netlify, needs no external account and no extra keys.
 *                   This is what makes a shareable public deploy possible
 *                   before Supabase is wired up.
 *
 * Selection is automatic: on Netlify we use Blobs, everywhere else memory.
 * Nothing outside this file knows or cares which is active.
 */
export interface SessionStore {
  create(session: InterviewSession): Promise<void>;
  get(id: string): Promise<InterviewSession | null>;
  update(id: string, patch: Partial<InterviewSession>): Promise<InterviewSession | null>;
  /** D19: a student's own history. Newest first. */
  listByStudent(studentId: string): Promise<InterviewSession[]>;
  /** J3: the delete-my-data path must actually delete. */
  deleteByStudent(studentId: string): Promise<number>;
}

function newestFirst(a: InterviewSession, b: InterviewSession): number {
  return a.createdAt < b.createdAt ? 1 : -1;
}

class MemoryStore implements SessionStore {
  private map = new Map<string, InterviewSession>();

  async create(session: InterviewSession): Promise<void> {
    this.map.set(session.id, session);
  }
  async get(id: string): Promise<InterviewSession | null> {
    return this.map.get(id) ?? null;
  }
  async update(id: string, patch: Partial<InterviewSession>) {
    const existing = this.map.get(id);
    if (!existing) return null;
    const next = { ...existing, ...patch };
    this.map.set(id, next);
    return next;
  }
  async listByStudent(studentId: string) {
    return [...this.map.values()].filter((s) => s.studentId === studentId).sort(newestFirst);
  }
  async deleteByStudent(studentId: string) {
    let n = 0;
    for (const [id, s] of this.map) {
      if (s.studentId === studentId) {
        this.map.delete(id);
        n += 1;
      }
    }
    return n;
  }
}

class BlobStore implements SessionStore {
  // Imported lazily so local development never has to resolve the package at
  // module load, and so a failure here can fall back rather than crash a route.
  private async blobs() {
    const { getStore } = await import('@netlify/blobs');
    return getStore({ name: 'precas-sessions', consistency: 'strong' });
  }

  /**
   * THE PER-STUDENT INDEX (7 September 2026).
   *
   * Blobs has no query. `listByStudent` used to list EVERY session in the
   * store and read each one to find a student's own, and it is called on
   * every mock start (entitlement, the resume check, the seen set), on the
   * dashboard and in the advice picker. That is fine for a pilot and it is
   * the wrong shape for scale: the cost of one student starting a mock grew
   * with the number of students who had ever used the product, in time and
   * in the Netlify reads that are already most of the monthly credit.
   *
   * So a second store holds one small document per student: the ids of that
   * student's sessions. A create appends to it; a read fetches the index and
   * then only that student's sessions. A student created before the index
   * existed has no document, so the first read for them does the old full
   * scan once and writes the index (lazy backfill). Two simultaneous creates
   * for one student could race on the append and lose an id; a student has
   * one browser and the create route already hands back an open sitting
   * instead of making a second, so this is accepted and the full-scan path
   * remains as the repair (see `repairIndex`).
   */
  private async index() {
    const { getStore } = await import('@netlify/blobs');
    return getStore({ name: 'precas-session-index', consistency: 'strong' });
  }

  private async readIndex(studentId: string): Promise<string[] | null> {
    try {
      const ix = await this.index();
      const ids = (await ix.get(studentId, { type: 'json' })) as string[] | null;
      return Array.isArray(ids) ? ids : null;
    } catch {
      return null;
    }
  }

  private async writeIndex(studentId: string, ids: string[]): Promise<void> {
    try {
      const ix = await this.index();
      await ix.setJSON(studentId, [...new Set(ids)]);
    } catch {
      // The index is a cache of the truth, never the truth. A failed write
      // costs one slow read later, not a lost session.
    }
  }

  async create(session: InterviewSession): Promise<void> {
    const s = await this.blobs();
    await s.setJSON(session.id, session);
    if (session.studentId) {
      const ids = (await this.readIndex(session.studentId)) ?? (await this.repairIndex(session.studentId));
      if (!ids.includes(session.id)) await this.writeIndex(session.studentId, [...ids, session.id]);
    }
  }

  async get(id: string): Promise<InterviewSession | null> {
    try {
      const s = await this.blobs();
      return ((await s.get(id, { type: 'json' })) as InterviewSession | null) ?? null;
    } catch {
      return null;
    }
  }

  async update(id: string, patch: Partial<InterviewSession>) {
    const s = await this.blobs();
    const existing = (await s.get(id, { type: 'json' })) as InterviewSession | null;
    if (!existing) return null;
    const next = { ...existing, ...patch };
    await s.setJSON(id, next);
    return next;
  }

  /**
   * The full scan. Kept for the lazy backfill and the back office; never on
   * the student's own path once their index exists.
   */
  private async all(): Promise<InterviewSession[]> {
    try {
      const s = await this.blobs();
      const { blobs } = await s.list();
      const rows = await Promise.all(
        blobs.map((b) => s.get(b.key, { type: 'json' }) as Promise<InterviewSession | null>)
      );
      return rows.filter((r): r is InterviewSession => Boolean(r));
    } catch {
      return [];
    }
  }

  /** One full scan for one student, and the index is written from it. */
  private async repairIndex(studentId: string): Promise<string[]> {
    const ids = (await this.all()).filter((x) => x.studentId === studentId).map((x) => x.id);
    await this.writeIndex(studentId, ids);
    return ids;
  }

  async listByStudent(studentId: string) {
    const ids = (await this.readIndex(studentId)) ?? (await this.repairIndex(studentId));
    if (ids.length === 0) return [];
    const rows = await Promise.all(ids.map((id) => this.get(id)));
    const found = rows.filter((r): r is InterviewSession => Boolean(r) && r!.studentId === studentId);
    // A session deleted elsewhere leaves a dangling id; drop it from the
    // index so the next read does not pay for it.
    if (found.length !== ids.length) await this.writeIndex(studentId, found.map((r) => r.id));
    return found.sort(newestFirst);
  }

  async deleteByStudent(studentId: string) {
    const s = await this.blobs();
    const mine = await this.listByStudent(studentId);
    for (const row of mine) await s.delete(row.id);
    try {
      const ix = await this.index();
      await ix.delete(studentId);
    } catch {
      // Nothing to do; a stale index is repaired on the next read.
    }
    return mine.length;
  }
}

/** Netlify sets NETLIFY=true in its build and function environments. */
function onNetlify(): boolean {
  return process.env.NETLIFY === 'true' || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
}

const globalForStore = globalThis as unknown as { __precasStore?: SessionStore };

export const store: SessionStore =
  globalForStore.__precasStore ??
  (globalForStore.__precasStore = onNetlify() ? new BlobStore() : new MemoryStore());

/** True when sessions will not survive a restart. Surfaced in the UI. */
export function storeIsEphemeral(): boolean {
  return !onNetlify() && !process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function storeName(): string {
  return onNetlify() ? 'netlify-blobs' : 'memory';
}
