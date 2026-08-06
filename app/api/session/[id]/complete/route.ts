import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { buildSummary } from '@/lib/summary';
import { apiError, type ApiResult, type SessionSummary } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Pure arithmetic over the per-answer evaluations that were already computed
 * during the interview. No AI call here, so it cannot time out and the results
 * page is instant.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await store.get(params.id);
  if (!session) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session', 'Your session has expired. Please start again.'),
      { status: 404 }
    );
  }

  const summary = buildSummary(session);
  await store.update(params.id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    summary,
  });

  const result: ApiResult<SessionSummary> = { ok: true, data: summary };
  return NextResponse.json(result);
}
