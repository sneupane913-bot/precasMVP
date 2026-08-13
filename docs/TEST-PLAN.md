# The Test Plan

**This is the release gate for PreCAS Practice. Nothing ships until this
document has been walked from the top.**

Last updated: 13 August 2026.

---

## 0. Read this first, whoever you are

### 0.1 The standard the client has set

The client's instruction, in his own words, and it is not a suggestion:

> "I want you to write a documentation that clearly states that these are the
> things that need to happen. You're gonna go to the website. You're gonna see
> how many links are there, what are the things that can happen, what are the
> things that can go wrong, and what should we test for. Every single test, so
> that we ensure none of the bugs are there. When a student clicks on a certain
> link, the link has to be there. When a student does a certain action, the
> action has to be recorded."

And on the standard of the work:

> "I don't want you to just create this all thing based on my saying. I see that
> the last session you checked it only for the fixes which I had told you about.
> But I want every fix in this website, for every link, for every life cycle
> that there is. You should start from opening the application, start from
> checking each of the pages."

**What that means in practice.** Testing only the things the client named is
not testing. The client names examples, not a scope. If he says "check the
payment double-tap", the job is every payment path, and then every other path
too. He has repeatedly found bugs after being told the product was clean, and
every time it was because a tester covered the named case and stopped.

### 0.2 The two rules of this document

1. **Nothing is passed by reading the code.** A control is confirmed by
   clicking it, or by a test that exercises it end to end and asserts what a
   person would see. Reading a route handler and concluding it works is how the
   consultancy approval queue sat broken for weeks: the server could approve
   payments, the code looked right, and the screen had no button on it.

2. **Zero findings means you did not look.** If a full pass produces no
   defects, the pass was not thorough. Go deeper: the wrong turns, the second
   tap, the back button, the expired session, the shared machine.

### 0.3 What "a bug" means here

A bug is not only a crash. On this product, all of the following are bugs of
equal seriousness:

| Kind | Example found in this product |
|---|---|
| The student is cheated | A student paid and still got a 10 question interview |
| The student can cheat | Trial ended, a second interview could still be started |
| The student is stranded | Refused with a red sentence and nothing to click |
| The product lies | 47 cards saying "Free first try" to a student with none left |
| The staff are stranded | Consultancy could not see the payments only they could approve |
| The records disagree | An approved payment could be flipped to rejected, credits intact |
| The real user is blocked | 30 lab students on one Wi-Fi locked out by a brute force limit |

---

## 1. How to run the tests

### 1.1 The automated suites

Six suites live in `qa/`. They run against a local dev server. **Each suite
needs a freshly started server**, because the per IP throttles are real and a
suite that inherits a used bucket will report throttling as failure.

```
cd /tmp/precas
npx next dev -p 3060 &          # wait ~25 seconds for first compile
QA_PORT=3060 node qa/walk-check.js
```

| Suite | What it proves | Size |
|---|---|---|
| `walk-check.js` | Every actor walked click by click, in order, with the wrong turns | 78 steps |
| `adversarial-check.js` | The specific ways a student tries to cheat or is disappointed | 18 |
| `lifecycle-check.js` | Each guarantee in isolation | 20 |
| `journey-check.js` | The direct student journey step by step, plus 360px layout | 26 |
| `fraud-check.js` | Trial farming, forged fields, role separation | 19 |
| `tenant-check.js` | One consultancy can never see or touch another | 12 |

**`walk-check.js` is the important one.** The others prove that individual
guarantees hold. Only the walks prove that each step actually leads to the next,
which is the class of bug a list of endpoints cannot find.

### 1.2 The browser pass, which the suites do not replace

The automated suites drive the API and read the server rendered HTML. They
cannot see:

- a control that only appears after JavaScript loads
- a page that renders but is unreadable on a 360px phone
- a button that is present but does nothing because a handler is not wired
- stale client state, which is where the two most recent defects live
- anything about how it looks

So **every release also gets a browser pass** using the Claude in Chrome tools,
walking Part A below screen by screen. Ask the client for a real Google sign in
when the flow needs one. He has offered.

### 1.3 The order of a full pass

1. Automated suites, fresh server per suite, all green.
2. Browser pass over Part A, every route, every control.
3. Browser pass over Part B, the five lifecycles, in order.
4. Part D, the open defect list, confirm each is still open or now closed.
5. Record the result in `CONTINUE-HERE.md` with the date and the commit.

---

## 2. The invariants

These hold at all times, in every path, for every actor. If any test anywhere
contradicts one of these, the product is wrong, not the test.

**Money and entitlement**

- I1. The browser never sends a price, a plan, a credit count, or a question
  limit. Every one of those is decided on the server.
- I2. A balance is `SUM(delta)` over an append only ledger. There is no mutable
  balance column anywhere.
- I3. One wallet transaction number unlocks exactly one account, once.
- I4. One student may have at most one payment waiting for approval.
- I5. Approving twice grants once. Re-approving is idempotent.
- I6. A verified payment can never be flipped to rejected. Reversing a paid
  order is a deliberate separate act, never a side effect.
- I7. A credit is consumed when the student first records an answer, never when
  the session row is created. Opening an interview and closing it costs nothing.

**Access and identity**

- I8. No interview exists without a signed in student.
- I9. Entitlement is read from the ledger on every request, never from the
  session, never from the client.
- I10. A consultancy sees only its own students and only its own orders. There
  is no request field through which one consultancy can name another.
- I11. A consultancy admin never sees any transcript, answer, or feedback
  content. Engagement and entitlement only.
- I12. The owner key and the super admin key are separate. Neither opens the
  other's door.
- I13. A disabled student cannot act, but their data is kept and the site does
  not break for them.

**Honesty**

- I14. The outcome of the trial gate is never a ban. The worst case is a soft
  deny, which keeps full browsing and the ability to buy.
- I15. A countdown deadline is a real server timestamp tied to a named reason.
  It is never regenerated per visit and never reissued.
- I16. Every refusal states what is locked, why, and what unlocks it, and
  carries a control to act on.
- I17. A consultancy approval is recorded as the consultancy's word, not as
  something we verified.
- I18. Every approval, rejection, grant, and status change leaves an audit row
  naming who did it.

---

## 3. Part A. Every page, every control

For each route: what a person can click, what must happen, and what must never
happen. Walk this list in a browser. Tick nothing you have not clicked.

### 3.1 `/` home

| Control | Must do | Must never |
|---|---|---|
| Logo | Stay on home | |
| "Start free" (hero) | Go to `/start?next=/universities` | Start an interview without sign in |
| "How it works" | Scroll to the section on the same page | 404 |
| Header: Universities, Practise one question, Pricing | Load those pages | |
| Header: My practice | Load `/account`, or send to sign in and **come back to `/account`** | |
| Header: Sign in / Start free | Show only when signed out | Show "Sign in" to a signed in student |
| Header: Sign out | Show only when signed in, and actually sign out | |
| Footer: every link | Resolve 200 | Any 404 |
| Footer: WhatsApp | Open a real number | Open `wa.me/` with no digits |

Also check: every `href` on this page returns under 400. `walk-check` step 1.2
does this automatically and must stay green.

### 3.2 `/start` sign in

| Control | Must do | Must never |
|---|---|---|
| "Continue with Google" | Open the Google chooser, then land on `next` | Land anywhere other than `next` |
| Google chooser | Always offer account selection | Silently reuse the previous student's Google session |
| Already signed in | **Redirect straight to `next`** | Show the Google button again. **THIS IS OPEN, see D-01** |
| Popup blocked (Firefox ETP, Safari) | Fall back to full page redirect | Show a bare "please try again" |
| Sign in fails | Show the reason and the Firebase code in small print | Swallow the code |
| Soft denied | Show the calm message, WhatsApp, and "Look at the packs" | Read as a ban |
| `?ref=CODE` | Show "a friend invited you" and bind at account creation only | Apply retroactively |
| `?via=slug` | Bind the student to that consultancy if it is approved | Bind to a pending or invented one |
| Privacy, Terms | Load | |

### 3.3 `/universities` catalogue

| Control | Must do | Must never |
|---|---|---|
| Search box | Filter live, and honour `?q=` from the home page | Ignore the query it was linked with |
| Type chips (All, Pre-CAS, CAS, Pre-Admission) | Filter across both lists | |
| University card badge | Say "Free first try" only if they have one, "Needs a pack" otherwise | Promise a free try to a student with none |
| "Start interview" | Create the session and open `/interview/{id}` | |
| "Start interview", signed out | Say "Sign in to start", go to `/start?next=/universities?start=slug` | **Still say "Sign in to start" after signing in. THIS IS OPEN, see D-02** |
| Return from sign in with `?start=slug` | Start that university's interview automatically | Dump them back at 47 cards |
| "Start interview", no credits | Amber notice, the reason, and a "See the packs" button | Bare red text with nothing to click |
| A non featured UK university | Work exactly like a featured one | |

### 3.4 `/interview/[sessionId]` the interview room

| Control | Must do | Must never |
|---|---|---|
| Device check: microphone | Ask permission, show a level meter | Let them start deaf |
| Consent | Record the current consent version server side | Accept a stale or invented version |
| Record | Capture audio, enforce the 90 second cap server side | |
| Next question | Advance, and never lose a recorded answer | |
| Retry a question | Allow up to 3 attempts | Allow a retry loop that drains credit |
| Silent or empty recording | Refuse before we pay to transcribe it | Charge a credit for silence |
| Question 10 of a trial | Show the TrialGate | Show a countdown here, that is pressure before value |
| TrialGate "See my report" | Open the full report, not a crippled one | Hold anything back from the free report |
| TrialGate "See the packs" | Go to `/pricing` | |
| Leave and come back | Resume where they were | Charge a second credit |
| Finished session, reopened | Refuse further answers | |
| Network drops mid answer | Recovery screen with a way forward | Lose the sitting silently |

### 3.5 `/results/[sessionId]` the report

| Control | Must do | Must never |
|---|---|---|
| Page load | Show scores, strengths, next steps | Show `NaN` for an answer we never heard |
| Someone else's session id | 404 | Show a stranger's transcript |
| An invented session id | 404 with a way home | Blank page |
| "Practise one question" | Go to `/practice` | |
| "Choose your university" | Go to `/universities` | |
| Offer countdown | Show a real server deadline, once | Restart on every visit |
| Profile capture | Ask for name and consultancy here, after value | Ask before the trial |

### 3.6 `/pricing`

| Control | Must do | Must never |
|---|---|---|
| Pack cards | Show only Prep and Serious | Show the hidden Starter or Pro |
| "Buy" on a pack | Go to `/checkout?pack=code` | Send a price from the browser |
| FAQ anchor `#faq` | Scroll to the FAQ | |
| Comparison claims | Compare like for like | Repeat a retracted claim, see CHECKLIST-MARKETING |

### 3.7 `/checkout` payment

| Control | Must do | Must never |
|---|---|---|
| Page load | Create or **reuse** the student's open order | Write a new order on every visit |
| Amount | Come from the server plan table | Be influenced by the URL |
| QR image | Show the owner's real wallet QR, or fall back to the number | Show a broken image or an invented QR |
| "Copy the number" | Copy the wallet number | |
| Transaction number field | Required, minimum 4 characters | |
| Name, last 4 digits | Required | |
| Receipt picture | Optional and labelled optional, failure never blocks | Block payment on a failed upload |
| "I have paid" | Submit once, show the waiting panel with their reference | |
| "I have paid" tapped again, same number | Same calm answer | Turn red at a student who has paid |
| Open checkout while a payment is waiting | Refuse, and say it is already being checked | Create a second request to the approver |
| A friend enters the same transaction number | Refuse | Unlock a second account |
| Rejected, then "Try again" | Allow a fresh payment | |
| Approved | Show approval and "Continue practising" | |
| "Back to packs" | Return to `/pricing` | Trap them on the payment page |

### 3.8 `/practice` single question drill

| Control | Must do | Must never |
|---|---|---|
| Category chips | Select one category or any | |
| "Start" with practice credit | One question, consumes a practice credit | Consume a mock credit |
| "Start" without practice credit | Say practice comes with a pack | Say they "used all" of something they never had |
| Locked state | Show the pay route on the page | |

### 3.9 `/account` my practice

| Control | Must do | Must never |
|---|---|---|
| Page load, signed out | Send to `/start?next=/account` and **return here after sign in** | **Loop back to sign in. THIS IS OPEN, see D-01** |
| Page load, signed in | Show name, email, credits, history | Show nothing at all |
| Session row: "See report" | Open that report | |
| Session row: "Resume" | Reopen an unfinished interview | |
| Referral link, "Copy link" | Copy their own link | |
| "Delete my data" | Ask to confirm | Delete on the first click |
| "Yes, delete everything" | Remove every session and answer, strip name and email from payment records, sign them out | Leave sessions behind |
| "Keep my data" | Cancel cleanly | |

### 3.10 `/signout`

| Control | Must do | Must never |
|---|---|---|
| Signed in | Name the account, offer Sign out and Stay signed in | |
| "Sign out" | Work as a plain form POST, with no JavaScript | Depend on a bundle loading |
| Signed out already | Say so, offer Sign in and Home | Error |

### 3.11 `/c/[slug]` a consultancy's own landing page

| Control | Must do | Must never |
|---|---|---|
| Page load | Show that consultancy's name and branding | |
| Both call to action buttons | Carry `?via=slug` through to `/start` | Drop the consultancy, which loses the binding and the seat |
| A pending or suspended consultancy | Still render, but bind nobody | Grant a seat |
| An invented slug | 404 | |

### 3.12 `/admin` consultancy portal

| Control | Must do | Must never |
|---|---|---|
| Short name and passcode | Sign in | |
| Wrong passcode | "That name or passcode is not correct" | |
| Invented consultancy | **The same message**, letter for letter | Reveal which consultancies exist |
| Pending consultancy | "Waiting for approval" | Show any data |
| Suspended consultancy | "This account has been suspended" | Show any data |
| 6 attempts in 5 minutes | Throttle | |
| Payments waiting section | List their own students' submitted payments | Show another consultancy's |
| "Approve" | Confirm first, then release credits, and record it as their word | Approve without a confirmation step |
| "Cannot confirm" | Require a reason, tell the student | |
| An order belonging to another consultancy | 404 | |
| Messages for you | Show notifications, including approvals and rejections we made | |
| Student table | Name, email, credits, last active, status | Any transcript or answer content |
| Seats bought, used, left | Agree with the seat allocation rows | Count revoked seats as used |
| Student link, "Copy link" | Copy `/c/slug` | |
| "Refresh" | Reload without losing the session | |

### 3.13 `/super` super admin

| Control | Must do | Must never |
|---|---|---|
| Super key | Open the dashboard | |
| Wrong key | 403 | |
| Owner key in the super field | 403 | |
| Overview counts | Students, paying, consultancies, orders awaiting | |
| Build revision | Show the live commit, so nobody audits a stale deploy | |
| Orders queue: "Approve" | Release credits once, notify the consultancy if there is one | Grant twice |
| Orders queue: "Reject" | Refuse if already verified, notify the consultancy | Flip a verified order |
| Flagged trials: "Grant" | Give the trial, audit it | |
| Flagged trials: "Decline" | Record it, audit it | Ban anyone |
| Disable a student | Stop them acting, keep their data | |
| Grant credit by hand | Audit it as `grant_credit` | File it as something else |
| Export CSV | Download | Include transcript content |
| Audit tab | Show who did what, newest first | |

### 3.14 `/owner`

| Control | Must do | Must never |
|---|---|---|
| Owner key | Open the switch | |
| Super key in the owner field | 403 | |
| "Turn the platform off" | Confirm first | Take the site down on one click |
| Off | Every student route 503 with the message a person wrote, `/owner` still reachable | Lock the owner out |
| On | Everything returns | |
| Owner audit | Record every pause and resume with time and address | |

### 3.15 `/consultancy` the sales page

| Control | Must do | Must never |
|---|---|---|
| Bundle prices | Show 20 and 30 seats at NPR 300 a seat | Show the dropped 50 and 100 tiers |
| "Go to the portal" | Go to `/admin` | |
| WhatsApp | Open a real number | |

### 3.16 Legal and error pages

`/privacy`, `/terms`, `/refund` load and are current. `/no-such-page` returns
404 **and offers a way home**. `/results/does-not-exist` returns 404, not a
blank screen.

---

## 4. Part B. The five lifecycles

Each is a flowchart of what happens, and beneath it what must never happen.
Walk them in order. The value is in the order: the bugs live between steps, not
inside them.

### 4.1 Lifecycle 1: the student who came from an advertisement

```
                    ┌──────────────────┐
                    │  Sees the advert │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │   Lands on  /    │  every link resolves
                    └────────┬─────────┘
                             ▼
                 ┌───────────────────────┐
                 │ Taps "Start free"     │
                 └───────────┬───────────┘
                             ▼
                 ┌───────────────────────┐
        ┌────────│ Signed in already?    │────────┐
       NO        └───────────────────────┘       YES
        ▼                                          ▼
┌───────────────┐                        ┌────────────────────┐
│ /start        │                        │ straight to `next` │
│ Google chooser│                        │  (D-01: not done)  │
└───────┬───────┘                        └─────────┬──────────┘
        ▼                                          │
┌────────────────────────┐                         │
│ Trial gate decides     │                         │
│  granted / soft denied │                         │
│  / already claimed     │                         │
└───────┬────────────────┘                         │
        └──────────────────┬──────────────────────-┘
                           ▼
                ┌──────────────────────┐
                │ /universities        │  cards must tell the truth
                └──────────┬───────────┘
                           ▼
                ┌──────────────────────┐
                │ Has a mock credit?   │
                └───┬──────────────┬───┘
                   YES            NO
                    ▼              ▼
        ┌───────────────────┐   ┌─────────────────────────────┐
        │ /interview/{id}   │   │ Amber notice + "See the      │
        │ device check      │   │ packs" button  (never bare   │
        │ consent           │   │ red text)                    │
        │ 10 questions      │   └──────────────┬──────────────┘
        └─────────┬─────────┘                  │
                  ▼                            │
        ┌───────────────────┐                  │
        │ credit consumed   │                  │
        │ on FIRST answer   │                  │
        └─────────┬─────────┘                  │
                  ▼                            │
        ┌───────────────────┐                  │
        │ TrialGate after   │                  │
        │ question 10       │                  │
        └────┬─────────┬────┘                  │
             ▼         ▼                       │
    ┌────────────┐  ┌──────────────┐           │
    │ See report │  │ See the packs│───────────┤
    └─────┬──────┘  └──────────────┘           │
          ▼                                    ▼
    ┌──────────────────────┐          ┌──────────────────┐
    │ /results/{id}        │          │ /pricing         │
    │ full report, free    │          └────────┬─────────┘
    │ offer countdown once │                   ▼
    └──────────┬───────────┘          ┌──────────────────┐
               │                      │ /checkout        │
               ▼                      └──────────────────┘
    ┌──────────────────────────────┐
    │ He now tries the workarounds │
    └──────────────────────────────┘
```

**The workarounds he tries, and the answer each must get**

| What he does | What must happen |
|---|---|
| Reopens the finished interview | Refused. No further answers. |
| Starts a second interview at another university | 402, with the pay button |
| Signs out and signs back in, same Google account | `already_claimed`. Still zero credits. |
| Signs in with a second Gmail on the same laptop | First two granted, a family shares a laptop. By the fifth or sixth, soft denied. |
| Same, but on an allow-listed consultancy network | 30 students all granted. This is the one that must not break. |
| Browses `/pricing`, `/practice`, `/account`, legal pages | All load. He is never banned. |
| Clicks anything locked | Told plainly, given the pay route on the page |

**What must never happen in Lifecycle 1**

- He gets a second free ten by any route.
- He is banned, blocked, or shown a dead end.
- A card promises a free try he does not have.
- He is refused with no control to act on.
- He cannot sign out on a shared machine.

### 4.2 Lifecycle 2: the student who came through a consultancy link

Everything in Lifecycle 1 applies. These are the differences.

```
        ┌────────────────────────────────┐
        │ Consultancy gives him /c/slug  │
        └───────────────┬────────────────┘
                        ▼
        ┌────────────────────────────────┐
        │ /c/slug shows their branding   │
        │ every CTA carries ?via=slug    │
        └───────────────┬────────────────┘
                        ▼
        ┌────────────────────────────────┐
        │ /start?via=slug                │
        └───────────────┬────────────────┘
                        ▼
        ┌────────────────────────────────┐
        │ Consultancy approved?          │
        └──────┬───────────────────┬─────┘
              YES                 NO
               ▼                   ▼
    ┌────────────────────┐   ┌──────────────────────────┐
    │ bound + seat taken │   │ signs up as a DIRECT     │
    │ 12 mocks 30 pract. │   │ student, keeps free try  │
    │ (plus his free try)│   │ binds to nobody          │
    └─────────┬──────────┘   └──────────────────────────┘
              ▼
    ┌────────────────────────────┐
    │ Seats all gone?            │
    └──────┬───────────────┬─────┘
          NO              YES
           ▼               ▼
   ┌──────────────┐  ┌─────────────────────────────────┐
   │ seat granted │  │ NOT turned away. Keeps his free │
   └──────────────┘  │ try, can buy like anyone else.  │
                     │ Being the 51st is not his fault.│
                     └─────────────────────────────────┘
```

**When he pays**

```
   he submits → order carries his consultancyId
                        │
                        ▼
        ┌───────────────────────────────────┐
        │ notification goes to HIS OWN       │
        │ consultancy, and only that one     │
        └───────────────┬───────────────────┘
                        ▼
        ┌───────────────────────────────────┐
        │ appears in THEIR queue at /admin   │
        └───────┬───────────────────┬───────┘
                ▼                   ▼
      ┌──────────────────┐  ┌──────────────────────┐
      │ their admin      │  │ super admin steps in │
      │ approves         │  │ instead              │
      │ recorded as      │  │ credits released     │
      │ THEIR word       │  │ consultancy is TOLD  │
      └──────────────────┘  └──────────────────────┘
```

**What must never happen in Lifecycle 2**

- Another consultancy can see, approve, or reject his payment.
- His own consultancy cannot see the payment they are meant to approve.
- His consultancy sees a word of what he said in an interview.
- The link binds him to a consultancy that is pending, suspended, or invented.
- He gets a smaller product than a student who walked in off the street. A seat
  is the full Serious pack, by client decision on 12 August 2026.
- The seat count and the seat rows disagree.

### 4.3 Lifecycle 3: the consultancy admin

```
   /admin ──▶ short name + passcode
                    │
     ┌──────────────┼───────────────┬────────────────┐
     ▼              ▼               ▼                ▼
  wrong pass    invented slug    pending         suspended
  403 same      403 SAME         "waiting for    "has been
  message       message          approval"       suspended"
                    │
                  approved
                    ▼
        ┌───────────────────────────┐
        │ Dashboard                 │
        ├───────────────────────────┤
        │ 1. Payments waiting  ◀────┼── the only thing that is a TASK
        │ 2. Messages for you       │
        │ 3. Seats bought/used/left │
        │ 4. Student link + copy    │
        │ 5. Their students         │
        │ 6. Payments decided       │
        └───────────────────────────┘
```

**What the admin CAN do**

- See their own students: name, email, credits left, last active, status.
- See their own students' payments, and approve or reject them.
- Copy their student link.
- Set their logo and primary colour.
- Read notifications about actions we took on their students.

**What the admin CANNOT do, and must never be able to do**

- See any other consultancy's students, orders, or seats.
- See a transcript, an answer, or feedback text for anyone.
- Approve an order belonging to another consultancy, even with a valid order id.
- Grant credit directly. Credit comes only from a seat or a verified payment.
- Change their own seat total.
- Reach `/super` or `/owner`.
- Discover which consultancy slugs exist by comparing error messages.

**The honest note.** The money for these orders lands in our wallet, not
theirs. A consultancy approving a payment is asserting something they cannot
verify. The client accepted that trade for speed on 12 August 2026. The
mitigation is a paper trail, not a block: every consultancy approval is stamped
with who did it and carries the sentence "Approved by the consultancy, not
checked against our wallet ledger", and the order stays visible to the super
admin.

### 4.4 Lifecycle 4: the super admin

```
   /super ──▶ super key
                 │
                 ▼
   ┌──────────────────────────────────────────────┐
   │ Overview   students, paying, consultancies,  │
   │            orders awaiting, revenue, BUILD   │
   ├──────────────────────────────────────────────┤
   │ Orders     approve ──▶ credits once          │
   │                        + notify consultancy  │
   │            reject  ──▶ refused if verified   │
   │                        + notify consultancy  │
   ├──────────────────────────────────────────────┤
   │ Trials     grant / decline a soft deny       │
   ├──────────────────────────────────────────────┤
   │ Students   disable / enable, grant credit    │
   ├──────────────────────────────────────────────┤
   │ Audit      who did what, newest first        │
   └──────────────────────────────────────────────┘
```

**What the super admin CAN do:** approve or reject any payment, override a soft
denied trial, disable or enable a student, grant credit by hand, approve or
suspend a consultancy, read the audit trail, export students.

**What the super admin CANNOT do:** turn the platform off. That is the owner's
key and only the owner's key. Nor read a transcript from these screens.

**Rules that must hold**

- Approving twice grants once.
- Rejecting a verified order is refused with a clear reason.
- Every action writes an audit row naming `super_admin`.
- Approving or rejecting a consultancy student always notifies that consultancy,
  because their numbers move without them doing anything and a dashboard that
  changes silently is a dashboard nobody trusts.

### 4.5 Lifecycle 5: the owner

```
   /owner ──▶ owner key   (a super key here is refused)
                 │
                 ▼
        ┌────────────────────────┐
        │ Turn the platform off  │──▶ confirm ──▶ every student route 503
        └────────────────────────┘                with a human message
                 │                                /owner still reachable
                 ▼
        ┌────────────────────────┐
        │ Turn it back on        │──▶ everything returns
        └────────────────────────┘
                 │
                 ▼
        ┌────────────────────────┐
        │ Owner audit: every     │
        │ pause and resume, with │
        │ time, address, browser │
        └────────────────────────┘
```

This control exists for a commercial dispute. That is exactly why it is audited
and why it cannot be reached with the super key.

---

## 5. Part C. The regression gate

Run every time, from the top, forever. This list is not ticked once.

### 5.1 Automated, fresh server per suite

- [ ] `walk-check.js` 78/78
- [ ] `adversarial-check.js` 18/18
- [ ] `lifecycle-check.js` 20/20
- [ ] `journey-check.js` 26/26
- [ ] `fraud-check.js` 19/19
- [ ] `tenant-check.js` 12/12
- [ ] `npx tsc --noEmit` clean
- [ ] `npx next build` clean

### 5.2 Browser, every route in Part A

- [ ] Every route loads
- [ ] Every control on every route clicked
- [ ] Every link resolves
- [ ] Nothing forces sideways scrolling at 360px
- [ ] Signed out state correct on every page
- [ ] Signed in state correct on every page, **including after signing in
      without a reload**

### 5.3 The money path, by hand, every release

- [ ] Buy a pack end to end with a real wallet
- [ ] Tap "I have paid" twice, deliberately
- [ ] Open the checkout again while one is waiting
- [ ] Forward the receipt to a second account
- [ ] Approve as a consultancy admin
- [ ] Approve as the super admin, check the consultancy is told
- [ ] Reject as the super admin, check the consultancy is told
- [ ] Try to reject something already approved

### 5.4 The shared machine, every release

- [ ] Student A signs in, sits an interview, walks away
- [ ] Student B sits down: can they sign out A? Can they see A's report?
- [ ] 30 accounts on one consultancy network all get their free try

---

## 6. Part D. Open defects

**These are open right now. They were found by the client, in a browser, after
the automated suites were green. That is the point of the browser pass.**

### D-01. `/start` does not know you are already signed in

**Severity: high. Confirmed by reading `app/(student)/start/page.tsx`: there is
no call to `/api/me` anywhere in the file.**

A signed in student who taps "My practice", or "Sign in", or any link that
routes through `/start`, is shown the Google chooser again. The client's words:
"you're already signed in, but if you again click into my practice page, you'll
directly be taken to that."

Expected: `/start` checks the session on load. If a student is already signed
in, it redirects to `next` immediately without showing the button.

Test to add to `walk-check.js`:
```
sign in, then GET /start?next=/account
  -> must redirect or render the account page, never the Google button
```

### D-02. "Sign in to start" persists after signing in

**Severity: high.**

The catalogue asks `/api/me` once on mount and stores `signedIn`. After signing
in and returning, the cards can still read "Sign in to start", and tapping them
sends the student back to sign in again. The client's words: "I've just signed
in, but it still says the same thing."

Two things to check and fix together:

1. Does the catalogue refetch `/api/me` when it regains focus or when the route
   changes? Right now it does not.
2. Is the Next client router cache serving a stale segment after the sign in
   navigation? `router.push(next)` may not remount.

Expected: after signing in, the very next screen reflects the signed in state,
with no reload.

### D-03. There is no visible confirmation of who is signed in

**Severity: medium.** Raised by the client: "there has to be login details of
who has signed in. I don't see that anywhere."

A student cannot tell which account they are in. On a shared machine that is a
privacy problem as much as a usability one. The header now shows the name and a
Sign out button, but this needs confirming in a browser, and `/account` should
show the email prominently.

### D-04. Client side state is untested everywhere

**Severity: high, and it is the reason D-01 and D-02 were missed.**

Every suite drives the API and reads server rendered HTML. Not one of them
loads the JavaScript. Every defect the client has found in the last two rounds
lives in client state. Until the browser pass in section 1.2 is a standing part
of the gate, this class of bug will keep shipping.

---

## 7. Part E. Fixed this round, now permanent regression tests

Eight defects found by `walk-check.js` on 13 August 2026 and fixed. Each has a
test that will fail if it ever returns.

| # | Severity | Defect | Now covered by |
|---|---|---|---|
| 1 | High | A refused student got red text with nothing to click | walk 1.11 |
| 2 | **Critical** | No way to sign out anywhere in the product. On a lab machine the next student inherited the last one's account, report, and credits | walk 1.16, 1.17 |
| 3 | Medium | Every visit to the checkout wrote a new order, without limit | walk 3.5 |
| 4 | High | Tapping "I have paid" twice on bad wifi showed red to a student who had really paid | walk 4.2 |
| 5 | **Critical** | One student could have two payments waiting at once. One payment, two approvals, two packs | walk 4.4 |
| 6 | **Critical** | A consultancy could not see the payments only they were allowed to approve. The whole feature was unreachable | walk 5.6 |
| 7 | High | We told a consultancy when we approved their student and said nothing when we rejected | walk 6.3 |
| 8 | High | A verified payment could be flipped to rejected while the credits stayed granted | walk 6.4 |

Also removed: `checkCredits()`, a placeholder in the answer route that always
returned allowed. It read like a control and guarded nothing.

Earlier round, four defects, all still covered by `adversarial-check.js`:

| Severity | Defect |
|---|---|
| **Critical** | A student paid and still received a 10 question interview |
| High | The trial did not end. A second interview could be opened with zero credits |
| High | Student sign in shared the passcode brute force limit, locking out a 30 student lab |
| Medium | A trial student was told they had used practice questions they never had |

---

## 8. How to add to this document

When you find a defect:

1. Write the test first, in `qa/walk-check.js`, phrased as what a person
   experiences. Not "the endpoint returns 402". Rather "starting a second
   interview without paying is refused".
2. Watch it fail. A test that has never failed has proved nothing.
3. Fix the product.
4. Watch it pass.
5. Add a row to Part E and, if it is a new control, a row to Part A.

Never delete a test to make a suite green. If a test and the product disagree,
decide which is right and say so in a comment. Twice in this project the product
was right and the test was wrong, and both times the comment is what stopped the
next person from "fixing" the product back into a bug.
