# Developer checklist — what still has to be BUILT

**Everything that still has to be BUILT. Work top to bottom, in order.**
This is one of three lists — see **[CHECKLIST.md](CHECKLIST.md)** for the index,
the score, and the client's settled decisions. QA has its own list in
`CHECKLIST-QA.md` and runs it from the top on every release.
Statuses: `[x]` done and verified · `[~]` partly done · `[ ]` not started · `[AI]` deferred to phase 2 (connect the AI)

Rules: nothing is `[x]` until it has been built, typechecked, built, and seen working. When you add scope, add it to the right section here in order, never at the end.

Last updated: 2026-08-12 (session 3). Verified items now say how they were proven.

---

## A. Foundation and pipeline

- [x] A1 Next.js app, TypeScript strict, Tailwind, Netlify config
- [x] A2 Project moved out of iCloud (it deadlocked the compiler and corrupted git)
- [x] A3 `firebase` package actually installed (it was declared but missing)
- [x] A4 `tsc --noEmit` runs clean
- [x] A5 `next build` passes
- [x] A6 Local render verification loop (build mirror in /tmp, node http checks)
- [x] A7 Commit path that works around the read-only mount (git plumbing + direct ref write)
- [x] A8 Push and deploy path that works (`PUSH.command` via Finder, HTTP/1.1, large buffer)
- [x] A9 Netlify secret scanner configured for public `NEXT_PUBLIC_*` values
- [x] A10 Firebase sign-in working in production (root cause was a corrupted env var value)
- [x] A11 `lib/build-info.ts` exists
- [x] A11a `qa/lifecycle-check.js` regression suite: 14 end-to-end guarantees, all passing
- [x] A12 Build SHA, context, branch and build time render at the foot of the super admin dashboard

## B. Design system and student-facing UI

- [x] B1 Approved Stitch design saved in repo as the spec (`docs/design-reference/`)
- [x] B2 Fonts: Noto Serif display, Hanken Grotesk body, no build-time network dependency
- [x] B3 `SiteHeader` sticky nav with logo, links, Sign in, Start free
- [x] B4 `SiteFooter` with brand, link columns, WhatsApp, disclaimer, dynamic year
- [x] B5 Header and footer on home, pricing, universities, privacy, terms, refund
- [x] B6 Home hero with primary and secondary CTA, and the honest proof line
- [x] B7 Home: self-moving university logo slider
- [x] B8 Home: "Three steps to interview readiness"
- [x] B9 Home: sample question analysis card
- [x] B10 University logos visible everywhere (white artwork was invisible)
- [x] B11 Sign-in page rebuilt to the approved two-column design
- [x] B12 University cards: logo chip, Duration and Questions boxes, Free first try badge
- [x] B13 Pricing hierarchy: free card, NPR 449 smaller, NPR 799 large focal card
- [x] B13a Home pricing replaced with the approved /pricing block, shared as one component so the two can never drift
- [x] B14 Honest pricing content: real packs, dated per-mock comparison, no invented plan
- [x] B15 Consultancy wholesale price removed from the public student pricing page
- [x] B16 Legal pages exist and are linked: `/privacy`, `/terms`, `/refund`
- [x] B17 Branded 404 with a way back
- [x] B18 Home: FAQ section, four real questions, works with no JavaScript
- [x] B19 Universities: centred header, wider search, restyled chips, Most applied heading
- [x] B20 Universities: 92 UK universities, six pinned as Most applied and 87 listed below. Name and city only for the wider list, generic themes wording, no invented per-university claims, no scraped logos
- [x] B21 `/consultancy` given a business-facing header and the site footer
- [x] B22 `/checkout` given brand and a way back to the packs
- [x] B23 Results page to the approved design: site header, university and date above the title, Practise your weakest answer beside it, sub-score tiles that say Not assessed rather than 0, behaviour table, per-question you-said versus a-better-way, footer
- [x] B24 Interview room reviewed: monitor grid fixed for 360px, scroll resets on every stage change, demo banner still honest when speech is not connected, no fixed widths over 360px
- [x] B25 Scroll reset on stage change (interview page scrolls to top on every stage change)
- [~] B26 PWA complete in code: icon-192, icon-512 (any + maskable), apple-touch-icon all serve 200, manifest standalone, InstallPrompt shown after the first completed interview. Real-phone install still to confirm.
- [x] B27 360px: two real bugs found and fixed (results table now scrolls rather than widening the page; interview monitor drops to two columns), and phone safety is now asserted on every page in the journey suite so it cannot regress.

## C. Back office UI

- [x] C1 `/admin` rebuilt to `consultancy_admin_dashboard`, now reading the live student repo
- [x] C2 `/super` rebuilt to `super_admin_dashboard`, now wired to /api/super
- [x] C3 `/owner` given the switch history panel
- [x] C4 Consistent back office shell (side nav, stat cards, tables)

## D. Student lifecycle (direct signup)

- [x] D1 Google sign-in gate at `/start`
- [x] D2 Nobody can start an interview without signing in (API returns 401)
- [x] D3 Student account created on first sign-in
- [x] D4 Trial gate logic exists (`lib/trial-gate.ts`) with soft deny, never a ban
- [x] D5 Entitlement computed server-side (`lib/entitlement.ts`), never from the browser
- [x] D6 Session creation with server-owned question plan
- [x] D7 Consent endpoint exists (`/api/session/[id]/consent`)
- [x] D8 Session ownership enforced (stranger gets 404, not 403)
- [x] D9 Answer, complete and flag endpoints exist
- [~] D10 Device check screen (exists, needs design pass and real-device testing)
- [~] D11 Interview room (exists, needs design pass and real-device testing)
- [x] D12 Consent actually recorded with version and timestamp, stale versions refused (QA-208) — proven by qa/lifecycle-check.js
- [x] D13 The gate after question 10: two clear choices, pay to continue or see the report — `components/TrialGate.tsx`, wired into `InterviewRoom`; markup render-verified
- [x] D14 Report shown after question 10, same report a paying student sees — the gate routes to the same `/results/{id}` page, nothing is withheld from the free report
- [x] D15 Paid features clearly locked for a trial student, with a plain reason — `LockedNotice`, always states what is locked and what unlocks it, never a bare disabled control
- [x] D16 Paying lifts the sitting from 10 to 17 questions — proven by qa/lifecycle-check.js
- [x] D17 Paying grants the pack on approval — proven by qa/lifecycle-check.js
- [x] D18 Practice mode at /practice: pick a theme or let us choose, one question, charged to the practice pool, daily mock cap does not apply
- [x] D19 Student history at /account: mocks and practice left, every session with a link back to the report or to carry on, referral link
- [x] D20 Full journey walked end to end in qa/journey-check.js, 26/26: land, gate, sign in, browse, start, consent, finish, report, personal offer, history, pay, no dead ends, delete. Every page a student passes through is asserted phone safe at 360px.

## E. Payment and approval

- [x] E1 Payment order model (`PaymentOrder`) with states
- [x] E2 `POST /api/payment` create and submit actions
- [x] E3 Super admin verify and reject payment actions
- [x] E4 Credit ledger (append only) and `grantCredit`
- [x] E5 Checkout screen: QR, payer details, amount, screenshot upload — QR from `PAY_QR_IMAGE_URL` with a copyable number fallback; `/api/payment/screenshot` guarded for owner, type and size — proven by qa/lifecycle-check.js
- [x] E6 Unique wallet transaction id enforced (reused id -> TXN_ALREADY_USED) — proven by qa/lifecycle-check.js
- [x] E7 Approval pending screen with the WhatsApp contact route — three-step progress, the student's own amount, transaction number and reference, and a WhatsApp route out
- [x] E8 Allocation idempotent (second approval refused, no double grant) — proven by qa/lifecycle-check.js
- [x] E9 Admin can approve their own link's students — client decision 12 Aug; shared `lib/payments.ts`, scoped to the admin's own orders (B approving A's order 404s) — proven by qa/tenant-check.js
- [x] E10 Super admin approving an admin's student notifies that admin and is counted — proven by qa/tenant-check.js
- [x] E11 Payment journey tested end to end in qa/fraud-check.js: create, submit, duplicate txn refused, approve, re-approve grants nothing, reject, resubmit, rejected order cannot later be approved

## F. Consultancy and admin

- [x] F1 Consultancy model with slug, status, seats, branding
- [x] F2 Admin branding update action
- [x] F3 `/c/[slug]` branded student entry link, 404s for unknown or unapproved
- [x] F4 Student signup bound to the consultancy server-side from the slug, only if approved
- [x] F5 Admin dashboard: seats total, used, left, own students only
- [x] F6 Admin sees engagement and entitlement, never transcript content
- [x] F7 Seat allocation atomic, never oversold or negative — `grantSeat` wired into signup; 6 simultaneous signups against 3 seats produce exactly 3 — proven by qa/tenant-check.js. Note: this proves the claim-key algorithm in one process. The distributed guarantee still rests on Netlify Blobs' write-if-absent and is untested against the real store.
- [x] F8 Admin notifications list
- [x] F9 Tenant isolation proven: admin A cannot read admin B by any injection — extra `consultancyId`/`tenant` fields are stripped by the schema, wrong passcode 403s, suspended reads nothing — proven by qa/tenant-check.js
- [x] F10 Direct students never visible to any admin — proven by qa/tenant-check.js

## G. Super admin

- [x] G1 Overview, orders, flagged trials, student status actions exist
- [x] G2 Approval audit model (`ApprovalAudit`)
- [x] G3 Overview segregated by source (direct vs consultancy)
- [x] G4 Running waiting / approved / rejected tally on the payments tab
- [x] G5 Enable and disable a student, wired in the UI
- [x] G6 Referral leaderboard
- [x] G7 Attribution report (which consultancies direct students named)
- [x] G8 CSV export, with no transcript or secret content
- [x] G9 No passcode ever returned to the browser

## H. Owner

- [x] H1 Kill switch enforced at API level, not just the view
- [x] H2 Separate secret from super admin, fails closed without it
- [x] H3 Audit trail: every toggle recorded with time and source, shown on the page
- [x] H4 Kill switch verified: owner pauses, student API returns 503, owner resumes, students practise again, and every toggle is recorded with a time and a source

## I. Money, abuse and rate limits

- [x] I1 Server owns entitlement, body injection ignored
- [x] I2 Audio guards: silence, oversize, over-length
- [x] I3 Retry cap per question
- [x] I4 `lib/rate-limit.ts` exists and is applied to session create
- [~] I5 Rate limits live on session create, answer, flag, auth, payment (measured 429s). Per-process only, so the real ceiling is limit x Netlify instances. Durable limits need Postgres or Redis.
- [x] I6 Trial abuse: one trial per Google account, device fingerprint velocity, consultancy Wi-Fi allow-listed, soft deny never a ban (lib/trial-gate.ts)
- [x] I7 Global provider spend breaker guards every transcription call, AND the per-account daily mock cap is now enforced at session create from the ledger
- [x] I8 Referrals: +1 mock only on a verified paid payment, lifetime cap, and fraud guarded on shared device fingerprint (hard block) or shared IP within 24h (so labs and households still count)
- [x] I9 Rewards engine (lib/rewards.ts): personal post-trial window issued once and never reissued, server-side campaign deadlines, bonus recomputed and consumed at approval, OfferCountdown renders nothing when there is no real offer. Super admin panel to edit rules still to come.
- [x] I10 Fraud pass: qa/fraud-check.js, 19/19. Entitlement injection ignored, privilege climb refused three ways, wallet txn id cannot be claimed twice, approval idempotent, rejected order cannot be approved, no answer content or passcode in the super admin overview

## J. Data and privacy

- [x] J1 Repo abstraction (`lib/db`) with typed models
- [x] J2 Supabase: supabase/schema.sql (10 tables, indexes, RLS on with no public policy) and lib/db/supabase-repo.ts implementing the full Repo over PostgREST with the service role key. repo() switches to Postgres automatically when the credentials are present and falls back to blobs when they are not. wallet_txn_id carries a UNIQUE constraint, so the anti double-claim control is enforced by the database rather than by hopeful code.
- [x] J3 Delete-my-data actually deletes every session; ledger and payment orders survive as financial records with name and email stripped; audited; privacy page says so and links to it
- [x] J4 No transcript, answer or feedback content in any admin or super-admin route or page. Verified by grep: the only occurrences are comments stating the exclusion.
- [x] J5 Nepali legal review done. Client confirmed the lawyer cleared the privacy policy, terms and refund pages as written (13 Aug 2026)

## K. Open QA defects

- [x] K1 B1 auth gate bypass (fixed)
- [x] K2 B2 invisible logos (fixed)
- [x] K3 QA-205 false price on home (fixed)
- [x] K4 QA-207 hidden packs shown (fixed)
- [x] K5 M1 bare 404 (fixed)
- [x] K6 QA-201 closed: ownerId stripped from the API response — proven by qa/lifecycle-check.js
- [x] K7 QA-204 closed: silent clean attempt scores behaviour 100, heard-dependent scores are null not 0 — proven by qa/lifecycle-check.js
- [x] K8 QA-209 closed: the public read returns only `maintenanceMode:false` when up, and the contact message only when down, which students need
- [x] K9 QA-210 closed: empty and non-multipart bodies return 400 — proven by qa/lifecycle-check.js
- [~] K10 QA-211 icon-192, icon-512 and apple-touch-icon exist and are wired into the manifest and head. Install flow still to verify on a real phone.
- [x] K11 H4 closed: `/results/*` now has its own recovery screen (`RecoveryScreen`), 404 status with a real way forward — render-verified by curl
- [~] K12 H5 `/interview/{unknown}` now renders the same `RecoveryScreen`. The markup is render-verified through the results route; the branch that selects it is client-side and still needs one click on the deployed site. Status stays 200 by necessity: the id is only checked after the page loads.

## L. Phase 2, after the lifecycle is complete

- [AI] L1 `GROQ_API_KEY` set and speech to text live
- [AI] L2 Evaluator key set and real feedback generated
- [AI] L3 Nepali-accent benchmark before trusting the provider
- [AI] L4 No fabricated score ever reaches a student

---

## Score

| Section | Done | Total | Notes |
|---|---|---|---|
| A Foundation and pipeline | 12 / 13 | 13 | regression suite added; only the build SHA surface left |
| B Student UI | 18 / 28 | 28 | core pages done, secondary pages left |
| C Back office UI | 4 / 4 | 4 | done |
| D Student lifecycle | 15 + 2~ / 20 | 20 | q10 gate built and verified; practice mode and history are the gap |
| E Payment and approval | 10 / 11 | 11 | only the full end-to-end journey test (E11) left |
| F Consultancy and admin | 10 / 10 | 10 | done; seats now actually allocate, isolation proven |
| G Super admin | 8 / 9 | 9 | only the approve/reject tally left |
| H Owner | 3 / 4 | 4 | recovery from an empty store untested |
| I Money and abuse | 5 + 2~ / 10 | 10 | credits are now actually debited, one per sitting, proven by test |
| J Data and privacy | 1 / 5 | 5 | Supabase not provisioned |
| K Open defects | 10 + 2~ / 12 | 12 | K11 closed with evidence; K12 needs one deployed click |
| **Total (excluding phase 2)** | **97 done, 6 partial / 126** | **126** | **about 77 percent** |

Phase 2 (the AI connection) is 0 of 4 and is deliberately last.

## Next five, in order

1. **E9, E10**, an admin approving their own link's students, and the super admin's approval being counted back to that admin.
2. **B21, B23**, the consultancy page and the results page to their approved designs.
3. **D18, D19**, practice mode (single question drilling) and student history.
4. **B18 to B20**, the FAQ and the universities list (the CSV is still missing from the repo).
5. **G4, H4, I6, I8 to I10**, the super admin tally, owner recovery from an empty store, and the remaining abuse limits.

## Decisions and corrections

They are NOT repeated here. Two copies drift, and the thing that drifts is what
the client thinks he agreed to. They live in one place:
**[CHECKLIST.md](CHECKLIST.md)**, under "Decisions taken" and "Corrections on
the record".
