import { NextResponse } from 'next/server';
import { firebaseWebConfig } from '@/lib/auth/firebase';

export const runtime = 'nodejs';

/**
 * The Firebase web config is public by design: it identifies the project to
 * Google and appears in any client that uses Firebase. Access is controlled by
 * Authorised Domains, not by hiding these values.
 *
 * The service-account key is a different thing entirely and is deliberately
 * NOT used anywhere in this project, so there is one fewer secret to leak.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      firebase: firebaseWebConfig(),
      supportWhatsapp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? null,
    },
  });
}
