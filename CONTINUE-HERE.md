# CONTINUE-HERE

**Read this first, every session. Do not start over.** Full state, decisions already made, and the one open bug. Append to the Work Log at the bottom before you finish.

## How to continue (paste this to start a session)

> Continuing work on precas-mvp — do not start over. Read `CONTINUE-HERE.md` in the project root first; it has full state, decisions already made, and the open bug. Append to its Work Log section before you finish.

---

## 1. THE OPEN BUG — Google sign-in fails in production: `auth/api-key-not-valid`

### Corrected diagnosis (verified by reading the code, 2026-08-11)

**The "three missing Netlify variables" theory is WRONG — drop it.** `lib/auth/firebase.ts` reads **only three** env vars:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` (falls back to `<projectId>.firebaseapp.com` if unset)

It does **not** use `APP_ID`, `MESSAGING_SENDER_ID`, or `STORAGE_BUCKET`. Those are for Analytics/Messaging/Storage, not Auth. Adding them will not fix this bug. Per the last session, all three vars the code *does* need are already present in Netlify (all contexts).

### Confirmed Firebase config (public — Web API keys are NOT secrets; they ship in client JS by design)

```
apiKey:            AIzaSyAcabpaQyPunOK9qwjC0VhBBJUW0d0BN-Q
authDomain:        precas-practice.firebaseapp.com
projectId:         precas-practice
storageBucket:     precas-practice.firebasestorage.app   (unused by current code)
messagingSenderId: 1060580806513                          (unused by current code)
appId:             1:1060580806513:web:902ec46dd8f91382b5f0d0  (unused by current code)
```

The key matches the `precas-practice` project, so "key belongs to another project" is ruled out.

### Most likely cause → the one fix to try first

`NEXT_PUBLIC_*` values are **baked into the JavaScript at BUILD time.** If the vars were added or edited **after** the last successful build, the deployed code still contains `apiKey: undefined`, which throws exactly `auth/api-key-not-valid` — no matter how correct the Netlify settings page looks now.

**Fix:** Netlify → your PreCAS project → **Deploys → Trigger deploy → Clear cache and deploy site.** Wait for the build, then re-test.

### Confirm the cause BEFORE changing code/config (DevTools check)

On the deployed site: open DevTools → **Network**, reload, open a main JS chunk, search for `apiKey`.
- **`apiKey` is empty/undefined in the bundle** → build-time baking issue → Clear cache and deploy (above).
- **`apiKey` shows the correct `AIzaSy…` value but sign-in is still rejected** → it's rejected at Google's end, not sent wrong. Then: Google Cloud Console → APIs & Services → **Credentials → that key → Application restrictions**: if HTTP-referrer restrictions are on, the Netlify domain must be listed. Also confirm **Identity Toolkit API** is enabled.

### Dead theories — do not revisit
- Firefox tracking protection (wrong last session).
- The popup→redirect fallback shipped in `b727474` does **not** fix this.

### Session rules for this bug
- **Verify sign-in in a real browser (Chrome AND Firefox) before telling the client it works.** curl testing missed this bug entirely.
- **Never swallow an error code in a catch block.**

---

## 2. Product state & decisions (already made — do not relitigate)

- **Authoritative build spec:** `docs/LIFECYCLE_BUILD_SPEC.md` (all four actor lifecycles, fraud plan, acceptance matrix).
- **Agent communication log:** `HANDOFF.md` (append-only; read the whole thing).
- **Costs:** `docs/PILOT_COSTS.md` — pilot total ≈ **$40** to load.
- Locked decisions: light gate = **Sign in with Google** (phone/WhatsApp OTP only at payment); full mock = **17 questions** (10 free trial + 7 unlocked on payment); two public packs **6 mocks + 15 practice / NPR 449** and **12 mocks + 30 practice / NPR 799** (Starter/Pro hidden); **Supabase** for accounts/ledger/orders/seats; **referrals** (+1 mock per *paid* referral, fraud-guarded, capped); honest **countdown CTAs** only (no evergreen timers); consultancy pricing on unlisted **`/consultancy`** page; trial abuse = **soft-deny + human appeal**, never auto-ban; onboarding = **two** paths (direct, and consultancy/admin-link — same thing).

## 3. Deploy state

- **Live site (`main`):** commit `eaeac56` — security/honesty fixes only. Old anonymous trial flow, old universities, no Firebase lifecycle.
- **Committed but NOT pushed:** `db63ad4` — "Firebase auth, full student lifecycle, security hardening." **Not yet QA-verified.** Being pushed to a `qa-preview` branch/PR (`PUSH-PREVIEW.command`) for QA testing before it is promoted to production.
- **Pushing** must run on the Mac (`.command` scripts) — the assistant sandbox has no GitHub auth.
- **iCloud hazard:** a stale `.git/index.lock` recurs and the sandbox cannot delete it. **Move the project out of iCloud before the pilot.**

## Rules for every session
- QA does not write feature code — QA files defects and specs. Nothing reaches production `main` until QA verifies the preview.
- Verify in real Chrome + Firefox before declaring anything fixed.
- Never swallow an error code in a catch block.
- Ask before moving the project folder.

---

## Work Log (append-only, newest at bottom)

- **2026-08-11 (QA):** Created this file. Corrected the Firebase diagnosis: `lib/auth/firebase.ts` uses only `API_KEY`, `PROJECT_ID`, `AUTH_DOMAIN`; the "three missing vars" lead is a red herring. Confirmed the real config from the Firebase Console snippet. Most likely fix = **Clear cache and deploy** (NEXT_PUBLIC vars bake at build time; last build predates the env edits). If the deployed bundle shows the correct apiKey yet still fails, it's a Google-side key restriction / Identity Toolkit API. Full lifecycle (`db63ad4`) committed, not pushed; `qa-preview` PR flow prepared for verification.
