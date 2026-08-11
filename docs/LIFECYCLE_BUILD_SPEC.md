# LIFECYCLE BUILD SPEC — the whole life cycle, one AI call from done

**Author: QA agent (senior QA + student advocate + acting marketing analyst). Date: 2026-08-10.**
**Audience: the builders (Claude Code × 2, Codex). This is a specification, not code. QA does not write feature code; QA defines what "done" means and then breaks it.**

Read `PROJECT_CONTEXT.md`, then `HANDOFF.md` (the whole log), then this. Where this file and `PROJECT_CONTEXT.md` disagree, a `[DECISION]` in `HANDOFF.md` from the human wins; until then, flag the conflict, do not silently pick one.

---

## 0. The one sentence that governs this round

> Build every actor's **entire** life cycle so that, when this round ends, the **only** thing still unfinished is connecting the speech-to-text and the AI feedback (the "AI answer" step). Everything before and after that call — register, trial, results/report, pay, approve, allocate, practice, admin, super-admin, owner — must be complete, deployed, and QA-verified, with the AI step behind a clean stub that returns an obvious "feedback pending — API not connected yet" object.

Concretely, "the AI step is the only thing left" means:

- `lib/ai/stt.ts` and `lib/ai/evaluate.ts` stay behind their existing interfaces. When no key is set they return a clearly-labelled *not-connected* result, never a fabricated transcript or score. The UI already shows a demo banner when `demo.stt` is true — keep that, and make the results/report render "Feedback will appear here once we finish setup" in place of AI text, **never** a number.
- Every other state transition works for real: an account is really created, a payment order is really recorded, an approval really allocates credits, a debit really happens, an admin really sees only their own students.
- QA can walk each actor end to end on the deployed URL and the only gap they hit is the words the AI would have written.

---

## 1. Client decisions captured 2026-08-10 (verbatim intent, with open confirmations)

Transcribed from the client's brief. **All four confirmations were answered by the human on 2026-08-10 (see the `[DECISION]` in `HANDOFF.md`) and are now LOCKED.** Build as written.

1. **TWO ways a student arrives (corrected — the consultancy link IS the admin link).** (a) **Direct / marketing:** they come from our ads and sign up on the public site; (b) **Consultancy / admin link:** an admin shares `/c/[slug]`, the student signs up there, attributed to that consultancy. "A consultancy gives them a link/ID" and "admin-link signup" are the same path — there are two onboarding paths, not three.
2. **LIGHT GATE = "Sign in with Google" (LOCKED — verification model pivoted 2026-08-10).** The trial gate is **Google sign-in (OAuth)**, *not* phone OTP. Reason (client, from real pain): SMS OTP is delayed and unreliable (7-minute waits, expired codes elsewhere), and this is the highest-frequency, most friction-critical moment. Google sign-in is instant, and — importantly — is a **decent bot filter** because Google itself gates account creation with its own phone verification and rate limits, so it is harder to farm than temp email. The trial is bound to **Google account + device fingerprint + IP/Wi-Fi velocity** (the composite is the defence — see §5A, rewritten). **Phone number becomes the SECOND verification, done only at the payment/package step** via **WhatsApp OTP** (§13). Full details (name, phone, **partner-consultancy/attribution**) are captured at the **report / 10th-question / payment** moment, once value is felt. Device type (phone vs laptop) is irrelevant to entitlement. The `PROJECT_CONTEXT.md §4` "taste first" principle **stands**.
3. **Trial = 10 questions with feedback.** After question 10 the student sees two buttons: **[Continue — pay first]** or **[See my report]**. The report after 10 questions is the **same** report a paying student sees for those 10.
4. **Full mock = 17 questions, ~30 minutes (LOCKED).** The trial is the **first 10 of that 17-question sitting.** Paying **unlocks the remaining 7 of that same sitting** so it is completed, **and** grants the package's mocks — **each mock is a full 17 questions.** If the student does not pay, **paid features are locked** (they may browse the rest of the site freely).
5. **Report is shown immediately** after the 10th question: every answer, where they went wrong, how they could have answered, a good feedback report, how to answer each question, ranking, and any actionable note (e.g. speak louder). The *words* come from the AI later; the report **structure, layout, per-question blocks, ranking, and "feedback pending — not connected" placeholders** are built now.
6. **Free plan ends at the report.** A trial student cannot start another mock or unlock the remaining 7 without paying; they may still browse plans/site.
7. **Paying student path:** click Pay → QR code appears → all payer details asked → student pays → **uploads the payment screenshot** and the amount → clicks Next → sees "please contact this WhatsApp/number" → **super admin approves** (retail) → package allocated **instantly on approval** → student continues/practises. WhatsApp is the **contact/notification** channel only; the approval **decision and record** live in the portal against the receiver's wallet ledger. (Only-remaining assumption; correct if wrong.)
8. **No promo codes** (deliberately dropped to avoid disruption).
9. **Packs (LOCKED):** students do **not** browse plans first — funnel is test → 10 free → eligible to pay → choose package → get that many 17-question mocks. Two public packs, each **mocks + practice** (competitors bundle both; dropping practice would make our card look thinner for the same money): **6 mocks + 15 practice / NPR 449** and **12 mocks + 30 practice / NPR 799** (current `plans.ts` values; Starter 149 and Pro 1,299 stay hidden). Practice = single-question drilling, cheap for us and the retention loop that brings students back to their weakest categories. A package is consumable at any cadence (e.g. 6 in a day or over weeks); plan for the burst — see §6.

10. **Admin-link approval — super-admin fallback (LOCKED, with a known flaw).** Admin-link students are normally approved by **their admin**; the **super admin may also approve them** when the admin is unavailable. When super admin approves an admin-link student, the **admin must see a count of "approved by super admin on your behalf"** and it is logged. **Known flaw the client has accepted for now:** the super admin cannot independently confirm an admin-link student *paid* (that student may have paid the consultancy, or been given a seat, not paid into our wallet). For now this rests on daily super-admin↔admin communication; revisit later. **Strong QA recommendation to remove the flaw:** make admin-link entitlement **seat-based** — the admin pre-buys seats and assigning a seat *is* the entitlement, so no per-student payment verification is needed; reserve super-admin fallback approval for genuine exceptions and tag it in the audit as "approved on admin's confirmation, payment not independently verified."
10. **Two public packs only:** 6 mocks for NPR 449 and 12 mocks for NPR 799. Hide Starter (149) and Pro (1,299) for now.
11. **Admin-link student path:** admin shares a link → student signs up (attributed to that consultancy) → pays → **the admin approves** (admin approves their own link's students even if payment handling differs). Their data shows in that admin **and** in super admin.
12. **Data segregation (hard rule):** a consultancy admin sees **only** students who signed up through that admin's link. Students who signed up directly (our marketing) are **never** visible to any admin — only to super admin. Super admin sees everything, segregated by source.
13. **Seats:** super admin sells a bundle of seats to an admin (e.g. 200–300). The admin distributes seats to their students. Seat counts, usage, and allocations appear in both admin (own) and super admin (all).
14. **Super admin powers:** see all, segregated; approve/reject (with running counts of how many approved/rejected); **enable/disable** any student; **approve an admin's student** too — but when they do, the **admin is notified** ("super admin approved this for you"), and it is recorded. Super admin controls both admins and direct customers; an admin controls only their own link's students.
15. **Attribution for lead-gen:** at signup, a student states the partner consultancy / where they are applying through, so we can later approach those consultancies to become admins. This must be captured and visible to super admin even for direct students.
16. **Pricing has two faces:** business (consultancy seat) pricing and standard student pricing. Both exist already in `lib/data/plans.ts` (`PLANS` and `BUNDLES`).
17. **University logos:** the six approved-university SVGs are supplied in `public/university-logos/`; wire them into the UI.
18. **Quality bar:** the student side must ship with **no bugs / no glitches** for the final test. Hierarchy of care: student > admin > super admin > owner, but all four must be audited.

---

## 2. The four actors and their life cycles (state machines + acceptance criteria)

Each life cycle is written as: **states → transitions → what QA will verify**. A transition is "done" only when its four states (loading / success / failure / empty) all exist and are visible, per `AGENT_BUILDER.md`.

### 2A. Direct student (from our marketing)

```
LAND (ad → / or /c/[slug])
  → REGISTER  (name, phone, email?, partner-consultancy/attribution, consent v+timestamp)
  → VERIFY    (phone OTP — stubbed OK in non-prod, real gateway later; still record the claim)
  → TRIAL ELIGIBLE (server grants exactly 10-question trial; trial_claim written)
  → DEVICE CHECK → CONSENT (recorded) → INTERVIEW (10 Qs, answers persisted each stop)
  → Q10 reached → CHOICE: [See my report] or [Pay to continue]
  → REPORT (per-question, ranking, model answers, "AI feedback pending" placeholders; NO fabricated score)
  → PAYWALL (only other plans visible; cannot start another mock)
  → PAY (QR + payer details + screenshot + amount) → ORDER 'submitted'
  → "Contact us on WhatsApp <number>" screen
  → [super admin verifies vs wallet ledger → approves] → credits allocated instantly
  → PRACTICE / MOCKS until package exhausted (respect per-day cap + provider budget breaker)
```

QA verifies: registration validates every field server-side (adversarial inputs from `AGENT_QA.md §B`); trial is exactly 10 and cannot be re-claimed from the same phone/device/IP beyond the configured limits; the report **never** shows a number for an unheard answer; the paywall genuinely blocks a second mock; a payment order is recorded with a unique transaction id; nothing is allocated until an approval event exists; on approval the balance increases by exactly the pack amount and a `credit_ledger` row is appended; a direct student's record is invisible to every admin.

### 2B. Admin-link student (from a consultancy)

```
LAND (/c/[consultancySlug] — branded)
  → REGISTER (same, but consultancyId is bound from the slug and cannot be spoofed by the client)
  → TRIAL (same 10)
  → REPORT (same)
  → PAY (same QR flow) → ORDER 'submitted'
  → [the ADMIN of that consultancy approves] (or seat-allocation grants entitlement) → credits allocated
  → PRACTICE / MOCKS
```

QA verifies: the consultancy binding comes from the server slug, not a client field (inject `consultancyId` in the body → must be ignored); this student appears in **that** admin's list and in super admin, and in **no other** admin's list; if the consultancy is `pending` or `suspended`, the student cannot be approved/served (and the message says why); super admin can also approve this student, and when they do the admin is notified and it is logged.

### 2C. Admin (consultancy)

```
INVITE/CREATE (super admin creates the consultancy; admin gets slug + passcode)
  → LOGIN (/admin, passcode — MVP auth; see §6 hardening)
  → BUY SEATS (bundle: small/medium/large) → recorded as consultancy.paidNpr + seatsTotal
  → SHARE LINK (/c/[slug]) → students sign up under it
  → APPROVE own-link students (and/or auto via seat allocation)
  → DASHBOARD: seats total / used / left, students under this link only,
     who is practising a lot vs not, engagement + entitlement — NEVER transcripts by default
  → NOTIFIED when super admin approves one of their students
```

QA verifies: an admin sees only their own students (attempt to read another consultancy's slug/students → refused, identical error for wrong-passcode vs no-such-consultancy so existence cannot be enumerated); seat maths cannot go negative or over-allocate under concurrency (fire concurrent allocations → no lost updates, no oversell); the admin can see engagement/entitlement but **no transcript/answer/feedback content** (student-privacy rule); direct students never appear here.

### 2D. Super admin

```
LOGIN (/super, passcode — separate secret from owner)
  → OVERVIEW: everything, SEGREGATED by source (direct vs each consultancy),
     seats/allocations, total estimated revenue, approved/pending counts
  → APPROVE/REJECT students & consultancies (running tally of approved vs rejected, audited)
  → APPROVE an admin's student → admin is NOTIFIED + recorded
  → ENABLE / DISABLE any student
  → VERIFY payments against the wallet ledger before approving retail QR orders
  → CANNOT touch the owner kill switch (separate secret; see 2E)
```

QA verifies: overview segregation is correct and totals reconcile with the ledger; approve/reject writes an append-only audit entry (who, when, what, before/after); disabling a student actually stops them serving; approving an admin's student produces an admin-visible notification and a record; the super passcode used as `ownerKey` is refused (already true — keep it); every response is least-privilege (no passcodes returned to the browser — currently the overview must not leak `consultancy.passcode`).

### 2E. Owner (kill switch)

```
LOGIN (/owner, OWNER_ACCESS_KEY — separate secret)
  → TOGGLE maintenance (UI gate AND API 503, already enforced)
  → every toggle writes an AUDIT record: who/when/from where (currently only enabledBy/enabledAt — extend)
  → platform can ALWAYS be turned back on, even if the store is empty/corrupt
```

QA verifies: with maintenance ON, student pages are dark **and** `POST /api/session/create` and `/answer` return 503; `/owner` still works; the super passcode cannot operate it; missing `OWNER_ACCESS_KEY` in prod fails **closed** (no `owner-dev` fallback — already true); a toggle is recorded with actor + time + source; re-enable works from an empty store.

---

## 3. Data-model additions required (map onto what exists)

Current code has `InterviewSession`, `Answer`, `SessionSummary` (`lib/types.ts`), `Consultancy`, `StudentRecord`, `PlatformSettings` (`lib/platform.ts`), `PLANS`/`BUNDLES` (`lib/data/plans.ts`), stubs for payments/otp/credits. The lifecycle needs the following added (names indicative; if moving to Supabase, these become tables per `MVP_SPEC.md §2`):

- **Student account** — extend `StudentRecord`: `email?`, `phoneVerifiedAt`, `attributionConsultancy` (free text the student typed — the lead-gen field, distinct from `consultancyId` which is the *bound* admin link), `status: 'active'|'disabled'`, `source: 'direct'|'consultancy'`, `createdVia` (slug or 'marketing'), `disabledAt`, `disabledBy`.
- **trial_claims** — `phone_e164 UNIQUE`, `fingerprintHash`, `ip`, `claimedAt`. Enforces "one 10-Q trial per phone" + velocity limits (`MVP_SPEC.md §2`).
- **credit_ledger** — append-only `{userId, delta, reason, sessionId?, orderId?, createdAt}`; balance = SUM(delta). **Never** a mutable balance column (kills the drift/lost-update class I found on the platform store).
- **payment_orders** — `{id, userId, consultancyId?, packCode, amountNpr, walletTxnId UNIQUE, payerName, payerPhoneSuffix, screenshotUrl, state: 'created'|'submitted'|'verified'|'rejected'|'expired', verifiedBy, verifiedAt, reason, createdAt, expiresAt}`. The `walletTxnId UNIQUE` constraint is the anti-double-claim control.
- **approvals_audit** — append-only `{id, actorRole, actorId, action: 'approve_student'|'reject_student'|'approve_consultancy'|'approve_admin_student'|'enable'|'disable', subjectId, before, after, note, createdAt}`. Drives the super-admin "how many approved/rejected" tally and the admin notification.
- **admin_notifications** — `{id, consultancyId, message, createdAt, readAt}` — for "super admin approved this for you".
- **seat_allocations** — derived or explicit: which seat went to which student, so seats used/left is exact and concurrency-safe.
- **owner_audit** — append-only toggle log `{actor, at, source, action}`.

Session model: add a way to resume a trial into a paid full sitting (the remaining ~7), or start fresh full mocks — depends on **CONFIRM #2**.

---

## 4. Payment life cycle (manual QR) — exact state machine

```
created  → (student sees QR + fills payer details)
submitted → (student uploads screenshot + walletTxnId + amount; UNIQUE(walletTxnId) enforced)
   → verifier opens the RECEIVER's official wallet/bank ledger (not WhatsApp)
   → matches txnId + recipient + exact amount + timestamp
verified  → credits allocated atomically; credit_ledger row appended; order closed
rejected  → reason recorded; student told plainly; can resubmit a new order
expired   → after N minutes unpaid; student starts a new order
```

Rules QA will enforce (fraud plan in §5): one `walletTxnId` can be claimed **once** (DB unique constraint, tested by racing two submits with the same id); a screenshot is *supporting evidence only*, never proof; the amount on the order must equal the pack price server-side (client cannot set price); WhatsApp is the **contact** channel only — the decision and the record live in the portal; retail QR orders are approved by **super admin**, admin-link orders by the **admin** (or via pre-bought seat codes); allocation happens **only** on a `verified` transition and is idempotent (re-verifying does not double-allocate).

---

## 5. Fraud & money-abuse test plan (QA runs every build)

File each success as `CRITICAL` — every one is a way the founder loses money or a student's private data leaks.

1. **Trial multi-claim:** same phone twice; same device new phone; same IP many devices → blocked at the configured thresholds, not before (don't block a consultancy's shared Wi-Fi outright).
2. **Client entitlement tampering:** inject `isTrial`, `plan`, `credits`, `maxQuestionsPerMock`, `consultancyId`, `amountNpr` into every POST → all ignored; server owns all of it. (LIVE-003 already passes for the session create body; re-verify for register, pay, allocate.)
3. **Payment double-claim / replay:** same `walletTxnId` submitted twice / concurrently → exactly one order; approving twice → credits granted once.
4. **Screenshot reuse:** the same screenshot/amount across two orders with different txn ids → still one credit per real ledger match; verifier UI shows the txn id, not the chat image, as the source of truth.
5. **Self-approval / privilege climb:** student calls the approve endpoint; admin approves a student outside their consultancy; admin calls a super-only action; super calls the owner switch → all refused.
6. **Seat oversell / negative seats:** allocate more seats than bought; concurrent allocations; refund/disable races → seats never negative, never oversold (concurrency test: 20 simultaneous allocations).
7. **Data-store lost update:** 20 simultaneous `createConsultancy` / 20 concurrent approvals on the single-JSON blob store → count how many survive. (I demonstrated this class is a real risk on the current Blob store; §6.)
8. **Cross-tenant read:** admin A reads admin B's students by slug swap, `consultancyId` injection, array/object/null injection → refused; error identical for wrong-passcode vs no-such-consultancy.
9. **Direct-student leak to admin:** a marketing-signup student must never appear in any admin list.
10. **Transcript privacy:** no admin role (consultancy or, by default, super) sees answer text / transcript / feedback content — only engagement + entitlement. Any transcript reachable by an admin = `CRITICAL`.
11. **Unheard-answer score:** any number shown for an answer we did not hear = `CRITICAL` (the founding rule; QA-204 behaviour 0% is an open instance).
12. **Budget breaker:** with the STT key set (later), confirm a per-provider hard spend cap and per-account/day mock cap stop a runaway before it bills.
13. **Rate limits:** no auth endpoint or session-create allows unbounded attempts (currently NONE are limited — I measured ~600–4,300/min; this must change before any real key or public link).
14. **Disposable-number / temp-email farming:** attempt the trial with a virtual/VOIP number and a temp email → see §5A below. Email must never be the trial key; the number-type check must reject known VOIP/disposable ranges.

### 5A. Temp phone numbers & temp email — the trial-farming defence

You cannot make free-trial abuse impossible; the goal is to make it **uneconomic and detectable** without blocking a real household or a consultancy lab. Under the pivoted model the trial gate is **Google sign-in**, so the layers are:

1. **Google account (OAuth), not email OTP and not phone, is the identity.** A Google account is harder to mass-create than temp email — Google requires its own phone verification and rate-limits account creation — so "Sign in with Google" is itself a bot filter. Temp email is irrelevant (we never key on a typed email).
2. **The composite key is the real defence — Google account + device fingerprint + IP/Wi-Fi velocity.** One trial per Google account; a farmer making 2–3 Gmails is stopped by the **device fingerprint** (same browser/device across accounts) and **IP velocity**.
3. **CRITICAL nuance for consultancy labs — do NOT hard-block on shared Wi-Fi.** 30 legitimate students in one consultancy sit on **one Wi-Fi** with 30 different devices and Google accounts; that is normal, not abuse. Block on **same device fingerprint + different Google account repeating** (one person farming), and treat Wi-Fi/IP only as a **velocity** signal with **allow-listed consultancy networks**. The client's model ("same device + same Wi-Fi can't make many Gmails") is right for one farmer but must never catch a lab. Get this wrong and you block paying customers.
4. **Risk-based escalation:** add reCAPTCHA / an extra check only when signals combine (same fingerprint, many accounts, fast repeats). Never punish the normal student.
5. **Phone is the SECOND scarce check, at payment** (§13), via WhatsApp OTP — so the money step still has a strong gate even though the trial does not.
6. **Cost is bounded downstream anyway:** the trial's only cost is STT on ≤10 answers (≈NPR 3), the paid step needs a real wallet payment + human approval a farmer can't fake for free, and the **global provider spend breaker** caps the worst case.
7. **Sequencing:** trial farming costs *nothing today* (STT not connected). These must be live **before** the real STT key is set.

### 5B. Trial flagging: soft-deny, never ban, with a human appeal (client scenario)

The client's scenario: Gmail A signs in, uses the 10 free questions, logs out; Gmail B signs in **on the same device** (very common in a shared consultancy lab with no fixed seating over many days). What happens, and how do we avoid punishing a real student?

**First, the terms (so the logic is precise):**
- **True positive** = a real farmer correctly flagged (one person spinning up Gmail A/B/C on one device to get many free trials).
- **False positive** = a *legit* student wrongly flagged (the client called this a "true negative"). Example: a lab student on a device a different student used yesterday.
- **Design bias (student-first): minimise FALSE POSITIVES even at the cost of letting some true positives through.** A blocked real student is lost revenue *and* lost trust; a farmer who slips through costs only bounded STT (capped by the spend breaker). Never bias toward blocking.

**What actually happens, step by step:**

1. **The trial is keyed to the Google ACCOUNT, one trial per account.** So Gmail B is a *new* account that has never claimed a trial → **by default Gmail B is eligible and gets its own 10 questions.** In a lab, Gmail B is almost always a different real student, so this is correct. Gmail A's report and history stay with Gmail A; Gmail B is a separate user — no data is lost or merged.
2. **Device fingerprint is a SECONDARY velocity signal, not a hard block.** We count *how many distinct Google accounts claimed a trial on this device in a short window*. A home device: 1–3 (a family) is normal. A lab device: many over days is normal. A farmer: several accounts within minutes/hours on a non-allow-listed network.
3. **Allow-listed consultancy Wi-Fi relaxes the threshold hugely.** When super admin onboards a consultancy, they register its Wi-Fi/IP; on those networks the device-velocity limit is raised far up (labs legitimately have 30 accounts per device). **This is the single biggest false-positive reducer — build it.**
4. **Only a HIGH composite risk (many accounts + same device + short window + non-allow-listed IP) triggers a flag — and the flag is a SOFT-DENY, never a ban.**

**Soft-deny (the client's preferred outcome, refined):**
- The flagged user can **still browse everything and still BUY a pack** — a farmer who pays is now a paying customer, the best possible outcome.
- What is withheld is only the **free 10 questions**, pending a light check.
- They see a calm, non-scary message: *"We couldn't automatically confirm you're a new student on this device. You can still look around and buy a pack. To switch on your free 10 questions, message us on WhatsApp `<super-admin number>` or call `<number>` and we'll turn it on."*
- **We never "ban the Gmail."** Banning is hostile, feels irreversible, and — given the false-positive rate the client rightly worries about — would burn real students. Soft-deny + easy appeal is strictly better and fully reversible.

**The appeal / review flow (super admin override):**
- Super admin gets a **flagged-trials review queue**: the Google account, device, IP, prior claims on that device, and why it flagged.
- Super admin can **grant** (override the flag, switch on the trial) or **decline**, with one tap; the action is **audited** (who/when/why), consistent with §16.
- Contact channel is WhatsApp/call to the **super-admin number** (same channel as payment approval), so the student always has a human way forward.

**Why not just auto-block true positives?** Because we cannot tell a farmer from an unlucky lab student with enough confidence to justify blocking a real one. The cost asymmetry (lost customer + trust vs bounded STT) says: **let the automated system only soft-deny the highest-risk cases, keep browsing + buying open, and put a human (super admin) on the appeal.** Tune the thresholds from real pilot data — start permissive.

**QA tests for §5B:** Gmail B on a fresh account gets its own trial by default; on an allow-listed consultancy IP, many accounts per device all pass; a soft-denied user can still browse and reach checkout; a soft-denied user is never shown a "banned" dead-end and always has the WhatsApp/call path; super admin override grants the trial and is audited; no legitimate account is ever hard-banned automatically.

---

## 6. Traffic, concurrency & scaling (the client's explicit concern)

The client asked what happens if many students burn a 10-mock package within a few hours. Two things must be true:

**A. Cost stays bounded.** Per `docs/UNIT_ECONOMICS.md`: one full mock ≈ 30 Netlify function invocations and ≈ NPR 6–10 of AI. Netlify free tier ≈ 125,000 invocations/month ≈ ~4,000 full mocks/month. A burst of, say, 50 students × 10 mocks in an afternoon = 500 mocks ≈ 15,000 invocations — inside free tier, but **only if** the per-answer-immediately pattern (`MVP_SPEC.md §4`) is kept and no runaway retries occur. Enforce: 90-second cap, 3 retries/question, silence rejection, **per-account daily mock cap**, and a **global provider spend breaker**.

**B. The data store must be concurrency-safe — DECIDED: Supabase now.** The current `lib/platform.ts` and `lib/store.ts` do read-modify-write on a **single JSON document** with no locking. Under the burst the client describes — concurrent registrations, approvals, seat allocations, credit debits — this **will** silently lose writes (I flagged this data-integrity class in my audit). The human confirmed on 2026-08-10: **provision Supabase this round.** Put accounts, credit ledger, payment orders, approvals audit, and seats in **Postgres with row-level security and an append-only ledger** (balance = SUM(delta), never a mutable column). Seat allocation and credit debit must be **transactional** (a single atomic statement or a DB transaction), so the concurrency tests in §5.6/5.7 pass. Sessions may migrate too; at minimum everything touching money/seats/approvals is in Postgres, not the blob.

---

## 7. University data + SVG wiring (asset task for the builder)

Replace the seed set in `lib/data/institutions.ts` with the **client-approved six** and wire the supplied SVGs (present in `public/university-logos/`). Mapping:

| Approved university | slug | SVG file (present) | Note |
|---|---|---|---|
| BPP University | `bpp-university` | `bpp.svg` | keep |
| University of East London | `university-of-east-london` | `uel.svg` | keep |
| University of West London | `university-of-west-london` | `uwl.svg` | **ADD** (replaces ARU) |
| University of Wolverhampton | `university-of-wolverhampton` | `wolverhampton.svg` | **ADD** (replaces Roehampton) |
| Ravensbourne University London | `ravensbourne-university-london` | `ravensbourne.svg` | **ADD** (replaces UWE); **pilot-only until written logo permission** (`public/university-logos/README.md`) |
| Coventry University | `coventry-university` | `coventry.svg` | keep |

Add `logoUrl` to the `Institution` type and render it (with the monogram as fallback) on the catalogue cards, the university detail, and the interview top bar. Do **not** recolour the marks or imply endorsement (they are third-party trademarks, not partnership assets). Housekeeping: delete the stray `public/university-logos/bpp` file (50 KB, no extension — looks like a conflict copy), delete `components/InterviewRoom 2.tsx`, and remove the many `.fuse_hidden*` iCloud conflict files under `app/api/session/**` before they get compiled/deployed.

---

## 8. Truthfulness / copy carry-over (still open from my audits)

These block "the offer is truthful" and must be closed in this round:

- **Home page** still advertises "Rs 500 / month" and "Other sites charge around Rs 175 for one" (QA-205). Replace with the two approved one-time packs and the honest, dated per-mock comparison already live on `/pricing`. Home and `/pricing` must agree.
- `/pricing` currently shows **Starter and Pro** — hide them; show only 449 and 799 (QA-207).
- Both public pages claim **"the questions this university asks"** while every question is generic (`institutionId: null`). Change to "based on published credibility themes" until source-mapped packs exist (LIVE-003/AUDIT-003).
- Set `plans.ts` `maxQuestionsPerMock` to **17** (LOCKED full-test length); trial cap stays **10**. Public packs: 6 mocks/449 and 12 mocks/799 only.

---

## 9. Defects that must be closed as part of this round

From my two audits (details in `HANDOFF.md`): **QA-201** (ownerId echoed + reused — stop returning it), **QA-203** (unlimited unverified trials — the money leak; add phone/device/IP + rate limits), **QA-204** (Behaviour 0% for a silent, clean attempt), **QA-205** (home price false), **QA-207** (hidden packs shown), **QA-208** (consent not recorded — record version+timestamp), **QA-209** (`GET /api/platform` public), **QA-210** (answer endpoint 500 on empty body), **QA-211 / LIVE-010** (PWA icons/sw 404), **LIVE-004** (expose a build SHA/time so revision is provable), **LIVE-008** (scroll reset on stage change). `LIVE-001` (STT/evaluator keys) is the *one* thing that may remain open at the end of this round.

---

## 10. Order of operations & the moving-ahead pattern (for the builders)

Work in this order; each step is `READY_FOR_QA` → QA verifies → `VERIFIED` before the next actor's flow is layered on. Communicate **only** through `HANDOFF.md`, append-only, newest at the bottom, honest "Known limitations" every time.

1. **Foundation for accounts & money.** Decide the store (Supabase vs interim per-key blobs — §6), add the data model (§3), keep the STT/AI behind the stub. Expose a build SHA/time surface (LIVE-004).
2. **Direct-student flow (2A)** end to end with the stub AI: register → trial(10) → report(placeholders) → paywall → QR order → super-admin approval → allocation → practice. Close QA-203/204/205/207/208.
3. **Payment life cycle (§4)** hardened: unique txn id, order states, screenshot upload, atomic idempotent allocation.
4. **Super admin (2D)**: segregated overview, approve/reject with audit tally, enable/disable, admin-student approval + notification, no passcode/transcript leakage.
5. **Admin + admin-link student (2C/2B)**: seats, branded link, own-students-only, notifications, tenant isolation.
6. **Owner (2E)**: audit trail on toggle, fail-closed, always re-enablable.
7. **University data + SVGs (§7)**, copy truthfulness (§8), PWA icons (§9), scroll reset (LIVE-008).
8. **Hardening pass**: rate limits everywhere, provider budget breaker, per-day mock cap, concurrency tests (§5.6/5.7).
9. **Definition of done for the round:** QA can complete every actor's life cycle on the deployed URL, all `CRITICAL`/`HIGH` closed, and the *only* visible gap is the AI-written words behind the stub. Then, and only then, is the product "one API connection from done."

**Definition of done for any single task** is unchanged from `AGENT_BUILDER.md`: 360 px, three browsers, four states, forward button on every failure, red text on every disabled control, server-side credit check before any cost, server-side validation, no secret in the bundle, deployed to the live URL, entry in `HANDOFF.md`.

---

## 11. Marketing-analyst assessment: does this life cycle fit?

Acting as the marketing analyst the client asked for, judging the funnel against the Nepali student psychology in `PROJECT_CONTEXT.md §2` and the competitor picture:

**What fits well.**
- **One-time packs + a genuine 10-question free trial** is the right shape for this market (short need window, urgency-priced competitors, no free proof elsewhere). Keep it.
- **Consultancy attribution captured at signup** is a quietly powerful growth loop: every direct student becomes a lead pointing at a consultancy we can convert into an admin. This is the strongest idea in the brief — make sure it is captured even when the student pays directly.
- **Admin seat model** turns one sale into fifty students at near-zero acquisition cost. Correct priority.

**Where the life cycle risks hurting conversion (flag to the client).**
- **Registration *before* the trial (Decision #2) fights the founding funnel.** `PROJECT_CONTEXT.md` calls "no account before the trial" the single most important funnel decision, because a frightened, low-confidence student abandons at a form. Forcing name/phone/OTP/attribution *before* they feel any value will lower activation. **Recommendation:** let the student *taste* one or two questions, or reach the trial, with the lightest possible gate, and collect full details at the moment they hit real value (the report or the 10th question). If the client wants registration first for lead capture, at minimum make it 2 fields (phone + attribution), defer email/name, and keep OTP until after the taste. This is exactly the experiment `HANDOFF.md`'s prior QA note proposed (`first_feedback_seen / landing_view` as the metric). **CONFIRM #1.**
- **Manual QR + WhatsApp approval adds friction and a human bottleneck** right at the moment of payment intent — the highest-drop point. It is acceptable for a pilot, but instrument the drop from "saw QR" → "submitted screenshot" → "approved", and keep the approval SLA short (a student who paid and waits hours will feel scammed). WhatsApp must be comms only; the *record* must be in the portal, or disputes later have no evidence.
- **17-question full test** is long for a nervous first-timer. The 10-question trial is a good taste; make sure the paid remainder feels like progress, not a wall.

**Fraud/marketing tension to watch.** The trial is the acquisition engine *and* the cost leak. The abuse controls (phone/device/IP) must be strict enough to stop free-STT farming but loose enough not to block a consultancy's shared Wi-Fi or a family sharing one phone. Start permissive, measure, tighten — and never silently punish a legitimate household (give super admin a manual override + an abuse report).

**Bottom line:** the life cycle is commercially coherent and the attribution loop is genuinely clever. The one change I would push back on is register-before-taste; everything else is sound and should be built as specified.

---

## 12. QA acceptance matrix (what QA will tick before sign-off)

Per actor, QA must be able to answer YES to every line, on the deployed URL, with only the AI words stubbed:

**Direct student:** registers with validated fields ▢ · consent recorded (version+time) ▢ · gets exactly 10 trial Qs ▢ · cannot re-claim trial beyond limits ▢ · report shows per-question blocks + ranking with NO fabricated numbers ▢ · paywall blocks a 2nd mock ▢ · QR order recorded with unique txn id ▢ · nothing allocated pre-approval ▢ · on approval, exact pack credited via ledger ▢ · invisible to all admins ▢

**Admin-link student:** consultancy bound server-side (injection ignored) ▢ · visible to that admin + super only ▢ · blocked if consultancy pending/suspended ▢ · admin approval allocates ▢ · super approval notifies admin + is logged ▢

**Admin:** sees only own-link students ▢ · seats never oversold/negative under concurrency ▢ · no transcript content ▢ · cross-tenant read refused + non-enumerable ▢ · notified on super-admin approvals ▢

**Super admin:** segregated overview reconciles with ledger ▢ · approve/reject audited with tally ▢ · enable/disable actually enforced ▢ · no passcode/transcript leakage ▢ · cannot operate owner switch ▢

**Owner:** maintenance dark UI + 503 API ▢ · /owner still works ▢ · toggle audited (who/when/where) ▢ · fails closed without key ▢ · re-enablable from empty store ▢

**Cross-cutting:** rate limits on every money/auth endpoint ▢ · provider budget breaker ▢ · per-day mock cap ▢ · no secret in bundle ▢ · build SHA visible ▢ · six approved universities with logos ▢ · home/pricing consistent & truthful ▢ · PWA installs with real icons ▢.

---

---

## 13. Verification: Google sign-in for the trial, WhatsApp OTP at payment

**Verification is auth infrastructure, not the AI feedback API** — it is in-scope this round; a gate with no real verification is not a gate. The pivoted model (client, 2026-08-10) solves the OTP-delay pain by removing OTP from the high-frequency moment:

**Trial gate = "Sign in with Google" (Firebase Auth / Google Identity).**
- Instant, no OTP, no SMS delay — exactly where friction hurts most.
- **Free at pilot scale:** Google/social sign-in is free up to **50,000 monthly active users** on Firebase Auth. Auth cost for the pilot ≈ **$0**. ([Firebase Auth pricing 2026](https://blog.logto.io/firebase-authentication-pricing), [metacto guide](https://www.metacto.com/blogs/the-complete-guide-to-firebase-auth-costs-setup-integration-and-maintenance))
- Ships with Google's own bot protection; pairs with §5A composite key.

**Second verification = phone via WhatsApp OTP, only at the payment / package step.**
- Lower frequency (only converting students), so occasional delay is far less damaging, and **WhatsApp delivers over data and is generally faster/more reliable than carrier SMS** in Nepal.
- The student may use **any** number they choose; OTP is sent by **WhatsApp, not SIM SMS**.
- Cost: WhatsApp **authentication** messages are cheap per-message; Nepal moves to a **standalone rate card whose exact rate Meta publishes by 1 September 2026** — treat as a small per-message cost (roughly a US cent or two domestic, higher internationally) and confirm the Nepal number when published. ([WhatsApp API pricing 2026](https://eazybe.com/blog/whatsapp-business-api-pricing), [Nepal rate-card change](https://amanmishra.com.np/whatsapp-business-api-pricing-2026/)) Setup needs a Meta Business account + a BSP (WhatsApp Business API) — operational, not costly.

**OTP-delay resilience (build regardless of channel), because the client hit this personally:**
- Generous expiry (**10 minutes**, not 5); **resend** with backoff; a visible **"didn't get it? resend / contact us on WhatsApp"** fallback; never a dead-end.
- Android **Web OTP autofill** to cut typing.
- Because Google is primary, the **trial has no OTP at all** — the delay problem is designed out of the moment where it mattered most.

**Expansion:** Google sign-in and WhatsApp both work in **India** (a large WhatsApp market), so this model expands beyond Nepal cleanly; India WhatsApp auth pricing differs — re-check per country.

**Builder action:** wire Google sign-in via Firebase Auth for the trial; wire WhatsApp OTP behind the existing `lib/otp/index.ts` for the payment step (BSP TBD). Rate-limit OTP send (3/number/hour, 10/IP/hour). A dev stub is acceptable **only** with no real STT key and no public link.

---

## 14. Honest urgency — countdowns and CTAs (client marketing direction)

The client wants Higgsfield-style urgency: a live countdown that drives an instant CTA — **but explicitly legit, not an evergreen timer that is identical for every student and resets on every visit.** This is the right instinct, and it is also a hard QA rule: **fake/evergreen countdowns are a dark pattern.** They are deceptive, they are legally risky in several markets, and — worst for us — they burn trust with exactly the anxious student who has already been misled by other platforms. Our whole wedge is honesty. So every countdown must be anchored to a **real deadline** and a **real reason**, stored server-side, and it must **stay expired once it expires** for that student.

Two honest mechanics to build:

**A. Personal post-trial bonus (the main CTA).** When a student finishes their 10 free questions, start a **real, per-student window** (e.g. 60 minutes) offering a genuine **value add, not a price cut** (the client does not want to discount NPR 449/799): "Because you finished your practice today, book any pack in the next 60 minutes and we add **+1 (or +2) free mocks**." This is legitimate because the window is personal, starts at a real event (their trial completion), the bonus is really granted (attach it to the order server-side and honour it on approval), and once it expires it is **gone for that student** — we do **not** silently re-offer the same timer on their next visit. Cost of a bonus mock ≈ NPR 6–10, trivial against the conversion. *(Interpreting the client's "one/two free mocks" — confirm the exact bonus if it should differ per pack.)*

**B. Pricing-page campaign countdown (must vary, must be real).** Any countdown on the pricing page is tied to a **real, named campaign with a real server-side end time** — e.g. an intake-deadline push, a festival offer (Dashain/Tihar), a launch-week cohort, a consultancy drive. The rules the client set, made concrete:
- Each countdown references a **specific event and a specific reason**; two campaigns cannot share the same reason or the same end time.
- It is **stored server-side** with a real `endsAt`; the client (browser) only renders it. A student reloading or returning sees the **same real deadline tick down**, not a fresh reset.
- When it ends, it **ends** — either no offer, or a **different** real campaign replaces it. Never the same evergreen timer on a loop.
- The promised reward is **actually delivered** at checkout/approval; QA will verify the bonus lands.

**QA tests for §14:** (1) the post-trial timer does not reset when the page is reloaded or revisited after expiry; (2) an expired offer is not silently re-granted; (3) the countdown `endsAt` comes from the server, not `Date.now()+X` in the browser; (4) two live campaigns never share reason/end time; (5) the promised bonus mocks are genuinely added to the account on approval. Any evergreen or client-generated timer = defect (dishonest-urgency, treated as HIGH because it violates the product's core honesty promise).

---

---

## 15. Referral codes (replacing promo codes)

No promo codes; **referrals instead** (client, 2026-08-10). Rules:

- Every student gets a referral code/link. **The reward is granted only when a referred friend PAYS** (their order reaches `verified`), never on signup.
- **Reward = +1 free mock per verified paid referral** (a 17-question mock).
- **The economics are strongly positive, so legitimate volume is not the risk.** One paid referral = **+NPR 449 (or 799) revenue** against a reward cost of **~NPR 6** (one free mock's STT+LLM, per `docs/MONEY.md`). A student who refers 20 paying friends earns us ~NPR 9,000 for ~NPR 120 of reward mocks. More referrals = more profit. So do **not** fear a popular referrer; fear **fraud**.
- **The real risk is fake / self-referral.** Guardrails: block a referral where the referred account shares the referrer's **device fingerprint, Wi-Fi/IP, Google account, or payment source**; reward only after the friend's payment is **approved**; a **configurable lifetime cap** on referral-earned mocks (default e.g. 10–20, set by super admin) to bound automated liability and discourage industrial farming; referral mocks may **expire** (configurable) so liability does not accrue forever.
- **QA tests:** self-referral on the same device/Wi-Fi/Google/payment is refused; reward lands only after `verified` payment, exactly once (no double-credit on re-approve); the lifetime cap holds; free mocks still pass the unheard-answer and budget-breaker rules.

## 16. Bonus / rewards engine — automated, super-admin-controlled

The post-trial bonus (§14A), campaign countdowns (§14B), and referral rewards (§15) are driven by a **rules engine that runs automatically**, so the super admin does **not** have to hand-approve each one. The super admin gets a **Rewards & Offers** panel that is **pre-loaded with sensible suggested defaults** and lets them **review, edit, pause/terminate, or override** any rule:

- Configurable: post-trial bonus size (per pack), the post-trial window length, referral reward size + lifetime cap + expiry, and each pricing-page campaign (name, reason, real `endsAt`, reward).
- **Automated by default, human-overridable always:** rules fire on their own; the super admin can kill or change any rule at any time, and every change is written to the approvals/audit log (who/when/what).
- **QA tests:** a rule the super admin pauses stops firing immediately; an edited reward takes effect for new grants only (no retroactive clawback of already-honoured rewards); defaults are present on first load; every change is audited.

## 17. Consultancy (B2B) pricing — hide from the student site

**Recommendation (QA + marketing): keep bulk-seat / consultancy pricing OFF the student-facing pages.** This is a student-first product; a scared student who sees "wholesale seats / resell / NPR 240 per seat" is confused and may feel they are overpaying versus consultancies — a negative we can avoid entirely. Also B2B is relationship-led, not self-serve, and public wholesale pricing creates channel conflict and undercuts the admins we want to recruit. So:

- Student pages show **only** the two student packs (449 / 799) and the trial.
- Consultancy pricing lives on an **unlisted page reached by typing the URL, exactly like `/owner`** — no link from any student-facing navigation, header, or footer (client's suggestion). Slug is **one word: `/consultancy`**. It renders the `BUNDLES` seat pricing. **Note for the builder:** unlisted ≠ secret — anyone with the URL can open it, which is fine for *pricing display*. If the client later wants it truly private, gate it behind a lightweight passcode like the admin pages; for now, unlisted-URL is enough because no sensitive data is exposed.
- The `BUNDLES` data already exists in `lib/data/plans.ts`; render it only on this partner surface, never on `/`, `/pricing`, or the catalogue.

## 18. Student data, super-admin visibility & export

- **Super admin** sees **every student** (direct + all consultancies) and **every consultancy**, segregated by source; **admin** sees **only** students from their own link. (Already in §2C/2D — reaffirmed.)
- **Referral leaderboard:** super admin sees **which students referred the most (paying) people** — a first-class report (and a signal for who to reward or recruit).
- **Attribution report:** super admin sees which **partner consultancies** direct students named at signup — the pipeline of consultancies to convert to admins.
- **Export:** super admin can **download** the student list, consultancy list, referral leaderboard, and attribution report as **CSV**. Admin can export only their own students. **Never** include transcript/answer/feedback content or raw OTP/payment secrets in an export; export engagement + entitlement + attribution only. QA will check exports for leaked personal/answer content.

---

*End of spec. QA will re-run every line of §12, §5, §5A, §14, §15, §16, §17, and §18 against the deployed build and file anything that fails. The target state for this round: the only unchecked box left anywhere is "AI writes the feedback words," and that is the second-phase API connection. Verification (Google sign-in + WhatsApp OTP) is NOT that box — it is auth infrastructure and must be real this round (§13).*
