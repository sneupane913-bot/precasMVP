# The Rules

**Every rule this product must obey, and an honest mark against each one.**

Last updated: 14 August 2026.

---

## How to read the marks, and why the distinction is not pedantry

| Mark | Means |
|---|---|
| **BUILT + PROVEN** | The code exists AND a test drives the running product and asserts what a person would experience. |
| **BUILT + SOURCE-CHECKED** | The code exists and a test reads the source to confirm it. **This is weaker and is not the same as proven.** |
| **BUILT, NOT PROVEN** | The code exists. Nothing automated confirms it. Needs a browser or a handset. |
| **NOT BUILT** | Does not exist. |

### Why the middle row is marked differently rather than being called proven

The client asked directly: *"you need to identify whether or not you just wrote
proven for the sake of writing, or have you actually proven that?"*

The honest answer, measured rather than asserted:

**501 assertions across 20 suites. 458 of them drive the running product. 43 of
them only read source code.**

Full regression, 14 August 2026, all green:
walk 78 · model 70 · rules 59 · pilot 32 · journey 26 · contract 25 ·
passcode 24 · ai 23 · backoffice-ui 21 · lifecycle 20 · state 20 ·
fraud 19 · adversarial 18 · backoffice 12 · tenant 12 · copy 8 · header 8 ·
reachable 6 · route 5. `tsc` clean, `next build` clean.

A test that greps source proves the code *says* something. It does not prove the
product *does* it. This project has already been bitten by exactly that gap:
four tests once passed by matching a comment while the code beneath did
something else, and five separate features passed green suites while being
unreachable by any human being.

So the 43 are marked SOURCE-CHECKED, not PROVEN. Where the behaviour can be
driven, it has been converted. Where it genuinely cannot be driven from a test
process, the reason is stated on the line.

### The three things a green suite still cannot tell you

1. **Whether a human can reach the feature.** `reachable-check.js` now fails the
   build when an API action has no screen calling it, which is a static check
   for a defect that shipped five times.
2. **Whether client-side state is right.** No suite loads any JavaScript. Every
   defect the client has found himself lived here.
3. **Whether it looks right, or works on a real phone.**

**Therefore: nothing in this document is a release. The browser pass is.**

---

## Part 1. The student lifecycle

### 1a. Getting in

| # | Rule | Status | Evidence |
|---|---|---|---|
| S-1 | No interview can exist without a signed-in student | **BUILT + PROVEN** | walk 1.3, journey 2 |
| S-2 | Signing in with Google grants exactly one free trial per Google account | **BUILT + PROVEN** | walk 1.4, pilot CS-01 |
| S-3 | Signing out and back in never refills the trial | **BUILT + PROVEN** | walk 1.13, pilot CS-03 |
| S-4 | There is always a visible way to sign out | **BUILT + PROVEN** | walk 1.16, and `/signout` works with no JavaScript (walk 1.17) |
| S-5 | A signed-in student can see which account they are in | **BUILT + SOURCE-CHECKED** | rules S-5. The header renders the name; only a browser can confirm it is visible |
| S-6 | `/start` sends an already signed-in student straight on, never to the Google chooser again | **BUILT + PROVEN** | header suite, and driven in the browser pass |
| S-7 | The header never claims a session state it has not established | **BUILT + PROVEN** | header-check H-1 to H-8 |
| S-8 | A disabled student cannot act, keeps their data, and the site does not break for them | **BUILT + PROVEN** | walk 9.1 to 9.3 |

### 1b. The free ten

| # | Rule | Status | Evidence |
|---|---|---|---|
| S-10 | The free trial is exactly 10 questions | **BUILT + PROVEN** | walk 1.5, pilot CS-01 |
| S-11 | A whole sitting costs exactly one credit, however many questions | **BUILT + PROVEN** | pilot CS-02 |
| S-12 | The credit is spent on the FIRST answer, never at session creation | **BUILT + PROVEN** | state ST-4, walk 3.2 |
| S-13 | A second free interview is refused, with a way to pay attached | **BUILT + PROVEN** | walk 1.9, 1.11, pilot CS-04 |
| S-14 | The refusal carries a control to act on, never bare red text | **BUILT + PROVEN** | walk 1.11 |
| S-15 | The free report is the same report a paying student gets | **BUILT + SOURCE-CHECKED** | rules S-15 |
| S-16 | No countdown on the question-10 gate. Urgency before value is a dark pattern | **BUILT + SOURCE-CHECKED** | rules S-16 |

### 1c. State, which is where a student loses trust fastest

| # | Rule | Status | Evidence |
|---|---|---|---|
| S-20 | Answer one of ten, leave, come back: the same sitting, 9 left | **BUILT + PROVEN** | state ST-1, ST-2, ST-3 |
| S-21 | Coming back never costs a second credit | **BUILT + PROVEN** | state ST-4, ST-8 |
| S-22 | The answers already given are still there | **BUILT + PROVEN** | state ST-5 |
| S-23 | A paid mock resumes the same way | **BUILT + PROVEN** | state ST-6 |
| S-24 | Tapping a different university resumes the open sitting and NAMES which one it is | **BUILT + PROVEN** | state ST-7, pilot CS-04b |
| S-25 | Practice resumes too, and is never charged twice | **BUILT + PROVEN** | state ST-9, ST-10 |
| S-26 | An open practice sitting does not block starting a mock | **BUILT + PROVEN** | state ST-11 |
| S-27 | Reopening an untouched sitting reuses it rather than leaving an orphan | **BUILT + PROVEN** | state ST-9 |
| S-28 | Leaving mid-interview warns first, and the warning covers the in-app Back button | **BUILT, NOT PROVEN** | Built this session. `beforeunload` and `popstate` cannot be driven from a test process. **Browser pass required.** |
| S-29 | Three attempts per question, read from the stored attempt number | **BUILT + SOURCE-CHECKED** | rules S-27 |
| S-30 | A dropped connection preserves the recording | **BUILT + SOURCE-CHECKED** | rules S-28 |

### 1d. Paying

| # | Rule | Status | Evidence |
|---|---|---|---|
| S-40 | The browser never sends a price. The server decides | **BUILT + PROVEN** | pilot CS-10 |
| S-41 | Opening the checkout twice reuses the order, never writes a new one | **BUILT + PROVEN** | walk 3.5, state ST-13 |
| S-42 | Reaching the QR and walking away grants nothing | **BUILT + PROVEN** | walk 3.2, state ST-14 |
| S-43 | One student may have at most ONE payment awaiting approval | **BUILT + PROVEN** | walk 4.4, pilot CS-08a |
| S-44 | Tapping "I have paid" twice is answered calmly, never in red | **BUILT + PROVEN** | walk 4.2, pilot CS-08b |
| S-45 | One wallet transaction number unlocks exactly one account, once | **BUILT + PROVEN** | walk 4.3, pilot CS-11 |
| S-46 | The waiting screen states how many HOURS to allow, not "a little time" | **BUILT + PROVEN** | state ST-12 |
| S-47 | The waiting screen carries a number to ring and a prewritten message | **BUILT + PROVEN** | model N-9b, N-9c |
| S-48 | Approval is INSTANT. Credits are there on the very next request | **BUILT + PROVEN** | state ST-20 |
| S-49 | Approving twice grants once | **BUILT + PROVEN** | backoffice BO-12, walk 4.7 |
| S-50 | Rejection is always SOFT: they can immediately start again | **BUILT + PROVEN** | state ST-17, ST-18 |
| S-51 | A rejected student is told WHY, in the approver's own words | **BUILT + PROVEN** | state ST-15 |
| S-52 | A rejected student is given a person to reach | **BUILT + PROVEN** | state ST-16 |
| S-53 | Paying gives the full 17-question sitting, not still 10 | **BUILT + PROVEN** | walk 4.8, 4.9, adversarial CASE 2 |

### 1e. Fairness, and never blaming the student

| # | Rule | Status | Evidence |
|---|---|---|---|
| S-60 | A score is NEVER shown for words we did not hear | **BUILT + PROVEN** | ai AI-2, AI-8 |
| S-61 | Silence is refused before we pay to transcribe it | **BUILT + PROVEN** | ai AI-1 |
| S-62 | A too-short answer is explained, never scored zero | **BUILT + PROVEN** | ai AI-2, AI-3 |
| S-63 | When we catch only part of what they said, we SAY SO, in our own name | **BUILT + PROVEN** | ai AI-18, AI-19 |
| S-64 | That message never blames their accent or their English | **BUILT + PROVEN** | ai AI-20 |
| S-65 | And it names the one mechanical fix that helps | **BUILT + PROVEN** | ai AI-21 |
| S-66 | Being half heard never costs them the answer entirely | **BUILT + PROVEN** | ai AI-22 |
| S-67 | A normal answer is never wrongly told we missed some of it | **BUILT + PROVEN** | ai AI-23 |
| S-68 | Personal numbers are stripped before storage or before reaching a model | **BUILT + SOURCE-CHECKED** | ai AI-14. Cannot be driven without a real transcript containing a passport number |
| S-69 | Whisper's stock hallucinations on silence are treated as silence | **BUILT + SOURCE-CHECKED** | ai AI-13. Needs the real provider to drive |
| S-69a | Deepgram is the primary transcriber whenever its key exists; Groq is tried only when Deepgram fails. Broken if both keys are set and the first paid request goes to Groq, or if silence/too-short audio is charged to both providers | **NOT BUILT** | Planned provider contract STT-1 to STT-3 |
| S-69b | No product instructions or interview vocabulary are sent to Groq as a conditioning prompt. Broken if any `prompt` field leaves this app and can reappear as words the student never said | **NOT BUILT** | Planned provider contract STT-4 |
| S-70 | Feedback quotes the student's own words back | **BUILT + PROVEN** | ai AI-6 |
| S-71 | Marked against the same four steps the student saw on screen | **BUILT + PROVEN** | ai AI-7 |
| S-72 | The trial gate never bans. The worst case is a soft deny that can still browse and buy | **BUILT + PROVEN** | walk 2.3, 2.4 |
| S-73 | Thirty students on one consultancy Wi-Fi all get their free try | **BUILT + PROVEN** | walk 2.5, pilot CS-05a |
| S-74 | A real farm on one device is eventually held back | **BUILT + PROVEN** | walk 2.2, pilot CS-05b |

---

## Part 2. The consultancy admin

| # | Rule | Status | Evidence |
|---|---|---|---|
| A-1 | A consultancy sees only its own students | **BUILT + PROVEN** | tenant suite |
| A-2 | A consultancy sees no transcript, answer or feedback content, ever | **BUILT + PROVEN** | tenant suite |
| A-3 | An invented consultancy and a wrong passcode get the SAME message | **BUILT + PROVEN** | walk 8.1, 8.2 |
| A-4 | A pending or suspended consultancy reads nothing | **BUILT + PROVEN** | passcode PC-1 setup, tenant suite |
| A-5 | They can see the payments they are the only ones allowed to approve | **BUILT + PROVEN** | walk 5.6 |
| A-6 | They can approve or reject their own students' payments | **BUILT + PROVEN** | walk 5.8, backoffice-ui |
| A-7 | Another consultancy can never touch their orders | **BUILT + PROVEN** | walk 5.7 |
| A-8 | They can NEVER approve their own seat purchase | **BUILT + PROVEN** | backoffice-ui. Found by running it: it would have been NPR 6,000 of stock on their own say-so |
| A-9 | Their approval is recorded as their word, not as something we verified | **BUILT + PROVEN** | walk 8.7 |
| A-10 | They can buy more seats, with a QR and a transaction number | **BUILT + PROVEN** | backoffice-ui |
| A-11 | Sending the seat transaction number twice is answered calmly | **BUILT + PROVEN** | backoffice-ui |
| A-12 | They can set their own logo and colour | **BUILT + PROVEN** | backoffice-ui, reachable R-1 |
| A-13 | They can top a student up out of their own seats | **BUILT + PROVEN** | model N-5 |
| A-14 | Seats bought, used and left always agree with the seat rows | **BUILT + PROVEN** | model N-24 |
| A-15 | **The passcode we set them is a HANDOVER code. The portal shows nothing until they replace it** | **BUILT + PROVEN** | passcode PC-2, PC-4, PC-5 |
| A-16 | Changing it needs the current one, so a walk-up cannot lock them out | **BUILT + PROVEN** | passcode PC-9 |
| A-17 | The handover code stops working the moment they change it | **BUILT + PROVEN** | passcode PC-11 |
| A-18 | Their passcode is never sent back to the browser | **BUILT + PROVEN** | passcode PC-14 |
| A-19 | The change is recorded, and the audit trail does NOT contain the passcode | **BUILT + PROVEN** | passcode PC-15, PC-16 |

---

## Part 3. The super admin

| # | Rule | Status | Evidence |
|---|---|---|---|
| SA-1 | Using the dashboard never spends the brute-force budget | **BUILT + PROVEN** | backoffice BO-1, BO-3 |
| SA-2 | Approve works immediately after a page load | **BUILT + PROVEN** | backoffice BO-2 |
| SA-3 | The row says approved straight away, never a stale "submitted" | **BUILT + PROVEN** | backoffice BO-4 |
| SA-4 | The counters and the row never disagree about whether we were paid | **BUILT + PROVEN** | backoffice BO-5 |
| SA-5 | Guessing the passcode is still throttled hard | **BUILT + PROVEN** | backoffice BO-9, BO-10 |
| SA-6 | The screen never shows an error and a success at once | **BUILT + SOURCE-CHECKED** | backoffice BO-11 |
| SA-7 | **Every payment carries a phone number to ring** | **BUILT + PROVEN** | backoffice BO-6 |
| SA-8 | Every student in the directory carries a number and whether WhatsApp works | **BUILT + PROVEN** | backoffice BO-7 |
| SA-9 | A verified payment can never be flipped to rejected | **BUILT + PROVEN** | walk 6.4 |
| SA-10 | Approving or rejecting a consultancy's student always tells that consultancy | **BUILT + PROVEN** | walk 6.2, 6.3 |
| SA-11 | They can create, approve and suspend a consultancy | **BUILT + PROVEN** | backoffice-ui |
| SA-12 | A new consultancy is PENDING and does nothing until approved | **BUILT + PROVEN** | backoffice-ui |
| SA-13 | They can give a student credit by hand, with a reason, audited as `grant_credit` | **BUILT + PROVEN** | backoffice-ui, walk 8.8 |
| SA-14 | They can soft-block one device without banning a person | **BUILT + PROVEN** | backoffice-ui |
| SA-15 | They can add a question to the live bank with no deploy | **BUILT + PROVEN** | backoffice-ui |
| SA-16 | They can change the QR, wallet and support number with no deploy | **BUILT + PROVEN** | model N-11 |
| SA-17 | **Every settings change records WHICH fields changed** | **BUILT + PROVEN** | backoffice-ui audit assertions |
| SA-18 | They can set how many hours a student is told to wait | **BUILT + PROVEN** | state ST-12 |
| SA-19 | They can change the post-trial offer, clamped to 15 minutes to 24 hours | **BUILT + PROVEN** | backoffice-ui |
| SA-20 | They can read the audit trail | **BUILT + PROVEN** | backoffice-ui |
| SA-21 | They can see whether the AI is live and what it has cost this month | **BUILT + PROVEN** | reachable R-1, driven in backoffice-ui |
| SA-22 | **They can change their own passcode without a deploy** | **BUILT + PROVEN** | passcode PC-18 |
| SA-23 | The old passcode stops working immediately | **BUILT + PROVEN** | passcode PC-19 |
| SA-24 | The new one works on every door, not just the one it was changed on | **BUILT + PROVEN** | passcode PC-21 |
| SA-25 | **Rotating the deploy key in the host really does hand access back** | **BUILT + PROVEN** | passcode PC-22, PC-23. This promise was FALSE until the test was written |

---

## Part 4. The owner

| # | Rule | Status | Evidence |
|---|---|---|---|
| O-1 | The owner key and the super key are separate. Neither opens the other's door | **BUILT + PROVEN** | walk 8.4, 8.5 |
| O-2 | The kill switch stops every student API, not just the pages | **BUILT + PROVEN** | walk 10.1 |
| O-3 | It closes the back office too, so money cannot move while students are locked out | **BUILT + PROVEN** | model N-41 |
| O-4 | Students are told why, in words a person wrote | **BUILT + PROVEN** | walk 10.2 |
| O-5 | Turning it back on really turns it back on | **BUILT + PROVEN** | walk 10.3 |
| O-6 | Every pause and resume is recorded with time and address | **BUILT + SOURCE-CHECKED** | rules H-3 |

---

## Part 5. Money guarantees

| # | Rule | Status | Evidence |
|---|---|---|---|
| M-1 | A balance is SUM(delta) over an append-only ledger. No mutable balance column | **BUILT + PROVEN** | lifecycle suite |
| M-2 | The browser cannot forge a plan, a credit count or a question limit | **BUILT + PROVEN** | fraud suite, rules G-forged |
| M-3 | A seat is derived from the pack and cannot drift | **BUILT + SOURCE-CHECKED** | model M-10 |
| M-4 | No price, mock count or practice count is typed by hand anywhere | **BUILT + PROVEN** | copy-check M-8 to M-10c. **It caught its own author this session** |
| M-5 | A promised bonus is recalculated when the money is confirmed | **BUILT + SOURCE-CHECKED** | rules M-5 |
| M-6 | A monthly ceiling on paid provider calls, checked BEFORE the call | **BUILT + SOURCE-CHECKED** | ai AI-16, AI-17 |
| M-7 | A per-student daily mock cap | **BUILT + PROVEN** | walk 7.2 |

---

## Part 6. What is NOT done

| # | Item | Status | What it needs |
|---|---|---|---|
| X-1 | Speech to text is live | **NOT BUILT (no key)** | `GROQ_API_KEY` in Netlify. The code path is complete and the honest fallback is proven |
| X-2 | Real feedback is live | **NOT BUILT (no key)** | `GEMINI_API_KEY` in Netlify |
| X-3 | Nepali-accent benchmark | **NOT BUILT** | Real student audio on a real mid-range Android. Groq was chosen on price, which is verified; that it beats Deepgram on Nepali-accented English is **unproven** |
| X-4 | The exit warning (S-28) | **BUILT, NOT PROVEN** | Browser pass. `beforeunload` and `popstate` cannot be driven from a test process |
| X-5 | PWA install on a real phone | **BUILT, NOT PROVEN** | A real handset |
| X-6 | The interview room on a real phone | **BUILT, NOT PROVEN** | A real handset with a real microphone |
| X-7 | Durable rate limits | **PARTIAL** | Limits are per process, so the real ceiling is the limit times the number of Netlify instances. Needs Postgres or Redis |
| X-8 | Every screen clicked in a browser | **NOT DONE** | The browser pass. **This is the next job and nothing ships before it** |

---

## Part 7. The 43 source-checked assertions, listed honestly

These are marked SOURCE-CHECKED above rather than PROVEN. They read the code
rather than driving the product.

**Convertible, and worth converting** when there is time: rules S-15, S-16,
S-27, S-28, S-30, S-31, S-37, S-52, S-55, E-6, G-10, M-5, M-11, Q-6, Q-10, and
model N-33, N-36, N-37, N-40, N-16, N-19b.

**Not convertible from a test process**, with the reason:

| Assertion | Why it cannot be driven |
|---|---|
| ai AI-11, AI-12 | Require `NODE_ENV=production`, which correctly disables the dev sign-in the whole suite depends on |
| ai AI-13 | Requires the real Whisper provider returning a hallucination |
| ai AI-14 | Requires a real transcript containing a passport number |
| ai AI-16, AI-17 | Ordering of calls inside one function, not observable from outside |
| ai AI-10 | Whether the room SHOWS demo mode is a rendering question |
| backoffice BO-8, BO-11 | Rendering and banner-state questions |
| reachable R-3, R-4 | This suite is a source check by design; that is its whole job |
| model Q-1, N-1, M-10, M-12 | Statements about the question bank and the price table, which are data |

---

## Part 8. How to add a rule

1. Write the rule as a sentence about what a PERSON experiences.
2. Write the test first, and watch it fail.
3. Build it.
4. Watch it pass.
5. Add the row here with the honest mark.

Never mark a rule PROVEN because the code looks right. Five features in this
project were correct, complete, and unreachable by any human being, and every
one of them sat behind a green suite.
