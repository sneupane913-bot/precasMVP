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

  async create(session: InterviewSession): Promise<void> {
    const s = await this.blobs();
    await s.setJSON(session.id, session);
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
   * Blobs has no query, so we list keys and read them. Fine at pilot scale and
   * one of the reasons Postgres is the destination for this data.
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

  async listByStudent(studentId: string) {
    return (await this.all()).filter((s) => s.studentId === studentId).sort(newestFirst);
  }

  async deleteByStudent(studentId: string) {
    const s = await this.blobs();
    const mine = await this.listByStudent(studentId);
    for (const row of mine) await s.delete(row.id);
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
