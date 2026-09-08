/**
 * THE DEBRIEF: what a student was actually asked at their real interview.
 *
 * 8 September 2026, the client's decision. Every source we hold today is
 * second- or third-hand: a university's own page, a student-shared sheet, a
 * consultancy blog. The only evidence that can beat every competitor is
 * first-hand: our own students, straight after the real pre-CAS interview,
 * telling us what was asked, how many questions, how long, in what format.
 *
 * The deal, written on /free-mock and enforced here:
 *   - a debrief is for ONE real interview, at one university, on one date;
 *   - at least five questions, each in the interviewer's words, not a topic;
 *   - a person checks it (the super admin, on /super > Debriefs) and only an
 *     approved debrief earns the free mock. Vague, copied or invented lists
 *     are refused with a reason the student can read;
 *   - one pending debrief per student at a time, and at most three approved
 *     ever, so the reward cannot be farmed.
 *
 * Approved debriefs are exported by qa/export-debriefs.mjs into
 * docs/research/evidence as the "debrief" tier, the strongest we have, and
 * feed the paper like every other source. Nothing here is shown publicly.
 *
 * Storage follows lib/store.ts: memory locally, Netlify Blobs in production,
 * with a per-student index so a read never scans the whole store.
 */

import { DEBRIEF_RULES } from '@/lib/debrief-rules';

export type DebriefFormat = 'cas_shield_video' | 'live_video' | 'phone' | 'in_person' | 'other';
export type DebriefOutcome = 'passed' | 'resit' | 'failed' | 'waiting';
export type DebriefStatus = 'pending' | 'approved' | 'rejected';

export interface Debrief {
  id: string;
  studentId: string;
  /** Catalogue id when the university is one of ours, else null. */
  institutionId: string | null;
  /** What the student typed or picked, always kept. */
  universityName: string;
  interviewDate: string;
  format: DebriefFormat;
  questionCount: number | null;
  minutes: number | null;
  /** The questions, in the interviewer's words, as the student remembers them. */
  questions: string[];
  outcome: DebriefOutcome;
  notes: string;
  status: DebriefStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export { DEBRIEF_RULES };

/** What is wrong with a submission, in words the student can act on; null when it is fine. */
export function debriefProblem(d: Pick<Debrief, 'questions' | 'universityName' | 'interviewDate'>): string | null {
  if (!d.universityName.trim()) return 'Tell us which university interviewed you.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.interviewDate)) return 'Give the date of the interview.';
  const when = new Date(d.interviewDate).getTime();
  if (Number.isNaN(when) || when > Date.now() + 24 * 3600 * 1000) return 'The interview date cannot be in the future.';
  if (when < Date.now() - 365 * 24 * 3600 * 1000) return 'We can only use interviews from the last twelve months.';
  const qs = d.questions.map((q) => q.trim()).filter(Boolean);
  if (qs.length < DEBRIEF_RULES.minQuestions) return `Write at least ${DEBRIEF_RULES.minQuestions} questions, each as the interviewer said it.`;
  if (qs.length > DEBRIEF_RULES.maxQuestions) return `That is more than ${DEBRIEF_RULES.maxQuestions} questions. Keep the ones you are sure of.`;
  const short = qs.find((q) => q.length < DEBRIEF_RULES.minQuestionChars);
  if (short) return `"${short}" is too short to be a question. Write it the way the interviewer asked it.`;
  const distinct = new Set(qs.map((q) => q.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ')));
  if (distinct.size < qs.length) return 'Two of your questions are the same. Each line should be a different question.';
  const notQuestion = qs.filter((q) => !/[?]|^(why|how|what|where|when|who|which|tell|describe|explain|do|did|have|has|are|is|can|could|would|will)\b/i.test(q));
  if (notQuestion.length > Math.floor(qs.length / 2)) return 'Most of these read as topics, not questions. Write what the interviewer actually asked, for example "Why did you choose this course?"';
  return null;
}

export interface DebriefStore {
  create(d: Debrief): Promise<void>;
  get(id: string): Promise<Debrief | null>;
  update(id: string, patch: Partial<Debrief>): Promise<Debrief | null>;
  listByStudent(studentId: string): Promise<Debrief[]>;
  listAll(): Promise<Debrief[]>;
}

function newestFirst(a: Debrief, b: Debrief): number {
  return a.createdAt < b.createdAt ? 1 : -1;
}

class MemoryDebriefs implements DebriefStore {
  private map = new Map<string, Debrief>();
  async create(d: Debrief) {
    this.map.set(d.id, d);
  }
  async get(id: string) {
    return this.map.get(id) ?? null;
  }
  async update(id: string, patch: Partial<Debrief>) {
    const cur = this.map.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    this.map.set(id, next);
    return next;
  }
  async listByStudent(studentId: string) {
    return [...this.map.values()].filter((d) => d.studentId === studentId).sort(newestFirst);
  }
  async listAll() {
    return [...this.map.values()].sort(newestFirst);
  }
}

class BlobDebriefs implements DebriefStore {
  private async blobs() {
    const { getStore } = await import('@netlify/blobs');
    return getStore({ name: 'precas-debriefs', consistency: 'strong' });
  }
  private async index() {
    const { getStore } = await import('@netlify/blobs');
    return getStore({ name: 'precas-debrief-index', consistency: 'strong' });
  }
  async create(d: Debrief) {
    const s = await this.blobs();
    await s.setJSON(d.id, d);
    try {
      const ix = await this.index();
      const ids = ((await ix.get(d.studentId, { type: 'json' })) as string[] | null) ?? [];
      if (!ids.includes(d.id)) await ix.setJSON(d.studentId, [...ids, d.id]);
    } catch {
      // The index is a cache; listAll() still finds everything.
    }
  }
  async get(id: string) {
    try {
      const s = await this.blobs();
      return ((await s.get(id, { type: 'json' })) as Debrief | null) ?? null;
    } catch {
      return null;
    }
  }
  async update(id: string, patch: Partial<Debrief>) {
    const cur = await this.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    const s = await this.blobs();
    await s.setJSON(id, next);
    return next;
  }
  async listByStudent(studentId: string) {
    try {
      const ix = await this.index();
      const ids = ((await ix.get(studentId, { type: 'json' })) as string[] | null) ?? [];
      const rows = await Promise.all(ids.map((id) => this.get(id)));
      return rows.filter((r): r is Debrief => Boolean(r)).sort(newestFirst);
    } catch {
      return [];
    }
  }
  async listAll() {
    try {
      const s = await this.blobs();
      const { blobs } = await s.list();
      const rows = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' }) as Promise<Debrief | null>));
      return rows.filter((r): r is Debrief => Boolean(r)).sort(newestFirst);
    } catch {
      return [];
    }
  }
}

function onNetlify(): boolean {
  return process.env.NETLIFY === 'true' || Boolean(process.env.NETLIFY_BLOBS_CONTEXT);
}

const g = globalThis as unknown as { __precasDebriefs?: DebriefStore };
export const debriefs: DebriefStore = g.__precasDebriefs ?? (g.__precasDebriefs = onNetlify() ? new BlobDebriefs() : new MemoryDebriefs());
