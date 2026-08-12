# MASTER CHECKLIST

**The single list of everything this project needs. Work top to bottom, in order.**
Statuses: `[x]` done and verified · `[~]` partly done · `[ ]` not started · `[AI]` deferred to phase 2 (connect the AI)

Rules: nothing is `[x]` until it has been built, typechecked, built, and seen working. When you add scope, add it to the right section here in order, never at the end.

Last updated: 2026-08-12.

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
- [ ] A12 Build SHA and time visible in super admin so QA can prove which revision is live (LIVE-004)

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
- [x] B14 Honest pricing content: real packs, dated per-mock comparison, no invented plan
- [x] B15 Consultancy wholesale price removed from the public student pricing page
- [x] B16 Legal pages exist and are linked: `/privacy`, `/terms`, `/refund`
- [x] B17 Branded 404 with a way back
- [ ] B18 Home: FAQ section
- [ ] B19 Universities: "Most applied" pinned section and filter chips per the approved design
- [ ] B20 Universities: full UK list (needs the university CSV, which is missing from the repo)
- [ ] B21 `/consultancy` B2B page rebuilt to its approved design, with header and footer
- [ ] B22 `/checkout` given the shell and a way back
- [ ] B23 Results page rebuilt to its approved design
- [ ] B24 Interview room reviewed against the design system
- [ ] B25 Scroll reset on stage change (LIVE-008)
- [ ] B26 PWA icons and Apple touch icon (they 404 today) and install flow
- [ ] B27 Mobile pass at 360px on every page on a real phone

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
- [ ] D12 Consent actually recorded with version and timestamp at the moment of consent (QA-208)
- [ ] D13 The gate after question 10: two clear choices, pay to continue or see the report
- [ ] D14 Report shown after question 10, same report a paying student sees
- [ ] D15 Paid features clearly locked for a trial student, with a plain reason
- [ ] D16 Paying unlocks the remaining 7 questions of that same sitting
- [ ] D17 Paying grants the pack (each mock 17 questions) atomically on approval
- [ ] D18 Practice mode (single question drilling)
- [ ] D19 Student history: past sessions and reports
- [ ] D20 Full walk through of the direct student journey end to end on a real phone

## E. Payment and approval

- [x] E1 Payment order model (`PaymentOrder`) with states
- [x] E2 `POST /api/payment` create and submit actions
- [x] E3 Super admin verify and reject payment actions
- [x] E4 Credit ledger (append only) and `grantCredit`
- [ ] E5 Checkout screen: QR, payer details, amount, screenshot upload
- [ ] E6 Unique wallet transaction id enforced so one payment cannot be claimed twice
- [ ] E7 Approval pending screen with the WhatsApp contact route
- [ ] E8 Allocation is idempotent (re-approving never double credits)
- [ ] E9 Admin can approve their own link's students
- [ ] E10 Super admin approving an admin's student notifies that admin and is counted
- [ ] E11 Full payment journey tested end to end, including rejection and resubmission

## F. Consultancy and admin

- [x] F1 Consultancy model with slug, status, seats, branding
- [x] F2 Admin branding update action
- [x] F3 `/c/[slug]` branded student entry link, 404s for unknown or unapproved
- [x] F4 Student signup bound to the consultancy server-side from the slug, only if approved
- [x] F5 Admin dashboard: seats total, used, left, own students only
- [x] F6 Admin sees engagement and entitlement, never transcript content
- [ ] F7 Seat allocation atomic, never oversold or negative
- [x] F8 Admin notifications list
- [ ] F9 Tenant isolation proven: admin A cannot read admin B by any injection
- [ ] F10 Direct students never visible to any admin

## G. Super admin

- [x] G1 Overview, orders, flagged trials, student status actions exist
- [x] G2 Approval audit model (`ApprovalAudit`)
- [x] G3 Overview segregated by source (direct vs consultancy)
- [ ] G4 Approve and reject with a running approved/rejected tally
- [x] G5 Enable and disable a student, wired in the UI
- [x] G6 Referral leaderboard
- [x] G7 Attribution report (which consultancies direct students named)
- [x] G8 CSV export, with no transcript or secret content
- [x] G9 No passcode ever returned to the browser

## H. Owner

- [x] H1 Kill switch enforced at API level, not just the view
- [x] H2 Separate secret from super admin, fails closed without it
- [x] H3 Audit trail: every toggle recorded with time and source, shown on the page
- [ ] H4 Verified re-enablable from an empty or corrupted store

## I. Money, abuse and rate limits

- [x] I1 Server owns entitlement, body injection ignored
- [x] I2 Audio guards: silence, oversize, over-length
- [x] I3 Retry cap per question
- [x] I4 `lib/rate-limit.ts` exists and is applied to session create
- [ ] I5 Rate limits on every auth and money endpoint (QA-202)
- [ ] I6 Trial abuse: one trial per Google account, device and IP velocity, consultancy Wi-Fi allow-listed
- [ ] I7 Provider spend breaker and per-account daily mock cap
- [ ] I8 Referrals: +1 mock only on a verified paid referral, fraud guarded, lifetime cap
- [ ] I9 Rewards engine: post-trial bonus and honest campaign countdowns, super admin controlled
- [ ] I10 Fraud test pass (docs/LIFECYCLE_BUILD_SPEC.md section 5)

## J. Data and privacy

- [x] J1 Repo abstraction (`lib/db`) with typed models
- [ ] J2 Supabase provisioned for accounts, ledger, orders, approvals, seats (blob store loses writes under load)
- [ ] J3 Retention rule applied and a working delete request path
- [ ] J4 No transcript content reachable by any admin role
- [ ] J5 Nepali legal review of the privacy policy and terms

## K. Open QA defects

- [x] K1 B1 auth gate bypass (fixed)
- [x] K2 B2 invisible logos (fixed)
- [x] K3 QA-205 false price on home (fixed)
- [x] K4 QA-207 hidden packs shown (fixed)
- [x] K5 M1 bare 404 (fixed)
- [ ] K6 QA-201 ownerId echoed in the API body and reused across sessions
- [ ] K7 QA-204 Behaviour shows 0% on a silent, zero-violation attempt
- [x] K8 QA-209 closed: the public read returns only `maintenanceMode:false` when up, and the contact message only when down, which students need
- [ ] K9 QA-210 answer endpoint returns 500 on an empty body
- [ ] K10 QA-211 PWA icons 404
- [ ] K11 H4 `/results/*` dead end for an old link
- [ ] K12 H5 `/interview/{unknown}` returns 200 instead of a clear recovery screen

## L. Phase 2, after the lifecycle is complete

- [AI] L1 `GROQ_API_KEY` set and speech to text live
- [AI] L2 Evaluator key set and real feedback generated
- [AI] L3 Nepali-accent benchmark before trusting the provider
- [AI] L4 No fabricated score ever reaches a student

---

## Score

| Section | Done | Total | Notes |
|---|---|---|---|
| A Foundation and pipeline | 11 / 12 | 12 | only the build SHA surface left |
| B Student UI | 17 / 27 | 27 | core pages done, secondary pages left |
| C Back office UI | 4 / 4 | 4 | done |
| D Student lifecycle | 9 / 20 | 20 | plumbing exists, the paid half is missing |
| E Payment and approval | 4 / 11 | 11 | model exists, screens and guarantees missing |
| F Consultancy and admin | 7 / 10 | 10 | branded link and dashboard done |
| G Super admin | 8 / 9 | 9 | only the approve/reject tally left |
| H Owner | 3 / 4 | 4 | audit trail added |
| I Money and abuse | 4 / 10 | 10 | limits and referrals missing |
| J Data and privacy | 1 / 5 | 5 | Supabase not provisioned |
| K Open defects | 6 / 12 | 12 | 6 still open |
| **Total (excluding phase 2)** | **74 / 124** | **124** | **about 60 percent** |

Phase 2 (the AI connection) is 0 of 4 and is deliberately last.

## Next five, in order

1. E5 to E8, the checkout screen and the money guarantees (QR, payer details, screenshot, unique transaction id, idempotent allocation).
2. D13 to D17, the question 10 gate, the report, and unlocking the paid half.
3. B21 and B22, the consultancy and checkout shells.
4. I5 and I6, rate limits everywhere and the trial abuse controls.
5. B23, the results page to its approved design, and K7 the 0% behaviour defect.
