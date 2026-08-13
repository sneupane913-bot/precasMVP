import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { startPostTrialWindow } from '@/lib/rewards';
import { buildSummary } from '@/lib/summary';
import { ownsSession } from '@/lib/owner-session';
import { apiError, type ApiResult, type SessionSummary } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Pure arithmetic over the per-answer evaluations that were already computed
 * during the interview. No AI call here, so it cannot time out and the results
 * page is instant.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await store.get(id);
  if (!session || !(await ownsSession(session.ownerId))) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session or not owner', 'Your session has expired. Please start again.'),
      { status: 404 }
    );
  }

  const summary = buildSummary(session);
  await store.update(id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    summary,
  });

  // I9. Finishing the free questions starts the student's own countdown, once.
  // It starts HERE, at a real event, which is what makes the deadline honest.
  // startPostTrialWindow refuses to issue a second one, so it can never become
  // the evergreen timer that resets on every visit.
  if (session.isTrial && session.studentId) {
    await startPostTrialWindow(session.studentId);
  }

  const result: ApiResult<SessionSummary> = { ok: true, data: summary };
  return NextResponse.json(result);
}
