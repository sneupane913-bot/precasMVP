/**
 * Firebase Authentication, server side.
 *
 * WHY FIREBASE (client decision, 2026-08-10, and it is the right call):
 * one system covers Google sign-in for the trial AND phone OTP at payment.
 * Two separate providers would mean two identities per student and a merge
 * problem later, which is a genuinely nasty class of bug.
 *
 * COSTS, stated plainly so nobody budgets wrong:
 *   - Google sign-in: free to 50,000 monthly active users. Then $0.0055 each.
 *   - Phone SMS OTP: NEVER free. Needs a billing account. $0.01 to $0.46 per
 *     SMS depending on region, and **every send is billed even if the student
 *     never types the code**. That makes "send OTP" a way to spend our money,
 *     so it is rate limited hard before it ever goes live.
 *
 * Verification uses the Identity Toolkit REST API with the public Web API key.
 * That means NO service-account JSON in environment variables, which is one
 * fewer high-value secret to leak. Google validates the token, not us.
 */

export interface FirebaseIdentity {
  /** Firebase UID. Stable per user per project. This is the trial key. */
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
  phoneE164: string | null;
  /** 'google.com', 'phone', or 'dev'. */
  provider: string;
}

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

export function firebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
    projectId,
  };
}

export function firebaseConfigured(): boolean {
  return firebaseWebConfig() !== null;
}

interface LookupUser {
  localId?: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  photoUrl?: string;
  phoneNumber?: string;
  providerUserInfo?: { providerId?: string }[];
  disabled?: boolean;
}

/**
 * Verify a Firebase ID token.
 *
 * Google is the authority here. A forged or expired token fails at their end,
 * so there is no local signature checking to get subtly wrong.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity | null> {
  const cfg = firebaseWebConfig();

  // Development escape hatch. Refused in production, verified by test:
  // `next start` runs as production and rejects these, which is how it should be.
  if (!cfg) {
    if (process.env.NODE_ENV === 'production') return null;
    if (!idToken.startsWith('dev:')) return null;
    const handle = idToken.slice(4).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!handle) return null;
    return {
      uid: `dev-${handle}`,
      email: `${handle}@example.dev`,
      emailVerified: true,
      name: handle,
      picture: null,
      phoneE164: null,
      provider: 'dev',
    };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${cfg.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;

    const json = (await res.json()) as { users?: LookupUser[] };
    const u = json.users?.[0];
    if (!u?.localId) return null;

    // A disabled account must not be able to act, even with a valid token.
    if (u.disabled) return null;

    return {
      uid: u.localId,
      email: u.email ?? null,
      emailVerified: Boolean(u.emailVerified),
      name: u.displayName ?? null,
      picture: u.photoUrl ?? null,
      phoneE164: u.phoneNumber ?? null,
      provider: u.providerUserInfo?.[0]?.providerId ?? 'unknown',
    };
  } catch {
    return null;
  }
}
