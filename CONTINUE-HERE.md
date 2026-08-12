# CONTINUE-HERE

**Read this first, every session, before touching anything. Do not start over. Do not re-plan from scratch.**
Append to the Work Log at the bottom before you finish. Keep this file accurate: it is the only thing that survives between AI sessions.

---

## 0. THE MINDSET (read this before you write code)

The client has repeatedly hit one problem: an AI builds "the core MVP feature" and stops, leaving something that works but does not look or feel like a real product. **That is the failure mode to avoid.**

The standard is: **a deployable product a real student would trust and pay through.** That means the non-functional parts are not optional. Header, footer, legal pages, empty states, error states, loading states, real logos, consistent design, working buttons everywhere. If a page looks unfinished, it is not done, even if the logic works.

Rules that come from hard experience on this project:
- Never claim something works until you have run it. Typecheck, build, and render it. curl-only testing has missed real bugs here before.
- Never swallow an error code in a catch block.
- Never show a number for something we did not measure (a score for an answer we never heard is the product's cardinal sin).
- Use the approved design in `docs/design-reference/`, but never its placeholder content (it invented a "£29 unlimited" plan; our real offer is the NPR 449 / NPR 799 one time packs).
- Copy style: plain simple English for nervous students with weak English. No em dashes.

---

## 1. WHERE THE PROJECT IS (updated 2026-08-12)

Project path: `/Users/umanganiroula/Developer/Content Karkhana/precas-mvp`
(It was moved out of iCloud on 2026-08-12. iCloud used to deadlock `tsc` and corrupt git. That is fixed.)

**Verified working right now:** `tsc --noEmit` exits 0, `next build` succeeds, all public routes render 200 with correct content.

Git state: HEAD is `69799e3`. There are **uncommitted changes** (the UX work below) and **two stale lock files** that block commits from the AI sandbox.

**To commit, run this on the Mac (one time):**
```
cd "/Users/umanganiroula/Developer/Content Karkhana/precas-mvp"
rm -f .git/index.lock .git/HEAD.lock
git add -A && git commit -m "UX: header, footer, legal pages, Stitch design foundation"
```
Then push and deploy as usual. The AI sandbox cannot push (no GitHub credentials) and cannot delete files on the mount.

---

## 2. HOW TO BUILD AND VERIFY (the workflow that works)

The cowork mount allows creating files but **not deleting** them, which breaks `next build` (it cleans `.next`). Use a build mirror in `/tmp`:

```bash
# one time
mkdir -p /tmp/precas && cd /tmp/precas && npm install

# sync source -> mirror (run after every edit)
cat > /tmp/sync.sh <<'EOF'
#!/bin/bash
SRC="/sessions/zealous-practical-turing/mnt/Content Karkhana/precas-mvp"
DST=/tmp/precas
cd "$SRC" || exit 1
tar cf - --exclude=node_modules --exclude=.next --exclude=.git --exclude=docs/design-reference . 2>/dev/null | (cd $DST && tar xf -)
EOF
chmod +x /tmp/sync.sh

# typecheck (runs fine on the real folder)
cd "<project>" && ./node_modules/.bin/tsc --noEmit

# build + render test (MUST start server and query it in ONE bash call:
# background processes are killed between calls)
/tmp/sync.sh && cd /tmp/precas && npx next build
cd /tmp/precas && (npx next start -p 3000 > /tmp/next.log 2>&1 &) \
  && for i in $(seq 1 30); do sleep 2; node -e "require('http').get({host:'127.0.0.1',port:3000,path:'/'},r=>process.exit(0)).on('error',()=>process.exit(1))" 2>/dev/null && break; done \
  && node -e "const http=require('http');http.get({host:'127.0.0.1',port:3000,path:'/'},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(r.statusCode,d.length))})"
```

Gotchas that cost hours before:
- `curl` in this sandbox goes through a proxy that returns fake 200s with empty bodies for localhost. **Use node http, not curl,** for local testing.
- The sandbox proxy blocks `fonts.googleapis.com`, so `next/font/google` cannot build here. Fonts are loaded with `<link>` tags in `app/layout.tsx` instead. Keep it that way: it also stops a Google Fonts outage from failing a Netlify deploy.
- The sandbox cannot reach `*.netlify.app` either. Live-site QA must go through the Chrome extension on the Mac.

---

## 3. DESIGN: the approved system

The client generated and approved a full design set in Google Stitch and it is saved in the repo at **`docs/design-reference/`** (8 screens, each `code.html` + `screen.png`, plus `academic_clarity/DESIGN.md` with the tokens). **Build every page to match these.**

System name "Academic Clarity": Deep Navy Ink `#0F172A`, Emerald `#10B981` accent, white and light slate `#F8FAFC` surfaces, **Noto Serif** headings, **Hanken Grotesk** body, 8px spacing base, small radii, minimal shadow, 48px tap targets, mobile first at 375px, max container 1140px.

Approved screens: landing_page, sign_in, universities_catalogue, results_report, consultancy_b2b_page, consultancy_admin_dashboard, super_admin_dashboard, owner_kill_switch.

**Use the layout, never the placeholder content.** Real offer: free 10 question trial, then one time packs **NPR 449 (6 mocks + 15 practice)** and **NPR 799 (12 mocks + 30 practice)**, each mock **17 questions**. Starter and Pro stay hidden.

Full plan and per screen notes: `docs/DESIGN_DIRECTION.md`. The UX gap analysis: `docs/UX_AUDIT.md`.

---

## 4. WHAT IS DONE (verified, not claimed)

- **Firebase sign-in root cause found and documented.** The live `auth/api-key-not-valid` was a **corrupted value in the Netlify env var** `NEXT_PUBLIC_FIREBASE_API_KEY` (39 chars, right tail, wrong head, did not start `AIzaSy`). The code was correct. Fix: re-paste `AIzaSyAcabpaQyPunOK9qwjC0VhBBJUW0d0BN-Q` in Netlify (Production) and **Clear cache and deploy**. Dead theories: missing vars, Firefox tracking protection, undefined key. Only 3 Firebase vars are used by the code: API_KEY, PROJECT_ID, AUTH_DOMAIN.
- **`firebase` npm package was declared but not installed.** Fixed with `npm install`. This alone would have broken the build.
- `components/SiteHeader.tsx`: sticky header, logo links home, nav (Universities, How it works, Pricing), Sign in, solid Start free button.
- `components/SiteFooter.tsx`: brand block, Practise / Help / Legal columns, WhatsApp contact, honesty disclaimer, dynamic year copyright.
- Header and footer wired into `/`, `/pricing`, `/universities`.
- `components/TrustedBy.tsx`: self-moving university logo slider (client asked for this), pauses on hover, static under reduced motion.
- Fonts: Noto Serif + Hanken Grotesk via link tags, wired through `tailwind.config.ts` and `globals.css`.
- Legal pages created so footer links resolve: `/privacy`, `/terms`, `/refund` (working drafts, need Nepali legal review).
- **Consultancy wholesale pricing removed from public `/pricing`** (a student must never see the NPR 240 seat price). B2B lives on the unlisted `/consultancy`.
- Pricing CTA is now a solid high contrast button instead of a disabled looking box.
- `/start` rebuilt to the approved two column sign_in design: value proposition and university logos on the left, single Google button on the right, brand links home, Privacy and Terms links. Firebase logic untouched.
- `/universities` now renders the **real university SVG logos** with monogram fallback. Ravensbourne is correctly excluded from the public list until written logo permission.

---

## 5. WHAT IS NEXT (in this order)

**A. Finish the UI (match `docs/design-reference/`)**
1. Home `/`: align hero, three step cards, the sample QUESTION ANALYSIS card and pricing teaser to `landing_page/screen.png`.
2. Results `/results/[sessionId]`: match `results_report`, keep "Not assessed" and never a fabricated score.
3. `/consultancy` B2B page: match `consultancy_b2b_page`, holds the seat and bundle pricing.
4. Back office to the same standard: `/admin`, `/super`, `/owner` per their screenshots. Calm dashboards, cards, clear tables. No transcript content to any admin.
5. Add a 404 page with a way home. Add PWA icons (`/icon-192.png`, `/icon-512.png`, apple touch icon) which still 404.

**B. Then the lifecycle (the client's main goal, target: finished this week)**
The lifecycle spec is `docs/LIFECYCLE_BUILD_SPEC.md` and it is authoritative. Routes that already exist: `/checkout`, `/consultancy`, `/api/payment`, `/api/me`, `/api/session/[id]/consent`, `/api/super`, `/api/admin`, `/api/platform`. Verify each end to end, then close the gaps:
- Student direct: sign in, 10 free questions, report, choice to pay or view report, QR payment with payer details and screenshot upload, approval pending state, allocation on approval, practice.
- Student via consultancy link `/c/[slug]`: same, attributed to that consultancy, approved by that admin (super admin can also approve, and the admin sees a count of those).
- Admin: seats bought, seats used, own students only, never other consultancies, never transcripts.
- Super admin: everything segregated by source, approvals with audit tally, enable and disable, referral leaderboard, attribution report, CSV export.
- Owner: maintenance switch with audit trail, fails closed, always re-enablable.
- Lifecycle screens do **not** need new Stitch mockups. Generalise Academic Clarity: device check, interview room, the gate after question 10, QR payment, approval pending, soft deny, and all empty, loading and error states.

**C. Then QA the whole thing** against `docs/LIFECYCLE_BUILD_SPEC.md` section 12 (acceptance matrix) and section 5 (fraud and money abuse tests).

---

## 6. LOCKED PRODUCT DECISIONS (do not relitigate, they are in HANDOFF.md)

- Light gate: **Sign in with Google** for the trial. Phone verification moves to the **payment** step and is sent over **WhatsApp**, not SIM SMS, because SMS OTP delays were a real problem.
- Trial abuse: composite of Google account + device fingerprint + IP velocity. **Never hard block shared Wi-Fi** (a consultancy lab is 30 legitimate students on one router). Flagging is a **soft deny**: the student can still browse and still buy, only the free 10 is held, and super admin can override from a review queue. Never auto ban.
- Full mock is **17 questions**, about 30 minutes. Trial is the first 10. Paying unlocks the remaining 7 of that sitting and grants the pack.
- Referrals replace promo codes: **+1 free mock only when the referred friend actually pays**, fraud guarded (not same device, Wi-Fi, Google account or payment source), with a super admin configurable lifetime cap.
- Urgency must be **honest**: real per student deadlines and real named campaigns with server side end times. Evergreen or client generated countdowns are a dark pattern and a HIGH defect.
- Consultancy pricing is hidden from students, on the unlisted one word route **`/consultancy`**.
- Backend: **Supabase** for accounts, ledger, orders, approvals, seats (the single JSON blob store loses writes under concurrency).
- Pilot cost to load: about **$40**. Google sign-in is free to 50k monthly users. See `docs/PILOT_COSTS.md`.

---

## 7. KNOWN OPEN DEFECTS (from QA, details in HANDOFF.md)

QA-203 CRITICAL unlimited unverified trials (the money leak once STT is live), QA-202 no rate limiting anywhere, QA-201 ownerId echoed and reused, QA-204 Behaviour shows 0% on a silent clean attempt, QA-208 consent not recorded with version and timestamp, QA-209 `GET /api/platform` public, QA-210 answer endpoint 500 on empty body, QA-211 PWA icons 404, LIVE-004 no build SHA surface, LIVE-008 scroll not reset on stage change.

**Open data gap:** the large UK university list Codex reportedly saved as CSV is **not in the repo**. Only the 6 approved universities and their 6 SVG logos exist. Find that CSV to populate the full catalogue and the logo slider.

**Deferred:** align colours to merotestbooking.com colour theory later. It is a client rendered React app so its palette needs a rendered inspection. The Stitch palette stands for now.

---

## Work Log (append only, newest at bottom)

- **2026-08-11 (QA):** Created this file. Corrected the Firebase diagnosis. Full lifecycle commit `db63ad4` exists but was never QA verified.
- **2026-08-11 (QA, live testing):** Root cause of `auth/api-key-not-valid` found: corrupted Netlify env var value, not a code bug. Verified the real key is accepted by Google.
- **2026-08-11 (QA, UX audit):** Full UI and completeness audit of the live site written to `docs/UX_AUDIT.md`. Good bones, missing the entire storefront layer.
- **2026-08-11 (QA as coder):** Built SiteHeader, SiteFooter, legal pages, removed the consultancy price leak, made the pricing CTA solid. Could not verify (iCloud broke tsc and the mount blocked builds).
- **2026-08-11 (Stitch design port begun):** Client approved a Stitch design set; saved to `docs/design-reference/`. Ported fonts and added the TrustedBy slider.
- **2026-08-12 (folder moved out of iCloud, first real verification):** Reconnected the project at `~/Developer/Content Karkhana`. **Discovered `firebase` was declared but never installed** and fixed it with `npm install`. Established the /tmp build mirror workflow. **First verified green build in this project's history:** `tsc --noEmit` exit 0, `next build` succeeds, all 8 public routes render 200 with correct content (header, footer, legal links, real packs 449/799, no Rs500 leak, no NPR 240 leak, no invented £29 plan, 6 university SVGs in the slider). Switched fonts off `next/font/google` to link tags so a Google Fonts outage cannot fail a deploy. Rebuilt `/start` to the approved two column design and wired real university logos into `/universities`, both verified rendering. Commits are blocked only by stale `.git/*.lock` files that the sandbox cannot delete: see section 1 for the one line fix on the Mac.
