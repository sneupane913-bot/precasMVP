import { NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { ownsSession } from '@/lib/owner-session';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { platformDown } from '@/lib/platform';
import { apiError, type ApiResult, type FlagType } from '@/lib/types';

export const runtime = 'nodejs';

const FLAG_TYPES = [
  'tab_switch',
  'window_blur',
  'fullscreen_exit',
  'background_noise',
  'low_light',
  'face_not_visible',
  'multiple_faces',
  'no_audio',
  'answer_too_short',
] as const;

const Body = z.object({
  type: z.enum(FLAG_TYPES),
  questionId: z.string().nullable().default(null),
});

/** Cheap and frequent. No AI call, no cost. Capped so it cannot be abused. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


  const { id } = await params;
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json(apiError('BAD_REQUEST', 'invalid flag', 'Something went wrong.'), {
      status: 400,
    });
  }

  const rl = rateLimit(`flag:${clientIp(req)}`, RL.flag);
  if (!rl.allowed) {
    return NextResponse.json({ ok: true, data: { count: -1 } });
  }

  const session = await store.get(id);
  if (!session || !(await ownsSession(session.ownerId))) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session or not owner', 'Your session has expired.'),
      { status: 404 }
    );
  }

  // Hard cap so a misbehaving client cannot grow the record without bound.
  if (session.flags.length >= 500) {
    const capped: ApiResult<{ count: number }> = { ok: true, data: { count: session.flags.length } };
    return NextResponse.json(capped);
  }

  const flags = [
    ...session.flags,
    {
      type: parsed.type as FlagType,
      questionId: parsed.questionId,
      occurredAt: new Date().toISOString(),
    },
  ];
  await store.update(id, { flags });

  const result: ApiResult<{ count: number }> = { ok: true, data: { count: flags.length } };
  return NextResponse.json(result);
}
