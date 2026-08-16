import { NextResponse } from 'next/server';
import { z, type ZodError } from 'zod';
import { zodMessage } from '@/lib/zod-message';
import { supportWhatsapp } from '@/lib/support';
import {
  platform,
  isOwner,
  isSuperAdminAsync,
  revenueSummary,
  DEFAULT_SETTINGS,
  type Consultancy,
} from '@/lib/platform';
import {
  rateLimit,
  rateLimitPeek,
  rateLimitPenalise,
  clientIp,
  LIMITS as RL,
} from '@/lib/rate-limit';
import { apiError } from '@/lib/types';
import { repo } from '@/lib/db';
import type { ApprovalAudit } from '@/lib/db/types';

export const runtime = 'nodejs';

/**
 * QA-209: this returned the full settings object to anyone, including fields
 * that describe our internal state. It now returns ONLY what a student staring
 * at a maintenance screen needs, and only while maintenance is actually on.
 * When the platform is up it says so and nothing else.
 */
/**
 * D-16. Strip the passcode from anything leaving this route.
 *
 * Three handlers returned the whole Consultancy row: `overview`,
 * `setConsultancyStatus` and `createConsultancy`. `/api/admin` had always
 * stripped it, which is exactly why rule A-18 was recorded as PROVEN, the
 * automated assertion checked that route and nobody checked this one.
 *
 * A single choke point rather than three call sites, so a fourth handler added
 * later cannot quietly reintroduce it.
 */
/**
 * D-18. Consultancy lifecycle events were the only back-office actions with no
 * record at all.
 *
 * Creating a consultancy hands out seats and records money received. Approving
 * one switches on their link so those seats can be taken. Suspending one cuts a
 * partner off. None of the three wrote an audit row, while a consultancy
 * changing its OWN passcode was audited carefully with before and after values.
 * The discipline was applied to the smaller thing and not the larger one.
 *
 * If a consultancy ever disputes when they were approved, or how many seats
 * they were given, there has to be something to point at.
 */
async function auditPlatform(
  action: ApprovalAudit['action'],
  subjectId: string,
  before: string | null,
  after: string | null,
  note: string
): Promise<void> {
  try {
    await repo().appendAudit({
      id: crypto.randomUUID(),
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action,
      subjectId,
      before,
      after,
      note,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // An audit failure must never block the money action it describes.
  }
}

function withoutPasscode(c: Consultancy): Omit<Consultancy, 'passcode'> {
  const { passcode: _secret, ...safe } = c;
  return safe;
}

export async function GET() {
  const s = await platform.getSettings();

  /**
   * D-17. The support number is returned even when nothing is wrong.
   *
   * The checkout used to get the number ONLY on a successful `create`, so any
   * failure on that call removed the "Talk to a person" card from the one
   * screen where money is in flight. The number is already sent to every
   * student on every successful checkout, so publishing it here leaks nothing
   * and means no screen can ever lose its way to a human.
   */
  if (!s.maintenanceMode) {
    return NextResponse.json({
      ok: true,
      // Through the helper, so it picks up the env fallback exactly like every
      // other screen rather than being the one place that reads settings raw.
      data: { maintenanceMode: false, supportWhatsapp: await supportWhatsapp() },
    });
  }

  return NextResponse.json({
    ok: true,
    data: {
      maintenanceMode: true,
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
  /**
   * D-13. Read back the saved maintenance message, for the owner only.
   *
   * The public GET deliberately withholds the contact name and number while the
   * platform is UP, because that is the owner's personal number and there is no
   * reason to publish it. But the owner's own screen still has to load what is
   * saved, or the fields come back blank on every visit and a second pause
   * ships an emergency screen with no phone number on it.
   */
  z.object({
    action: z.literal('getMaintenance'),
    ownerKey: z.string().min(1),
  }),
  z.object({
    action: z.literal('setConsultancyStatus'),
    superKey: z.string().min(1),
    consultancyId: z.string().min(1),
    status: z.enum(['pending', 'approved', 'suspended']),
  }),
  /**
   * D-31. Mark a consultancy's network as a lab.
   *
   * Raises the per-device account threshold from 4 to 40 for that IP, which is
   * the whole reason `DEVICE_ALLOWLISTED_THRESHOLD` exists. Without a way to
   * set this the fifth student to sit at a shared lab machine was soft-denied
   * their free trial, at the client's most important kind of customer.
   */
  z.object({
    action: z.literal('setAllowlistedIps'),
    superKey: z.string().min(1),
    consultancyId: z.string().min(1),
    ips: z.array(z.string().min(3).max(45)).max(20),
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
  /**
   * PEEK, do not consume. `auth` is a brute-force budget and brute force means
   * GUESSING — so only a WRONG passcode may spend from it. Consuming here
   * charged every legitimate action the same as an attack: loading /super
   * fires four actions, which spent four of five, and the next click was
   * refused with "Too many attempts". See LIMITS.backOffice.
   */
  const rl = rateLimitPeek(`platform-auth:${clientIp(req)}`, RL.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'auth attempts', 'Too many attempts. Please wait five minutes and try again.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    // D-22. Name the field and the limit instead of six generic words.
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', zodMessage(e as ZodError)),
      { status: 400 }
    );
  }

  // ---- Owner only. A super admin cannot reach this branch. ----
  if (body.action === 'getMaintenance') {
    if (!isOwner(body.ownerKey)) {
      rateLimitPenalise(`platform-auth:${clientIp(req)}`, RL.auth);
      return NextResponse.json(apiError('FORBIDDEN', 'bad owner key', 'Not allowed.'), { status: 403 });
    }
    const cur = await platform.getSettings();
    return NextResponse.json({
      ok: true,
      data: {
        maintenanceMode: cur.maintenanceMode,
        maintenanceTitle: cur.maintenanceTitle,
        maintenanceMessage: cur.maintenanceMessage,
        contactName: cur.contactName,
        contactPhone: cur.contactPhone,
      },
    });
  }

  if (body.action === 'setMaintenance') {
    if (!isOwner(body.ownerKey)) {
      rateLimitPenalise(`platform-auth:${clientIp(req)}`, RL.auth);
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
      // QA H3: a control whose stated purpose is a commercial dispute needs a
      // record. Append only, newest first, capped at 50.
      ownerAudit: [
        {
          at: new Date().toISOString(),
          action: body.enabled ? ('paused' as const) : ('resumed' as const),
          ip: clientIp(req),
          userAgent: (req.headers.get('user-agent') ?? '').slice(0, 200),
        },
        ...(current.ownerAudit ?? []),
      ].slice(0, 50),
    };
    await platform.saveSettings(next);
    return NextResponse.json({ ok: true, data: next });
  }

  // ---- Everything below is super admin. ----
  if (!(await isSuperAdminAsync(body.superKey))) {
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
        // D-16. This used to return the whole Consultancy row, PASSCODE AND
        // ALL, in plain text. Not the handover code we chose either: the
        // private one the consultancy picked precisely so we would not know it,
        // on the very screen that told them "your student list should be yours
        // alone". `/api/admin` had always stripped it, which is why the rule
        // was recorded as proven; nobody checked this route.
        consultancies: consultancies.map(withoutPasscode),
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
    await auditPlatform(
      body.status === 'approved' ? 'approve_consultancy' : 'suspend_consultancy',
      c.id,
      c.status,
      body.status,
      `${c.name} (${c.slug}) set to ${body.status}. ${c.seatsTotal} seats, NPR ${c.paidNpr} recorded as paid.`
    );
    return NextResponse.json({ ok: true, data: withoutPasscode(updated) });
  }

  if (body.action === 'setAllowlistedIps') {
    const c = await platform.getConsultancy(body.consultancyId);
    if (!c) {
      return NextResponse.json(apiError('NOT_FOUND', 'no consultancy', 'Not found.'), { status: 404 });
    }
    const updated: Consultancy = { ...c, allowlistedIps: body.ips };
    await platform.saveConsultancy(updated);
    await auditPlatform(
      'set_allowlisted_ips',
      c.id,
      String((c.allowlistedIps ?? []).length),
      String(body.ips.length),
      `${c.name} (${c.slug}) lab networks set to ${body.ips.length} address(es).`
    );
    return NextResponse.json({
      ok: true,
      data: {
        allowlistedIps: body.ips,
        message:
          body.ips.length > 0
            ? 'Saved. Students on those networks can share a machine without losing their free questions.'
            : 'Saved. That consultancy is back to the normal shared-device limit.',
      },
    });
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
    /**
     * A HANDOVER code, not their passcode. We know it, because we just typed
     * it, so it gets them in once and the portal refuses to show them anything
     * until they replace it with one only they know.
     */
    passcodeIsTemporary: true,
    passcodeChangedAt: null,
  };
  await platform.saveConsultancy(created);
  await auditPlatform(
    'create_consultancy',
    created.id,
    null,
    `${created.seatsTotal} seats`,
    `${created.name} (${created.slug}) created with ${created.seatsTotal} seats, NPR ${created.paidNpr} recorded as paid.`
  );
  return NextResponse.json({ ok: true, data: withoutPasscode(created) });
}
