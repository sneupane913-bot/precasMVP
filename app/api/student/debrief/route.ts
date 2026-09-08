import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentStudent } from '@/lib/auth/session';
import { rateLimit, clientIp, LIMITS as RL } from '@/lib/rate-limit';
import { apiError } from '@/lib/types';
import { debriefs, debriefProblem, type Debrief } from '@/lib/debriefs';
import { DEBRIEF_RULES } from '@/lib/debrief-rules';
import { getInstitution, ALL_INSTITUTIONS } from '@/lib/data/institutions';

export const runtime = 'nodejs';

/**
 * A student tells us what their real interview asked (see lib/debriefs.ts).
 *
 * The reward is NOT granted here. A person reads the debrief first, because
 * the whole value of it is that it is true and specific, and a form cannot
 * judge that. The student is told exactly that on /free-mock.
 */
const Body = z.object({
  universityName: z.string().trim().min(2).max(120),
  interviewDate: z.string().trim().max(10),
  format: z.enum(['cas_shield_video', 'live_video', 'phone', 'in_person', 'other']),
  questionCount: z.number().int().min(1).max(60).nullable().optional(),
  minutes: z.number().int().min(1).max(180).nullable().optional(),
  questions: z.array(z.string().trim().max(300)).max(DEBRIEF_RULES.maxQuestions),
  outcome: z.enum(['passed', 'resit', 'failed', 'waiting']),
  notes: z.string().trim().max(1000).optional().default(''),
});

function matchInstitution(name: string): string | null {
  const n = name.trim().toLowerCase();
  const hit = ALL_INSTITUTIONS.find((i) => i.name.toLowerCase() === n || i.shortName.toLowerCase() === n || i.slug === n || i.id === n);
  return hit?.id ?? getInstitution(name)?.id ?? null;
}

export async function GET() {
  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(apiError('NOT_SIGNED_IN', 'no student session', 'Please sign in first.'), { status: 401 });
  }
  const mine = await debriefs.listByStudent(student.id);
  return NextResponse.json({
    ok: true,
    data: {
      debriefs: mine.map((d) => ({
        id: d.id,
        universityName: d.universityName,
        interviewDate: d.interviewDate,
        status: d.status,
        reviewNote: d.reviewNote,
        createdAt: d.createdAt,
        questions: d.questions.length,
      })),
      rules: DEBRIEF_RULES,
      approved: mine.filter((d) => d.status === 'approved').length,
      pending: mine.some((d) => d.status === 'pending'),
    },
  });
}

export async function POST(req: Request) {
  const rl = rateLimit(`debrief:${clientIp(req)}`, RL.sessionCreate);
  if (!rl.allowed) {
    return NextResponse.json(apiError('RATE_LIMITED', 'too many debriefs', 'Please wait a minute and try again.'), {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSec) },
    });
  }
  const student = await currentStudent();
  if (!student) {
    return NextResponse.json(apiError('NOT_SIGNED_IN', 'no student session', 'Please sign in first so we know whose debrief this is.'), {
      status: 401,
    });
  }
  if (!student.whatsappNumber || !student.name) {
    return NextResponse.json(
      apiError('PROFILE_REQUIRED', 'no profile', 'Add your name and WhatsApp number first, so we can reach you about your free mock.', {
        label: 'Add your details',
        href: '/welcome?next=/free-mock',
      }),
      { status: 403 }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(apiError('BAD_REQUEST', 'invalid body', 'Something in the form is not right. Please check it and try again.'), {
      status: 400,
    });
  }

  const questions = body.questions.map((q) => q.trim()).filter(Boolean);
  const problem = debriefProblem({ questions, universityName: body.universityName, interviewDate: body.interviewDate });
  if (problem) {
    return NextResponse.json(apiError('BAD_REQUEST', 'debrief rejected by rules', problem), { status: 400 });
  }

  const mine = await debriefs.listByStudent(student.id);
  if (mine.some((d) => d.status === 'pending')) {
    return NextResponse.json(
      apiError('DEBRIEF_PENDING', 'one pending at a time', 'You already have a debrief waiting to be checked. We will message you once it is reviewed.'),
      { status: 409 }
    );
  }
  if (mine.filter((d) => d.status === 'approved').length >= DEBRIEF_RULES.maxApprovedPerStudent) {
    return NextResponse.json(
      apiError('DEBRIEF_CAP', 'cap reached', `Thank you, you have already earned the maximum of ${DEBRIEF_RULES.maxApprovedPerStudent} free mocks from debriefs.`),
      { status: 409 }
    );
  }
  if (mine.some((d) => d.interviewDate === body.interviewDate && d.universityName.toLowerCase() === body.universityName.trim().toLowerCase())) {
    return NextResponse.json(
      apiError('DEBRIEF_DUPLICATE', 'same interview', 'You have already told us about this interview.'),
      { status: 409 }
    );
  }

  const d: Debrief = {
    id: crypto.randomUUID(),
    studentId: student.id,
    institutionId: matchInstitution(body.universityName),
    universityName: body.universityName.trim(),
    interviewDate: body.interviewDate,
    format: body.format,
    questionCount: body.questionCount ?? null,
    minutes: body.minutes ?? null,
    questions,
    outcome: body.outcome,
    notes: body.notes ?? '',
    status: 'pending',
    reviewNote: null,
    reviewedAt: null,
    createdAt: new Date().toISOString(),
  };
  await debriefs.create(d);
  return NextResponse.json({ ok: true, data: { id: d.id, status: d.status } });
}
