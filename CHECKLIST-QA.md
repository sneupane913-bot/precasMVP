# QA checklist — what must be confirmed EVERY time

**This is a release gate, not a to-do list.** The developer checklist gets ticked
once and moves on. This one is run again from the top on every single release,
forever, because the whole point is catching the thing that used to work.

Nothing here is ticked from reading code. Every line means *somebody ran it and
watched it happen*. If you cannot run it, write "NOT RUN" — never a tick.

**Owner of this file:** whoever is acting as QA that day.
**Run it against:** the deployed site for a release, or a local dev server for a
work-in-progress check. Say which one at the top of your report.

---

## Gate 0 — before you believe any result

These four traps have each produced a false result in this project already. Check
them first or you will debug the wrong thing.

- [ ] Q0.1 The test mirror has **no `.env.local`**. With real Firebase config present the `dev:` sign-in token is correctly refused, and every assertion downstream fails for the wrong reason.
- [ ] Q0.2 The server is `next dev`, **never `next start`**. `next start` sets NODE_ENV=production, which correctly disables the dev sign-in token.
- [ ] Q0.3 You are not tripping the rate limiter. Auth is **5 attempts per IP per 5 minutes**. More than five super-admin or admin calls from one address and the sixth returns 429, which then breaks an unrelated assertion. Vary `x-forwarded-for`.
- [ ] Q0.4 If asserting on rendered HTML, **strip comments and tags first**. React inserts `<!-- -->` between adjacent text nodes, so `body.includes("NPR 449")` is a false negative.
- [ ] Q0.5 You know which commit is live. Compare the SHA in super admin against the SHA you think you are testing. A "fixed" defect that reappears is usually an old build.

---

## Gate 1 — automated, must be 100% green

A single failure here stops the release. There is no "known failure" list.

- [ ] Q1.1 `npx tsc --noEmit` exits 0
- [ ] Q1.2 `npm run build` succeeds (build in a mirror outside the mounted folder; the mount blocks `.next` writes)
- [ ] Q1.3 `node qa/lifecycle-check.js` — **20 of 20**
- [ ] Q1.4 `node qa/tenant-check.js` — **12 of 12**
- [ ] Q1.5 Record the actual numbers in your report, not the word "passing"

---

## Gate 2 — every page answers

For each route: does it load, does it show the right thing, and is there a way
onward. A page that loads but strands you is a failure.

| Route | Must show | Must offer a way on |
|---|---|---|
| [ ] `/` | hero, three steps, sample analysis card, real packs, logo strip, footer | start free, see pricing |
| [ ] `/start` | Google sign-in, the two-column design | sign in, back home |
| [ ] `/universities` | 6 universities with visible logos, duration and question counts | pick one, or sign in first |
| [ ] `/interview/{valid}` | consent, then device check, then the room | continue at each stage |
| [ ] `/interview/{unknown}` | **recovery screen**, three reasons, no spinner | start new, home |
| [ ] `/results/{own}` | band label, score, sub-scores, per-question feedback | practise again |
| [ ] `/results/{unknown}` | **recovery screen**, 404 status | practise again, home |
| [ ] `/pricing` | free trial first, 799 as focal card, 449 beside it, comparison table | choose a pack |
| [ ] `/checkout` | amount, wallet number, QR if set, copy button, form | pay, or contact us |
| [ ] `/consultancy` | 20 and 30 seat bundles only, NPR 6,000 and 9,000 | enquire |
| [ ] `/c/{valid-slug}` | that consultancy's branding | sign up |
| [ ] `/c/{unknown-slug}` | 404 (never a blank page) | home |
| [ ] `/privacy` `/terms` `/refund` | real content, not placeholder | back |
| [ ] `/admin` | login, then own students only | log out |
| [ ] `/super` | login, then the real queues | log out |
| [ ] `/owner` | passcode, then the switch and its history | log out |
| [ ] `/any-nonsense-url` | branded 404 | catalogue, home |

---

## Gate 3 — the lifecycle of every button

**This is the section the client asked for.** Every control has four states and
QA confirms all four, not just the happy one.

For each control below, confirm:

1. **Normal** — click it, does the right thing happen
2. **Working** — while it is busy, does it say so and can it be double-clicked
3. **Failure** — turn off wifi, or make the server fail, does it say what went wrong in plain words
4. **Recovery** — from that failure, is there a way forward without refreshing

A control that silently does nothing is the worst defect class in this product,
because the student concludes we took their money and broke.

### Student controls

- [ ] Q3.1 Home "Start free" → `/start?next=/universities`, never straight to the catalogue
- [ ] Q3.2 Home "See how it works" → scrolls or navigates, does not dead-click
- [ ] Q3.3 Home + pricing pack buttons → checkout for **that** pack, price matches the card
- [ ] Q3.4 `/start` Google sign-in → works; **popup blocked falls back to redirect**; a rejected token shows the real reason, never a generic message
- [ ] Q3.5 University card when signed out → says "Sign in to start", returns to that same university afterwards
- [ ] Q3.6 University card when signed in → creates a session, correct question count (10 trial / 17 paid)
- [ ] Q3.7 Consent "I understand, continue" → records version and time; a stale version is refused
- [ ] Q3.8 Device check camera → permission denied shows what to do, not a dead screen
- [ ] Q3.9 Device check microphone → the sound meter moves; **the recording is decoded, not read from live state** (that bug reported silence for everyone)
- [ ] Q3.10 Device check "Start" → enters the room, scroll resets to the top
- [ ] Q3.11 Record button → starts, shows it is recording, timer counts
- [ ] Q3.12 Stop → uploads, shows progress, then transcript or a clear retry
- [ ] Q3.13 Silent or too-short answer → refused with a reason, retry offered, **no score invented**
- [ ] Q3.14 Fourth attempt on one question → capped, told to move on
- [ ] Q3.15 Next question → advances, no double-speak (StrictMode fired the voice twice once)
- [ ] Q3.16 Violation monitor → count rises, wording is not alarming, background noise does not spam it
- [ ] Q3.17 Timer → visible, counts down, does not jump
- [ ] Q3.18 Finish → trial student lands on the **gate**, paying student on the report
- [ ] Q3.19 Trial gate "See my report" → the report, free, complete
- [ ] Q3.20 Trial gate "See the packs" → pricing
- [ ] Q3.21 Checkout "Copy the number" → clipboard actually contains it, button confirms
- [ ] Q3.22 Checkout receipt upload → over 2 MB refused kindly, non-image refused, **a failed upload does not block payment**
- [ ] Q3.23 Checkout "I have paid" → disabled until the fields are valid, says why it is disabled
- [ ] Q3.24 Reused transaction number → refused with a clear reason
- [ ] Q3.25 Pending screen → shows amount, transaction number, reference; WhatsApp link works
- [ ] Q3.26 Rejected → "Try again" starts a fresh order
- [ ] Q3.27 Every footer and legal link → 200, correct page

### Consultancy admin controls

- [ ] Q3.28 Login → own students only; wrong passcode 403 with the same message as an unknown slug
- [ ] Q3.29 Branding save → persists, shows on `/c/{slug}`
- [ ] Q3.30 Approve payment → credits released, **approving twice does not pay twice**
- [ ] Q3.31 Approve another consultancy's order id → **404**
- [ ] Q3.32 Reject → student told; an already-approved order cannot be rejected here
- [ ] Q3.33 Seats used / left → matches reality, revoked seats are free again

### Super admin controls

- [ ] Q3.34 Verify payment → grants once, second click refused
- [ ] Q3.35 Reject payment → recorded with a reason
- [ ] Q3.36 Approving a consultancy's student → **that consultancy is notified**
- [ ] Q3.37 Grant credit → appears in the ledger with a note
- [ ] Q3.38 Set student status → takes effect
- [ ] Q3.39 Resolve a flagged trial → grants or refuses, never bans
- [ ] Q3.40 Create and approve a consultancy → slug works immediately
- [ ] Q3.41 Audit trail → shows who did what, including consultancy approvals with their warning note

### Owner controls

- [ ] Q3.42 Passcode → wrong one gets nowhere
- [ ] Q3.43 Kill switch ON → **every student API returns 503**, not just the pages
- [ ] Q3.44 Contact name and phone → editable, shown to students while down
- [ ] Q3.45 Kill switch OFF → everything returns
- [ ] Q3.46 Switch history → every flip recorded with who and when

---

## Gate 4 — the money guarantees

These are the ones that cost real rupees when they break.

- [ ] Q4.1 Price always comes from the server. Post `amountNpr: 1` — server still charges the real price
- [ ] Q4.2 Hidden packs (`starter`, `pro`) cannot be bought or seen
- [ ] Q4.3 One wallet transaction id can be claimed **once**
- [ ] Q4.4 Approval is idempotent — no double grant
- [ ] Q4.5 **One sitting costs exactly one credit**, however many questions it has
- [ ] Q4.6 The credit is taken on the **first answer**, not at session creation
- [ ] Q4.7 Seats never oversell — more signups than seats still seats exactly the seat count
- [ ] Q4.8 A seat grants the **Serious pack** (12 mocks, 30 practice)
- [ ] Q4.9 Running out of seats does not block signup — the student keeps the free trial
- [ ] Q4.10 Referral pays **only** on a verified payment, never on signup
- [ ] Q4.11 Balance is always `SUM(delta)` from the ledger, never a stored number
- [ ] Q4.12 Spend breaker trips before the provider bill runs away

---

## Gate 5 — roles, privacy and isolation

- [ ] Q5.1 No interview can be started without signing in (API returns 401)
- [ ] Q5.2 A stranger with a session id gets **404, not 403** (403 confirms it exists)
- [ ] Q5.3 `ownerId` is never echoed back to the browser
- [ ] Q5.4 Consultancy A cannot read B by injecting any field
- [ ] Q5.5 Direct students are invisible to every admin
- [ ] Q5.6 A suspended or pending consultancy reads nothing
- [ ] Q5.7 **No admin role can reach transcript or answer content** — engagement and entitlement only
- [ ] Q5.8 The public platform read returns only `maintenanceMode`, nothing else
- [ ] Q5.9 Malformed bodies return 400, never 500

---

## Gate 6 — is what is on screen actually true

Two claims have already had to be retracted from this product. Read every number
on every public page as if you were a student about to spend money.

- [ ] Q6.1 Every price on screen matches `lib/data/plans.ts`
- [ ] Q6.2 Home and `/pricing` show identical packs (they diverged once — QA-205)
- [ ] Q6.3 The NPR 240 wholesale price is **not** visible on any student-facing page
- [ ] Q6.4 Competitor comparison carries a date and is still accurate
- [ ] Q6.5 No superlative that cannot be proved ("cheapest", "best", "only")
- [ ] Q6.6 No countdown that regenerates on refresh
- [ ] Q6.7 Nothing is described as the student's own words unless it is — demo text is labelled
- [ ] Q6.8 Question counts on screen match what the session actually serves

---

## Gate 7 — on a real phone

Not a browser window resized. An actual phone, on mobile data.

- [ ] Q7.1 Every page at 360px wide, nothing clipped or overlapping
- [ ] Q7.2 Camera and microphone work in mobile Chrome and Safari
- [ ] Q7.3 The interview room is usable one-handed; the record button is reachable
- [ ] Q7.4 The install prompt appears and the installed app opens
- [ ] Q7.5 A dropped connection mid-answer recovers with the answer intact or a clear retry
- [ ] Q7.6 Nothing needs pinch-zoom to read

---

## Gate 8 — after the deploy, on the live site

- [ ] Q8.1 The Netlify build actually succeeded (a failed deploy leaves the OLD site up, looking fine)
- [ ] Q8.2 The SHA in super admin is the commit you just pushed
- [ ] Q8.3 Google sign-in works on the live domain (authorised domains list)
- [ ] Q8.4 Spot-check the specific thing this release changed
- [ ] Q8.5 Kill switch responds on live, then put it back

---

## How to report

One line per defect, in this shape, so it can be fixed without a conversation:

```
ID | severity | route | what you clicked | what happened | what should happen | build SHA
```

Severity: **CRITICAL** money or data can be lost, or a stranger can read a
student's answers · **HIGH** a student cannot complete the journey · **MEDIUM**
confusing or ugly but passable · **LOW** cosmetic.

Never report "it doesn't work". Report what you clicked and what you saw.
