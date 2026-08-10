import { NextResponse } from 'next/server';
import { z } from 'zod';
import { platform, type Consultancy } from '@/lib/platform';
import { store } from '@/lib/store';
import { apiError } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('login'),
    slug: z.string().min(1).max(60),
    passcode: z.string().min(1).max(60),
  }),
  z.object({
    action: z.literal('updateBranding'),
    slug: z.string().min(1).max(60),
    passcode: z.string().min(1).max(60),
    logoUrl: z.string().url().max(500).nullable(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
]);

/**
 * Consultancy portal API.
 *
 * The isolation rule: a consultancy is looked up by its OWN slug and passcode,
 * and every record returned is filtered by that consultancy's id. There is no
 * parameter through which one consultancy can name another. A suspended or
 * pending consultancy cannot read anything at all.
 */
export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(apiError('BAD_REQUEST', 'invalid body', 'Something went wrong.'), {
      status: 400,
    });
  }

  const c = await platform.getConsultancy(body.slug);
  if (!c || c.passcode !== body.passcode) {
    // Same message either way, so the response cannot be used to discover
    // which consultancy slugs exist.
    return NextResponse.json(
      apiError('FORBIDDEN', 'bad credentials', 'That name or passcode is not correct.'),
      { status: 403 }
    );
  }

  if (c.status !== 'approved') {
    return NextResponse.json(
      apiError(
        'NOT_APPROVED',
        'status ' + c.status,
        c.status === 'pending'
          ? 'Your account is waiting for approval. You will be contacted shortly.'
          : 'This account has been suspended. Please get in touch.'
      ),
      { status: 403 }
    );
  }

  if (body.action === 'updateBranding') {
    const updated: Consultancy = {
      ...c,
      logoUrl: body.logoUrl,
      primaryColor: body.primaryColor,
    };
    await platform.saveConsultancy(updated);
    return NextResponse.json({ ok: true, data: publicView(updated) });
  }

  // login: return only this consultancy's own data
  const allStudents = await platform.listStudents();
  const mine = allStudents.filter((s) => s.consultancyId === c.id);

  const sessionIds = mine.flatMap((s) => s.sessionIds);
  const sessions = (
    await Promise.all(sessionIds.map((id) => store.get(id)))
  ).filter((s): s is NonNullable<typeof s> => Boolean(s));

  const completed = sessions.filter((s) => s.status === 'completed');
  const avgScore = completed.length
    ? Math.round(
        completed.reduce((n, s) => n + (s.summary?.overallScore ?? 0), 0) / completed.length
      )
    : 0;

  return NextResponse.json({
    ok: true,
    data: {
      consultancy: publicView(c),
      students: mine,
      stats: {
        studentCount: mine.length,
        seatsLeft: Math.max(0, c.seatsTotal - c.seatsUsed),
        interviewsCompleted: completed.length,
        averageScore: avgScore,
      },
      recentSessions: sessions
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
        .slice(0, 25)
        .map((s) => ({
          id: s.id,
          status: s.status,
          createdAt: s.createdAt,
          score: s.summary?.overallScore ?? null,
          band: s.summary?.band ?? null,
          answered: s.answers.filter((a) => a.evaluation).length,
          total: s.questionIds.length,
        })),
    },
  });
}

/** Never send the passcode back to the browser. */
function publicView(c: Consultancy) {
  const { passcode: _omit, ...rest } = c;
  return rest;
}
