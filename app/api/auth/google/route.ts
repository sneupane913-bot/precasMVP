import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * SUPERSEDED by /api/auth/firebase.
 *
 * The client chose Firebase over Google Identity Services, correctly: Firebase
 * covers Google sign-in now AND phone OTP at payment under one identity, so a
 * student never ends up with two accounts to merge.
 *
 * This file should be DELETED. It still exists only because the project sits in
 * an iCloud-synced folder that refuses programmatic deletion. It is listed in
 * CLEANUP-AND-PUSH.command.
 *
 * Until then it fails closed rather than lingering as a second, unmaintained
 * way to authenticate. A forgotten auth endpoint is exactly the kind of thing a
 * good auditor finds.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: 'GONE',
        message: 'superseded by /api/auth/firebase',
        userMessage: 'Please reload the page and sign in again.',
      },
    },
    { status: 410 }
  );
}
