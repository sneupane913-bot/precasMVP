import { NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { ownsSession } from '@/lib/owner-session';
import { platformDown } from '@/lib/platform';
import { resumeIndexOf, answeredCountOf } from '@/lib/resume';
import { apiError } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.object({ questionId: z.string().min(1) });

/**
 * The student chose to pass on this question.
 *
 * This endpoint exists because Skip used to be a browser-only action: it moved
 * a number on screen and told the server nothing. Two things followed, and the
 * client hit both on 14 Aug.
 *
 * The skipped question came back on the next resume, because the server had no
 * idea it had been passed on — so a student could be handed the same question
 * forever. And the browser's index ran ahead of anything the server knew,
 * which is how the room came to read **"Q 8/10 · 1 done, 9 left"**: eight steps
 * forward against one real answer.
 *
 * A skip is a decision the student made. Decisions belong on the server.
 *
 * Deliberately NOT recorded as an answer: it consumes no attempt, produces no
 * transcript and is never scored. A skipped question is unanswered and the
 * report must keep saying so — filing it as a bad answer would score a student
 * on something they explicitly declined to do, which is G-1 in another costume.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }

  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'questionId required', 'Something went wrong. Please try again.'),
      { status: 400 }
    );
  }

  const session = await store.get(id);
  // 404 not 403, so this cannot be used to confirm a session id exists (LIVE-002).
  if (!session || !(await ownsSession(session.ownerId))) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session or not owner', 'We could not find that interview.'),
      { status: 404 }
    );
  }

  // Only a question that is genuinely in this paper, so a crafted request
  // cannot pad the skip list and fast-forward to the end of the interview.
  if (!session.questionIds.includes(parsed.data.questionId)) {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'question not in this session', 'Something went wrong. Please try again.'),
      { status: 400 }
    );
  }

  // Idempotent: a double tap, or a retry after a dropped connection, must not
  // skip two questions.
  const skipped = Array.from(
    new Set([...(session.skippedQuestionIds ?? []), parsed.data.questionId])
  );
  await store.update(id, { skippedQuestionIds: skipped, status: 'in_progress' });

  const next = { ...session, skippedQuestionIds: skipped };
  return NextResponse.json({
    ok: true,
    data: { resumeIndex: resumeIndexOf(next), answeredCount: answeredCountOf(next), skipped },
  });
}
