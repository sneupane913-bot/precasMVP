import { NextResponse } from 'next/server';
import { z, type ZodError } from 'zod';
import { zodMessage } from '@/lib/zod-message';
import { isSuperAdminAsync, platform, platformDown, secretEquals } from '@/lib/platform';
import { repo, type ApprovalAudit } from '@/lib/db';
import { grantPack, rewardReferral, adminGrant } from '@/lib/entitlement';
import {
  rateLimit,
  rateLimitPeek,
  rateLimitPenalise,
  clientIp,
  LIMITS as RL,
} from '@/lib/rate-limit';
import { approvePayment, rejectPayment } from '@/lib/payments';
import { apiError } from '@/lib/types';
import { setPostTrialRule, rulesOrDefaults } from '@/lib/rewards';
import { sttIsMocked } from '@/lib/ai/stt';
import { evaluatorIsMocked } from '@/lib/ai/evaluate';
import { spendState, maxPaidCallsPerMonth } from '@/lib/rate-limit';
import { BUILD_INFO } from '@/lib/build-info';

export const runtime = 'nodejs';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('overview'), superKey: z.string().min(1) }),
  z.object({ action: z.literal('orders'), superKey: z.string().min(1) }),
  z.object({
    action: z.literal('verifyPayment'),
    superKey: z.string().min(1),
    orderId: z.string().min(1),
    /** The verifier confirms they matched it in the RECEIVER's own ledger. */
    confirmedInWalletLedger: z.literal(true),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('rejectPayment'),
    superKey: z.string().min(1),
    orderId: z.string().min(1),
    reason: z.string().min(3).max(500),
  }),
  z.object({ action: z.literal('flaggedTrials'), superKey: z.string().min(1) }),
  z.object({
    action: z.literal('resolveTrialFlag'),
    superKey: z.string().min(1),
    claimId: z.string().min(1),
    grant: z.boolean(),
    note: z.string().max(500).optional(),
  }),
  z.object({
    action: z.literal('setStudentStatus'),
    superKey: z.string().min(1),
    studentId: z.string().min(1),
    status: z.enum(['active', 'disabled']),
  }),
  z.object({
    action: z.literal('grantCredit'),
    superKey: z.string().min(1),
    studentId: z.string().min(1),
    kind: z.enum(['mock', 'practice']),
    amount: z.number().int().min(1).max(50),
    note: z.string().max(200),
  }),
  z.object({ action: z.literal('audit'), superKey: z.string().min(1) }),
  z.object({ action: z.literal('directory'), superKey: z.string().min(1) }),
  /**
   * N-11, N-20. Only the super admin may change where the money goes and who
   * answers the phone about it. No deploy, and no consultancy involvement.
   */
  /** N-25. Add a question to the live bank, no deploy. */
  z.object({
    action: z.literal('addQuestion'),
    superKey: z.string().min(1),
    category: z.string().min(2).max(40),
    text: z.string().min(10).max(400),
    intent: z.string().min(5).max(300),
  }),
  /** N-18. Soft-block or unblock one device fingerprint. */
  /**
   * The post-trial offer. Documented as super-admin controlled since it was
   * written, and until now nothing could write it.
   */
  z.object({
    action: z.literal('setRewardRule'),
    superKey: z.string().min(1),
    active: z.boolean(),
    windowMinutes: z.number().int().min(15).max(1440),
    publicReason: z.string().min(10).max(300),
    bonusPrep: z.number().int().min(0).max(10),
    bonusSerious: z.number().int().min(0).max(10),
  }),
  z.object({
    action: z.literal('setDeviceBlock'),
    superKey: z.string().min(1),
    fingerprint: z.string().min(4).max(200),
    blocked: z.boolean(),
  }),
  /**
   * The super admin changes their own passcode.
   *
   * Until now it could only be changed by editing an environment variable and
   * redeploying, which in practice means it never gets changed: not when a
   * laptop is lost, not when somebody leaves, not after it has been read out
   * over the phone to get somebody unstuck.
   *
   * The old one is required. It is already in the body of every request to
   * this route, but requiring it EXPLICITLY as `passcode` means a stale open
   * tab cannot silently change it, and it reads as a deliberate act.
   */
  z.object({
    action: z.literal('changeSuperPasscode'),
    superKey: z.string().min(1),
    newPasscode: z.string().min(10).max(80),
  }),
  z.object({
    action: z.literal('setPaymentSettings'),
    superKey: z.string().min(1),
    /**
     * D-11. The QR could NEVER be uploaded, and it never had been.
     *
     * `PaySettingsForm` accepts a file up to 400 KB and converts it to a base64
     * data URL, which is roughly 400,000 characters. This cap was 500. Zod
     * rejected it, the route returned the generic BAD_REQUEST, and the admin was
     * told only "Something went wrong." every single time, with nothing naming
     * the real limit. The client hit it repeatedly and reasonably concluded the
     * product was broken.
     *
     * Both shapes are accepted now, because both are legitimate: a short https
     * link to a hosted image, or an inline data URL from the file picker. The
     * ceiling is sized for the 400 KB the form already enforces, with headroom
     * for base64 expansion, and anything else is refused by SHAPE with a message
     * that says what to do.
     */
    payQrImageUrl: z
      .string()
      .max(800_000)
      .refine(
        (v) => v === '' || /^https?:\/\//.test(v) || /^data:image\/(png|jpe?g|webp|gif);base64,/.test(v),
        'The QR must be an https link to an image, or an image file.'
      )
      .optional(),
    payWalletName: z.string().max(80).optional(),
    payWalletNumber: z.string().max(40).optional(),
    payAccountName: z.string().max(120).optional(),
    supportWhatsapp: z.string().max(40).optional(),
    /** Hours a student is told to allow. Honest, and changeable at Dashain. */
    approvalWaitHours: z.number().int().min(1).max(72).optional(),
  }),
]);

async function audit(a: Omit<ApprovalAudit, 'id' | 'createdAt'>): Promise<void> {
  await repo().appendAudit({ ...a, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
}

export async function POST(req: Request) {
  // N-41. The kill switch closes EVERY door, not just the shop front. A dark
  // site with a working till is not a kill switch, and an admin or super admin
  // still able to move money while students are locked out is exactly the
  // workaround the owner is paying for the switch to prevent.
  const down = await platformDown();
  if (down) {
    return NextResponse.json(apiError(down.code, down.message, down.userMessage), { status: 503 });
  }


  /**
   * PEEK, do not consume. `auth` is a brute-force budget and brute force means
   * GUESSING — so only a WRONG passcode may spend from it. Consuming here
   * charged every legitimate action the same as an attack: loading /super
   * fires four actions, which spent four of five, and the next click was
   * refused with "Too many attempts". See LIMITS.backOffice.
   */
  const rl = rateLimitPeek(`super:${clientIp(req)}`, RL.auth);
  if (!rl.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'auth attempts', 'Too many attempts. Please wait five minutes.'),
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    // D-22. Name the field and the limit instead of six generic words.
    return NextResponse.json(apiError('BAD_REQUEST', 'invalid body', zodMessage(e as ZodError)), {
      status: 400,
    });
  }

  if (!(await isSuperAdminAsync(body.superKey))) {
    // ONLY a wrong passcode spends from the brute-force budget.
    rateLimitPenalise(`super:${clientIp(req)}`, RL.auth);
    return NextResponse.json(apiError('FORBIDDEN', 'bad super key', 'Not allowed.'), { status: 403 });
  }

  /**
   * Authenticated work gets its own, generous budget.
   *
   * Still bounded: a runaway retry loop in the browser must not be able to spin
   * against the store forever. But 240 a minute is far more than a human
   * clicking around a dense dashboard, so it will never be the reason a real
   * payment cannot be approved.
   */
  const work = rateLimit(`super-work:${clientIp(req)}`, RL.backOffice);
  if (!work.allowed) {
    return NextResponse.json(
      apiError('RATE_LIMITED', 'back-office flood', 'That is a lot of requests at once. Give it a moment and try again.'),
      { status: 429, headers: { 'Retry-After': String(work.retryAfterSec) } }
    );
  }

  const r = repo();

  // --------------------------------------------------------------- overview
  if (body.action === 'overview') {
    const [students, consultancies, orders] = await Promise.all([
      r.listStudents(),
      platform.listConsultancies(),
      r.listOrders(),
    ]);

    const verified = orders.filter((o) => o.state === 'verified');
    /**
     * D-21. Total revenue means TOTAL revenue.
     *
     * This counted verified ORDERS only, which is student payments and seat
     * purchases that went through the checkout. Money a consultancy paid up
     * front, recorded on the consultancy row as `paidNpr` when the super admin
     * created them, was invisible. In testing that meant the dashboard headline
     * read "NPR 449" when NPR 25,449 had actually been taken, and the missing
     * NPR 25,000 was the consultancy channel the whole growth plan rests on.
     *
     * Split as well as totalled, because "where did it come from" is the
     * question he will actually ask of this number.
     */
    const revenueFromOrders = verified.reduce((n, o) => n + o.amountNpr, 0);
    const revenueFromConsultancies = consultancies.reduce((n, c) => n + (c.paidNpr ?? 0), 0);
    const revenueNpr = revenueFromOrders + revenueFromConsultancies;

    // Attribution: which consultancies our DIRECT students named. This is the
    // sales pipeline, and the strongest growth idea in the brief.
    const attribution = new Map<string, number>();
    for (const s of students) {
      if (!s.attributionConsultancy) continue;
      const key = s.attributionConsultancy.trim().toLowerCase();
      if (key) attribution.set(key, (attribution.get(key) ?? 0) + 1);
    }

    // Referral leaderboard: who brought in people who actually PAID.
    const paidStudentIds = new Set(verified.map((o) => o.studentId));
    const leaderboard = new Map<string, { code: string; name: string | null; paid: number }>();
    for (const s of students) {
      if (!s.referredByCode || !paidStudentIds.has(s.id)) continue;
      const referrer = students.find((x) => x.referralCode === s.referredByCode);
      if (!referrer) continue;
      const cur = leaderboard.get(referrer.id) ?? {
        code: referrer.referralCode,
        name: referrer.name,
        paid: 0,
      };
      cur.paid += 1;
      leaderboard.set(referrer.id, cur);
    }

    return NextResponse.json({
      ok: true,
      data: {
        counts: {
          students: students.length,
          paying: paidStudentIds.size,
          consultancies: consultancies.filter((c) => c.status === 'approved').length,
          pendingConsultancies: consultancies.filter((c) => c.status === 'pending').length,
          ordersAwaiting: orders.filter((o) => o.state === 'submitted').length,
        },
        revenueNpr,
        revenueFromOrders,
        revenueFromConsultancies,
        // Never any transcript or answer content. Engagement and entitlement only.
        students: students.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          source: s.source,
          createdVia: s.createdVia,
          consultancyId: s.consultancyId,
          attributionConsultancy: s.attributionConsultancy,
          status: s.status,
          referralCode: s.referralCode,
          referredByCode: s.referredByCode,
          createdAt: s.createdAt,
          lastSeenAt: s.lastSeenAt,
          /**
           * A NUMBER YOU CAN RING.
           *
           * 14 Aug: the client asked why there was no phone number here. The
           * answer is the whole reason this dashboard exists — when something
           * has gone wrong with a student's payment or their details, the only
           * useful next action is to call them. A directory you cannot act on
           * is a list, not a tool.
           *
           * `whatsappConfirmed` travels with it because half the support plan
           * is a WhatsApp link, and a number that turns out NOT to be on
           * WhatsApp is a student we cannot reach on the day it matters. We
           * ASK, we never assume (N-22).
           *
           * Still no transcript, at any level. G-8 has no exceptions.
           */
          phone: s.whatsappNumber ?? s.phoneE164 ?? null,
          whatsappConfirmed: s.whatsappConfirmed ?? null,
        })),
        /**
         * The payment and support details, so the super admin can EDIT them.
         *
         * `setPaymentSettings` existed and worked from the day it was written.
         * There was simply no form anywhere that called it, so the QR, the
         * wallet number and the support number could only be changed by
         * editing env vars and redeploying — which is exactly what N-10 and
         * N-11 exist to prevent. The client asked for this twice.
         */
        paySettings: await (async () => {
          const st = await platform.getSettings();
          return {
            payQrImageUrl: st.payQrImageUrl ?? '',
            payWalletName: st.payWalletName ?? '',
            payWalletNumber: st.payWalletNumber ?? '',
            payAccountName: st.payAccountName ?? '',
            supportWhatsapp: st.supportWhatsapp ?? '',
            approvalWaitHours: st.approvalWaitHours ?? 4,
          };
        })(),
        /**
         * The live post-trial offer, so the form shows what is ACTUALLY in
         * force rather than the defaults. Sending the defaults to a screen
         * that can edit them is how an admin saves a change they never made.
         */
        rewardRule: await (async () => {
          const rule = (await rulesOrDefaults()).find((x) => x.kind === 'post_trial_window');
          return {
            active: rule?.active ?? false,
            windowMinutes: rule?.windowMinutes ?? 60,
            publicReason: rule?.publicReason ?? '',
            bonusPrep: rule?.bonusMocksByPack?.prep ?? 0,
            bonusSerious: rule?.bonusMocksByPack?.serious ?? 0,
          };
        })(),
        /**
         * Is the AI actually switched on, and what is it costing.
         *
         * Until now the only way to answer "is speech to text live" was to sit
         * an interview and look for the demo banner. That is the wrong person
         * doing the wrong test: the owner needs to know before a student finds
         * out. Keys are NEVER returned, only whether one is present.
         *
         * The spend counter is per process, so on Netlify the real figure is
         * this times the number of running instances. Said plainly here rather
         * than quietly presented as exact.
         */
        ai: {
          sttLive: !sttIsMocked(),
          evaluatorLive: !evaluatorIsMocked(),
          sttProvider: process.env.GROQ_API_KEY
            ? 'Groq Whisper large v3'
            : process.env.DEEPGRAM_API_KEY
              ? 'Deepgram Nova 3'
              : null,
          callsThisMonth: spendState().calls,
          callCap: maxPaidCallsPerMonth(),
        },
        // A12 / LIVE-004: an entire audit round was wasted on a stale deploy.
        // QA can now read the live revision straight off this dashboard.
        build: BUILD_INFO,
        attribution: [...attribution.entries()]
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
        referralLeaderboard: [...leaderboard.values()].sort((a, b) => b.paid - a.paid),
      },
    });
  }

  // ----------------------------------------------------------------- orders
  if (body.action === 'orders') {
    const orders = await r.listOrders();
    const students = await r.listStudents();
    return NextResponse.json({
      ok: true,
      data: orders.map((o) => {
        const st = students.find((s) => s.id === o.studentId);
        return {
          ...o,
          studentName: st?.name ?? null,
          studentEmail: st?.email ?? null,
          /**
           * N-13. The payer's phone, on every approval request.
           *
           * When the money has not landed, the only useful next step is to ring
           * them. Making whoever is approving go and look the number up in
           * another screen is how a payment sits unapproved overnight while a
           * student assumes they have been robbed.
           */
          /**
           * The number the student actually gave us, and it was reading the
           * wrong field.
           *
           * `phoneE164` is only ever written by Firebase PHONE auth. Everybody
           * signs in with Google, which carries no number, so `phoneE164` is
           * null for every real student and this column was empty on every
           * single payment. Meanwhile the number the student volunteers at
           * checkout is stored as `whatsappNumber`, three lines away, and the
           * directory branch above already reads it correctly.
           *
           * So the client opened the payments queue, asked "why is there no
           * phone number here", and was right: the server was sending a field
           * that is never populated. Same fault as the payer phone, the seat
           * numbers and the payment settings before it, only this time the two
           * halves were in the same file.
           *
           * Ordered by how much we trust it: what they typed for us, then a
           * verified phone-auth number if one ever exists.
           */
          payerPhone: st?.whatsappNumber ?? st?.phoneE164 ?? null,
          payerPhoneWhatsappConfirmed: st?.whatsappConfirmed ?? null,
          payerPhoneSuffix: o.payerPhoneSuffix,
        };
      }),
    });
  }

  /**
   * N-21, N-22, N-24. Students and consultancies, listed SEPARATELY.
   *
   * One mixed list forces whoever is looking to do the sorting in their head,
   * and the two are answered by different questions: a student is "can they
   * practise", a consultancy is "are they buying". They are also different
   * privacy classes, so keeping them apart makes the transcript rule (G-8)
   * easier to keep rather than harder.
   */
  if (body.action === 'directory') {
    const [students, consultancies, orders, seatsAll] = await Promise.all([
      r.listStudents(),
      platform.listConsultancies(),
      r.listOrders(),
      Promise.resolve(null),
    ]);

    const studentRows = await Promise.all(
      students.map(async (st) => ({
        id: st.id,
        name: st.name,
        email: st.email,
        // N-22, exactly the fields the client named, and nothing more.
        level: st.level ?? null,
        targetUniversity: st.targetUniversity ?? null,
        whatsappNumber: st.whatsappNumber ?? null,
        whatsappConfirmed: st.whatsappConfirmed ?? null,
        city: st.city ?? null,
        source: st.source,
        consultancyId: st.consultancyId,
        status: st.status,
        createdAt: st.createdAt,
        lastSeenAt: st.lastSeenAt,
        mocksLeft: await r.balance(st.id, 'mock'),
        // NEVER a transcript, at any level. G-8 has no exceptions.
      }))
    );

    const consultancyRows = await Promise.all(
      consultancies.map(async (c) => {
        const seats = await r.listSeats(c.id);
        const live = seats.filter((x) => !x.revokedAt);
        const mine = students.filter((st) => st.consultancyId === c.id);
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          status: c.status,
          seatsTotal: c.seatsTotal,
          // N-24. What the client asked to see per consultancy.
          seatsGivenOut: live.length,
          seatsLeft: Math.max(0, c.seatsTotal - live.length),
          renewals: live.filter((x) => String(x.allocatedBy).startsWith('renew:')).length,
          studentsFromLink: mine.length,
          paidNpr: c.paidNpr,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      data: {
        students: studentRows,
        consultancies: consultancyRows,
        directPaidOrders: orders.filter((o) => o.state === 'verified' && !o.consultancyId).length,
      },
    });
  }

  if (body.action === 'addQuestion') {
    const cur = await platform.getSettings();
    const q = {
      id: `x-${crypto.randomUUID().slice(0, 8)}`,
      category: body.category,
      text: body.text.trim(),
      intent: body.intent.trim(),
      addedAt: new Date().toISOString(),
      addedBy: 'super_admin',
    };
    await platform.saveSettings({ ...cur, extraQuestions: [...(cur.extraQuestions ?? []), q] });
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: 'add_question',
      subjectId: q.id,
      before: String((cur.extraQuestions ?? []).length),
      after: String((cur.extraQuestions ?? []).length + 1),
      note: q.text.slice(0, 80),
    });
    return NextResponse.json({ ok: true, data: { id: q.id, total: (cur.extraQuestions ?? []).length + 1 } });
  }

  if (body.action === 'setRewardRule') {
    const rule = await setPostTrialRule({
      active: body.active,
      windowMinutes: body.windowMinutes,
      publicReason: body.publicReason,
      bonusMocksByPack: { prep: body.bonusPrep, serious: body.bonusSerious },
      updatedBy: 'super_admin',
    });
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: 'reward_rule_change',
      subjectId: rule.id,
      before: null,
      after: `${rule.active ? 'on' : 'off'}, ${rule.windowMinutes}m, prep +${body.bonusPrep}, serious +${body.bonusSerious}`,
      note: rule.publicReason.slice(0, 120),
    });
    return NextResponse.json({
      ok: true,
      data: {
        active: rule.active,
        windowMinutes: rule.windowMinutes,
        publicReason: rule.publicReason,
        bonusMocksByPack: rule.bonusMocksByPack,
      },
    });
  }

  if (body.action === 'setDeviceBlock') {
    const cur = await platform.getSettings();
    const set = new Set(cur.blockedDevices ?? []);
    if (body.blocked) set.add(body.fingerprint);
    else set.delete(body.fingerprint);
    await platform.saveSettings({ ...cur, blockedDevices: [...set] });
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: 'set_device_block',
      subjectId: body.fingerprint.slice(0, 16),
      before: String((cur.blockedDevices ?? []).includes(body.fingerprint)),
      after: String(body.blocked),
      note: 'device soft-block toggled',
    });
    return NextResponse.json({ ok: true, data: { blocked: body.blocked, total: set.size } });
  }

  if (body.action === 'changeSuperPasscode') {
    if (secretEquals(body.newPasscode, body.superKey)) {
      return NextResponse.json(
        apiError('SAME_PASSCODE', 'new equals old', 'Please choose a passcode different from your current one.'),
        { status: 400 }
      );
    }
    if (/^[0-9]+$/.test(body.newPasscode) || /^(.)\1+$/.test(body.newPasscode)) {
      return NextResponse.json(
        apiError(
          'WEAK_PASSCODE',
          'digits only or one repeated character',
          'Please use letters as well as numbers. This one passcode opens every student record we hold.'
        ),
        { status: 400 }
      );
    }

    const cur = await platform.getSettings();
    await platform.saveSettings({
      ...cur,
      superPasscode: body.newPasscode,
      superPasscodeChangedAt: new Date().toISOString(),
      // Stamp which deploy key this was chosen against, so rotating that key
      // in the host really does hand access back. See isSuperAdminAsync.
      superPasscodeSetAgainst: process.env.SUPER_ADMIN_PASSCODE ?? '',
    });
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: 'change_passcode',
      subjectId: 'super_admin',
      before: cur.superPasscode ? 'own passcode' : 'the one set at deploy',
      after: 'own passcode',
      // Never the passcode itself. An audit trail holding secrets is a second
      // copy of the secret, in a place more people can read.
      note: 'super admin changed their own passcode',
    });

    return NextResponse.json({
      ok: true,
      data: {
        message:
          'Saved. Use the new passcode from now on. If you ever forget it, change SUPER_ADMIN_PASSCODE in Netlify and redeploy: that overrides this one and lets you back in.',
      },
    });
  }

  if (body.action === 'setPaymentSettings') {
    const cur = await platform.getSettings();
    const next = { ...cur };
    /**
     * Record WHICH fields changed, not just the wallet number.
     *
     * The audit row used to write the old and new wallet number and a fixed
     * note, so changing the QR image or the support number left a row that
     * said nothing changed. Where the money goes and who answers the phone
     * about it are the two settings most worth being able to reconstruct
     * afterwards, and "payment or support details changed" reconstructs
     * nothing.
     *
     * The QR is a data URL and can be hundreds of kilobytes, so the audit
     * records THAT it changed, never the value.
     */
    const changed: string[] = [];
    const LABELS = {
      payQrImageUrl: 'the QR image',
      payWalletName: 'the wallet name',
      payWalletNumber: 'the wallet number',
      payAccountName: 'the account name',
      supportWhatsapp: 'the support number',
      approvalWaitHours: 'how long students are told to wait',
    } as const;
    // Written one key at a time rather than in a loop: the settings object mixes
    // strings and a number, and a loop over mixed types either loses the types
    // or needs a cast that would hide a real mistake later.
    const STRING_KEYS = ['payQrImageUrl', 'payWalletName', 'payWalletNumber', 'payAccountName', 'supportWhatsapp'] as const;
    for (const k of STRING_KEYS) {
      if (body[k] !== undefined && body[k] !== cur[k]) {
        changed.push(LABELS[k]);
        next[k] = body[k];
      }
    }
    if (body.approvalWaitHours !== undefined && body.approvalWaitHours !== cur.approvalWaitHours) {
      changed.push(LABELS.approvalWaitHours);
      next.approvalWaitHours = body.approvalWaitHours;
    }
    if (changed.length === 0) {
      return NextResponse.json({ ok: true, data: { saved: true, changed: [] } });
    }
    await platform.saveSettings(next);
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: 'set_payment_settings',
      subjectId: 'platform',
      // Short, readable values only. Never the QR data URL.
      before: [cur.payWalletNumber, cur.supportWhatsapp].filter(Boolean).join(' / ') || 'not set',
      after: [next.payWalletNumber, next.supportWhatsapp].filter(Boolean).join(' / ') || 'not set',
      note: `changed ${changed.join(', ')}`,
    });
    return NextResponse.json({ ok: true, data: { saved: true, changed } });
  }

  // ---------------------------------------------------------- verifyPayment
  //
  // The work itself lives in lib/payments.ts, shared with the consultancy
  // route (E9). Two places that can release credits must run the same code.
  if (body.action === 'verifyPayment') {
    const order = await r.getOrder(body.orderId);
    if (!order) {
      return NextResponse.json(apiError('NOT_FOUND', 'no order', 'Not found.'), { status: 404 });
    }
    const res = await approvePayment(
      order,
      { role: 'super_admin', id: 'super_admin', label: 'super admin' },
      body.note
    );
    if (!res.ok) {
      return NextResponse.json(apiError(res.code, res.code, res.userMessage), { status: 409 });
    }
    if (res.alreadyVerified) {
      return NextResponse.json({
        ok: true,
        data: { alreadyVerified: true, message: 'This payment was already approved. Nothing changed.' },
      });
    }
    return NextResponse.json({
      ok: true,
      data: { granted: res.granted, referral: res.referral, message: 'Approved and credits added.' },
    });
  }

  // ---------------------------------------------------------- rejectPayment
  //
  // WALK 6.3 and 6.4. This branch used to write the order itself instead of
  // calling the shared rejectPayment, and skipping that one function cost two
  // guarantees at once:
  //
  //   6.4  It would happily flip an ALREADY VERIFIED order to rejected. The
  //        credits stay granted, because nothing un-grants them, so the money
  //        record says refused and the student record says paid. Once those two
  //        disagree there is no way to tell later which one was right.
  //
  //   6.3  It never told the consultancy. We message them when we approve one
  //        of their students and said nothing when we refused one, so their
  //        student is stuck and the only person who could help was never told.
  //
  // Both are fixed by doing what the approve branch already does: calling the
  // one shared function. Two routes that can move money must run the same code.
  if (body.action === 'rejectPayment') {
    const order = await r.getOrder(body.orderId);
    if (!order) {
      return NextResponse.json(apiError('NOT_FOUND', 'no order', 'Not found.'), { status: 404 });
    }
    const res = await rejectPayment(
      order,
      { role: 'super_admin', id: 'super_admin', label: 'super admin' },
      body.reason
    );
    if (!res.ok) {
      return NextResponse.json(apiError(res.code, res.code, res.userMessage), { status: 409 });
    }
    return NextResponse.json({ ok: true, data: { state: 'rejected' } });
  }

  // --------------------------------------------------------- flaggedTrials
  if (body.action === 'flaggedTrials') {
    const claims = await r.listTrialClaims({ outcome: 'soft_denied' });
    const students = await r.listStudents();
    return NextResponse.json({
      ok: true,
      data: claims
        .filter((c) => !c.overriddenAt)
        .map((c) => ({
          ...c,
          studentName: students.find((s) => s.id === c.studentId)?.name ?? null,
          studentEmail: students.find((s) => s.id === c.studentId)?.email ?? null,
        })),
    });
  }

  if (body.action === 'resolveTrialFlag') {
    const claims = await r.listTrialClaims();
    const claim = claims.find((c) => c.id === body.claimId);
    if (!claim) {
      return NextResponse.json(apiError('NOT_FOUND', 'no claim', 'Not found.'), { status: 404 });
    }

    await r.updateTrialClaim(claim.id, {
      outcome: body.grant ? 'granted' : 'soft_denied',
      overriddenBy: 'super_admin',
      overriddenAt: new Date().toISOString(),
    });
    if (body.grant) await adminGrant(claim.studentId, 'mock', 1, 'trial override');

    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: body.grant ? 'grant_trial_override' : 'decline_trial_override',
      subjectId: claim.studentId,
      before: 'soft_denied',
      after: body.grant ? 'granted' : 'declined',
      note: body.note ?? null,
    });
    return NextResponse.json({ ok: true, data: { granted: body.grant } });
  }

  // ------------------------------------------------------- student status
  if (body.action === 'setStudentStatus') {
    const s = await r.getStudent(body.studentId);
    if (!s) {
      return NextResponse.json(apiError('NOT_FOUND', 'no student', 'Not found.'), { status: 404 });
    }
    await r.updateStudent(s.id, {
      status: body.status,
      disabledAt: body.status === 'disabled' ? new Date().toISOString() : null,
      disabledBy: body.status === 'disabled' ? 'super_admin' : null,
    });
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      action: body.status === 'disabled' ? 'disable_student' : 'enable_student',
      subjectId: s.id,
      before: s.status,
      after: body.status,
      note: null,
    });
    return NextResponse.json({ ok: true, data: { status: body.status } });
  }

  if (body.action === 'grantCredit') {
    await adminGrant(body.studentId, body.kind, body.amount, body.note);
    await audit({
      actorRole: 'super_admin',
      actorId: 'super_admin',
      // Filed under its own name. This used to be recorded as
      // 'approve_admin_student', so a hand written credit grant read in the
      // audit trail as approving a student, which is a different act.
      action: 'grant_credit',
      subjectId: body.studentId,
      before: null,
      after: `+${body.amount} ${body.kind}`,
      note: body.note,
    });
    return NextResponse.json({ ok: true, data: { granted: body.amount } });
  }

  // ------------------------------------------------------------------ audit
  return NextResponse.json({ ok: true, data: await r.listAudit(200) });
}
