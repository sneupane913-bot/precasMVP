import { NextResponse } from 'next/server';
import { z } from 'zod';
import { store } from '@/lib/store';
import { ownsSession } from '@/lib/owner-session';
import { CONSENT_VERSION } from '@/lib/consent';
import { apiError, type ApiResult } from '@/lib/types';

export const runtime = 'nodejs';

const Body = z.object({
  /** Echoed back so a stale tab cannot record agreement to newer wording. */
  version: z.string().min(1).max(40),
});

/**
 * QA-208: the consent screen was displayed and nothing was recorded.
 *
 * The version is checked against the server's current version rather than
 * trusted. A student who left a tab open for a week must not silently record
 * agreement to text that has since changed.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json(
      apiError('BAD_REQUEST', 'invalid body', 'Something went wrong. Please reload the page.'),
      { status: 400 }
    );
  }

  const session = await store.get(id);
  if (!session || !(await ownsSession(session.ownerId))) {
    return NextResponse.json(
      apiError('SESSION_NOT_FOUND', 'no session or not owner', 'Your session has expired. Please start again.'),
      { status: 404 }
    );
  }

  if (body.version !== CONSENT_VERSION) {
    return NextResponse.json(
      apiError(
        'CONSENT_STALE',
        `client had ${body.version}, server is ${CONSENT_VERSION}`,
        'Our terms have been updated. Please reload the page and read them again.'
      ),
      { status: 409 }
    );
  }

  const consentAt = new Date().toISOString();
  await store.update(id, { consentVersion: CONSENT_VERSION, consentAt });

  const result: ApiResult<{ consentVersion: string; consentAt: string }> = {
    ok: true,
    data: { consentVersion: CONSENT_VERSION, consentAt },
  };
  return NextResponse.json(result);
}
