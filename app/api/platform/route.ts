import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  platform,
  isOwner,
  isSuperAdmin,
  revenueSummary,
  DEFAULT_SETTINGS,
  type Consultancy,
} from '@/lib/platform';
import { apiError } from '@/lib/types';

export const runtime = 'nodejs';

/** Public read: only whether the platform is up, and who to call if it is not. */
export async function GET() {
  const s = await platform.getSettings();
  return NextResponse.json({
    ok: true,
    data: {
      maintenanceMode: s.maintenanceMode,
      maintenanceTitle: s.maintenanceTitle,
      maintenanceMessage: s.maintenanceMessage,
      contactName: s.contactName,
      contactPhone: s.contactPhone,
    },
  });
}

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('setMaintenance'),
    ownerKey: z.string().min(1),
    enabled: z.boolean(),
    title: z.string().max(200).optional(),
    message: z.string().max(2000).optional(),
    contactName: z.string().max(120).optional(),
    contactPhone: z.string().max(40).optional(),
  }),
  z.object({
    action: z.literal('overview'),
    superKey: z.string().min(1),
  }),
  z.object({
    action: z.literal('setConsultancyStatus'),
    superKey: z.string().min(1),
    consultancyId: z.string().min(1),
    status: z.enum(['pending', 'approved', 'suspended']),
  }),
  z.object({
    action: z.literal('createConsultancy'),
    superKey: z.string().min(1),
    name: z.string().min(2).max(120),
    slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/),
    contactName: z.string().max(120).default(''),
    contactPhone: z.string().max(40).default(''),
    seatsTotal: z.number().int().min(0).max(100000).default(0),
    paidNpr: z.number().int().min(0).default(0),
    passcode: z.string().min(4).max(60),
  }),
]);

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', 'Something went wrong.'),
      { status: 400 }
    );
  }

  // ---- Owner only. A super admin cannot reach this branch. ----
  if (body.action === 'setMaintenance') {
    if (!isOwner(body.ownerKey)) {
      return NextResponse.json(apiError('FORBIDDEN', 'bad owner key', 'Not allowed.'), {
        status: 403,
      });
    }
    const current = await platform.getSettings();
    const next = {
      ...DEFAULT_SETTINGS,
      ...current,
      maintenanceMode: body.enabled,
      maintenanceTitle: body.title ?? current.maintenanceTitle,
      maintenanceMessage: body.message ?? current.maintenanceMessage,
      contactName: body.contactName ?? current.contactName,
      contactPhone: body.contactPhone ?? current.contactPhone,
      enabledAt: body.enabled ? new Date().toISOString() : null,
      enabledBy: body.enabled ? 'owner' : null,
    };
    await platform.saveSettings(next);
    return NextResponse.json({ ok: true, data: next });
  }

  // ---- Everything below is super admin. ----
  if (!isSuperAdmin(body.superKey)) {
    return NextResponse.json(apiError('FORBIDDEN', 'bad super key', 'Not allowed.'), {
      status: 403,
    });
  }

  if (body.action === 'overview') {
    const [consultancies, students] = await Promise.all([
      platform.listConsultancies(),
      platform.listStudents(),
    ]);
    return NextResponse.json({
      ok: true,
      data: {
        consultancies,
        students,
        revenue: revenueSummary(consultancies, students),
      },
    });
  }

  if (body.action === 'setConsultancyStatus') {
    const c = await platform.getConsultancy(body.consultancyId);
    if (!c) {
      return NextResponse.json(apiError('NOT_FOUND', 'no consultancy', 'Not found.'), {
        status: 404,
      });
    }
    const updated: Consultancy = {
      ...c,
      status: body.status,
      approvedAt: body.status === 'approved' ? new Date().toISOString() : c.approvedAt,
    };
    await platform.saveConsultancy(updated);
    return NextResponse.json({ ok: true, data: updated });
  }

  // createConsultancy
  const existing = await platform.getConsultancy(body.slug);
  if (existing) {
    return NextResponse.json(
      apiError('DUPLICATE', 'slug taken', 'That short name is already used.'),
      { status: 409 }
    );
  }
  const created: Consultancy = {
    id: crypto.randomUUID(),
    slug: body.slug,
    name: body.name,
    contactName: body.contactName,
    contactPhone: body.contactPhone,
    logoUrl: null,
    primaryColor: '#0d1b2a',
    status: 'pending',
    seatsTotal: body.seatsTotal,
    seatsUsed: 0,
    bundleCode: null,
    paidNpr: body.paidNpr,
    createdAt: new Date().toISOString(),
    approvedAt: null,
    passcode: body.passcode,
  };
  await platform.saveConsultancy(created);
  return NextResponse.json({ ok: true, data: created });
}
