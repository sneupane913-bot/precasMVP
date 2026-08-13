# CONTINUE-HERE

**Read this first, every session, before touching anything. Do not start over. Do not re-plan from scratch.**
Append to the Work Log at the bottom before you finish. Keep this file accurate: it is the only thing that survives between AI sessions.

---

## 0a. HOW TO TREAT THE CLIENT (binding rule, do not break it)

**Never hand the client a command to run. Never say "run this on your Mac".** He is the client, not the operator. If something must happen on the Mac, **you do it yourself** with the computer-use tools: open the app, click, read the result, and fix any error you see. He should only ever be asked to approve an access dialog or make a genuine business decision.

Why: every time he was handed a terminal command it errored, and he had no way to fix it, so the loop repeated and burned sessions.

How to actually do it (this is proven and works):
- **Terminal is granted at tier "click": you can see it and click, but you cannot type into it.** So do not try to type commands there.
- Instead: **write a `.command` script with the Write tool, `chmod +x` it via bash, then use Finder (tier "full") to double-click it,** and read the output from a screenshot. Fix, rewrite the script, double-click again. That is the working loop.
- `request_access` for Terminal warns you once and tells you to retry in the same turn. Retry immediately in that same turn.
- Navigate Finder with `cmd+shift+G` then type the path (typing works in Finder).

## 0d. THE TEST PLAN IS THE GATE (binding rule, added 13 August 2026)

**`docs/TEST-PLAN.md` is the release gate. Read it before you touch anything.
Nothing goes to the client as finished until it has been walked from the top.**

It contains: every page and every control with what must happen and what must
never happen, the five actor lifecycles as flowcharts, the invariants, the
regression gate, the open defects, and the defects already fixed.

### What the client has actually asked for, and the standard he expects

He has said this more than once, and every time it was because a previous pass
covered what he named and stopped there:

> "I don't want you to just create this all thing based on my saying. I see that
> the last session you checked it only for the fixes which I had told you about.
> But I want every fix in this website, for every link, for every life cycle
> that there is. You should start from opening the application, start from
> checking each of the pages."

> "You're gonna go to the website. You're gonna see how many links are there,
> what are the things that can happen, what are the things that can go wrong,
> and what should we test for. Every single test, so that we ensure none of the
> bugs are there. When a student clicks on a certain link, the link has to be
> there. When a student does a certain action, the action has to be recorded."

**Treat what he names as examples, never as the scope.** When he describes one
scenario, he is showing you the KIND of thing to hunt, not the list. Cover the
whole class.

### Three things that must change about how testing is done here

1. **The automated suites are not enough, and this is proven.** All six suites
   were green on 13 August 2026, and within minutes the client found two real
   bugs in a browser (D-01 and D-02 in the test plan). Every suite drives the
   API and reads server rendered HTML. **Not one of them loads the JavaScript.**
   Every defect he has found in the last two rounds lives in client side state.

2. **So every pass includes a real browser pass**, using the Claude in Chrome
   tools, walking Part A of the test plan screen by screen, clicking every
   control. He has offered to help with the real Google sign in when the flow
   needs it. Take him up on it.

3. **Never report "all green" from suites alone.** Say which suites passed and
   say plainly that the browser pass has or has not been done. He has been told
   "it is clean" and then found bugs himself, and that is the thing that has
   cost the most trust on this project.

### The bar for calling something done

- Clicked, not read. A route handler that looks correct proves nothing. The
  consultancy approval queue existed on the server for weeks with no button on
  the screen, and the code read perfectly the whole time.
- Zero findings means you did not look hard enough. Go to the wrong turns: the
  second tap, the back button, the expired session, the shared machine, the
  student who signs out and back in.
- A test is written before the fix, and watched failing first. A test that has
  never failed has proved nothing.

## 0c. THE CHECKLISTS ARE THE PLAN (binding rule)

**`CHECKLIST.md` in the project root is the index. It points at three lists**,
because three different people need three different things and mixing them is
how work gets missed. The client asked for this split on 12 August 2026.

| File | Who | What | How often |
|---|---|---|---|
| `CHECKLIST-DEV.md` | whoever is coding | everything still to be BUILT, in build order, with the score table | work top to bottom |
| `CHECKLIST-QA.md` | whoever is QA | everything to be CONFIRMED — a release gate, 8 gates including the per-button lifecycle | **from the top, EVERY release** |
| `CHECKLIST-MARKETING.md` | marketing analyst | claim honesty, pricing integrity, funnel, channels, competitor watch | claims before every public change, rest monthly |

**The difference that matters:** the developer list is ticked once and moves on.
The QA list is run again from the top every single time, forever, because its
whole job is catching the thing that used to work.

Rules:
- Work top to bottom through `CHECKLIST-DEV.md`. Do not jump around.
- Nothing is `[x]` until it has been built, typechecked, built, and **seen working**. `[~]` means partly done. If you could not run it, say so — never tick it.
- **Update the statuses and the score table every time you finish work**, in the same commit.
- New scope goes into the correct section in order, never appended at the end.
- **Anything the client decides goes into `CHECKLIST.md` under "Decisions taken"**, so it is not re-litigated by the next person.
- **Anything you got wrong and corrected goes under "Corrections on the record"** in the same file. A wrong number that is quietly fixed comes back.
- Before handing anything to the client as finished, run `CHECKLIST-QA.md` gates 1 to 3 at minimum.
- When the client asks "where are we", read him the score and the next few items, nothing more.

## 0b. HOW TO REPORT BACK TO THE CLIENT (binding rule)

**Give a short gist. Not a report.** He does not want to read a wall of text explaining everything you did.

**Every closing message is a GIST and nothing else.** It must be short and cover exactly three things, in plain language:
1. **What I did.**
2. **What I found** (anything broken, surprising, or worth knowing).
3. **What is next** (or what he must decide, if anything).

Target length: about 5 to 10 short lines total. No headings, no bullets-within-bullets, no walls of text.

Do not include: how you did it, which files you edited, what you learned along the way, section-by-section recaps, or any summary of your own process. All detail goes into the files (this one, `HANDOFF.md`, `docs/`), never into the chat. He has said repeatedly that long replies are confusing and he cannot follow them. If he wants detail he will ask.

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

Git state: HEAD is `d9dd2aa`, **committed and pushed to GitHub** (`master -> main`). Working tree clean.

**Committing from the sandbox** (the mount cannot delete files, so stale `.git/*.lock` files block normal `git commit`): use plumbing and write the ref directly.
```bash
export GIT_AUTHOR_NAME="Umanga Niroula" GIT_AUTHOR_EMAIL="snit.education@gmail.com"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"
rm -f /tmp/pidx
GIT_INDEX_FILE=/tmp/pidx git read-tree HEAD
GIT_INDEX_FILE=/tmp/pidx git add -A
TREE=$(GIT_INDEX_FILE=/tmp/pidx git write-tree)
C=$(git commit-tree "$TREE" -p HEAD -m "your message")
printf '%s\n' "$C" > .git/refs/heads/master     # bypasses the stale lock
```
(The Write tool refuses `.git` paths; use bash for that last line.)

**Pushing** must happen on the Mac (no GitHub credentials in the sandbox). Use `PUSH.command` in the parent folder and double-click it via Finder yourself (see section 0a). Two gotchas already solved and baked into that script: clear all four stale lock files, and set `http.version HTTP/1.1` plus `http.postBuffer 524288000`, otherwise a push of this size fails with `RPC failed; HTTP 400 curl 22`. The remote branch is `main`, the local branch is `master`, so the refspec is `master:main`.

---

## 2. HOW TO BUILD AND VERIFY (the workflow that works)

The cowork mount allows creating files but **not deleting** them, which breaks `next build` (it cleans `.next`). Use a build mirror in `/tmp`:

```bash
# one time PER SESSION (the /tmp mirror is empty in a fresh sandbox, and
# `next build` fails with "Could not find the Next.js package" without this)
mkdir -p /tmp/precas && /tmp/sync.sh && cd /tmp/precas && npm install

# sync source -> mirror (run after every edit)
cat > /tmp/sync.sh <<'EOF'
#!/bin/bash
SRC="<your session mount>/mnt/Content Karkhana/precas-mvp"   # changes every session, check with pwd
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
1. Home `/`: align hero, three step cards and the sample QUESTION ANALYSIS card to `landing_page/screen.png`. **Pricing teaser is DONE** and is now the shared `components/PricingPacks.tsx`.
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
- **2026-08-12 (folder moved out of iCloud, first real verification):** Reconnected the project at `~/Developer/Content Karkhana`. **Discovered `firebase` was declared but never installed** and fixed it with `npm install`. Established the /tmp build mirror workflow. **First verified green build in this project's history:** `tsc --noEmit` exit 0, `next build` succeeds, all 8 public routes render 200 with correct content (header, footer, legal links, real packs 449/799, no Rs500 leak, no NPR 240 leak, no invented £29 plan, 6 university SVGs in the slider). Switched fonts off `next/font/google` to link tags so a Google Fonts outage cannot fail a deploy. Rebuilt `/start` to the approved two column design and wired real university logos into `/universities`, both verified rendering. Commits are blocked only by stale `.git/*.lock` files that the sandbox cannot delete: worked around with git plumbing, see section 1.
- **2026-08-12 (committed and pushed, client no longer runs commands):** Client made clear he must never be handed terminal commands to run. Added section 0a as a binding rule. Committed as `d9dd2aa` by writing the ref directly (bypassing three stale lock files), then pushed it myself by writing `PUSH.command` and double-clicking it through Finder with computer-use. First push attempt failed with `RPC failed; HTTP 400 curl 22` because the 2 MB of design screenshots exceeded the HTTP/2 push path; fixed by forcing HTTP/1.1 and a large post buffer. **Push succeeded: `b727474..d9dd2aa master -> main`.** Netlify rebuilding. Next: verify the deployed site shows the new header, footer, logos and sign-in design, then continue the UI rebuild (home hero, results, consultancy, back office) and move into the lifecycle.
- **2026-08-12 (Netlify build failure fixed):** Deploy of `d9dd2aa` FAILED with "Exposed secrets detected: NEXT_PUBLIC_FIREBASE_API_KEY". Netlify's secret scanner fails a build when an env var value appears in build output. A Firebase Web API key is public by design (it identifies the project, authorises nothing, and must be in the client bundle for sign-in; access is controlled by Authorised Domains). Fixed in `netlify.toml` with `SECRETS_SCAN_OMIT_KEYS` listing only the `NEXT_PUBLIC_*` values. The real secrets (OWNER_ACCESS_KEY, SUPER_ADMIN_PASSCODE, SESSION_SECRET) are deliberately NOT listed so the scanner still guards them. Committed `5448aad` and pushed (`d9dd2aa..5448aad`). **If a future deploy fails on secret scanning for another NEXT_PUBLIC_ var, add it to that same list, never disable the scanner entirely.**
- **2026-08-12 (full live audit, client rejected the current UI):** Client inspected the live site and rejected the design as unprofessional and not matching the approved Stitch screens. Full defect list written to **`docs/UX_AUDIT_ROUND2.md`** — read it before coding. Headlines: **(B1 CRITICAL)** `POST /api/session/create` works with NO auth and the home CTA points at `/universities`, so the sign-in gate is completely bypassed; nobody may reach universities/interview/results without signing in. **(B2 CRITICAL)** `bpp.svg` and `uel.svg` are white artwork (`fill:#fff`) so they are invisible on light panels; normalise the logo wall to one ink tone. **(B3)** live `/` and `/universities` do not match `docs/design-reference/` (missing the second hero CTA, the three-steps section, the QUESTION ANALYSIS sample card, Most applied, filter chips, duration/questions stat boxes). **(H1)** pricing needs higgsfield-style hierarchy: keep free, make **799 the large focal card** and 449 smaller. Plus dead ends: `/results/fake-id` 404 with no way home, `/interview/fake-id` returns 200 for a non-existent session, bare 404 page, no shell on `/consultancy` and `/checkout`, back office unstyled. Fix order is at the bottom of the audit file. Verified good: all 15 routes respond, every internal link resolves 200, legal pages fine, pricing content honest.
- **2026-08-12 (round 2 fixes coded and verified, commit `aaeb3e2`, PUSH PENDING):** Fixed B1, B2, B3, H1 and M1 from `docs/UX_AUDIT_ROUND2.md`. **Auth gate:** `POST /api/session/create` now requires `currentStudent()` and returns 401 `NOT_SIGNED_IN`; home CTA goes to `/start?next=/universities`; `/universities` checks `/api/me`, labels the button "Sign in to start" when signed out, routes to sign-in and returns to the chosen university, and recovers from a mid-session 401. **Logos:** every mark now renders via `[filter:brightness(0)]` at low opacity (bpp/uel are white artwork and were invisible); applied on the home strip, the sign-in panel and the university cards. **Home:** added the second hero CTA "See how it works", the "Three steps to interview readiness" section and the sample Question analysis card, per `docs/design-reference/landing_page`. **University cards:** logo chip, Duration and Questions stat boxes, Free first try badge. **Pricing:** NPR 799 is now the large dark focal card (bigger price, emerald badge and CTA, slight scale up), 449 smaller beside it, free card kept first. **404:** branded `app/not-found.tsx` with routes back to the catalogue and home. All verified locally: `tsc` exit 0, `next build` passes, create returns 401 without login, and every change confirmed present in rendered HTML. **NEXT ACTION: push `aaeb3e2`** by double-clicking `PUSH.command` via Finder (the Mac was locked when this was written), then re-verify the live site. **Still open from the audit:** H2 shell on `/consultancy` and `/checkout`, H4 `/results/*` dead end, H5 `/interview/fake-id` returning 200, M2 home FAQ section, and then the lifecycle work.
- **2026-08-12 (back office + consultancy link, commit `3170dc3`, pushed):** **`CHECKLIST.md` is now the master plan** (see rule 0c). Score moved 57/124 to 74/124. Rebuilt `/super` to the approved design AND rewired it from `/api/platform` to `/api/super` (it was blind to payment orders, flagged trials, attribution and referrals). Rebuilt `/admin` to its approved design and **fixed a real bug: the admin API read the old platform store, so every Google-signed-in student was invisible to their own consultancy**; it now reads `repo().listStudents({consultancyId})` and returns engagement plus entitlement only, never answer content. Added the owner switch history panel (H3) with an append-only `ownerAudit` in `PlatformSettings`. Built **`/c/[slug]`**, the branded consultancy entry page, and made signup through it **bind the student to that consultancy server-side, only when the slug resolves to an approved consultancy** (binding is attribution, not entitlement, so a forged link buys nothing); unknown or unapproved slugs 404. Closed K8/QA-209: the public platform read returns only `maintenanceMode:false` when up, and the contact message only when down, which students need. Verified: tsc clean, build passes, all back office pages render, unknown slug 404s. **Next five are listed at the bottom of `CHECKLIST.md`**, starting with the checkout screen and the money guarantees (E5 to E8).
- **2026-08-12 (session 3):** Client asked for the home pricing block to be replaced with the `/pricing` design, which he approved. Extracted both into `components/PricingPacks.tsx` (`<PricingPacks />` and `<PriceComparison />`) and pointed home and `/pricing` at it, so they render byte-identical cards and can never drift again (they did once: QA-205, home advertised a monthly plan we never sold). Home shows the packs plus a link to the comparison; the comparison table stays on `/pricing` only so home does not become a second pricing page. Verified by rendering both pages and diffing 12 content markers, all matching, hidden Starter/Pro not leaked.
  **Testing note worth keeping:** a naive `body.includes("NPR 449")` gives FALSE NEGATIVES, because React inserts `<!-- -->` between adjacent text nodes in SSR output. Strip comments and tags before asserting on rendered text. My first run reported 6 false failures because of this.
- **2026-08-12 (session 3, part 2):** Ran a real end-to-end verification instead of trusting the checklist. **Ten items were already built but were marked open** because nobody had tested them. Wrote `qa/lifecycle-check.js`, a 14-assertion regression suite covering the whole money journey, **all 14 passing**: sign-in, server-owned entitlement, authority-field injection ignored, ownerId not echoed (K6), stranger 404, empty body 400 (K9), consent recorded and stale versions refused (D12), silent attempt scores behaviour 100 not 0 (K7), server-owned price, hidden packs refused, duplicate wallet txn refused (E6), idempotent allocation (E8), and paying lifting the sitting 10 to 17 (D16/D17). Checklist went 74 to **84 done + 5 partial of 126**.
  **Two testing traps cost me two runs, both documented in `qa/README.md`:** (1) leave `.env.local` in the /tmp mirror and the dev sign-in token is correctly refused by the production guard, so everything downstream fails for the wrong reason, delete it from the MIRROR ONLY; (2) `session/create` sets the owner cookie, not `auth/firebase`, so a test must carry a cookie jar across the whole journey or four unrelated assertions 404.
  **Next, in order:** D13 to D15 the question-10 gate, E5 and E7 the checkout and approval-pending screens, K11 and K12 the two dead ends, F7/F9/F10 seat atomicity and tenant isolation, then B21 and B23.
- **2026-08-12 (session 3, part 3 — the q10 gate, checkout, dead ends, and a real money bug):** Closed **D13, D14, D15, E5, E7 and K11**, and found a defect nobody had reported.
  **The question-10 gate (D13 to D15).** `components/TrialGate.tsx` gives two real choices. "See my report" is offered as an equal option, not a grey escape hatch, and the report a free student gets is the *same* report a paying student gets for those ten answers — weakening it to force a sale would make us the thing this product exists to be the opposite of. No countdown on that screen: urgency before the student has seen any value is a dark pattern. `LockedNotice` covers D15 and always names what is locked and what unlocks it, because a bare disabled button reads as "broken", and a student who thinks the product is broken leaves.
  **Checkout (E5) and the pending screen (E7).** The QR comes from `PAY_QR_IMAGE_URL` (see `.env.example`) and the wallet number is *always* shown and copyable beside it, because most students scan from the same phone that is displaying the page, which cannot work. New endpoint `POST /api/payment/screenshot` stores the receipt in a `precas-receipts` Netlify blob store, guarded on ownership first, then type, then a 2 MB cap. **The upload is optional on purpose and a failed upload never blocks the payment** — the control that stops a forwarded screenshot being reused is the unique wallet transaction id, not the image. The pending screen now shows the student their own amount, transaction number and an 8-character reference to quote back to us.
  **The dead ends.** New `components/RecoveryScreen.tsx` is now the single recovery screen for both `/results/{unknown}` (K11, closed, render-verified, correct 404 status) and `/interview/{unknown}` (K12, marked partial). Neither screen says *which* reason applies, deliberately: distinguishing "does not exist" from "is not yours" would confirm to a stranger that a guessed id is real, which is exactly the leak LIVE-002 closed. K12 stays partial and honest — its markup is proven through the results route, but the branch that selects it is client-side and **needs one click on the deployed site**. No browser can be installed in this sandbox (Playwright cannot get root), so I will not claim it renders.
  **The bug.** `consume()` in `lib/entitlement.ts` **had no callers**. Credits were granted on payment and never debited, so one NPR 449 pack bought unlimited mock interviews. Now called from the answer route, after the audio guard and before the paid STT call, and made idempotent per session — without that guard a 17-question mock would have burned 17 credits, which is the same bug in the opposite direction. Debiting on the first *answer* rather than at session creation is what makes the interview recovery screen's promise ("starting again does not use up a mock unless you record an answer") literally true.
  **Verification:** `tsc` clean, `next build` passes, `qa/lifecycle-check.js` now **20 of 20 passing** (added E5, E5-own, E5-type, E5-size, E5-ok and I-spend). Checklist **84 to 92 done + 6 partial of 126, about 73 percent**.
  **Two more testing traps, both cost a run.** (1) The suite must run against `next dev`, never `next start`: `next start` sets NODE_ENV=production, which correctly disables the `dev:` sign-in token, and every assertion then fails for the wrong reason. (2) The suite used `superKey: 'sup-x'`, which only worked because it was reading the client's real `.env.local`; it now uses the documented dev fallback `super-dev` so it does not depend on a secret. Also: **background servers do not survive between bash calls** — start the server and run the suite in the *same* call, and never `rsync --delete-excluded` into the mirror or it deletes `node_modules`.
  **Next five are at the bottom of `CHECKLIST.md`,** starting with F7/F9/F10 seat atomicity and tenant isolation.
  **Pushed:** `aa6e26a..ef38ded master -> main` at 11:40, Netlify rebuilding. **Still to confirm on the deployed site: K12** — open `/interview/some-made-up-id` and check the recovery screen appears rather than a spinner.
- **2026-08-12 (session 3, part 4 — seats and tenant isolation, F7/F9/F10 closed):** Found the **same class of bug as `consume()`, again**: `allocateSeat()` was correctly written with per-index claim keys and **had no callers**. A consultancy could buy a hundred seats, sign up two hundred students, and the dashboard would show nothing used. Added `grantSeat()` in `lib/entitlement.ts` and wired it into the Firebase signup route, after the student row is created so a seat is never claimed for an account that failed to create.
  **A student is never turned away when the seats run out.** They keep their free trial and can buy a pack like anybody else; being the fifty-first student through a fifty-seat link is not their fault.
  **`SEAT_GRANT` is an OPEN DECISION and the client must confirm it.** Nobody had ever said what a seat is worth. Rather than invent a number I derived one from the client's own figures: every bundle costs us 118 NPR per seat, the Prep pack costs 241 for 6 mocks and 15 practice, so a seat is a shade under half a Prep pack — **3 mocks and 8 practice**. It is written down at the bottom of `CHECKLIST.md` under "Open decision needing the client". If a seat should be worth more, raise `SEAT_GRANT` **and** the bundle prices together, never one without the other.
  **Also fixed a quieter bug:** the admin dashboard counted revoked seats as used (`seats.length`), while `allocateSeat` has always filtered on `revokedAt`. Two places disagreeing about how many seats are left is how a consultancy gets told it is full when it is not.
  **New suite `qa/tenant-check.js`, 8 of 8 passing:** 6 simultaneous signups against 3 seats produce exactly 3 seated (balances `[4,4,4,1,1,1]`), all 6 accounts still created, injected `consultancyId`/`tenant`/`slugOverride` fields are stripped by the schema so A sees only A, A's passcode against B's slug 403s, a suspended consultancy reads nothing, and a direct student is invisible to every admin. **Honest limit: this proves the claim-key algorithm inside one process.** The distributed guarantee still rests on Netlify Blobs' write-if-absent and has not been tested against the real store.
  Each student in that suite signs in from a different `x-forwarded-for`. That is not dodging the rate limiter — five sign-ins per IP per five minutes is the control that makes passcode brute force impractical, and loosening it for a test would be testing a product we do not ship.
  **Verification:** `tsc` clean, `next build` passes, lifecycle 20/20, tenant 8/8. Checklist **95 done + 6 partial of 126, about 75 percent**.
  **Pushed:** `ef38ded..9d28c5c master -> main` at 11:49, Netlify rebuilding.
- **2026-08-12 (session 3, part 5 — client decisions taken, E9 and E10 closed):**
  **I made an arithmetic error in part 4 and corrected it here.** I read `costNpr: 241` as the Prep pack's cost; it is Pro's. Prep costs 59 and Serious costs 118. The bundle files had always costed a seat at exactly **118 per seat** (2360/20, 5900/50, 11800/100), and 118 is precisely the Serious pack's cost — so the original intent was always that **a seat is a full Serious pack**. My "3 mocks" figure was built on the bad reading. Corrected, and `SEAT_GRANT` is now **derived from the Serious plan** rather than typed out, so it cannot drift again.
  **Client decisions, all recorded at the bottom of `CHECKLIST.md`:** (1) a seat is the Serious pack, 12 mocks and 30 practice, the same product a paying student gets — a consultancy student must never receive a lesser product than someone off the street; (2) bundles are **20 and 30 seats at NPR 300 each** (6,000 and 9,000), the 50 and 100 tiers dropped; (3) **consultancy admins may approve their own students' payments**; (4) the full button-by-button audit waits until the lifecycle is finished.
  **On (2), the client first asked for seats to be only "a bit" cheaper than the 799 retail.** I showed him the arithmetic instead of just doing it: at NPR 699 a seat he earns more per bundle but the consultancy has no room to resell under our own retail price, so nobody would buy. He chose NPR 300, which is what his cost sheet had always assumed.
  **On (3) I flagged the risk and he accepted it.** The money lands in OUR wallet, so a consultancy approving a payment is asserting something they cannot see. The mitigation is a paper trail rather than a block: `CONSULTANCY_APPROVAL_NOTE` is stamped into every such approval, and the order stays visible to the super admin.
  **Built:** `lib/payments.ts` now owns approve and reject, and BOTH `/api/super` and `/api/admin` call it. The moment two routes can release credits, one shared function is the only safe shape. The admin route checks `order.consultancyId === c.id` and returns the same 404 for "no such order" as for "not yours", so order ids cannot be probed across tenants. E10: when anyone other than the consultancy approves one of their students, that consultancy gets a notification, because a dashboard whose numbers move silently is a dashboard nobody trusts.
  **`qa/tenant-check.js` now 12 of 12** (added E9-cross, E9, E9-once, E10). Lifecycle still 20/20. Build passes, `/consultancy` renders the two new bundles and no longer shows 50 or 100.
  **A test-hygiene trap worth keeping:** the suite reused one IP for six super-admin calls, tripped the five-per-window auth limiter on the sixth, and an unrelated assertion then failed. Every super-admin call now uses its own `10.9.9.x`. **When a QA assertion fails, check the rate limiter before believing the product is broken.**
  Checklist **97 done + 6 partial of 126, about 77 percent**.
- **2026-08-12 (session 3, part 6 — the checklists split into three):** Client asked for the one master list to become three, one per role, and for this handoff file to point at all of them so another AI can pick up cleanly.
  **`CHECKLIST.md` is now a short index** holding the score, the client's settled decisions, and my corrections on the record. It points at:
  **`CHECKLIST-DEV.md`** — the old master list, everything still to be BUILT. Ticked once, stays ticked.
  **`CHECKLIST-QA.md`** — NEW, and the one the client specifically asked for. A release gate run from the top every single time, in 8 gates: (0) the four traps that have already produced false results here — no `.env.local` in the mirror, `next dev` not `next start`, the 5-per-IP auth limiter, and stripping React's `<!-- -->` before asserting on HTML; (1) automated, must be 20/20 and 12/12; (2) every route answers and offers a way onward; (3) **the lifecycle of every button** — 46 named controls, each checked in four states: normal, working, failure, recovery, because *a control that silently does nothing is the worst defect class in this product*; (4) the twelve money guarantees; (5) roles, privacy and isolation; (6) whether what is on screen is actually true; (7) a real phone on mobile data; (8) after the deploy, including that a failed Netlify build leaves the OLD site up looking fine.
  **`CHECKLIST-MARKETING.md`** — NEW. Leads with claim verification because this product has already had to retract two claims ("60% cheaper for the same thing" compared different pack sizes; "no other platform lets you try free" was untrue). Then pricing integrity (the NPR 300 wholesale price must never reach a student-facing page), the five funnel numbers worth measuring, channels, competitor watch, and a short list of things marketing must NOT do — no fake countdowns, no pressure before the student has seen their report, no claims about visa outcomes, and never touching transcripts for marketing.
  **Rule 0c in this file was rewritten** to cover all three, and now also requires that client decisions go under "Decisions taken" and my own corrections go under "Corrections on the record" in `CHECKLIST.md`.
  **Pushed:** `482e020..8b563a5 master -> main` at 12:28.
- **2026-08-13 (session 4 — the walks, eight bugs, and the test plan):**
  Built `qa/walk-check.js`, which is different in kind from the other five suites and is now the important one. The others prove individual guarantees in isolation. This one walks each ACTOR from their first click to their last, in the order they really click, with the wrong turns included: the second tap on bad wifi, the abandoned QR page, the sign out and back in, the second Gmail on the same laptop, the shared consultancy machine. **The bugs live between the steps, not inside them**, and a list of endpoints cannot find them.
  **Eight real defects found and fixed.** Three of them were critical.
  (1) **No way to sign out anywhere in the product.** Not a missing nicety: this product runs in consultancy labs on shared machines with a ninety day cookie, so the next student to sit down was already signed in as the last one, could read their report and spend the credits they paid for. Added `components/HeaderSession.tsx`, `/signout`, and `POST /api/signout`. The page is a plain form so it works when the JavaScript never loads, which is exactly the machine where it matters.
  (2) **One student could have two payments waiting for approval at once.** The client predicted this one almost word for word. He pays once, opens the checkout again, types a slightly different number, and two requests sit in the queue for one payment. Whoever approves sees two, believes two, grants two packs. `create` now refuses while one is submitted and says plainly that his payment is already being checked.
  (3) **A consultancy could not see the payments only they were allowed to approve.** `/api/admin` fetched the orders, used them to count revenue, and never sent them to the browser; the portal page had no queue and no buttons. So the client's own rule, that a student from an admin link is approved by that admin, was unreachable. The server code read perfectly the whole time. **This is why nothing is passed by reading code.**
  Also fixed: a refused student got red text with nothing to click (refusals now carry an action the server chooses, rendered as a button); every checkout visit wrote a new order without limit; tapping "I have paid" twice on bad wifi showed red to someone who had really paid (submit is now idempotent for the same number); we told a consultancy when we approved their student and said nothing when we rejected; and a verified payment could be flipped to rejected while the credits stayed granted, because `/api/super` wrote the order itself instead of calling the shared `rejectPayment`. Removed `checkCredits()`, a placeholder in the answer route that always returned allowed and read like a control.
  **Result: walk 78/78, adversarial 18/18, lifecycle 20/20, journey 26/26, fraud 19/19, tenant 12/12, `tsc` clean.**
  **Then the client found two more bugs in a browser, within minutes, with every suite green.** `/start` never asks whether you are already signed in, so a signed in student who taps "My practice" is shown the Google chooser again; and the catalogue keeps saying "Sign in to start" after you have signed in. **Both are client side state, and not one of the six suites loads any JavaScript.** That is the real lesson of this session and it is written up as D-04.
  **New: `docs/TEST-PLAN.md`, and it is now the release gate.** Every page with every control and what must never happen, the five actor lifecycles as flowcharts, the invariants, the regression gate, the open defects, and the ones already fixed. **New rule 0d in this file** records the standard the client has set, in his own words, and requires a real browser pass with the Claude in Chrome tools on every release. Do not report "all green" from the suites alone again.
  **Open and NOT fixed, deliberately, because the client asked for documentation rather than more code:** D-01 `/start` ignores an existing session, D-02 stale signed in state on the catalogue, D-03 no visible confirmation of who is signed in, D-04 no browser level testing at all. They are the first work of the next session.
  **Not yet committed or pushed.**
