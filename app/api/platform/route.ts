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
import { DEFAULT_BRAND_HEX } from '@/lib/branding';
import { couponOrderTotal, couponPacks } from '@/lib/data/plans';
import {
  formatCouponCode,
  issueCoupons,
  newHandoverPasscode,
  priceMismatchMessage,
} from '@/lib/coupons';

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
 *
 * The ONE deliberate exception is the freshly generated HANDOVER code on
 * `createConsultancy` and `resetConsultancyPasscode`: it is returned once, in
 * its own named field, because the whole point of it is to be handed over.
 */
/**
 * D-18. Consultancy lifecycle events were the only back-office actions with no
 * record at all.
 *
 * Creating a consultancy hands out coupons and records money received.
 * Suspending one cuts a partner off. If a consultancy ever disputes how many
 * coupons they were given, or what they paid, there has to be something to
 * point at.
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

/**
 * How many coupons of each pack. Keys are pack codes ('prep', 'serious'); the
 * server checks them against the plan table, never trusts them.
 */
const CouponCounts = z.record(z.string().min(1).max(40), z.number().int().min(0).max(500));

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
  /**
   * CREATE A CONSULTANCY, the coupon way (3 September 2026).
   *
   * The super admin enters who they are, how many coupons of each pack they
   * have paid for, and the amount received. The server does the arithmetic and
   * refuses a mismatch. The passcode is GENERATED here, never typed: the
   * client's decision is that the super admin should not choose it.
   *
   * `seatsTotal` and `passcode` remain accepted for the older seat model, which
   * the regression suites still exercise and which some partners may still be
   * on. A request with neither coupons nor seats simply creates an empty
   * account.
   */
  z.object({
    action: z.literal('createConsultancy'),
    superKey: z.string().min(1),
    name: z.string().min(2).max(120),
    slug: z
      .string()
      .min(2)
      .max(60)
      .regex(
        /^[a-z0-9-]+$/,
        'The short name can only use lower case letters, numbers and dashes, with no spaces. For example: global-edu.'
      ),
    contactName: z.string().max(120).default(''),
    contactPhone: z.string().max(40).default(''),
    coupons: CouponCounts.optional(),
    paidNpr: z.number().int().min(0).max(10_000_000).default(0),
    seatsTotal: z.number().int().min(0).max(100000).default(0),
    passcode: z.string().min(4).max(60).optional(),
  }),
  /**
   * More coupons for an existing consultancy, against money already received.
   * The same price check as creation: the coupons and the amount must agree.
   */
  z.object({
    action: z.literal('addCoupons'),
    superKey: z.string().min(1),
    consultancyId: z.string().min(1),
    coupons: CouponCounts,
    paidNpr: z.number().int().min(0).max(10_000_000),
  }),
  /**
   * They forgot their passcode. A fresh handover code is generated, shown once,
   * and they are made to choose their own again on the next sign-in. The super
   * admin never types the new code either.
   */
  z.object({
    action: z.literal('resetConsultancyPasscode'),
    superKey: z.string().min(1),
    consultancyId: z.string().min(1),
  }),
  /**
   * DELETE a consultancy. For a test entry or a mistake, never for a partner
   * with real students: refused the moment one of its coupons has been used
   * or a student is bound to it, because those rows belong to real people.
   * The super admin has to type the short name back, so it cannot be a slip.
   */
  z.object({
    action: z.literal('deleteConsultancy'),
    superKey: z.string().min(1),
    consultancyId: z.string().min(1),
    confirmSlug: z.string().min(1).max(60),
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
    rateLimitPenalise(`platform-auth:${clientIp(req)}`, RL.auth);
    return NextResponse.json(apiError('FORBIDDEN', 'bad super key', 'Not allowed.'), {
      status: 403,
    });
  }

  // Authenticated work gets its own, generous budget. See LIMITS.backOffice.
  const work = rateLimit(`platform-work:${clientIp(req)}`, RL.backOffice);
  if (!work.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'back-office flood', 'That is a lot of requests at once. Give it a moment and try again.'),
      { status: 429, headers: { 'Retry-After': String(work.retryAfterSec) } }
    );
  }

  /**
   * EVERY failure below comes back as JSON with the real reason.
   *
   * The client tried to add a consultancy and it "did not add it", with no
   * usable explanation. A store failure used to escape as a bare 500 with an
   * HTML body; the screen could not parse it and printed "Could not reach the
   * server", which is not what happened. From here the sentence names the
   * cause, and if the cause is a missing database table it says which one and
   * what to run.
   */
  try {
    return await superAdminAction(body);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    console.error('[platform] super admin action failed:', why);
    return NextResponse.json(
      apiError('STORE_ERROR', why, `We could not save this. ${why}`),
      { status: 500 }
    );
  }
}

type SuperBody = Extract<z.infer<typeof Body>, { superKey: string }>;

async function superAdminAction(body: SuperBody): Promise<NextResponse> {
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
      `${c.name} (${c.slug}) set to ${body.status}. NPR ${c.paidNpr} recorded as paid.`
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

  // ------------------------------------------------------------ addCoupons
  if (body.action === 'addCoupons') {
    const c = await platform.getConsultancy(body.consultancyId);
    if (!c) {
      return NextResponse.json(apiError('NOT_FOUND', 'no consultancy', 'Not found.'), { status: 404 });
    }
    const mismatch = priceMismatchMessage(body.coupons, body.paidNpr);
    if (mismatch) {
      return NextResponse.json(apiError('PRICE_MISMATCH', 'coupons vs paid', mismatch), { status: 400 });
    }
    const order = couponOrderTotal(body.coupons);
    const issued = await issueCoupons(c.id, body.coupons, 'super_admin');
    const updated: Consultancy = { ...c, paidNpr: (c.paidNpr ?? 0) + body.paidNpr };
    await platform.saveConsultancy(updated);
    await auditPlatform(
      'issue_coupons',
      c.id,
      `NPR ${c.paidNpr ?? 0} paid so far`,
      `NPR ${updated.paidNpr} paid so far`,
      `${c.name} (${c.slug}) bought ${order.totalCoupons} more coupon(s): ${order.lines
        .map((l) => `${l.count} ${l.name}`)
        .join(', ')} for NPR ${body.paidNpr}.`
    );
    return NextResponse.json({
      ok: true,
      data: {
        consultancy: withoutPasscode(updated),
        coupons: issued.map((cp) => ({ code: formatCouponCode(cp.code), packCode: cp.packCode })),
        message: `${order.totalCoupons} coupon(s) added. They appear in ${c.name}'s portal straight away.`,
      },
    });
  }

  // ------------------------------------------------ resetConsultancyPasscode
  if (body.action === 'resetConsultancyPasscode') {
    const c = await platform.getConsultancy(body.consultancyId);
    if (!c) {
      return NextResponse.json(apiError('NOT_FOUND', 'no consultancy', 'Not found.'), { status: 404 });
    }
    const handover = newHandoverPasscode();
    await platform.saveConsultancy({
      ...c,
      passcode: handover,
      passcodeIsTemporary: true,
      passcodeChangedAt: null,
    });
    // Recorded, and the code itself is NEVER written to the audit trail.
    await auditPlatform(
      'reset_passcode',
      c.id,
      'own passcode',
      'handover code',
      `${c.name} (${c.slug}) was issued a new handover code by the super admin. They must choose their own again on the next sign-in.`
    );
    return NextResponse.json({
      ok: true,
      data: {
        slug: c.slug,
        name: c.name,
        handoverPasscode: handover,
        message: `New temporary passcode issued for ${c.name}. Send it to them; they will be asked to choose their own the first time they sign in with it.`,
      },
    });
  }

  // ------------------------------------------------------ deleteConsultancy
  if (body.action === 'deleteConsultancy') {
    const c = await platform.getConsultancy(body.consultancyId);
    if (!c) {
      return NextResponse.json(apiError('NOT_FOUND', 'no consultancy', 'Not found.'), { status: 404 });
    }
    if (body.confirmSlug.trim().toLowerCase() !== c.slug) {
      return NextResponse.json(
        apiError('CONFIRM_MISMATCH', 'slug not confirmed', `Type the short name exactly, "${c.slug}", to delete it. Nothing was changed.`),
        { status: 400 }
      );
    }
    const r = repo();
    const [coupons, bound] = await Promise.all([
      r.listCoupons({ consultancyId: c.id }),
      r.listStudents({ consultancyId: c.id }),
    ]);
    const used = coupons.filter((cp) => cp.redeemedAt).length;
    if (used > 0 || bound.length > 0) {
      return NextResponse.json(
        apiError(
          'HAS_STUDENTS',
          `${used} used coupons, ${bound.length} students`,
          `${c.name} cannot be deleted: ${used} of its coupons ${used === 1 ? 'has' : 'have'} been used and ${bound.length} student${bound.length === 1 ? ' is' : 's are'} attached to it. Those records belong to real people. Suspend it instead.`
        ),
        { status: 409 }
      );
    }
    const removed = await r.deleteCoupons(c.id);
    await platform.deleteConsultancy(c.id);
    await auditPlatform(
      'delete_consultancy',
      c.id,
      `${coupons.length} coupons, NPR ${c.paidNpr} recorded`,
      'deleted',
      `${c.name} (${c.slug}) deleted by the super admin with ${removed} unused coupon(s). No student was attached.`
    );
    return NextResponse.json({
      ok: true,
      data: {
        deleted: true,
        message: `${c.name} deleted, with ${removed} unused coupon(s). Its NPR ${c.paidNpr.toLocaleString()} no longer counts in revenue.`,
      },
    });
  }

  // ------------------------------------------------------ createConsultancy
  const existing = await platform.getConsultancy(body.slug);
  if (existing) {
    return NextResponse.json(
      apiError('DUPLICATE', 'slug taken', `The short name "${body.slug}" is already used by another consultancy. Please choose a different one.`),
      { status: 409 }
    );
  }

  /**
   * THE PRICE CHECK. The whole fraud guard is these lines.
   *
   * When coupons are requested, the amount received must equal exactly what
   * those coupons cost at the wholesale prices in plans.ts. No rounding, no
   * "close enough". The super admin is shown the working when it does not.
   */
  const counts = body.coupons ?? {};
  const wantsCoupons = Object.values(counts).some((n) => n > 0) || body.coupons !== undefined;
  if (wantsCoupons) {
    const mismatch = priceMismatchMessage(counts, body.paidNpr);
    if (mismatch) {
      return NextResponse.json(apiError('PRICE_MISMATCH', 'coupons vs paid', mismatch), { status: 400 });
    }
  }
  const order = couponOrderTotal(counts);

  const id = crypto.randomUUID();
  const handover = body.passcode ?? newHandoverPasscode();

  // Coupons FIRST. If the coupon table is missing or the store is down this
  // throws before any consultancy row exists, so there is never an account
  // with money recorded against it and no coupons to show for it.
  const issued = wantsCoupons ? await issueCoupons(id, counts, 'super_admin') : [];

  const created: Consultancy = {
    id,
    slug: body.slug,
    name: body.name,
    contactName: body.contactName,
    contactPhone: body.contactPhone,
    logoUrl: null,
    primaryColor: DEFAULT_BRAND_HEX,
    /**
     * APPROVED ON CREATION. They have paid, in advance, before this form is
     * even opened: that is the whole coupon lifecycle. A second "approve" click
     * was a step with nothing to decide. Suspend still exists for the day it
     * is needed.
     */
    status: 'approved',
    seatsTotal: body.seatsTotal,
    seatsUsed: 0,
    bundleCode: null,
    paidNpr: body.paidNpr,
    createdAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    passcode: handover,
    /**
     * A HANDOVER code, not their passcode. We generated it, so we know it, so
     * it gets them in once and the portal refuses to show them anything until
     * they replace it with one only they know.
     */
    passcodeIsTemporary: true,
    passcodeChangedAt: null,
  };
  await platform.saveConsultancy(created);
  await auditPlatform(
    'create_consultancy',
    created.id,
    null,
    `${order.totalCoupons} coupons`,
    `${created.name} (${created.slug}) created with ${order.lines
      .map((l) => `${l.count} ${l.name}`)
      .join(', ') || 'no coupons'}${created.seatsTotal ? `, ${created.seatsTotal} seats` : ''}, NPR ${created.paidNpr} recorded as paid.`
  );
  if (issued.length > 0) {
    await auditPlatform(
      'issue_coupons',
      created.id,
      null,
      `NPR ${created.paidNpr} paid so far`,
      `${created.name} (${created.slug}) issued ${issued.length} coupon(s) on creation.`
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      ...withoutPasscode(created),
      /** Returned ONCE, here, because it exists to be handed over. */
      handoverPasscode: handover,
      coupons: issued.map((cp) => ({ code: formatCouponCode(cp.code), packCode: cp.packCode })),
      couponLines: order.lines,
      couponPacks: couponPacks().map((p) => ({ code: p.code, name: p.name })),
      message: `${created.name} is set up with ${issued.length} coupon(s). Copy the message below and send it to them.`,
    },
  });
}
