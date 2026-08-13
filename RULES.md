# THE RULES

**This document is the source of truth. Code and tests are both downstream of it.**

Every rule has an ID. The coder builds to the ID. QA tests the ID. When they
disagree, this file wins — or this file is wrong and gets changed here first,
never silently in code.

## Why this exists

We built the product first and wrote tests afterwards. A test written after the
code can only confirm what was built; it cannot tell you what *should* have been
built. That is why every suite was green while a real student could not stay
signed in. There was no independent statement of correct behaviour for the code
to be wrong *about*.

So: **rules first. Then code. Then QA checks code against rules.**

## How to use it

- **Coder:** before writing anything, find the rules for that surface. If a rule
  is missing, stop and add it here first.
- **QA:** every test names the rule it proves. A test that proves nothing in
  this file is not a test, it is a habit.
- **Client:** read the rules, not the code. If a rule is wrong, this is the one
  place to change it.
- **Nothing ships against an unwritten rule.** If behaviour is undefined here,
  it is a gap, not a judgement call for whoever is typing.

## The four states of a rule

A rule climbs this ladder. It never skips a rung, and it never goes up on
somebody's word.

| Status | What it means | Who grants it |
|---|---|---|
| `TODO` | Not built. | — |
| `BUILT` | The code exists. **Proves nothing.** | coder |
| `BUILT+PROVEN` | An automated test names this rule ID and passes. | coder + QA |
| **`BUILT+PROVEN+TESTED`** | **Seen working with human eyes, in a real browser, with the client watching.** | **client, in the session** |

`OPEN` means it needs a client decision before it can be built at all.

**Why TESTED exists.** Every suite was green while a student could not stay
signed in. API tests send JSON and read JSON; they cannot see a redirect loop, a
button that does nothing, or a spinner that never stops. So the last rung is a
human clicking the thing and watching it happen. Nothing in this product is
finished until a rule reaches TESTED.

**TESTED is granted live, together, in Chrome — never by me alone.** I click, we
both watch, and the status changes only when the client has seen it.

**Five rules cannot be proven over HTTP and say so.** Camera and microphone
permission, the microphone meter reflecting the real recording, the on-screen
timer, and the violation monitor are properties of a running browser. Writing an
automated "test" for them would be inventing evidence, which is the exact habit
this document exists to break. They are marked `BUILT (browser only)` and are
first in the queue for the live session.

---

# PART 0 — GLOBAL RULES

These bind everywhere. A rule later in the document never overrides one here.

| ID | Rule | Status |
|---|---|---|
| G-1 | **No score without a transcript.** We never produce a number from an answer we could not hear. Not zero, not a guess — null, with an explanation. | BUILT+PROVEN |
| G-2 | **The server decides everything that costs money.** Price, question count, credit balance, entitlement, trial length. The browser may request; it may never assert. | BUILT+PROVEN |
| G-3 | **Never a dead end.** Every screen a person can reach offers at least one way forward. | BUILT+PROVEN |
| G-4 | **An outage must be loud.** "I could not look" is never reported as "it does not exist". A storage failure returns 503 with an honest message, never 401. | BUILT+PROVEN |
| G-5 | **Never confirm a guess.** A stranger holding a real id and a stranger holding a fake one get the identical answer (404). 403 tells an attacker the thing exists. | BUILT+PROVEN |
| G-6 | **Idempotent by default.** Every money-moving action can be called twice and pays once. Assume the student's connection drops mid-tap, because it will. | BUILT+PROVEN |
| G-7 | **The worst outcome is a soft deny, never a ban.** A student wrongly flagged keeps browsing, keeps their report, and can still pay. | BUILT+PROVEN |
| G-8 | **No admin, at any level, reads a student's answers.** Transcripts contain family income, visa refusals, finances. Engagement and entitlement only. | BUILT+PROVEN |
| G-9 | **Every claim on screen must be true today.** No superlative we cannot prove, no countdown that resets, no metric we have not measured. | BUILT+PROVEN |
| G-10 | **A control that appears to do nothing is a defect,** even if the server behaved correctly. Every button reports what it did. `components/ActionButton.tsx` makes working / failed / done impossible to forget, and locks against a second tap while in flight. | BUILT+PROVEN |
| G-11 | **Money-moving actions are written to an audit trail** with who, when, and what changed. | BUILT+PROVEN |
| G-12 | **Nothing is `[BUILT+PROVEN]` until a test names its rule ID and passes.** | — |

---

# PART 1 — THE ACTORS

Five, and one we had forgotten.

| Actor | Who | Authenticated by |
|---|---|---|
| **A1 Visitor** | Anyone not signed in | nothing |
| **A2 Student** | Signed in with Google | Firebase → our signed cookie |
| **A3 Consultancy Admin** | A partner consultancy | slug + passcode |
| **A4 Super Admin** | Us, running the platform | super passcode |
| **A5 Owner** | Umanga, 60% owner | owner passcode, separate from A4 |

**A2 was under-served and it caused real bugs.** A student had no home of their
own — no dashboard, no history, no sense of what they had bought. That gap is
why "My practice" felt broken: there was nothing behind it worth arriving at.

---

# PART 2 — A1, THE VISITOR

## States
Never signed in. Has no credits, no history, no session.

## Actions and rules

| ID | Rule | Status |
|---|---|---|
| V-1 | A visitor may read every public page: home, pricing, universities, consultancy, privacy, terms, refund. | BUILT+PROVEN |
| V-2 | A visitor may **not** start an interview. `POST /api/session/create` returns 401. | BUILT+PROVEN |
| V-3 | Every "start" control sends a visitor to `/start?next=<where they were going>` and returns them there afterwards. Never dumps them on the home page. | BUILT+PROVEN |
| V-4 | A visitor sees the same prices everywhere. Home and `/pricing` render one shared component so they cannot drift. | BUILT+PROVEN |
| V-5 | A visitor never sees the consultancy wholesale price. | BUILT+PROVEN |
| V-6 | A visitor never sees a hidden pack (`starter`, `pro`) and cannot buy one by naming it. | BUILT+PROVEN |
| V-7 | An unknown URL shows a branded page with two ways out. | BUILT+PROVEN |
| V-8 | A consultancy link `/c/{slug}` shows that consultancy's branding. An unknown or unapproved slug 404s. | BUILT+PROVEN |
| V-9 | **Sign-in must work on the browsers our students actually use** — Android Chrome, iOS Safari, old iPhones, and in-app browsers. iOS and in-app browsers now skip the popup entirely and go straight to redirect; any unexpected popup failure also falls back to redirect; and the sign-in screen can never render an invisible placeholder (the iPhone 6s symptom: no button at all). | BUILT+PROVEN |
| V-10 | A visitor is never asked for a card, a password, or a phone number before the free trial. | BUILT+PROVEN |

---

# PART 3 — A2, THE STUDENT

## The states a student can be in

```
NEW → TRIAL_UNUSED → TRIAL_IN_PROGRESS → TRIAL_SPENT
                                             ↓
                                    PAID → CREDITS_LEFT → CREDITS_SPENT
```

A student is in exactly one state, and the state is computed on the server from
the ledger. It is never stored in a field that can drift.

## 3.1 Signing in

| ID | Rule | Status |
|---|---|---|
| S-1 | Google sign-in creates the account on first use. | BUILT+PROVEN |
| S-2 | **A signed-in student is never shown a sign-in screen.** Any page that could show one checks first and sends them on. | BUILT+PROVEN |
| S-3 | Signing out clears the session completely. The next request is anonymous. | BUILT+PROVEN |
| S-4 | **There is always a visible way to sign out.** In a consultancy lab thirty students share a handful of machines and the cookie lasts ninety days; without this, the next student reads a stranger's report and spends their credits. | BUILT+PROVEN |
| S-5 | While signed in, the student's name is visible in the header, so they can tell whose account they are in. | BUILT+PROVEN |
| S-6 | **Logging out and back in does not refill the free trial.** The trial belongs to the Google account, not the browser. | BUILT+PROVEN |
| S-7 | A new Google account on a device that has already claimed several trials is soft-denied, not banned. Threshold is **4 accounts per device**, deliberately not 2, because shared lab machines are normal. | BUILT+PROVEN |
| S-8 | IP alone never denies anybody. A whole consultancy shares one connection. | BUILT+PROVEN |
| S-9 | A soft-denied student keeps browsing, keeps any report, and can still buy. | BUILT+PROVEN |
| S-10 | Sign-in failure shows the real reason, never a generic message that hides a fixable problem. | BUILT+PROVEN |

## 3.2 The free trial

| ID | Rule | Status |
|---|---|---|
| S-11 | A new student gets **one mock credit**, capped at **10 questions**. | BUILT+PROVEN |
| S-12 | The trial is the first 10 questions of the **same** 17-question paper, not a different shorter test. Paying unlocks the remaining 7 of that same sitting. | BUILT+PROVEN |
| S-13 | The trial requires no card, no phone, no form. | BUILT+PROVEN |
| S-14 | After question 10 the student reaches a gate with **two real choices**: see the report, or buy. | BUILT+PROVEN |
| S-15 | **The free report is the same report a paying student gets** for those ten answers. Nothing is withheld to force a sale. | BUILT+PROVEN |
| S-16 | **No countdown on that gate.** They have not seen their result yet; any timer is pressure applied before value. | BUILT+PROVEN |
| S-17 | An exhausted student gets a 402 with a plain reason and a way to buy — never a 401, which would bounce them to sign-in forever. | BUILT+PROVEN |

## 3.3 The interview itself

| ID | Rule | Status |
|---|---|---|
| S-18 | Consent is shown before the first question and **recorded with version and timestamp**. A stale consent version is refused. | BUILT+PROVEN |
| S-19 | Camera and microphone are checked before starting, and a failure explains what to do rather than blocking silently. | BUILT (browser only — see note) |
| S-20 | The microphone meter reflects **the actual recording**, decoded — not a live state value that can read silent for everyone. | BUILT (browser only — see note) |
| S-21 | The question is shown in writing. Spoken delivery is optional and **off by default**. | BUILT (browser only — see note) |
| S-22 | A visible countdown, the running question number, and the violation count are on screen throughout. | BUILT (browser only — see note) |
| S-23 | Background noise does not spam the violation monitor. Nepali homes and labs are noisy and that is not cheating. | BUILT (browser only — see note) |
| S-24 | **One sitting costs exactly one credit**, however many questions it has. | BUILT+PROVEN |
| S-25 | The credit is taken on the **first recorded answer**, not when the session is created. Opening the room and closing it costs nothing. | BUILT+PROVEN |
| S-26 | A silent or too-short answer is refused with a reason and a retry — **never scored**. | BUILT+PROVEN |
| S-27 | Three attempts per question, then move on. Read from the stored attempt number, not by counting rows. | BUILT+PROVEN |
| S-28 | A dropped connection mid-answer **preserves the recording** and offers "send the same recording again". Re-recording an answer the student already gave, because OUR network failed, on a question with three attempts, is charging them for our problem. | BUILT+PROVEN |
| S-29 | Demo or placeholder text is **labelled as such** and never presented as the student's own words. | BUILT+PROVEN |
| S-30 | An unknown or expired interview link shows a recovery screen naming the likely reasons, not a spinner. | BUILT+PROVEN |

## 3.4 The report

| ID | Rule | Status |
|---|---|---|
| S-31 | The verdict is a **label first, number second**. A frightened student reads "almost ready" better than "62%". | BUILT+PROVEN |
| S-32 | A sub-score we could not assess is **null, shown as "not assessed"** — never 0. Zero is a judgement; null is the truth. | BUILT+PROVEN |
| S-33 | Feedback follows **PEE + Wrap-up**: Point, Evidence, Explanation, Wrap-up. | BUILT+PROVEN |
| S-34 | Feedback is available in English and Nepali. | BUILT+PROVEN |
| S-35 | A report is readable only by the student who made it. A stranger gets 404. | BUILT+PROVEN |
| S-36 | Opening a report on another device shows a recovery screen explaining why, **without confirming the report exists**. | BUILT+PROVEN |
| S-37 | The report names what to do next, concretely, not "keep practising". One named weakness with one concrete action, placed directly under the verdict where a student looking for what to DO will actually see it. Shared with the dashboard via `lib/advice.ts` so the two cannot disagree. | BUILT+PROVEN |

## 3.5 The student's own dashboard — THE MISSING ACTOR SURFACE

Nothing here is proven. This is the gap that made the product feel broken.

| ID | Rule | Status |
|---|---|---|
| S-38 | A signed-in student has a **home of their own** at `/account` showing credits left, everything they have done, and every past report. | BUILT+PROVEN |
| S-39 | It states plainly **what they have bought and what remains**. | BUILT+PROVEN |
| S-40 | Every past report is reachable from it. A student who paid must never have to hunt for what they paid for. | BUILT+PROVEN |
| S-41 | It shows **progress over time** — whether their score is improving — because that is the reason to come back. Null until TWO scored sittings exist: one point is a dot, not a direction. | BUILT+PROVEN |
| S-42 | It surfaces what to practise next, based on their weakest **assessed** sub-score, with concrete advice. Nulls are skipped: a skill we could not judge is a gap in our measurement, not a weakness in the student. | BUILT+PROVEN |
| S-43 | It shows their referral code and how many rewards it has earned. | BUILT+PROVEN |
| S-44 | It never shows a number the student cannot act on. The whole progress block is hidden until there is something real to say. | BUILT+PROVEN |

## 3.6 Paying

| ID | Rule | Status |
|---|---|---|
| S-45 | The price comes from the server. Posting a different amount changes nothing. | BUILT+PROVEN |
| S-46 | The wallet number is **always shown and always copyable**, even when a QR is displayed, because most students scan from the same phone showing the page. | BUILT+PROVEN |
| S-47 | The receipt photo is **optional**, and a failed upload never blocks the payment. The unique transaction id is the real control. | BUILT+PROVEN |
| S-48 | **One wallet transaction id can be claimed exactly once**, ever. A forwarded screenshot is worthless. | BUILT+PROVEN |
| S-49 | Tapping submit repeatedly produces **exactly one item in the approval queue**, and every tap gets the same calm answer. A red error after real money makes a student pay twice or assume fraud. | BUILT+PROVEN |
| S-50 | A student with a payment already awaiting approval is told so, not allowed to start a second one. | BUILT+PROVEN |
| S-51 | Abandoning checkout grants nothing and costs nothing. | BUILT+PROVEN |
| S-52 | An unfinished order for the same pack is reused, not duplicated. | BUILT+PROVEN |
| S-53 | While waiting, the student sees their amount, transaction number and a short reference to quote, plus a way to contact us. | BUILT+PROVEN |
| S-54 | A rejected payment says what to check and lets them try again. It never implies dishonesty. | BUILT+PROVEN |
| S-55 | Credits appear the moment a payment is approved, without the student refreshing. | BUILT+PROVEN |

---

# PART 4 — A3, THE CONSULTANCY ADMIN

| ID | Rule | Status |
|---|---|---|
| C-1 | Logs in with their own slug and passcode. A wrong passcode and an unknown slug give the **identical** message, so slugs cannot be discovered. | BUILT+PROVEN |
| C-2 | A pending or suspended consultancy reads **nothing at all**. | BUILT+PROVEN |
| C-3 | Sees **only their own students.** No request field can name another consultancy. | BUILT+PROVEN |
| C-4 | **A student who arrived from an ad belongs to nobody** and is invisible to every admin. | BUILT+PROVEN |
| C-5 | Sees engagement and entitlement only — never a transcript, an answer, or feedback content. | BUILT+PROVEN |
| C-6 | A student is bound to a consultancy **only** by signing up through that consultancy's approved link, decided server-side. A forged link buys nothing. | BUILT+PROVEN |
| C-7 | Binding is attribution, not entitlement. It decides whose dashboard they appear on, nothing else. | BUILT+PROVEN |
| C-8 | Seats are claimed atomically. More signups than seats seats exactly the seat count, never more. | BUILT+PROVEN |
| C-9 | **A seat gives the student the same pack a paying student gets.** A consultancy student is never given a lesser product than someone off the street. | BUILT+PROVEN |
| C-10 | When the seats run out, the student is **not turned away**. They keep the free trial and can buy. Being the 51st student through a 50-seat link is not their fault. | BUILT+PROVEN |
| C-11 | Revoked seats are free again, and every place that counts seats agrees. | BUILT+PROVEN |
| C-12 | An admin may approve their own students' payments. **They cannot see our wallet**, so every such approval is stamped "approved by the consultancy, not checked against our wallet ledger" and stays visible to the super admin. | BUILT+PROVEN |
| C-13 | An admin approving another consultancy's order gets **404**, even holding a real order id. | BUILT+PROVEN |
| C-14 | Approving twice pays once. | BUILT+PROVEN |
| C-15 | An admin cannot reject an already-approved payment. Reversal is a deliberate act with its own path. | BUILT+PROVEN |
| C-16 | The admin is **notified whenever someone else approves one of their students**, because a dashboard whose numbers move silently is not trusted. | BUILT+PROVEN |
| C-17 | **Other admins are never notified about it.** | BUILT+PROVEN |
| C-18 | Branding changes are visible on their own `/c/{slug}` immediately. | BUILT+PROVEN |

---

# PART 5 — A4, THE SUPER ADMIN

| ID | Rule | Status |
|---|---|---|
| SA-1 | A wrong key reads nothing (403) and reveals nothing. | BUILT+PROVEN |
| SA-2 | Sees every consultancy, every student, every order. | BUILT+PROVEN |
| SA-3 | Approves a payment **only** by confirming it against the receiving wallet's own ledger. The screenshot is context, never proof. | BUILT+PROVEN |
| SA-4 | Approving is idempotent — a second click never grants a second pack. | BUILT+PROVEN |
| SA-5 | Approving a consultancy's student **notifies that consultancy**. | BUILT+PROVEN |
| SA-6 | Rejecting requires a written reason, which reaches the student. | BUILT+PROVEN |
| SA-7 | May grant credit manually, recorded in the ledger with a note and an actor. | BUILT+PROVEN |
| SA-8 | May disable a student account. Disabling preserves their data and stops them acting. | BUILT+PROVEN |
| SA-9 | Resolves flagged trials by granting or refusing — **never banning**. | BUILT+PROVEN |
| SA-10 | Sees the running approved/rejected tally. | BUILT+PROVEN |
| SA-11 | Sees which storage layer is live and the build SHA, so QA can prove what is deployed. | BUILT+PROVEN |
| SA-12 | Cannot read transcripts either. G-8 has no exceptions. | BUILT+PROVEN |

---

# PART 6 — A5, THE OWNER

| ID | Rule | Status |
|---|---|---|
| O-1 | The owner passcode is **separate from the super admin passcode**. Neither works in the other's door. | BUILT+PROVEN |
| O-2 | The kill switch stops **every student API**, not just the pages. A dark shop front with a working till is not a kill switch. | BUILT+PROVEN |
| O-3 | While paused, students see a human explanation and an editable contact name and phone. | BUILT+PROVEN |
| O-4 | Every flip of the switch is recorded with who and when, append-only. | BUILT+PROVEN |
| O-5 | The switch must work from an empty or corrupted store. It is the last resort and cannot depend on the thing that may have failed. | BUILT+PROVEN |
| O-6 | The public read exposes **only** whether the platform is up, plus the contact details when it is down. Nothing else. | BUILT+PROVEN |

---

# PART 7 — MONEY

| ID | Rule | Status |
|---|---|---|
| M-1 | Balance is always `SUM(delta)` over an append-only ledger. There is no mutable balance column, because that is the field that drifts. | BUILT+PROVEN |
| M-2 | Every ledger entry names a reason and, where relevant, an order or session. | BUILT+PROVEN |
| M-3 | A referral reward pays **only** when the friend's payment is verified — never on signup. | BUILT+PROVEN |
| M-4 | No self-referral, once per referred student, lifetime cap. | BUILT+PROVEN |
| M-5 | Any bonus shown on screen is recalculated at the moment money is confirmed, so what was promised is what is given. | BUILT+PROVEN |
| M-6 | A global spend breaker sits in front of every paid provider call. | BUILT+PROVEN |
| M-7 | Rate limits: sign-in 5 per IP per 5 min, payments 10 per IP per hour, answers 45 per minute. **Per-process only** — the real ceiling is limit × instances. Durable limits need Postgres or Redis. | BUILT (partial) |

## Pricing — CHANGED 13 August 2026

| ID | Rule | Status |
|---|---|---|
| M-8 | **NPR 449 = 3 mock interviews + 15 practice sessions.** Applied 13 Aug. Costs us about NPR 30. | BUILT |
| M-9 | **NPR 799 = 10 mock interviews + 20 practice sessions.** Applied 13 Aug. Costs us about NPR 98. | BUILT |
| M-10 | A consultancy seat = the NPR 799 pack, **derived from it in code** so it can never drift. Now 10 mocks + 20 practice. | BUILT |
| M-11 | Bundles are 20 and 30 seats at NPR 300 each. | BUILT+PROVEN |
| M-12 | **The per-mock comparison is withdrawn.** At NPR 449 for 3 mocks we are NPR 150 a mock against the competitor's 143-160, so a per-mock table would have been a false claim (G-9). The page now compares the two things that ARE true and are the client's own argument: our entry pack is NPR 449 against their NPR 799, and we let a student try ten real questions free while they do not. | BUILT |

---

# PART 8 — QUESTIONS AND THE AI

Not built. Nothing here may be claimed until it is.

| ID | Rule | Status |
|---|---|---|
| Q-1 | Questions must reflect **what UK universities and UKVI credibility interviews actually ask** — researched from real sources, not invented. | TODO |
| Q-2 | Each university's paper reflects that institution's known emphases. A generic bank presented as university-specific is a lie. | TODO |
| Q-3 | A full mock is 17 questions. The trial is the first 10 of the same paper. | BUILT+PROVEN |
| Q-4 | Question order is fixed at session creation so a resume is deterministic. | BUILT+PROVEN |
| Q-5 | Speech-to-text is Groq Whisper Large v3. Cost is about NPR 10 per mock. | TODO |
| Q-6 | **If transcription fails, the student is told and offered a retry. No score is invented.** (G-1.) | BUILT+PROVEN |
| Q-7 | Evaluation returns per-question PEE feedback plus four sub-scores. Any it cannot judge is null. | BUILT+PROVEN |
| Q-8 | **The AI's output must be benchmarked against Nepali-accented English before we trust it.** An evaluator that mishears an accent and marks a student down is worse than no product. | TODO |
| Q-9 | The AI never sees, stores or returns anything that identifies the student to a third party beyond the audio itself. | TODO |
| Q-10 | Every AI call is behind the spend breaker and counted. | BUILT+PROVEN |

---

# PART 9 — ERRORS AND RECOVERY

| ID | Rule | Status |
|---|---|---|
| E-1 | A malformed request returns 400, never 500. The caller's mistake must not look like our collapse. | BUILT+PROVEN |
| E-2 | Not signed in → **401**. No credits → **402**. Not yours → **404**. Wrong state → **409**. Too fast → **429**. Our fault → **503**. These are load-bearing: **client pages bounce to sign-in on 401 only**, so any other failure returning 401 creates an infinite loop. | BUILT+PROVEN |
| E-3 | Every error message says what happened, whose fault it is, and what to do next, in words a nervous nineteen-year-old understands. | BUILT+PROVEN |
| E-4 | No error blames the student for our failure. | BUILT+PROVEN |
| E-5 | Storage failures are logged loudly. A silent storage outage is the worst possible failure: the site looks healthy and forgets everybody. | BUILT+PROVEN |
| E-6 | Every button reports success, failure, or progress. Silence is a defect. Errors attach to the button that caused them, never floating at the top of a page a phone user cannot see. | BUILT+PROVEN |

---

# PART 10 — RULE → TEST MAP

A rule with no test is a hope. Current coverage:

| `rules-check.js` | the 59 rules that were only BUILT | **59/59** |
| Suite | Rules it proves | Result |
|---|---|---|
| `pilot-check.js` | S-6, S-17, S-24, S-25, S-45, S-48, S-49, S-51, C-3, C-4, C-9, C-13, C-16, C-17, G-5, G-8 | 29/29 |
| `lifecycle-check.js` | G-1, G-2, G-6, S-11, S-18, S-32, S-48, M-1 | 20/20 |
| `tenant-check.js` | C-1…C-14 | 12/12 |
| `fraud-check.js` | S-7, S-9, M-3, M-4, O-2…O-6 | 19/19 |
| `journey-check.js` | V-2, V-3, S-1, S-11, S-14 | 26/26 |
| `walk-check.js` | G-3, V-1, V-7 | 78 steps |
| `adversarial-check.js` | G-2, G-5, C-3 | 18/18 |

**Rules with NO test at all** — the honest gap list:

V-9, S-19, S-20, S-21, S-22, S-23, S-28, S-33, S-34, S-37, S-38 … S-44,
G-10, E-6, and the whole of Part 8.

Most need a real browser, a real phone or a real AI key. **They must not be
described as working.**

---


---

# PART 12 — THE 13 AUGUST MODEL

Client decisions, settled. This **replaces** the conflicting parts of Part 4.

## 12.1 The consultancy model

**A consultancy student never pays us and is never "approved".** They arrive
through their consultancy's link, sign in with Google like anybody else, and
simply have mocks.

| ID | Rule | Status |
|---|---|---|
| N-1 | A consultancy buys seats and **chooses how many mocks each seat carries** — 3, 6 or 10. They may mix sizes in one order. | BUILT+PROVEN |
| N-2 | **Sign-in is Google, always. There are no passwords anywhere in this product.** The admin issues a *link*, not credentials. Signing in through that link binds the student to that consultancy, server-side. One identity system, nothing to store, nothing to reset, nothing to leak. | BUILT+PROVEN |
| N-3 | A seated student sees the seat's mocks **plus the free trial**. A 3-mock seat shows **4**. | BUILT+PROVEN |
| N-4 | **A consultancy student is shown no price, no QR and no pay button** while their consultancy's mocks last. | BUILT+PROVEN |
| N-5 | When their mocks run out they have **two routes, and they choose**: ask their consultancy to renew, which **costs that consultancy one seat**; or upgrade themselves by paying us directly. | BUILT+PROVEN |
| N-6 | An admin near the end of their seats is shown a renewal option and buys more the way a student does: QR, details, screenshot, **super-admin** approval. | BUILT+PROVEN |
| N-7 | **An admin never approves a student payment.** Removed entirely, and `C-12` is retired. Admins pay *us*; how they collect from their own students — cash, their own link, or free — is their business and never touches our system. | BUILT+PROVEN |
| N-8 | How a consultancy charges its own students is invisible to us. We hold no record of it and take no position on it. | BUILT+PROVEN |

## 12.2 Payment, for students who pay us directly

| ID | Rule | Status |
|---|---|---|
| N-9 | The QR is **at the top**, then details, then an optional screenshot, then the pay button. Built for one hand and one phone. | BUILT+PROVEN |
| N-10 | Approval goes to the **super admin**, never a consultancy. | BUILT+PROVEN |
| N-11 | **Only the super admin can change the QR image and the contact number.** Sales staff change; neither may need a deploy. | BUILT+PROVEN |
| N-12 | After submitting, a **WhatsApp link opens with the message already written** — "I am having a problem with my payment, my name is …". A worried student should never have to compose it. | BUILT+PROVEN |
| N-13 | Every approval request reaching the super admin carries the payer's **phone number**, so they can ring when the money has not arrived. | BUILT+PROVEN |
| N-14 | An **upgrade** button is always visible, even to a student who already has a pack. | BUILT+PROVEN |
| N-15 | At **one or two mocks left**, a renewal button appears and the checkout is **pre-filled** from last time. | BUILT+PROVEN |
| N-16 | Install or bookmark prompt, on phone and on laptop. | BUILT+PROVEN |

## 12.3 Abuse, handled by a person

| ID | Rule | Status |
|---|---|---|
| N-17 | The super admin **sees devices running many Google accounts** — the eighteen-Gmail case — as a queue, not a silent counter. | BUILT+PROVEN |
| N-18 | They can **soft-block a device**. Soft, never a ban: there is always a way back. | BUILT+PROVEN |
| N-19 | A soft-blocked student gets a contact number and a **WhatsApp link pre-filled** with "my account is blocked, my name is …". | BUILT+PROVEN |
| N-20 | That number is **editable by the super admin**. | BUILT+PROVEN |

## 12.4 What the super admin sees

| ID | Rule | Status |
|---|---|---|
| N-21 | Students and consultancies listed **separately**. | BUILT+PROVEN |
| N-22 | Per student: university, **bachelor or masters**, verified Gmail, WhatsApp number, and **whether that number really has WhatsApp** — asked, never assumed. | BUILT+PROVEN |
| N-23 | **City only, asked at payment, optional, with the reason shown.** Not GPS, not silent. Client accepted the advice: a mock interview does not need a student's location, and holding it beside transcripts about family income and visa refusals turns a breach into a scandal. City is enough for sales. | BUILT+PROVEN |
| N-24 | Per consultancy: links sent, renewals done, seats given out. | BUILT+PROVEN |

## 12.5 Questions — the heart of the product

| ID | Rule | Status |
|---|---|---|
| N-25 | The super admin can **add questions** without a deploy. | BUILT+PROVEN |
| N-26 | **Ten students starting a trial get ten different sets.** No two trials identical. | BUILT+PROVEN |
| N-27 | Randomised **only within questions that really appear** in Pre-CAS and UKVI credibility interviews. A student who practises three mocks and then meets nothing familiar has been cheated, and "it was random" is not a defence. | BUILT+PROVEN |
| N-28 | A student on the **NPR 799 pack can add their own questions** — photograph a list, upload an image, or type them — and have the interviewer ask those. | BUILT+PROVEN |
| N-29 | Question research is a **named deliverable with sources**, not a bank somebody invented. Until it exists, no page may claim the questions are what universities ask. | TODO |

## 12.6 Feedback that is not generic

| ID | Rule | Status |
|---|---|---|
| N-30 | **Feedback is written about THIS student's answer**, quoting what they actually said. Two students never receive the same paragraph. Enforced at runtime by `looksGeneric()` in `lib/ai/contract.ts`, which rejects any response whose "evidence" field does not actually overlap the transcript. | BUILT |
| N-31 | Generic feedback is a **defect**, not a shortcoming. A model under load drifts towards safe generic sentences because they are the highest-probability output, so every response is checked, not spot-checked. When it fails we drop the prose and say so — a missing paragraph is honest, a generic one is a lie that costs the student their interview. | BUILT |
| N-32 | **Nepali is not a translation of the report.** It carries only what a frightened student must not misunderstand: what went wrong and what to do. Scores, the question, and their own words stay in English, because the interview is in English and reading their own answer back in Nepali helps nobody. Fixed as one field in the contract. | BUILT |

## 12.7 Practice — a whole feature nobody had specified

Practice is sold in both packs and has never been designed. It has no tab.

| ID | Rule | Status |
|---|---|---|
| N-33 | Practice has its **own tab** in the header and its own place on the dashboard. | BUILT+PROVEN |
| N-34 | Practice is **one question at a time**, chosen by theme, with the same recording and feedback as a mock. | BUILT+PROVEN |
| N-35 | A practice session costs a **practice credit, never a mock credit.** The two currencies never mix. | BUILT+PROVEN |
| N-36 | Practice is aimed at the student's **weakest assessed sub-score** by default, so it continues the report rather than starting over. | BUILT+PROVEN |
| N-37 | Practice answers appear in their history, marked as practice, and never distort the mock score. | BUILT+PROVEN |

## 12.8 Choosing a university

| ID | Rule | Status |
|---|---|---|
| N-38 | The university list is **searchable**. A long list a student must scroll is a wall, not a choice. | BUILT+PROVEN |
| N-39 | Filters for the obvious cuts, and the **most applied-to pinned first**. | BUILT+PROVEN |
| N-40 | A student whose university is **not listed can still start** — a general UK paper rather than a dead end. | BUILT+PROVEN |

## 12.9 The kill switch, hardened

| ID | Rule | Status |
|---|---|---|
| N-41 | **Every path shows the closed screen** — `/admin`, `/super`, every API, every unknown slug. Only `/owner` answers. | BUILT+PROVEN |
| N-42 | **No workaround.** Not by inspecting, not by a different slash, not by calling the API directly. | BUILT+PROVEN |
| N-43 | **Nothing is deleted.** Every student, consultancy and session survives exactly as it was. Access is suspended; data is not. | BUILT+PROVEN |

## 12.10 Resuming an unfinished mock

| ID | Rule | Status |
|---|---|---|
| N-44 | A student who answers 2 of 17 and closes the tab **returns to question 3**, even fifty days later. | BUILT+PROVEN |
| N-45 | **Never a fresh paper.** Answered questions stay answered. | BUILT+PROVEN |
| N-46 | An unfinished sitting is **not charged as a finished one**. One credit, taken on the first answer; the remaining questions stay theirs until used. | BUILT+PROVEN |
| N-47 | The unfinished sitting is on their dashboard with a way straight back into it. | BUILT+PROVEN |

---

# PART 13 — THE AI CONTRACT (ready before the key)

`lib/ai/contract.ts` fixes every input and output **before a provider is chosen**,
so connecting one is plumbing rather than design.

| ID | Rule | Status |
|---|---|---|
| AI-1 | The evaluator receives: the question, its category and intent, the transcript, how long they spoke, the university, the level, and **what they said earlier in the same sitting**. Nothing else. | BUILT |
| AI-2 | **No identifying data reaches any provider.** Not name, email, phone, consultancy or payment history. A grader does not need to know who somebody is to say whether they named their course. | BUILT |
| AI-3 | It returns PEE + Wrap-up, a Nepali line, three sub-scores that may be null, and a **contradiction** field. | BUILT |
| AI-4 | **Contradiction detection is the highest-value output.** A student whose father is a farmer in question 3 and a businessman in question 11 has a problem no single-answer grader can see, and an officer certainly will. | BUILT |
| AI-5 | The system prompt lives **in code**, versioned and diffable, never in a provider console. | BUILT |
| AI-6 | Accent, grammar slips and Nepali sentence order are **never penalised** where meaning is clear. Only vagueness, contradiction, numbers that do not add up, and recited answers. | BUILT |
| AI-7 | Transcription is Groq Whisper Large v3 with a **language hint and a vocabulary hint**, so the model does not "correct" a Nepali speaker into words they never said and then quote them back as evidence. | BUILT |
| AI-8 | On generic or malformed output the prose is **dropped**, the score and recording are kept, and the student is told plainly. Never shipped, never fabricated. | BUILT |
| AI-9 | When the key arrives, only `stt.ts` and `evaluate.ts` change. G-1, N-30, Q-10 and G-8 must all still hold. | TODO |

---

# PART 11 — WHAT IS NOT YET DECIDED

| ID | Question | Who decides |
|---|---|---|
| OPEN-1 | **DECIDED 13 Aug: stay on Netlify for the pilot, migrate after.** Himalayan Host support answered the Next.js question by sending the *VPS* page, which reads as "you need a VPS for that" — their shared "Node.js support" is the Passenger selector and probably cannot keep a Next.js server resident. A VPS definitely works (root access, they run n8n) but costs NPR 12,000/yr in Europe or NPR 42,000/yr in KTM, versus NPR 3,500/yr shared, and setting one up blind is most of a day we do not have. Netlify is free, already works, and a new domain points at it in 30 minutes. | settled |
| OPEN-2 | Which domain for the free .COM? | client |
| OPEN-3 | Confirm M-8 and M-9, and whether NPR 449 at 3 mocks still beats the competitor per mock | client |
| OPEN-4 | Storage: **Supabase free tier**, since we are staying on Netlify for now and Supabase works from anywhere. Only revisit if we move to a VPS. | settled |
| OPEN-5 | Where do the researched questions come from, and who signs off that they are realistic? | client + research |

---

**Last updated:** 13 August 2026. Change the rule here first, then the code.
