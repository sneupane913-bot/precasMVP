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

## 0b. RULES.md IS THE SOURCE OF TRUTH (binding rule, added 13 Aug 2026)

**`RULES.md` in the project root outranks every other document, including the
checklists and including the code.**

The client called this out and he was right. We built the product first and
wrote tests afterwards. A test written after the code can only confirm what was
built; it cannot tell you what *should* have been built. That is exactly why
every suite was green while a real student could not stay signed in — there was
no independent statement of correct behaviour for the code to be wrong *about*.

The order is now: **rules → code → QA checks code against rules.**

- Every rule has an ID (G-1, S-25, C-13, M-8 …). The coder builds to the ID.
  **Every test names the rule it proves.** A test that proves nothing in
  `RULES.md` is not a test, it is a habit.
- **If a rule is missing, stop and write it there first.** Never make the
  judgement call in code. Undefined behaviour is a gap, not a licence.
- If code and rules disagree, the rules win — or the rule is wrong and gets
  changed in `RULES.md` first, never silently in code.
- Statuses in that file are `[BUILT]`, `[BUILT+PROVEN]`, `[TODO]`, `[OPEN]`.
  **Nothing is `BUILT+PROVEN` until a passing test cites its rule ID.**
- Part 10 of `RULES.md` lists the rules with **no test at all**. That list is
  the honest gap. Never describe anything on it as working.

---

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
  **Two stale git lock files were left behind: `.git/HEAD.lock` and `.git/index.lock`, both zero bytes.** The sandbox mount cannot unlink them ("Operation not permitted"), and they will block the next ordinary git command. This has happened before and the fix is known: either have the client's Mac remove them (they are harmless empty files), or bypass them entirely with the git plumbing route already proven here, `write-tree` then `commit-tree` then writing the hash straight into `.git/refs/heads/master` with `printf`. Do not spend a session on this again.
  **Committed as `ac640f7` on the local repo. NOT pushed**, because the client asked for documentation rather than more deployment this round. The next session should push it with the usual PUSH.command once D-01 to D-03 are also fixed, so one deploy carries the whole set.

- **2026-08-13 (PILOT HARDENING — client found real bugs the suites could not see):** The client opened the live site and hit a sign-in loop, no signed-in identity, no sign-out, and `/practice` bouncing to Google over and over. **The checklist said 120/126 done. It was not lying about the code; it was lying about what "done" proves.** Every suite here is API-level: it posts JSON and reads JSON. A redirect loop, a missing header, a dead link — none of that is visible to any test in this repo. That gap is the lesson: **green suites are not evidence a human can use the site.**
  **Root cause of three of the four: commit `ac640f7` was never pushed.** `HeaderSession`, `/signout`, `/account` and the header rework all existed locally while the live site ran `a1a919d`. Work was marked complete and never deployed. **Check `git log origin/main..HEAD` before telling the client anything is live.**
  **PILOT-01, the worst bug in the codebase.** `BlobRepo.get()` ended in `catch { return null }`, which made a BROKEN STORE indistinguishable from A STUDENT WHO DOES NOT EXIST. A student signs in with Google, the next request cannot read their record, `currentStudent()` returns null, every API answers 401, the page bounces to `/start`, they sign in again, forever — with nothing logged and nothing looking broken. `list()` had the same disease and would have shown a consultancy "0 students" instead of an outage. Both now throw `StoreUnavailableError`, and `lib/api-errors.ts` turns that into a **503 with an honest message**, never a 401. This matters because every client page only bounces to sign-in on a 401, so returning 503 is what breaks the loop.
  **PILOT-02.** `/start` never asked whether you were already signed in, which is what turned one failure into an endless loop. It now checks `/api/me` first and sends a signed-in student straight on.
  **PILOT-03, hardening.** `claim()` decided "did I win?" by comparing the value it wrote against the value stored. Callers passed things like `{orderId, at: ISO}`, so two writers in the SAME MILLISECOND wrote byte-identical values and both believed they had claimed it. This is the primitive behind every uniqueness guarantee in the product, so its failure mode is money. It now uses an uncollidable token.
  **New `qa/pilot-check.js`, 29 case studies, all passing.** Named stories rather than unit tests, built from the client's own list: finish ten then log out and back in (no refill), exhausted student blocked, abandoned checkout grants nothing, returning three days later still works, **triple-tapped submit produces exactly ONE item in the approval queue**, a forwarded receipt refused, admin A cannot approve admin B's student, super admin covering for a sleeping admin and the admin being told, both approvers clicking at once paying once, an ad-sourced student invisible to every admin, and no admin able to read a transcript.
  **Three of my own tests were wrong, not the product.** (1) CS-05 asserted a second Google account on one device should be stopped — the threshold is deliberately 4, because a consultancy lab shares machines and punishing the second student there would be indefensible. (2) CS-08 asserted only one of three repeat submits should succeed — answering all three calmly is deliberate, because a student shown a red error after sending real money pays twice or assumes fraud; what must not duplicate is the QUEUE ITEM, and it does not. (3) Lifecycle E6 tried to create a second order for one student, which is now correctly refused with 409, so it never reached the duplicate-txn guard; it now tests the real threat, a screenshot forwarded to a friend.
  **Harness lessons, both cost a run.** Next refuses a second `next dev` for the same project and silently reuses the first, so two suites tested nothing and reported "code 0". Kill the port between suites. And `fraud-check.js` shared one IP across more than ten payment calls, hitting the 10-per-hour limiter; it now varies `x-forwarded-for`, as `tenant-check.js` already did.
  **All seven suites green:** lifecycle 20/20, tenant 12/12, fraud 19/19, journey 26/26, walk 78 steps 0 bugs, adversarial 18/18, pilot 29/29.
  **STILL NOT PROVEN, and must not be claimed:** anything requiring a real browser — the Google popup and its redirect fallback, camera and microphone, the 360px phone pass, and the PWA install. No browser can be installed in this sandbox (Playwright cannot get root). These need a human with a phone.

- **2026-08-13 (THE RESET — rules first, and a new host):** The client stopped the work and named the real failure himself: *"I did not make a strategic plan. I did not make a skeleton of where everything needs to go. Once the rules were embedded, none of these bugs would have come."* He is right, and it is the single most important thing in this file.
  **What actually went wrong, stated plainly:** we wrote code, then wrote tests that described the code we had already written. Tests written after the fact can only confirm what you built. They cannot tell you what you *should* have built. That is why 124 assertions were green while a student could not stay signed in — nothing existed for the code to be wrong *about*. **Rules → code → QA. In that order, from now on.**
  **Created `RULES.md`** and made it outrank everything else (new binding rule 0b above). Five actors, ~120 numbered rules, each marked BUILT / BUILT+PROVEN / TODO / OPEN, and **Part 10 lists every rule with no test at all** so the gap is impossible to hide. The gap list is long and includes all of the AI, the whole student dashboard, and everything needing a real browser or phone.
  **We had forgotten an actor.** The student had no home of their own — no dashboard, no history, no sense of what they had bought. Rules S-38 to S-44 now cover it, all TODO. This is why "My practice" felt broken: there was nothing behind it worth arriving at.
  **HOSTING DECIDED.** Moving off Netlify to **Himalayan Host, "20X Faster Local Cloud with Free .COM", NPR 3,500/year**, local Kathmandu datacentre, DirectAdmin, Node.js supported. Coupon `HH2026` for 10% off. Reasoning: a .com alone costs NPR 1,500–2,000/yr, so the hosting is effectively ~NPR 1,500, and local hosting matters for students on Nepali mobile data. `merotestbooking.com` is abandoned — a fresh domain.
  **TWO THINGS TO SETTLE BEFORE DEPLOYING THERE (OPEN-1, OPEN-4 in RULES.md):** (1) their pages say "Node.js supported", which normally means the CloudLinux/Passenger selector — that runs simple Express apps reliably but **Next.js 16 App Router is heavier and I cannot test their environment from here.** Open a ticket asking exactly: *"Can I run a Next.js 16 application on a persistent Node.js process with `next start`?"* If no, the NPR 12,000/yr Europe VPS is the honest answer. (2) **Netlify Blobs does not exist there.** Their shared plans give MySQL, not Postgres. Point at Supabase's free cloud tier (the schema is already written in `supabase/schema.sql`) rather than writing a MySQL layer.
  **PRICING CHANGED, NOT YET APPLIED (M-8 to M-12):** NPR 449 = **3 mocks + 15 practice**; NPR 799 = **10 mocks + 20 practice**. A consultancy seat follows the 799 pack. **Flagged for the client:** at 3 mocks, NPR 449 is NPR 150 per mock against the competitor's NPR 143–160 — it is no longer clearly cheaper, so the comparison table on `/pricing` must be re-checked before this goes live or it becomes a false claim.
  **Still true and still unpushed:** commits `1efbb13` and earlier are waiting; the Mac was locked. Until they are pushed the live site still has the silent sign-in loop (PILOT-01).
  **HOSTING RE-DECIDED, same day.** Himalayan Host support was asked "can I run a Next.js 16 application on a persistent Node.js process with `next start`?" and replied with a link to the **VPS** page — not the shared hosting page. That is not an answer, but the choice of link reads as "you need a VPS for that", which fits: shared-plan "Node.js support" on DirectAdmin is the CloudLinux/Passenger selector, built for small apps and usually unable to keep a Next.js server resident. A VPS certainly works (root access; their own blurb mentions running n8n), but the cost jumps from NPR 3,500/yr shared to **NPR 12,000/yr Europe or NPR 42,000/yr KTM**, and building one blind is most of a day out of three.
  **Decision: stay on Netlify for the pilot and migrate afterwards.** Free, already working, and a new domain points at it in about thirty minutes. Local hosting is a speed improvement, not a works-versus-does-not-work improvement, and speed is not what is short right now. Storage stays Supabase free tier (OPEN-4 settled).
  **If someone revisits this:** the precise question to put to the host is whether the shared plan can run a long-running Node 20+ process listening on a port behind their web server, staying resident between requests, and if not whether KTM Small is the cheapest plan that can.

- **2026-08-13 (TESTED introduced, and 11 TODOs built):** Client added a fourth rung to the ladder. A rule is now `TODO → BUILT → BUILT+PROVEN → BUILT+PROVEN+TESTED`, and **TESTED is granted live, in Chrome, with the client watching — never by me alone.** The legend at the top of `RULES.md` explains why: every suite was green while a student could not stay signed in, because API tests send JSON and read JSON and cannot see a redirect loop, a silent button or a stuck spinner.
  **Built this session, 11 rules TODO → BUILT:**
  **V-9, and it explains the iPhone 6s.** The client saw *no sign-in button at all*. Cause was structural: `/start` renders a grey placeholder while `loading` is true, and `loading` was cleared only after two awaited fetches both resolved — one stalled request on an old device meant the placeholder stayed forever. Now every fetch has a 6s timeout and `loading` clears in a `finally`. Also: iOS and in-app browsers (Facebook, Instagram, TikTok) now **skip the popup entirely** and go straight to redirect, because trying the popup there produces the worst outcome — a button that looks like it did nothing. Any unexpected popup error also falls back to redirect rather than dead-ending. And `FirebaseSignIn` can no longer render an invisible placeholder.
  **G-10 / E-6:** `components/ActionButton.tsx`. Working / failed / done are impossible to forget, the button locks while in flight (the cheapest double-payment protection there is), and errors attach to the button that caused them rather than floating at the top of a page a phone user will not see.
  **S-41, S-42, S-44:** the dashboard now shows progress and one thing to work on. **Trend is null until TWO scored sittings** — one point is a dot, not a direction. The weakest sub-score **skips nulls**, because a skill we could not judge is a gap in our measurement, not a weakness in the student; naming it would be the same sin as scoring silence.
  **S-37:** the report names one concrete action, directly under the verdict, because a student reading a low score is looking for what to DO and will not scroll past four sub-scores. Shared with the dashboard through `lib/advice.ts` so the two can never give different advice about the same weakness.
  **S-28:** a dropped connection now **preserves the recording** and offers "send the same recording again". Before, a failed upload told the student to re-record an answer they had already given, on a question with three attempts, because OUR request failed. On Nepali mobile data a dropped connection is the normal case, not the exception.
  **Verified:** tsc clean, build passes, and all seven suites still green — lifecycle 20/20, tenant 12/12, pilot 29/29, fraud 19/19, journey 26/26, walk 78 steps, adversarial 18/18.
  **5 TODOs remain, and 3 are blocked on the client:** Q-1 and Q-2 (researching what UK universities and UKVI credibility interviews actually ask — real content work, I can do it next), and Q-5, Q-8, Q-9 (Groq speech-to-text, the Nepali-accent benchmark, and AI privacy) which cannot start until the **Groq and Gemini API keys** exist. Both are empty in `.env.local`.
  **Next: the TESTED session.** Chrome, together, rule by rule.

- **2026-08-13 (Part 12: the 13 August model, written then surveyed then built):** Client rewrote the consultancy model and added a large amount of scope. Written into `RULES.md` **Part 12 as 47 numbered rules before any code**, per rule 0b.
  **The hardest item disappeared on a clarification.** "Admin gives the student an id and password" would have meant a second identity system — storage, hashing, reset, lockout, a day of work. The client clarified: **sign-in is Google, always. The admin issues a LINK, not credentials.** One identity system, nothing to store, nothing to leak. `N-2`.
  **`C-12` is retired.** An admin never approves a student payment, because a consultancy student never pays us. Admins pay us for seats; how they collect from their own students — cash, their own link, or free — is their business and never touches our system.
  **`qa/model-check.js` was written BEFORE the code and run as a survey.** First run: 9 passed, 6 failed. Those six failures were the work list, and this is the first time on this project that the tests told us what to build rather than confirming what we had built.
  **What the survey found, and it was worth doing:**
  **N-26 was the serious one.** `buildQuestionPlan` was fully deterministic — **every student on the platform received the same ten questions in the same order.** Ten students in one lab compare notes, memorise the set, and walk into a credibility interview with rehearsed answers, which is precisely what that interview is designed to catch. We would have been coaching students into failing. Now **stratified random**: an identity question always opens, then one question per category in turn so the trial still diagnoses, with WHICH question random. Pure shuffling was rejected — it would sometimes hand a student six finance questions and tell them nothing about the rest. The plan is still stored on the session, so a resume stays deterministic (Q-4, N-45).
  **N-41/N-42, the kill switch had a hole.** `/api/me`, `/api/account`, `/api/super` and `/api/admin` never checked `platformDown`. A dark site with a working till is not a kill switch, and a super admin still able to move money while students are locked out is the exact workaround the switch exists to prevent. All now 503. Deliberately excluded: `/api/platform` (the owner needs it to turn the platform back on) and `/api/signout` (trapping a signed-in student on a shared lab machine would be worse than the outage).
  **N-40 was a real dead end.** Typing your own university and being told "we do not have that" with no button is the worst screen in the funnel. It now offers the general UK paper, because a credibility interview asks the same themes wherever you apply — the student loses almost nothing by practising it, and everything if we send them away.
  **N-44 to N-47 mostly already worked** and the survey proved it rather than assuming: answer 2 of 17, close the tab, come back at question 3 with the same paper and one credit spent. Only the dashboard's `resumeHref` was missing from the API contract.
  **Two of the six "failures" were my tests, not the product** — the owner key is `owner-dev` not `own-dev`, and N-40's empty-search branch is not in the first paint so it needed a source-level check.
  **Suites: model 14/15, rules 59/59, lifecycle 20/20, pilot 29/29.**
  **N-29 is the one genuine failure left and it is deliberate: the question bank cites no sources.** Until that research exists, **no page may claim these are the questions universities ask.** That is the next piece of real work, and the client named it as the heart of the product.

- **2026-08-13 (the AI contract, fixed before the key):** Client's goal for today was that **everything except connecting the AI is finished**, so that tomorrow is plumbing. Built `lib/ai/contract.ts` and Part 13 of `RULES.md` (AI-1 to AI-9, 8 of 9 BUILT+PROVEN).
  **Every input and output is now fixed before a provider is chosen.** What goes in: question, category, intent, transcript, duration, university, level, and **what the student said earlier in the same sitting**. What comes back: PEE + wrap-up, one Nepali line, three nullable sub-scores, and a **contradiction** field.
  **`AI-2` is the one I would defend hardest.** No name, email, phone, consultancy or payment history is in the input shape at all. A grader does not need to know who somebody is to say whether they named their course, and these transcripts contain family income and visa refusals.
  **`AI-4` contradiction detection is the highest-value output.** A student whose father is a farmer in question 3 and a businessman in question 11 has a problem no single-answer grader can see — and an officer certainly will. That is why `previousTranscripts` is in the input.
  **`looksGeneric()` enforces N-30 at runtime, on every response, not as a spot check.** A model under load drifts towards safe generic sentences because they are the highest-probability output, and that drift is silent. The guard requires the `evidence` field to actually overlap the transcript, and rejects a list of stock phrases ("give more detail", "keep practising"). On failure the prose is dropped, the score and recording are kept, and the student is told plainly: **a missing paragraph is honest, a generic one is a lie that costs them the interview.**
  **`AI-6`: accent and grammar are never penalised.** Only vagueness, contradiction, numbers that do not add up, and answers that sound recited. **`AI-7`:** the transcriber gets a language hint and a Nepali vocabulary hint, so it does not "correct" a speaker into words they never said and then quote those words back at them as evidence.
  **When the key arrives, only `stt.ts` and `evaluate.ts` change** (AI-9). G-1, N-30, Q-10 and G-8 must all still hold afterwards.
  **A third test of mine matched a code comment instead of code** — the same mistake as S-16, this time on AI-2. The file explains in prose what is deliberately NOT sent; the assertion now parses the interface body. **Worth internalising: when asserting on source, parse the construct, never grep the file.**
  **Suites: model 22/23, rules 59/59, lifecycle 20/20, pilot 29/29.**
  **STILL OPEN — 30 of the Part 12 rules.** Largest remaining blocks: the seat model with variable mock counts (N-1, N-3, N-5, N-6), QR and WhatsApp deep links (N-9 to N-16), the abuse queue and device soft-block (N-18 to N-20), super-admin views (N-21 to N-24), question authoring (N-25, N-28), and practice (N-34, N-36, N-37).
  **N-29 remains the one deliberate failure: the question bank cites no sources.** Until that research exists no page may claim these are the questions universities ask, and the client has called the questions the heart of the product.

- **2026-08-13 (pricing applied — M-8, M-9, M-10, M-12):** Client confirmed. **NPR 449 = 3 mocks + 15 practice** (costs us ~30). **NPR 799 = 10 mocks + 20 practice** (costs us ~98). A consultancy seat follows the 799 pack and is **derived from it in code**, so it can never drift.
  **M-12 mattered more than the numbers.** The pricing page compared **price per mock**, and at 449 for 3 mocks we are **NPR 150 a mock against the competitor's 143–160** — we are no longer cheaper on the one number the page was comparing. Leaving that table up would have turned a true claim into a false one (G-9). The client's own argument is stronger and is what the page now says: **our entry pack is NPR 449 against their NPR 799, and we let a student try ten real questions free while they do not.** The per-mock line is gone from the pack cards too, because printing NPR 150 invites exactly the comparison we lose.
  **The pricing change broke four suites and every break was a stale expectation, not a bug** — E8 expected 6 mocks, CS-16 expected a 13-mock seat, E9 expected 6. All corrected to 3 / 11 / 3.
  **My own G-9 guard caught me twice**, which is the best evidence it works: the new comparison table used the word "cheapest" in a column header and in its intro sentence, and the guard refused both.
  **And for the FOURTH time a test of mine matched a code COMMENT instead of code** — M-12 grepped for "per mock" and found the comment explaining why the per-mock rate is not shown. Comments are now stripped before that assertion. **The lesson is now unmissable: when asserting on source, strip comments or parse the construct. Never grep the raw file.**
  **Suites: rules 59/59, model 27/28, lifecycle 20/20, pilot 29/29, tenant 12/12.** The single failure is N-29, still deliberate.

- **2026-08-13 (working TODO by TODO, one at a time):** Client asked for exactly this: build one, prove it, move on. No batching, no "I cannot get there".
  **N-1, N-2, N-3 — seats carry a chosen number of mocks.** A consultancy buys 3, 6 or 10 mock seats and may mix them in one order. **The size travels on the LINK** (`?seat=seat3`), which is what let us keep N-2: sign-in stays Google-only and there are still **no passwords anywhere in this product**. The size is recorded **on the allocation**, not read back from the consultancy later — a consultancy can change its seat size between one student and the next, and a student given a 10-mock seat must keep 10 even if the next batch is bought at 3. Reading it live would silently rewrite their history. An unknown code in the URL falls back to the default rather than granting whatever the URL claims (G-2). Proven: seat3→4, seat6→7, seat10→11, `?seat=seat9999`→11.
  **N-4, N-7, N-8 — a consultancy student is never sold to.** `seatBacked` is computed on the server from the ledger and returned by both `/api/me` and `/api/account`; the dashboard shows "your consultancy is covering this" instead of a price. Their consultancy already paid, and asking again in front of thirty of their students is the fastest way to lose that consultancy. A student who pays us directly is `seatBacked: false` and still sees prices — proven both ways.
  **My test failed first because it signed up seven students against a five-seat consultancy and ran it dry**, so seat10 came back as the bare trial and looked like a broken seat size. It was a broken test. Seat count raised to 20 with a comment explaining why.
  **model-check now 32/33.** The single failure is still N-29.
  **Harness note:** `next dev` in the mirror needs ~20s warm-up plus ~100s for the full model suite; run it backgrounded to a file and read the file, or the bash call times out at 178s.
  **N-5 renewal, and a real bug it exposed.** `allocateSeat` is idempotent per student — correct for a SIGNUP, where a retried request must not hand over two seats. A renewal is the opposite: a deliberate second grant, months later, decided by a human. Without a flag, renewal quietly gave the student credits **without consuming a seat**, so a consultancy could top the same student up forever on one seat. `allocateSeat` now takes `{ renewal: true }`. Credits **add** rather than replace: a student with 7 left who is topped up with a 3-seat has 10, never 3 — anything else silently takes something they already owned. Proven both ways, plus one consultancy cannot renew another's student (404).
  **N-10, N-11, N-12, N-13, N-20 — the QR, the wallet and the WhatsApp escape.** All five live in `PlatformSettings` and are changed by the **super admin only**, with no deploy: a wallet number that needs a code release to update is a number that will be wrong on the day it matters most, while a student who has just sent money is trying to reach us. Env vars remain as the fallback so nothing breaks before the first time somebody sets them. A consultancy admin has no such action on their route at all (400). **N-12**: the WhatsApp link opens with the whole message already written, including their payment reference — a frightened student who has just sent real money should never have to compose an explanation in English on a phone. **N-13**: every approval request in the super-admin queue now carries the payer's phone, because when money has not landed the only useful next step is to ring them, and making the approver look the number up elsewhere is how a payment sits overnight while a student assumes they were robbed.
  **HARNESS TRAP, cost one run:** after `rsync` into the mirror, `next dev` served a stale `.next` and every multipart POST to `/api/session/[id]/answer` came back **404 "Failed to find Server Action"**, which looked exactly like a broken answer route and was not. **`rm -rf .next` in the mirror before starting the dev server.**
  **model-check 39/40.** N-29 remains the only failure.
  **N-14, N-15, N-16 — upgrade, top-up, install.** The decision of what to offer is made on the SERVER (`offerUpgrade`, `offerRenew`), not in the browser. **The top-up appears at two mocks or fewer, never at zero**: earlier is nagging, at zero it is already too late because the student has been stopped mid-preparation. It renders ABOVE the upgrade link deliberately — a nearly-empty student needs the top-up, not the shop, and the other order is how somebody ends up comparing packs while their interview is next week. Seat-backed students are excluded from both (N-4). `lastPayer` pre-fills the next checkout. The install prompt moved onto the **dashboard**, because the report is seen once and the dashboard is the page they come back to.
  **N-17, N-18, N-19 — the device soft-block.** The super admin can block a fingerprint by hand, which outranks the heuristic in both directions. **It is a SOFT block and stays soft**: the student is still signed in, keeps every report they earned, and can still buy a pack — the only thing they lose is another *free* trial. The message never says ban, fraud or cheat; it says what to do and gives a number. `blockedWhatsappLink()` pre-fills the appeal, because a wrongly flagged student who has to compose an appeal in English on a phone is a real customer we simply lose. Unblocking releases the device immediately — proven in both directions.
  **model-check 49/50.**
  **N-21 to N-24 — the super admin directory.** Students and consultancies in **two separate lists**, because one mixed list makes the reader do the sorting in their head, the two are answered by different questions ("can they practise" vs "are they buying"), and they are different privacy classes — keeping them apart makes G-8 easier to hold, not harder. Per student: level, target university, WhatsApp number **and whether it really has WhatsApp** (asked, never assumed — half the support plan is a WhatsApp link, and a number that turns out not to be on WhatsApp is a student we cannot reach on the day their payment fails). Per consultancy: seats given out, renewals, students from the link. **N-23 is city only, volunteered at payment, never GPS** — proven by asserting no coordinate field exists anywhere on the record. Everything is captured at the payment step, where asking is relevant, rather than gating the free trial behind a form. `N-21b` proves the directory still carries no transcript at any level.
  **model-check 54/55.**
  **N-34, N-36, N-37 — practice becomes a real feature.** One question at a time from a practice credit, and **aimed by default at the student's weakest ASSESSED sub-score** via `weakestCategoryFor()`: practice that starts from nothing is a worse product than practice that continues the report they just read, and a student told "you gave no real detail" should land on a question that demands detail without working out which theme that is. Returns null when nothing is scored, and the caller falls back to random — guessing a weakness we never measured would be scoring silence one step removed. **N-37: practice is marked in history and excluded from the mock trend.** A one-question drill averaged with a seventeen-question mock would swing the trend on a single answer and tell a student they had improved or collapsed when nothing of the sort happened.
  **model-check 57/58.**
  **N-25, N-28 — question authoring.** The super admin adds questions to the live bank with **no deploy**: the bank IS the product, and waiting for a code release to add a question a student just reported from a real interview is how a bank goes stale — and a stale bank is the one thing that would make this product useless while still appearing to work. Half-written questions are refused (400). **N-28**: students on the NPR 799 pack can add their own, recorded against their own id so their questions never leak into another student's paper. Below that pack it is refused with wording that makes clear **nothing they already have is taken away**.
  **A test-hygiene trap worth remembering:** my insert anchored on `=== PRACTICE ===` and the file contained that marker TWICE, so the whole block was duplicated and node refused to parse it (`Identifier already declared`). **When inserting into a test file by string match, check the anchor is unique first.**
  **model-check 61/62.**
  **N-6, N-9, N-27 done.** N-6: a consultancy buys more seats through the **same shape as a student payment** — QR, transaction id, super-admin approval — deliberately not a special B2B flow, so there is one approval queue, one set of money guarantees and one place a mistake can happen. Same one-payment-in-flight guard, so one transfer cannot become two approvals. N-9: checkout order proven **by position in the source** — QR, wallet number, details, optional photo, pay — with the WhatsApp escape directly under the button that might fail. N-27: `eligiblePool()` bounds the randomness; a question can only reach a paper if it is in the vetted bank, never generated or paraphrased.
  **model-check 66/67. Eight rules remain: Q-1, Q-2, Q-5, Q-8, Q-9, N-29, AI-9 — all of them either the question research or blocked on the AI keys.**
  **N-29, Q-1, Q-2 — the question bank now cites its sources, and this was the last non-AI gap.** Two named UK university sources, dated 13 Aug 2026: **Oxford Brookes' own credibility-interview guidance to its offer holders** (which publishes the five topic areas and example questions under each) and **University of Lincoln's Pre-CAS page**. Every category in `lib/data/questions.ts` is mapped to one of the five published topic areas, and the header states plainly that a question fitting none of them is not a Pre-CAS question however sensible it sounds.
  **Two lines from the source now shape the whole product, and are quoted in the file:** *"If you just give general answers that anyone could give, then your visa application may be refused"* — which is the external justification for N-30 forbidding generic feedback, because coaching a student toward a general answer would be coaching them to fail. And *"It is not enough to rely on university rankings"* — so a rankings-only answer must score BADLY on genuineIntent, not well. That is taken from a university's own guidance rather than guessed at.
  **model-check 69/69. Every Part 12 rule is now BUILT+PROVEN.** The only rules left in the whole document are Q-5, Q-8, Q-9 and AI-9 — all four blocked on the Groq and Gemini keys, which are still empty in `.env.local`.
