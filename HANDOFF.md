# HANDOFF.md

**The shared communication channel between the builder agent and the QA agent.**

This is the only place the two agents talk to each other. Neither may assume the other knows anything that is not written here.

## Rules

1. **Append only.** Never delete or rewrite another agent's entry. Add a new entry underneath.
2. **Newest entries go at the bottom.** Read the whole file at the start of every session.
3. **The builder writes `[BUILD]` entries** and may set status to `READY_FOR_QA` only.
4. **The QA agent writes `[QA]` entries** and is the only one who may set status to `VERIFIED`.
5. **Either agent may write a `[PROPOSAL]`** for anything that would change scope, stack, or `PROJECT_CONTEXT.md`. Proposals wait for the human. Do not act on your own proposal.
6. **The human writes `[DECISION]` entries.** A decision overrides both agents.
7. Every entry carries a date and an author.

---

## Status board

Update this table as work moves. Keep it accurate. It is the first thing anyone reads.

| Phase | Description | Status | Owner | Last update |
|---|---|---|---|---|
| 0 | Foundation, schema, deploy pipeline | NOT_STARTED | builder | |
| 1 | Interview engine | NOT_STARTED | builder | |
| 2 | Results page | NOT_STARTED | builder | |
| 3 | University catalogue and home page | NOT_STARTED | builder | |
| 4 | Accounts, credits, abuse prevention | NOT_STARTED | builder | |
| 5 | Payments (eSewa, Khalti) | DEFERRED | builder | 2026-08-05 |
| 6 | Admin and super admin | NOT_STARTED | builder | |
| 7 | PWA | NOT_STARTED | builder | |

Status values: `NOT_STARTED`, `IN_PROGRESS`, `READY_FOR_QA`, `DEFECTS_OPEN`, `VERIFIED`.

---

## Open defects

Keep this table current. Closed defects move to the log below, they are not deleted.

| ID | Severity | Title | Phase | Status | Filed | Closed |
|---|---|---|---|---|---|---|
| | | *none yet* | | | | |

---

## Open proposals awaiting human decision

| ID | Author | Proposal | Filed | Decision |
|---|---|---|---|---|
| | | *none yet* | | |

---

# Log

---

## [DECISION] Project kickoff
Date: 2026-08-05
Author: human (via planning session)

The following are decided and are not open for re-litigation by either agent:

- **Pricing:** NPR 500 per month as the primary plan, with generous limits. The $1 per month tier is modelled and viable at 3 interviews plus 20 practice questions per month. Both live in a `plans` database table, not in code.
- **Speech to text:** Deepgram Nova-3, **batch mode**, not streaming. Batch is 44 percent cheaper and fast enough.
- **Trial abuse prevention:** verified Nepali phone number, plus device fingerprint, plus IP rate limit. Not Gmail. SMS through a Nepali gateway, not WhatsApp.
- **Stack:** Next.js and TypeScript, Supabase, deployed on Netlify.
- **Free trial:** one trial per verified phone number, capped at 10 of the 22 questions.
- **Build order is fixed** and is listed in `AGENT_BUILDER.md`. The interview engine is built before the home page and before accounts.

Reference documents, all of which both agents must read:

- `PROJECT_CONTEXT.md` (source of truth)
- `docs/UNIT_ECONOMICS.md` (cost ceilings that constrain every technical choice)
- `docs/COMPETITOR_ANALYSIS.md` (what to copy and what to beat)
- `docs/MVP_SPEC.md` (data model, routes, API contracts, AI prompts)
- `docs/SPRINT_48H.md` (the ordered task list)

### The two findings that matter most

1. **The competitor scores empty answers.** UniMock awarded 43.00% and wrote feedback for an answer where the transcript literally read "Your recording was too short to capture a transcript". Their scoring is keyword overlap against the question text, not comprehension. Our entire product advantage rests on not doing this. **A score without a transcript is a `CRITICAL` defect in our product, always.**

2. **The competitor auto-advances past failed transcriptions**, silently losing the student's answer. We never do this. Failure stops the flow, explains itself, and lets the student choose.

---

## [DECISION] Defer payments and SMS, keep the seams open
Date: 2026-08-05
Author: human

**eSewa, Khalti, and the Nepali SMS gateway are deferred.** Merchant approval in Nepal takes days and must not block the MVP.

Rules for both agents:

1. Payments and OTP are behind **interfaces with working stub implementations**. The application must run end to end today with no merchant account and no SMS account.
2. `lib/payments/index.ts` and `lib/otp/index.ts` define the contract. The stub grants credits or accepts any 6-digit code in development, and refuses to run when `NODE_ENV === 'production'` unless a real provider is configured.
3. No business logic outside those two files may know which provider is in use. Swapping in eSewa later is one new file plus one environment variable.
4. **Do not weaken the credit ledger or the server-side credit check** just because payment is stubbed. Those are cost controls, not payment features, and they must be real from day one.
5. Phase 5 in the status board becomes `DEFERRED`, not `NOT_STARTED`.

### Priority restated by the founder

The interview room is the product. It must replicate the real exam:

- Camera on, live preview visible to the student
- Microphone on and recording
- A live status panel showing every violation as it happens, with a running count
- The question visible on screen and spoken aloud
- The answer recorded, with the transcript appearing live
- The time limit always visible and counting down
- Progress through the paper always visible

Everything on that list is mandatory for Phase 1. None of it may be deferred.

---

## [BUILD] Phase 0 and Phase 1
Date: 2026-08-05
Author: builder (planning session)
Status: READY_FOR_QA

### What I built

- Next.js 14 App Router scaffold with TypeScript strict mode and Tailwind
- Netlify configuration and PWA manifest
- Vertical-agnostic question bank: 22 questions across the full research taxonomy, with tips, model answers, and private rubric notes
- Six seeded UK institutions with per-institution question overrides
- Swappable session store: in-memory for local development, with the Supabase adapter slot defined
- Deepgram Nova-3 **batch** adapter, with a deterministic mock provider when no key is present
- Gemini evaluator implementing the empty-transcript guard, memorisation detection, and the Nepali hint line
- Device check screen: camera, lighting, microphone with playback, connection
- **Interview room** with camera picture-in-picture, live transcript, countdown ring, progress dots, structure chips, tips carousel, and the live violation monitor
- Violation detection: tab switch, window blur, fullscreen exit, low light, face not visible, multiple faces, background noise, answer too short
- Retry flow on failed transcription, with no auto-advance
- Results page with per-question transcript, feedback, model answer, and Nepali hint
- Home page with a single primary call to action, and the university catalogue with search and filters

### How to test it

1. `cd precas-mvp && npm install && npm run dev`
2. Open `http://localhost:3000` on a laptop, and on a phone over the same network
3. Press the one button on the home page, pick a university, pass the device check
4. Answer a question normally, then confirm the transcript appears
5. **Stay silent for a full answer.** Confirm you get a retry prompt and **no score**
6. Switch browser tabs mid-answer. Confirm the violation appears in the monitor within one second and the count increments
7. Finish and check the results page

### What I did NOT build and why

- Payments and OTP: deferred by decision above. Stub interfaces are in place.
- Supabase persistence: the store interface exists and the schema is written, but the in-memory adapter is active so the app runs with zero accounts. **This is the top item for the next phase.**
- Admin and super admin portals: Phase 6, unchanged.

### Known limitations, stated honestly

1. **The in-memory store does not survive a server restart, and will not work correctly on Netlify serverless**, where each invocation may hit a different instance. This is fine for local demo and is wrong for production. Supabase must be wired before any real student uses it.
2. Question audio uses the browser's built-in speech synthesis rather than pre-generated files. It is free and works now, but the voice quality is poor and it varies by browser. Production must use pre-generated cached audio, per the cost model.
3. Face detection uses the `FaceDetector` API where available, which today means Chrome on Android and desktop Chrome behind a flag. Elsewhere it falls back to a brightness and frame-variance heuristic, which catches a dark room and an empty chair but will not catch a second person.
4. Only six institutions are seeded, and their question sets differ only in the university-specific questions.
5. The mock STT provider returns fixed sample text when no Deepgram key is set. **QA must test with a real key before signing off the feedback quality audit**, because the mock cannot exercise the real failure modes.

### Files changed

Everything under `precas-mvp/` except the four documents written in the planning session.

### Self-check results before handing over

`npx tsc --noEmit` clean. `npx next build` compiles with no errors. API behaviour exercised with curl against a running server:

| Test | Result |
|---|---|
| Silent audio, 1 KB | Refused before any paid call, `AUDIO_SILENT` |
| Oversized audio, 7 MB | Refused before any paid call, `AUDIO_TOO_LARGE` |
| Duration 200 seconds | Refused, `AUDIO_TOO_LONG` |
| Transcript too short | `evaluation: null`, no score, retry offered with a count |
| Valid answer | Scored, and the evaluation quotes the student back |
| Retry cap | Blocks on the 4th attempt with a plain-English message |
| Answer to a question outside the fixed plan | Rejected, `BAD_QUESTION` |
| Injection into the flag type | Rejected by Zod |
| Injection into the institution field | Rejected, no crash |
| Empty body, 10,000 character string | Rejected, no crash |
| Unknown session | Clean error object, results page returns 404 |
| Trial plan size | 10 questions, spread across categories, not the first 10 |

### One defect found and fixed during self-check

**Retry cap never fired.** `priorAttempts` was computed by counting answer rows for a question, but each new attempt replaces the previous row, so the count was permanently 1 and a student could retry without limit. That is a direct cost leak: unlimited retries mean unlimited transcription calls. Now read from the stored `attemptNumber`. Re-tested and it blocks correctly on the 4th attempt.

---

## [BUILD] Fix: sound check reported silence for a working microphone
Date: 2026-08-05
Author: builder
Status: READY_FOR_QA

Found by the founder during live testing, not by any automated check. Worth noting how it was found, because it is a category the API tests cannot reach.

### QA-001 | HIGH | Sound check always said "We heard nothing"

**Cause.** `components/DeviceCheck.tsx` sampled the microphone level like this:

```ts
const sampler = setInterval(() => samples.push(level), 80);
```

`level` is React state. The interval closure captured its value at the moment the button was pressed, which is near zero because the student has not spoken yet. Every one of the 37 samples was that same dead number, so the peak never cleared the threshold and the verdict was always failure.

**Why it mattered more than a normal bug.** The playback contained real speech, so the student heard themselves clearly while the screen told them we heard nothing. Two parts of the same panel contradicted each other. A student who is already nervous now believes the product is broken, and they are right to.

**Fix.** Three changes:

1. The live level is now held in `levelRef`, a ref, so any timer reads the current value rather than a frozen one.
2. The verdict is computed by **decoding the actual recording** and taking RMS over 50 ms windows. This is the authoritative measurement, and it cannot disagree with the playback because it is literally the same bytes. The ref sampling is only a fallback for browsers that refuse to decode the container.
3. Playback now starts **after** the verdict is on screen, so the two can never appear to contradict each other again.

**Also fixed while in there.**

- The recording button now shows a live countdown, and playback has its own labelled state with a stop button. The founder reported the delayed playback as disturbing. It is deliberate, but nothing on screen said so. Copy now explains it before it happens.
- Thresholds split into four outcomes instead of three: heard nothing, noisy room, too quiet, clear.
- A failed microphone check no longer dead-ends. There is a "I can hear the playback, continue anyway" path, per the rule in `PROJECT_CONTEXT.md` section 7.
- `startLightCheck` and the level-meter animation frame leaked on unmount. Both now clean up.

### QA-002 | MEDIUM | Background noise monitor could fail to connect in the interview room

Same root cause, different symptom. `InterviewRoom` passed `streamRef.current` into `useMonitor`. A ref assignment does not re-render, so the effect's dependency stayed `null` and the noise monitor only connected if some unrelated state change happened to re-render after the stream arrived. Now held in state.

### Lesson for both agents

**Any value read inside a `setInterval`, `setTimeout`, or event handler must come from a ref or a functional state updater, never from a captured state variable.** All eight remaining timers in the codebase were audited against this rule and are clean.

Typecheck and build pass after the fix.

---

## [BUILD] Fixes from the second live test
Date: 2026-08-05
Author: builder
Status: READY_FOR_QA

All four found by the founder using the product, none by automated checks.

### QA-003 | CRITICAL | The mock transcript was presented as the student's own words

With no Deepgram key set, the mock provider returned a fluent sample answer, and the interview screen displayed it under the heading "Your answer" with no indication it was invented. The founder read it and said, correctly, "I don't think I have said this."

**This is the same failure we criticise the competitor for.** UniMock scores answers it never heard. We displayed words the student never said. That it was a development convenience is not a defence, because the screen did not say so.

Three fixes:

1. The mock transcript is now prefixed `[DEMO TEXT, NOT YOUR VOICE]`.
2. `GET /api/session/[id]` returns a `demo` object reporting whether speech-to-text, the evaluator, and storage are mocked.
3. The interview screen shows a purple banner above the question whenever `demo.stt` is true, stating plainly that we are not really listening and that the transcript is sample text.

**Standing rule for both agents: no screen may ever display generated placeholder content in a position where a student would read it as their own. If a provider is mocked, the UI says so, every time, unmissably.**

### QA-004 | HIGH | The question was spoken twice, which sounded like an echo

`reactStrictMode` is on, so React invokes effects twice in development. The effect that reads the question aloud fired twice a few hundred milliseconds apart, and two overlapping utterances sound exactly like an echo. The founder reported it twice and I initially mistook it for the device check playback, which was a separate and genuine feature.

Fixed with a `spokenForRef` guard keyed on question id, plus `speechSynthesis.cancel()` before every utterance and on unmount.

Separately, the founder does not like the browser voice at all. **Auto read-aloud is now off by default**, with an explicit "Read this to me" button and an "Auto voice" toggle. Production replaces this with pre-generated natural audio per institution, which the cost model already assumes.

### QA-005 | MEDIUM | Recording state was not obvious

Pressing the microphone only changed a button label. The founder asked for something that plainly says to start answering. There is now a full-width green banner reading "Speak now. We are listening." during recording, and a matching grey panel before it reading "Read the question, then press start" with a note that nothing is recorded until they press it. Button labels changed from "Tap to start answering" and "Tap when you have finished" to "Start answering" and "I have finished answering".

### QA-006 | MEDIUM | Monitor showed "Mic Off" while recording

`getAudioTracks().length` counts tracks that have ended. Now checks `readyState === 'live' && enabled`.

### Not a defect: the session reset mid-answer

The founder was answering question 1 when the screen reset. That was the Next.js dev server hot-reloading because I edited `InterviewRoom.tsx` while he was testing. Worth recording so nobody hunts for a bug that is not there. **Do not edit source while someone is testing a flow.**

---

## [DECISION] PEE plus wrap-up is the house answer method
Date: 2026-08-06
Author: human

Every answer in this product is taught and marked against four steps, in this order:

| | Step | Meaning |
|---|---|---|
| P | Point | Answer the question directly, in one sentence. No long introduction. |
| E | Evidence | One real, checkable fact: a name, a number, a date, a module title, a place. |
| E | Explanation | Why that fact matters to the student. The step most of them skip. |
| W | Wrap-up | One sentence linking it to their plan, then stop. |

This is binding and it must be consistent in **all four places**: the chips on the interview screen, the model answers in the question bank, the evaluator prompt, and the results page. A student must see the same four words wherever they look. Do not invent a parallel framework, do not rename the steps, do not add a fifth.

The previous chips said Point, Reason, Example, Wrap-up. That is now wrong. Anything still using it is a defect.

---

## [BUILD] Noise tolerance, PEE, timer, and Netlify persistence
Date: 2026-08-06
Author: builder
Status: READY_FOR_QA

### Noise handling relaxed on purpose

The founder's point: a Nepali student practises at home. There will be a fan, a street, family in the next room. That is the normal condition, not misconduct. Flagging it repeatedly punishes them for being poor and makes the violation count meaningless, which is exactly the trap the competitor fell into with 40 violations in five questions.

Four changes:

1. Noise threshold raised from `0.045` to `0.085` on the 20th-percentile floor. A ceiling fan and distant traffic sit around 0.02 to 0.05 and now correctly pass.
2. The detection window went from 90 frames to 300, roughly five seconds. A single door slam or a passing motorbike sits at the top of the distribution and is ignored by design. Only a **continuously** loud room triggers it.
3. Cooldown from 25 seconds to 90 seconds.
4. New per-type ceiling, `MAX_PER_TYPE`. Background noise can be raised **at most twice per session**. Low light twice. Once the student has been told, telling them again adds nothing and buries the flags that matter. Integrity flags such as leaving the screen are capped far higher, because there repetition IS the signal.

Severity for `background_noise` and `low_light` dropped from `moderate` to `minor`, and the wording softened to say a little noise is fine.

### PEE plus wrap-up

Implemented in all four required places. The evaluator now returns a `pee` object with a boolean per step, and the results page renders it as four cards showing which parts were present and which were missing. When Explanation is missing the page says so explicitly, because that is the most common failure.

### Timer

A large countdown now sits in the recording banner and changes colour: green, amber under 20 seconds, red under 10. Under 10 seconds the banner text changes to "Start wrapping up. Finish your last sentence." The small timer and the webcam overlay timer both remain.

### Netlify Blobs store

**This was the blocker for any public deploy and it is now solved.** The in-memory store is wrong on serverless, where separate invocations do not share memory: a student would answer question one and then be told their session had expired.

`lib/store.ts` now has a second adapter using `@netlify/blobs`, selected automatically when `NETLIFY=true`. No external account, no extra keys, no cost at this scale. Local development is unchanged and still uses memory. Nothing outside `lib/store.ts` changed.

Supabase is still the right destination once accounts and payments exist. Blobs is what makes a shareable demo possible today.

See `DEPLOY.md` for the full deployment procedure.

### Verified

Typecheck and build clean. Live API checks: demo flags exposed correctly as `{stt:true, evaluator:true, storage:true}`, PEE breakdown returned per answer with a matching fix line, mock transcript carries the `[DEMO TEXT, NOT YOUR VOICE]` prefix, and the empty-audio guard still refuses with `AUDIO_SILENT`.

### For QA

The noise thresholds are **guesses calibrated by reasoning, not by measurement.** Someone must sit in a genuinely noisy Nepali room, with a fan and a street, and confirm that normal conditions do not trigger the flag while a television at conversational volume does. This is the single most likely thing in this change set to be wrong, and it cannot be tested from a quiet room.

---

## [DECISION] Pricing model changed: one-time packs, not subscription
Date: 2026-08-06
Author: human, from competitor screenshots

finduni.ai sells six one-time credit packs, NPR 199 to NPR 1,999. UniMock sells single interviews at GBP 1. **Neither sells a subscription**, and they are right: a student needs this product for three to six weeks and then never again. Our earlier monthly plan is cancelled.

Full teardown in `docs/COMPETITOR-PRICING.md`. Prices live in `lib/data/plans.ts` as data.

**Standing rule: never price above NPR 100 per mock interview at the mid tier.**

---

## [BUILD] Groq, three-tier backend, owner switch, pricing
Date: 2026-08-06
Author: builder
Status: READY_FOR_QA

### Speech to text moved from Deepgram to Groq

Groq runs Whisper Large v3 at **$0.111/hr against Deepgram's $0.258/hr**. Our largest cost line more than halves, and Whisper is stronger on accented English, which is our entire population.

Cost per full mock interview drops from **NPR 14 to NPR 6.3**.

We deliberately do NOT use `whisper-large-v3-turbo` at $0.04/hr. It saves about four rupees per interview and is less accurate. Mis-hearing a nervous student is not worth four rupees.

Deepgram is kept as a drop-in fallback: leave `GROQ_API_KEY` empty and set `DEEPGRAM_API_KEY`.

**New guard:** Whisper invents stock phrases when given silence, things like "Thank you" and "Thanks for watching", learned from subtitle training data. Unchecked, that would put words in a student's mouth, which is the one thing this product must never do. `isWhisperHallucination()` catches the known set and returns `silent`.

### Three-tier backend

- **Student**: unchanged.
- **Admin** (`/admin`): consultancy signs in with its own slug and passcode, sees only its own students, sets its logo and colour, gets a branded `/c/[slug]` link.
- **Super admin** (`/super`): every consultancy, every student, revenue split by source, approve and suspend, create consultancies.

### Owner switch (`/owner`)

Standard maintenance mode. What is unusual is only who holds it: `OWNER_ACCESS_KEY` is a **separate secret** from `SUPER_ADMIN_PASSCODE`. A super admin can run the entire business and still cannot see or flip this switch. Verified by test.

### The defect this batch found

**The switch was cosmetic when first built.** The layout gate hid the pages, but every API route stayed live. Someone holding a session URL could have driven the whole product while the site looked dark, and every call would still have cost money.

Fixed with `platformDown()`, checked at the top of `session/create` and `session/[id]/answer` before any paid work. Both now return 503 with the owner's contact message.

**Rule: hiding a page is not stopping a service. Any switch that is supposed to stop the product must be enforced at the API, not the view.**

### Also fixed

`next@14.2.5` carried a published security vulnerability. Upgraded to `14.2.35`. Worth noting because this project is about to be publicly reachable.

### Verified by test

| Test | Result |
|---|---|
| Super admin passcode used as owner key | **403 refused** |
| Owner key flips maintenance | works, contact name and phone stored |
| Student sees maintenance page | yes, with phone number |
| `POST /api/session/create` while down | **503** with contact message |
| `POST /api/session/[id]/answer` while down | **503** |
| Super admin still works while down | 200, by design |
| Owner page reachable while down | 200, or it could never be turned back on |
| Consultancy A logs in with B's passcode | **403 refused** |
| Pending consultancy logs in | refused with "waiting for approval" |
| Approved consultancy login | sees own students only, **passcode not returned to browser** |
| Restore | student API back to 200 |

Typecheck and build clean, 12 routes.

### Known limitation, stated honestly

When maintenance is on, the home page's serialized React payload still contains the marketing copy, because Next renders the page component even though the layout does not display it. The student sees only the maintenance screen and every API is refused, so the platform is genuinely stopped. But the HTML source is not empty. It is public marketing copy, so this is cosmetic, and moving the check into middleware would close it if we ever care.

---

## [BUILD] Response to the deployed-site audit
Date: 2026-08-10
Author: builder
Status: READY_FOR_QA

QA's report is accepted in full. LIVE-002 and LIVE-003 were mine and both were serious. Fixed and proved by test.

### LIVE-003 CLOSED, trial bypass

`POST /api/session/create` accepted `isTrial` **from the request body**. Anyone could post `{"isTrial": false}` and receive a full 22-question session. Unlimited free transcription at our expense.

The body now carries **no authority fields at all**, only which university. Entitlement is read from the plan table on the server. Verified: posting `isTrial:false, mockInterviews:99, maxQuestionsPerMock:22` returns **10 questions**.

### LIVE-002 CLOSED, public session and results

Every session read was unauthenticated. A results page carries the student's own words about family income, visa refusals and finances. A UUID is unguessable, not secret: it travels in URLs, browser history, screenshots and WhatsApp.

Added an HTTP-only anonymous owner cookie, issued at creation and recorded on the session. Every read and write compares it. No login required, so the no-account funnel survives.

Non-owner responses are **404, not 403**, so the endpoint cannot be used to confirm a session id exists. Sessions created before this fix have no owner and are now permanently unreadable, which also closes the leaked QA sessions.

| Endpoint | Stranger | Owner |
|---|---|---|
| `GET /api/session/{id}` | 404 | 200 |
| `GET /results/{id}` | 404 | 200 |
| `POST .../complete` | 404 | 200 |
| `POST .../flag` | 404 | 200 |
| `POST .../answer` (costs money) | 404 | 200 |

### LIVE-009 CLOSED, coaching on answers we never heard

With zero audible answers the summary still praised the student and advised them not to "sound memorised". **That is the same fabrication we attack the competitor for**, arriving through the summary instead of the scorer.

`subScores` are now `number | null`. Null means **not assessed** and renders as "Not assessed", never as zero. Only `interviewBehaviour` survives, because it is observed rather than heard. Strengths and next steps are branched: with nothing transcribed the student is told plainly that there is nothing to judge yet and how to fix their microphone.

### LIVE-005 CLOSED, dependency advisories

`npm audit --omit=dev` reported 2 high-severity findings on Next 14.2.35. Upgraded to **Next 16.3.0 with React 19**. Audit now reports **0 vulnerabilities**.

Not forced blindly, as QA required. The migration needed real changes: `cookies()` is now async, route `params` is now a Promise in all five dynamic routes, and React 19 tightened `RefObject` nullability. Typecheck and build both clean, all 16 routes present.

### LIVE-006 CLOSED

`/universities?q=BPP` now initialises the search field from the URL. The component is wrapped in `Suspense`, which `useSearchParams` requires.

### LIVE-007 CLOSED

The live microphone meter said "Loud and clear" while the verdict said "We heard nothing", because one reads the live input and the other reads the finished recording. Once a verdict exists it is now the only voice on that panel.

### Overclaims I made, corrected

1. **"Groq is better at accented English."** Asserted without evidence. QA was right. The *price* is verified, the *accuracy* is not. Corrected in `docs/MONEY.md` and in the code comment, and reframed as a cost decision only until a real Nepali-accent benchmark is run. Deepgram remains one environment variable away.
2. **"60% cheaper for the same thing."** Compared our 12 mocks against their 14. The pricing page now compares **price per mock** in a table, carries the 6 August 2026 source date, and tells the student to check competitor prices themselves.
3. **"No other Nepali platform lets you try before paying."** A competitor now offers a free first attempt. Claim removed.

### Still open, needs the client not the builder

- **LIVE-001**: `GROQ_API_KEY` and `GEMINI_API_KEY` must be set in Netlify. No code change can fix this.
- **LIVE-004**: the deployed site is an old revision. Needs a redeploy from current `main`, plus the approved six universities and the two approved packs.
- **LIVE-008**: scroll reset on stage change, not yet done.
- **LIVE-010**: PWA icons still 404. Needs real icon files.
- Six university SVGs supplied by QA are **not yet wired into the UI**. Ravensbourne stays pilot-only until logo permission is granted.
- **`components/InterviewRoom 2.tsx`** is an iCloud conflict copy sitting in the repo. I cannot delete it: the folder denies writes. **It must be deleted by hand** or it will be compiled and deployed.

### Root cause worth naming

The iCloud-synced folder has now caused: an unwritable `.git/config` that pushed to the wrong GitHub account, four-minute cold starts, an undeletable duplicate source file, and repeated permission failures. **Move the project out of iCloud before the pilot.**

---

## [QA] Phase 0 and Phase 1 review
Status: NOT_STARTED

*QA agent: your first entry goes here. Use the template in `AGENT_QA.md`.*

Start with these, in this order:

1. **Test with a real Deepgram key.** The mock provider cannot reproduce Nepali-accented English failures, and the feedback quality audit is meaningless without it.
2. **iOS Safari microphone recording.** Highest-risk environment in the product. `MediaRecorder` support and codec selection differ from Chrome.
3. **The in-memory store on a deployed Netlify URL.** It is expected to fail there. Confirm how it fails and how visible that failure is to a student, because that determines how urgent the Supabase work is.
4. **The five second test** on the home page, the interview room, and the results page.
5. **Vocabulary check** on every student-facing string. The target reader has weak English.

---

## [QA] Senior MVP, market, content, security, and release audit
Date: 2026-08-10
Author: Codex QA/product analyst
Status: DEFECTS_OPEN — **not ready for a public or paid pilot**

### Scope and evidence

- Reviewed all 58 repository files, the active uncommitted developer changes, the Git/GitHub state, and all 42 supplied product images (39 in `screenshot/` plus three root images).
- Used official UKVI, HESA, university, Nepal telecom/privacy, and current competitor sources. Competitor claims are treated as claims, not independently verified outcomes.
- The deployed product could not be tested because the exact Netlify URL is not in the repository, GitHub deployment metadata, or local Netlify configuration. **No deployed behaviour is VERIFIED.**
- The GitHub remote contains the 2026-08-06 base commit; the newer routes, pricing, platform backend, and speech changes are local uncommitted work. They may not be what users currently see.

### Executive verdict

The opportunity is real and the transcript-first product principle is strong. The current build is trying to launch a student product, consultancy platform, super-admin system, pricing system, proctor, PWA, and AI readiness score at once. The one-week MVP should instead prove one outcome:

> A Nepali student can answer a verified credibility-interview theme aloud, see an accurate transcript, and receive specific coaching based on their own true application facts.

The product should win on **trust, specificity, and time-to-first-useful-feedback**, not on university count, pseudo-proctoring, or an unvalidated pass/readiness percentage.

### What the market evidence says

1. **Demand exists, but this is not a TAM calculation.** HESA reports 17,385 Nepalese entrants to UK higher education in 2024/25, more than ten times 2020/21. That is market context; it is not proof that every entrant needs or will buy a pre-CAS tool. Source: [HESA, 27 January 2026](https://www.hesa.ac.uk/news/27-01-2026/uk-he-student-numbers-fall-second-year-in-a-row).
2. **Mobile and social distribution are plausible.** DataReportal estimates 16.6 million internet users and 14.8 million social-media user identities in Nepal in October 2025. These are estimates and identities are not unique people. Source: [Digital 2026: Nepal](https://datareportal.com/reports/digital-2026-nepal). NTA reported 26.36 million 4G subscriptions at end-December 2025; subscriptions are not unique users. Source: [NTA MIS, Paush 2082](https://nta.gov.np/uploads/contents/NTA_MIS_%202082%20Paush.pdf).
3. **The previous competitor gap is stale.** UniMock now advertises a free first attempt per university and 100+ institutions. “We alone offer a free try” is no longer defensible. Source: [UniMock current Pre-CAS page](https://unimock.ai/pre-cas-interview).
4. **A direct Nepal competitor exists.** finduni.ai advertises its Tankey practice product from NPR 199 and leads with a seven-minute, one-question urgency narrative. Source: [finduni.ai](https://finduni.ai/).
5. **B2B operational value is credible but sales uplift is unproven.** Enroly’s vendor-authored Kingston case study reports reduced administration and clearer applicant journeys after automated interviews. It does not prove student conversion or visa outcomes. Source: [Enroly/Kingston case study, 24 July 2026](https://www.enroly.com/blog/how-kingston-university-streamlined-the-journey-from-offer-to-cas-with-cas-shield).
6. **No credible public Indian case study specific to AI pre-CAS practice was found.** Indian AI job-interview tools show useful category patterns—one free attempt, immediate feedback, and institution partnerships—but they are adjacent evidence, not proof for this product.

### Verified question/content model

UKVI does not publish a fixed question script. Current caseworker guidance assesses the whole application and interview on immigration history, education history and gaps, course/institution research, academic progression, study and post-study plans, living arrangements, finances, and English. It explicitly says a caseworker must not refuse someone merely for weak knowledge of bus routes or local geography. Source: [Student and Child Student caseworker guidance, updated 26 March 2026](https://www.gov.uk/government/publications/points-based-system-student-route/student-and-child-student-accessible).

| Seed institution | Officially supported public evidence | Content decision |
|---|---|---|
| BPP | Microsoft Teams, camera on; why BPP, academic/career aspirations, readiness for UK study. [BPP](https://www.bpp.com/study/international-students/applying-for-a-visa) | Supported themes; no claim that the current 22 are exact BPP questions. |
| Coventry/CU London | Live online interview about 45 minutes with ID check; university publishes common-question guidance. [Coventry](https://www.coventry.ac.uk/student-central/cul/before-you-start/credibility-interviews/) | Format claim is supported; question pack still needs per-item source mapping. |
| UEL | CAS Shield checks; published topics include previous studies, why UEL/course/UK, study gaps, and future plans. [UEL](https://www.uel.ac.uk/visa-immigration-advice/student-visa) | Strong source for themes, not an exact recorded sequence. |
| Roehampton | Public page describes a UKVI credibility interview of 5–10 minutes and broad themes. [Roehampton](https://www.roehampton.ac.uk/student-support/international-students/visas-and-immigration/student-visas/) | Current row must not present this as a verified Roehampton pre-CAS format. |
| UWE Bristol | CAS Shield recording for most applicants or a live regional interview; course, education/work, UK choice, and future plans. [UWE](https://www.uwe.ac.uk/courses/international-study/visas/applying/pre-cas-interviews) | Strongest current university-specific source in the seed set. |
| ARU | No current official ARU page confirming the product’s stated format was found. An older ARU College guide exists but is not enough for a current ARU claim. | Mark `evidence pending`; do not market as university-specific yet. |

Required data model for every published question pack: `sourceUrl`, `sourceTitle`, `sourceAccessedAt`, `evidenceLevel` (`official-theme`, `official-example`, `client-observed`, `unverified`), `reviewedBy`, and `reviewedAt`. Client-observed questions must be anonymised and never described as official.

### Open release blockers

| ID | Severity | Finding and evidence | Required outcome |
|---|---|---|---|
| AUDIT-001 | CRITICAL | Unlimited paid-call exposure: `checkCredits()` always allows; `POST /api/session/create` trusts client `isTrial`, so any caller can request a full session; there is no phone, account, device, IP, or global rate limit (`lib/credits.ts:27-33`, `app/api/session/create/route.ts:12-65`). | Server owns entitlement. Add a signed/HTTP-only session token, trial ledger, per-IP/device/phone limits, and provider-cost circuit breaker. Client must never choose paid/trial entitlement. |
| AUDIT-002 | CRITICAL | Session UUID is the only access control. Anyone holding a session URL can read transcripts/results and post answers; there is no ownership token (`app/api/session/[id]/route.ts:13-55`, answer route). | Bind every read/write to an unguessable session secret stored in an HTTP-only cookie or an authenticated user. Return no transcript or result without it. |
| AUDIT-003 | CRITICAL | “Questions this university asks” is false: every question has `institutionId: null`; only university/city placeholders change (`lib/data/questions.ts:326-351`, `app/(student)/universities/page.tsx:60-63`). | Change copy immediately to “based on published credibility themes,” then ship only source-mapped packs. |
| AUDIT-004 | CRITICAL | Scores and labels are not validated. “English clarity” equals content score; “genuine intent” is content score minus an AI memorisation flag; one answered question can produce a high “ready” result (`lib/summary.ts:22-51,90-110`). | Rename to **practice feedback score** or remove the percentage. Never predict CAS/visa readiness. Require a minimum completion rate for any overall label. |
| AUDIT-005 | HIGH | The system has no student facts (course, intake, modules, fees, deposit, sponsor, funding, history), so it cannot check truth or cross-answer consistency. Generic model answers contain placeholders. | Add a small “facts card” before the full mock and compare answers only with user-provided facts; never invent a fact. |
| AUDIT-006 | HIGH | AI JSON is cast and normalised without schema/semantic validation; invalid bands and empty feedback can reach results (`lib/ai/evaluate.ts:128-163`). | Parse with a strict Zod schema, reject invalid enums/empty required fields, retry once, then show “review unavailable”—never a fabricated fallback. |
| AUDIT-007 | HIGH | Test/practice mode is stored but unused. The only entry creates `mode: test`, while the “real interview” screen exposes tips and PEE prompts during answering. | Make modes honest: test hides coaching until results; practice allows tips/retries. If only one ships, call it guided practice, not a real exam. |
| AUDIT-008 | HIGH | Privacy is not release-ready: transcripts, education, immigration, and finance details are personal data; there is no retention period, deletion control, policy page, recorded consent, or consultancy-sharing choice. | Publish a plain-language policy, record consent version/time, set deletion/retention, provide delete request flow, and keep consultancy sharing opt-in. Nepal’s Privacy Act requires consent for collecting personal data and use for the stated purpose. Source: [Nepal Law Commission, Privacy Act 2075](https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/statutes-acts/%E0%A4%B5%E0%A5%88%E0%A4%AF%E0%A5%8D%E0%A4%A4%E0%A4%BF%E0%A4%95-%E0%A4%97%E0%A5%8B%E0%A4%AA%E0%A4%A8%E0%A5%80%E0%A4%AF%E0%A4%A4%E0%A4%BE-%E0%A4%B8%E0%A4%AE%E0%A5%8D%E0%A4%AC%E0%A4%A8%E0%A5%8D/). Obtain Nepali legal review before launch. |
| AUDIT-009 | HIGH | Consultancy passcodes are plaintext, four characters are allowed, admin/owner secrets are sent in request bodies, no auth endpoint is rate-limited, and super overview returns full consultancy objects including passcodes (`lib/platform.ts:12-30`, `app/api/platform/route.ts:30-115`). | Keep admin/super/owner hidden from MVP or replace with hashed credentials, server sessions, least-privilege responses, rate limits, and audit logs. Never return stored credentials. |
| AUDIT-010 | HIGH | Dependency state is inconsistent: `package.json` declares `next ^14.2.35`, but the lockfile and installed version remain 14.2.5. Current production-dependency audit reports one critical and one high vulnerability group, and a clean install is not deterministic while manifest and lock disagree. | Update and commit the lockfile intentionally, install from it, audit again, and test the supported upgrade. Do not describe the upgrade as complete until `npm ci` installs the declared version. |
| AUDIT-011 | HIGH | Audio duration is client-supplied; a caller can lie about it. MediaRecorder construction/start is not caught; “Continue anyway” after permission failure leads to another compulsory media request; toggling auto-voice resets phase due to effect dependencies (`lib/credits.ts:35-57`, `components/DeviceCheck.tsx:323-340`, `components/InterviewRoom.tsx:153-168,223-251`). | Verify actual media duration server-side, handle recorder/codec errors, remove the dead-end override, and prevent settings from changing recording state. Test real iOS Safari and low-end Android. |
| AUDIT-012 | HIGH | Pricing and provider messages conflict: home says NPR 500/month; current pricing data says one-time packs; source-of-truth started with Deepgram while code now prefers Groq. No Nepali-accent benchmark proves the provider switch. | One approved offer and one approved STT provider. Select STT with a blinded accent/noise benchmark, not vendor/secondary claims. Make all pages/docs/env examples match. |
| AUDIT-013 | HIGH | Release automation can overwrite work: `PUSH-NOW.command` force-pushes to `main`; all three scripts stage/commit broad working-tree changes, and one deletes Git lock files. | Quarantine these scripts. Release only from a reviewed branch/PR with explicit file scope, clean install, tests, preview deploy, QA sign-off, then production promotion. |
| AUDIT-014 | MEDIUM | PWA is advertised but manifest icons do not exist and there is no service worker/install flow. Search query links do not prefill the catalogue. A stale duplicate `InterviewRoom 2.tsx` remains. | Remove untrue PWA claims for the week. Fix the funnel query and delete/resolve the duplicate after confirming it is unused. |
| AUDIT-015 | BLOCKED | Current typecheck did not complete: repeated direct runs produced no diagnostics within 50–60+ seconds and were stopped. Build and deployed-browser checks were therefore not proven on the active dirty tree. | Diagnose the TypeScript hang, make `npm ci && npm run typecheck && npm run build` deterministic, then run deployed end-to-end QA. |

Positive findings to preserve: the server rejects very small/empty audio before STT; failed transcription does not receive a score or auto-advance; retry cap is server-side per question; paid calls are preceded by guard functions; the UI clearly marks mock transcript mode; no obvious committed API keys were found by pattern search.

### One-week MVP order of operations

Do this in order. Do not expand scope until the release gate passes.

1. **Day 0 — freeze decisions and release path.** Client answers the questions below. Record one pricing decision, one STT decision process, one primary customer, the exact pilot universities, data policy owner, live URL, and release deadline. Work from a branch/PR; preserve the current dirty tree.
2. **Day 1 — close cost and privacy exposure.** Server-owned trials, signed/HTTP-only session access, rate limits, provider budget ceiling, actual-duration validation, no public transcripts, consent record, retention/deletion rule. Hide admin/super/owner and disabled checkout unless secured.
3. **Day 2 — make content truthful.** Add the student facts card; change “exact/university questions” claims; publish a sourced generic UKVI core plus at most three evidence-backed university overlays. Correct the city/geography rubric to match current UKVI guidance.
4. **Day 3 — make evaluation honest.** Strict AI response schema; no score on invalid output; no pseudo English/intent scores; minimum completion rule; separate guided practice from test; user can replay/re-record in practice but cannot edit facts into a test result.
5. **Day 4 — make the interview reliable.** Fix recorder/voice state bugs, resume progress, completion error handling, permission dead ends, Safari/Android codecs, slow upload recovery, and accessibility at 360 px. Replace false device messages such as “We can see you” unless face presence is truly detected.
6. **Day 5 — instrument and test.** Events: `landing_view`, `university_selected`, `session_created`, `permission_result`, `first_recording_started`, `first_answer_uploaded`, `first_feedback_seen`, `session_completed`, `retry_reason`, `return_visit`. Never send transcript/finance/immigration text to analytics. Add API abuse/auth tests and a real consented accent/noise test set.
7. **Day 6 — controlled pilot.** Observe 5–10 target students and two consultancy staff using the deployed preview on their own phones. Record funnel drop-off and comprehension, not just opinions. Fix all Critical/High issues; do not add features.
8. **Day 7 — release gate.** Clean install, typecheck, build, production dependency audit, Chrome/Firefox/iOS Safari/Android checks, provider budget alarm, privacy copy, rollback test, preview sign-off, then production promotion. Any open Critical/High item means no public launch.

Explicitly deferred from the one-week MVP: live payments, consultancy/super-admin dashboards, PWA/install, 100-university catalogue, PDF/social sharing, avatars, perfect proctoring, and automated visa/CAS prediction.

### Conversion and marketing recommendation

The Amazon-style “one button” for this product is a hypothesis to test, not a fact:

> **Start one free question** → speak for 60 seconds → immediately see “what we heard” and one specific correction → verify phone and complete facts card to unlock the remaining trial.

This delays registration until after value while retaining abuse control after the sample. Run it against the existing phone-first flow. The success metric is `first_feedback_seen / landing_view`; guardrails are paid-call cost, abuse rate, and transcript-error rate.

Launch positioning: **“Practise your own true answer. See exactly what we heard. Fix one thing at a time.”** Do not lead with AI, proctoring, a pass promise, or “real questions.” Use English interview UI with short Nepali coaching/explanations.

Initial acquisition should be a consultancy-led pilot plus short consented before/after demonstrations on Facebook/Messenger/Instagram. Do not buy broad traffic until at least the first-answer and first-feedback funnel is measured. Pricing should be tested with real pilot willingness-to-pay; competitor price is an anchor, not proof of the correct price.

### Proposed release scorecard

| Outcome | MVP measure |
|---|---|
| Activation | Landing → first feedback seen |
| Technical success | Recording started → valid transcript returned |
| Product value | Student can state the correction they need after one answer |
| Completion | Started full trial → completed trial |
| Learning | Second attempt improves human-reviewed specificity/consistency |
| Retention | Returns for another practice within 7 days |
| Commercial signal | Pilot student/consultancy states a price and agrees to pay, not only “likes it” |
| Guardrails | Cost/session, STT material-error rate, invalid AI output rate, abuse rate, deletion requests, support incidents |

### Client decisions required once, before Day 1

1. What is the exact production Netlify URL, and may QA create/deplete test sessions there?
2. For this one-week release, who is the primary buyer: an individual student or a consultancy? Choose one; the other is secondary.
3. Which three universities and courses make up the real current Nepal pipeline? Provide official emails/guides and anonymised observed questions, if available.
4. Does the 2026-08-06 one-time-pack decision remain final? If yes, which single launch pack/price is approved?
5. May QA benchmark Groq and Deepgram using consented Nepali-accent recordings, and what is the maximum test/API budget?
6. Approve or reject the one-question-before-phone experiment. If rejected, confirm that phone verification remains before any paid STT call.
7. How long may transcripts be retained, may consultancies see them, and who owns privacy/legal approval and deletion requests?
8. Name the 5–10 pilot students and two consultancy staff, including the device mix they will use. Do not put sensitive recordings or credentials in this file.
9. Confirm the public brand/domain and whether Nepali explanation alongside English interview content is approved.
10. What exact date/time ends “one week,” who can approve production, and must all developer work move through a PR before Netlify production deploy?
11. Provide access through the existing project accounts/environment—not passwords in chat—to Netlify deploy logs and production configuration needed for QA.
12. Are real payments required in this week? Recommended answer: no; use a manually granted pilot entitlement until the core interview is verified.

---

## [DECISION] Launch direction confirmed by the client
Date: 2026-08-10
Author: human (captured from the client's written response)

These decisions supersede the earlier monthly-price and Deepgram decisions:

- **Commercial model:** student-facing product, initially distributed and piloted through the 40% shareholder's consultancy and consultancy network.
- **Launch universities:** BPP University, University of East London, University of West London, University of Wolverhampton, Ravensbourne University London, and Coventry University.
- **Retail offer:** one-time packs only. Public launch cards are **6 mocks for NPR 449** and **12 mocks for NPR 799**. Hide the unconfirmed Starter and Pro cards for now.
- **Trial:** one free trial containing 10 questions with feedback.
- **Speech provider:** Groq Whisper is the intended production STT provider, subject to a real Nepali-accent/device benchmark.
- **Payment sequence:** static QR plus manual verification first; eSewa merchant integration after the pilot.
- **Pilot sequence:** QA first, founder second, shareholder third, then a controlled group of real students and consultancy staff.
- **Target devices:** phone-first. iPhone Safari and Android Chrome are mandatory; students must be able to add the product to their Home Screen.
- **Data visibility:** students keep their own answer history. Admins need engagement and entitlement status, not student transcripts by default. Super admin manages the operational privacy/deletion process.
- **Release authority:** founder and client stakeholders approve production. Netlify deploy/configuration access can be arranged through the existing project account.
- **Timeline:** aim for a private pilot within one day. The remaining week is for security hardening, manual payment, and wider pilot readiness.

The “honour switch” remains required at both UI and API levels. It is an emergency control, not a substitute for a written shareholder/IP/operations agreement.

---

## [QA] Deployed-site audit, launch controls, and one-day release cut
Date: 2026-08-10
Author: QA agent
Status: DEFECTS_OPEN
Environment tested: <https://precasmvp-umanga.netlify.app/>

The client authorised creation and consumption of test sessions. QA exercised the landing page, university search, consent/device flow, a BPP trial, recording failure, early finish, results, direct session read, and direct session creation. Mobile testing used a real 390 x 844 browser viewport.

### Release verdict

**Do not accept payment or invite real students on the current deployment.** A private founder/QA pilot can start after the first five critical gates below pass. A public paid release is not a credible one-day change while the deployed application still exposes sessions and cannot transcribe speech.

### What works and should be preserved

- The mobile landing page is visually strong and did not overflow horizontally at 390 px.
- Empty/unheard audio did not receive a numeric score.
- The result layout is readable on a phone.
- Security headers include HSTS, 'X-Frame-Options: DENY', 'nosniff', and a camera/microphone Permissions Policy.
- The local dependency was raised to Next.js 14.2.35, removing the earlier critical advisory. It is not fully clear: the current production-only audit still reports two high-severity dependency findings.

### Deployed blockers

| ID | Severity | Deployed evidence | Required acceptance condition |
|---|---|---|---|
| LIVE-001 | CRITICAL | Interview banner states production has no STT key, says it is “not really listening,” and still tells the operator to add Deepgram. A recorded answer returned “Something went wrong while listening.” | Configure 'GROQ_API_KEY' and evaluator key in Netlify, redeploy, then obtain valid transcripts from iPhone Safari and Android Chrome. No mock/demo text in production. |
| LIVE-002 | CRITICAL | An unauthenticated 'GET /api/session/{id}' returned the session and result data. The public result URL returned 200. | Bind every session read/write/result to a logged-in owner or an HTTP-only session secret; return 401/404 without it. Rotate/delete QA sessions after fixing. |
| LIVE-003 | CRITICAL | An unauthenticated create request with browser-controlled 'isTrial:false' created a 22-question session. Returned questions still had 'institutionId:null'. | Server selects plan, trial length, credits, and university pack from authenticated entitlement; ignore browser authority fields. |
| LIVE-004 | CRITICAL | The deployed home page still advertises NPR 500/month and the old six-university set. It is not the client-approved offer or launch list. | Deploy the approved one-time offer and six launch universities; show build SHA/time in super-admin so QA can prove which revision is live. |
| LIVE-005 | CRITICAL | Next.js 14.2.35 remains inside multiple current advisory ranges; 'npm audit --omit=dev' reports two high-severity production dependency findings. | Upgrade to a supported patched Next.js line, run typecheck/build/audit, and regression-test Netlify routing. Do not auto-force a major upgrade without this test. |
| LIVE-006 | HIGH | '/universities?q=BPP' leaves the search field blank and displays all cards. | Initialise search from the URL or remove the query-link promise. |
| LIVE-007 | HIGH | Device UI simultaneously showed “We heard nothing,” “Loud and clear,” and an enabled Start button after silent playback. | One source of truth: failed microphone playback cannot pass or enable Start; offer retry and accessible troubleshooting. |
| LIVE-008 | HIGH | On mobile, the interview retained the device page's scroll position; the question heading began under the sticky header. | Scroll to the interview start on stage change and verify heading/focus is visible at 320, 375, 390, and 430 px. |
| LIVE-009 | HIGH | With zero audible answers, results still said the student stayed on screen and advised adding specifics/not sounding memorised. | Only derive coaching from successfully transcribed answers and observed events. Show “not assessed” for all other dimensions. |
| LIVE-010 | HIGH | PWA manifest is live, but '/icon-192.png', '/icon-512.png', and '/sw.js' return 404. There is no install prompt/instruction flow. | Add valid maskable icons and Apple touch icon; add install UX; verify Android installation and iPhone Add to Home Screen. Offline mode may remain deferred. |

### Truthful pricing copy

- NPR 449 is 43.8% below NPR 799, but the current evidence compares our **6 mocks** with FindUni's **5-mock** NPR 799 pack. Say “6 mocks for NPR 449” and show per-mock value; do not call it the same pack.
- NPR 799 is 60.0% below NPR 1,999, but the captured FindUni pack has **14 mocks**, not 12. Do not use “60% cheaper for the same thing.”
- FindUni's current public page independently supports only “sessions from NPR 199.” Its detailed tiers are based on checkout screenshots dated 2026-08-06 and must carry that date.
- The claim “we give 10 free questions and the competitor gives 5” is not presently evidenced. UniMock now advertises a free first attempt per university. Remove “twice the competitor” until a dated primary-source checkout proves it.
- The current direct competitor already operates as **FindUni** in Nepal. Do not launch as “FindUni Nepal”: it creates avoidable customer, search, and brand confusion and may create legal risk. Recommended working name: **Mero CAS Practice**, endorsed as “by Mero Test Booking,” initially on the Netlify URL or 'cas.merotestbooking.com'.

### One-day private-pilot cut, in order

1. **Keep honour mode closed.** Deploy current code to a preview first, expose build SHA/time, and verify the API also returns 503 when closed.
2. **Close access and credit leaks.** Session ownership, server-owned 10-question trial, real credit debit, API/body limits, per-route rate limits, and no public results.
3. **Make the core product real.** Configure Groq/Gemini through Netlify environment settings, remove old Deepgram/demo copy, and pass a successful transcript-to-feedback run on two phone browsers.
4. **Make the offer truthful.** Only the two approved packs; correct six universities; “based on published credibility themes,” not “the exact questions this university asks.”
5. **Add minimum consent/privacy.** Consent version/time, plain retention/delete statement, processor disclosure, and no admin transcript visibility by default.
6. **Fix phone blockers.** Microphone state contradiction, scroll reset, visible retry, missing PWA icons, and Safari/Chrome install instructions.
7. **QA gate.** Run one full QA session, one founder session, and one shareholder session. Record browser/device, transcript failures, material fact errors, time to first feedback, support issues, and cost.

Anything not in those seven steps is deferred from the one-day private pilot: live payment automation, large admin dashboards, 100+ university catalogue, avatars, PDFs, detailed proctoring, and broad marketing.

### Manual QR payment design that blocks screenshot reuse

A screenshot is evidence submitted by the buyer; it is never proof of payment.

1. App creates a unique order before showing QR: 'orderId', account, pack, exact amount, receiver name, created time, and expiry.
2. Student pays and submits the wallet's transaction/reference ID plus payer name/number suffix. Receipt image is optional supporting evidence.
3. A unique database constraint prevents one transaction ID being claimed twice. One order can credit only one account, atomically.
4. Verifier opens the **receiver's official wallet/bank ledger**, not WhatsApp, and matches transaction ID, recipient, exact amount, and timestamp.
5. States are 'created -> submitted -> verified | rejected | expired'; store verifier ID, time, reason, and before/after credits in an append-only audit log.
6. WhatsApp is support only. It must not be the approval channel or source of truth.
7. Until ledger access can be safely delegated, only super admin approves retail QR payments. Consultancy admins receive pre-purchased seat codes/credits and cannot verify payments into the owner's wallet.
8. After eSewa merchant approval, replace manual proof with signed booking/callback plus server-side status verification. eSewa's own documentation requires a unique transaction UUID/signature and recommends status verification to filter fraudulent transactions: <https://developer.esewa.com.np/pages/Epay>.

### Trial abuse controls

No control can stop a determined student from borrowing every relative's phone. The correct goal is to make abuse measurable and uneconomic without blocking a consultancy's shared Wi-Fi.

- One 10-question trial per verified phone, enforced by the server.
- A signed device token plus HMAC of normalised phone for duplicate detection; do not trust Gmail or browser 'isTrial'.
- Soft velocity limits: start with 3 new trials per IP/day and 10/week, plus stricter per-device limits. Whitelist known pilot/consultancy networks; never block on IP alone.
- CAPTCHA/extra OTP only when risk signals combine: repeated devices, many phones, fast account creation, or repeated failed uploads.
- Enforce 90-second recording, three retries, payload/duration validation, and provider spend limits before every paid call.
- Give super admin a reasoned manual override and an abuse report; do not silently punish a legitimate household.

### Data and privacy recommendation

The business—not the “super admin” software role—is accountable for the policy. The founder may operate it, but the privacy notice must name the responsible business/contact and the vendors processing audio/transcripts.

- Delete raw audio immediately after successful transcription; do not retain it for admin playback in the MVP.
- Keep student-visible transcripts/feedback for **90 days after last activity** as a provisional product rule, with earlier self-delete/request and a scheduled deletion job. Obtain Nepali legal review before making this final.
- Consultancy view: name/ID, entitlement, question count, last active, completion, and technical failure state. Transcript/answer content is off by default and shared only through explicit, revocable student consent.
- Super admin gets aggregate funnel/cost/abuse metrics and operational access for support; every exceptional transcript access is audited.
- Never send transcript, course/finance/immigration answers, phone, or receipt content to analytics logs.
- The Privacy Act 2075 requires consent and purpose-bounded personal-data use; the earlier source remains the Nepal Law Commission text. Add processor/overseas-processing disclosure and a clear deletion contact.

Text storage is not the immediate scaling risk; uncontrolled access and indefinite retention are. A transcript/feedback session is small compared with audio. Keep lifecycle controls even if database storage is cheap.

### Test and API budget set by QA

Use **NPR 1,500 as the hard API ceiling for the complete controlled pilot**, with an alert at NPR 750 and provider-level hard stops. This is intentionally conservative: at the developer's current NPR 6.3 full-mock estimate, 50 complete mocks cost about NPR 315 before contingency. Track Groq and evaluator costs separately because NPR 6.3 is a model, not a measured invoice.

Benchmark before choosing on quality:

- At least 50 consented recordings across iPhone Safari and Android Chrome; include quiet room, fan, street/family noise, 30/60/90 seconds, and multiple Nepali English accents.
- Blind the provider/model name during transcript review.
- Record transcript success rate, latency, material errors in names/course/fees/dates/numbers, and hallucinated words.
- Groq's current official page confirms Whisper Large v3 at USD 0.111 per transcribed hour and a 10-second minimum: <https://groq.com/pricing>. It does **not** prove better Nepali-accent accuracy. Remove that unsupported claim from 'docs/MONEY.md' until measured.

### Phone and Home Screen acceptance

- Android Chrome: install prompt or clear “Install app” action, maskable icon, standalone relaunch, microphone/camera recheck.
- iPhone Safari: visible steps **Share -> Add to Home Screen -> Open as Web App -> Add**; Apple documents this manual flow at <https://support.apple.com/en-gb/guide/iphone/iphea86e5236/ios>.
- WhatsApp/Facebook in-app browser: show “Open in Safari/Chrome” before permissions or payment; do not assume PWA install or reliable recording inside the in-app browser.
- Test incoming call/interruption, locked screen, permission denial/recovery, slow 4G, and 90-second upload.

### University logo delivery

Six SVGs and their source/hash register are in 'public/university-logos/'. They were captured from the universities' current official sites; no mark was redrawn. They are third-party trademarks, not partnership assets. Do not recolour or imply endorsement. Ravensbourne's press page explicitly says its official logo is supplied by its communications team, so keep that mark pilot-only until written permission: <https://www.ravensbourne.ac.uk/information/press-and-media>.

### Inputs still required only when their stage begins

- For QR release: the approved QR image, receiver display name, receiver wallet/bank, and the super-admin verifier with official ledger access. Do not put wallet credentials in this repository or chat.
- For real-user pilot: consented tester list and device mix, collected privately.
- For production QA: Netlify deploy logs/build SHA and environment-variable presence through the existing account; never send secret values.
