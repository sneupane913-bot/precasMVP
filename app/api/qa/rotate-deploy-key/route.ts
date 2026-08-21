import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'nodejs';

/**
 * DEVELOPMENT ONLY. Rotate the deploy-time super admin key in this process.
 *
 * This exists to prove one specific promise the product makes on screen:
 *
 *   "If you ever forget it, change SUPER_ADMIN_PASSCODE in Netlify and
 *    redeploy: that overrides this one and lets you back in."
 *
 * That promise was FALSE when it was first written. The stored passcode took
 * precedence unconditionally, so rotating the deploy key would have changed
 * nothing and the owner would have been locked out of their own product with no
 * way back in. It is now stamped with the key it was chosen against and ignored
 * once that key changes, which is what makes the sentence true.
 *
 * A promise about recovery that has never been exercised is not a feature, it is
 * a hope. Proving it needs the deploy key to change while the server runs, and
 * in production that is a redeploy. So this endpoint simulates the redeploy.
 *
 * It REFUSES TO EXIST IN PRODUCTION. Not "is hidden", not "needs a key": the
 * handler returns 404 exactly as an unknown route does, so it cannot be probed
 * for, and it never reveals or accepts the real key.
 */
const Body = z.object({ to: z.string().min(1).max(200) });

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    // Indistinguishable from a route that was never deployed.
    return new NextResponse('Not found', { status: 404 });
  }
  /**
   * SECURITY AUDIT 21 Aug (finding #2). `NODE_ENV` alone is not a lock: a
   * staging deploy, a preview build, or a misconfigured container can run with
   * NODE_ENV !== 'production' while being reachable from the internet — and
   * this route would then let ANY anonymous caller set the super admin
   * passcode. So it now also requires the QA harness secret. The harness sets
   * QA_ALLOW_DEV_TOKENS=1 already (see lib/auth/firebase.ts); without that
   * flag the route refuses to exist even in development.
   */
  if (process.env.QA_ALLOW_DEV_TOKENS !== '1') {
    return new NextResponse('Not found', { status: 404 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'bad body' }, { status: 400 });
  }

  process.env.SUPER_ADMIN_PASSCODE = body.to;
  return NextResponse.json({ ok: true, data: { rotated: true } });
}
