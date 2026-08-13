# Pilot readiness report

**Date:** 13 August 2026 · **Build tested:** local `1efbb13` · **Live build:** `a1a919d`
**Verdict:** the machine is sound. **Do not open to a hundred students until the two blockers below are cleared.**

---

## 1. Read this before the numbers

You were told 120 of 126 items were done, then found a sign-in loop in ten minutes.
Both are true, and the reason matters more than the score.

**Every automated suite in this project is API-level.** It sends JSON and reads
JSON back. A redirect loop, a missing signed-in name, a dead link, a spinner
that never stops — **not one of those is visible to any test here.** The
checklist measured the things that could be measured and the word "done" carried
more weight than it had earned.

So: a green suite proves the *rules* are right. It does not prove a person can
use the site. Those are different claims and this report keeps them apart.

---

## 2. What was actually wrong

| # | Finding | Severity | Status |
|---|---|---|---|
| **P-00** | **Commit `ac640f7` was never pushed.** Sign-out, the signed-in header and `/account` existed in code while the live site ran without them. Three of your four bugs were already fixed and undeployed. | CRITICAL (process) | Fixed, **awaiting push** |
| **P-01** | `BlobRepo.get()` ended in `catch { return null }`, so **a broken store looked exactly like a student who does not exist.** Sign in succeeds → next read fails → every API says 401 → page bounces to `/start` → sign in again → forever. Nothing logged. `list()` had the same fault and would have told a consultancy it had **0 students** instead of showing an outage. | CRITICAL | Fixed |
| **P-02** | `/start` never checked whether you were **already signed in**, which is what turned a single failure into an endless loop. | HIGH | Fixed |
| **P-03** | `claim()` decided "did I win?" by comparing the value it wrote against the value stored. Callers passed `{orderId, at}`, so two writers **in the same millisecond** wrote identical values and both believed they had claimed it. This is the primitive behind every uniqueness guarantee in the product, so its failure mode is money. | HIGH | Fixed |

P-01 is the one that would have ruined Monday. It fails **silently** — the site
looks healthy and simply refuses to remember anybody.

---

## 3. Case studies — the student

| ID | The story | Result |
|---|---|---|
| CS-01 | New student is served exactly 10 free questions | PASS |
| CS-02 | A whole sitting costs exactly one credit, not one per question | PASS |
| CS-03 | **Finishes 10, logs out, logs back in — no second free trial** | PASS |
| CS-04 | Exhausted student cannot start another mock (402, with a real reason) | PASS |
| CS-05a | A **shared consultancy lab PC** does not punish the 2nd student | PASS |
| CS-05b | But five accounts on one device is caught as a farm | PASS |
| CS-06 | Opens checkout, abandons it — granted nothing | PASS |
| CS-07 | Comes back three days later and pays on the old order | PASS |
| CS-08a | **Internet drops, taps submit 3× — ONE item in the approval queue** | PASS |
| CS-08b | Every repeat tap gets a calm answer, never a red error | PASS |
| CS-09 | Impatient triple-tap on Pay is survivable | PASS |
| CS-10 | Student edits the price to NPR 1 — server still charges 449 | PASS |
| CS-11 | A receipt forwarded to a friend cannot be reused | PASS |
| CS-12 | A stranger holding a session id gets 404, never 403 | PASS |
| CS-13 | After sign-out the session is genuinely gone | PASS |
| CS-26 | A signed-in student is recognised as signed in | PASS |
| CS-27 | No practice credits gives **402, never 401** (the loop's engine) | PASS |

## 4. Case studies — the consultancy admin

| ID | The story | Result |
|---|---|---|
| CS-14 | Two admins, two links, two completely separate student lists | PASS |
| CS-15 | **A student who came from an ad is invisible to every admin** | PASS |
| CS-16 | A seat grants the full Serious pack (12 mocks + 30 practice) | PASS |
| CS-17 | Admin A cannot approve admin B's student, even with a real order id | PASS |
| CS-21 | Admin and super admin both clicking approve pays **once** | PASS |

## 5. Case studies — super admin and owner

| ID | The story | Result |
|---|---|---|
| CS-18 | **Admin asleep — super admin approves instead** | PASS |
| CS-19 | That admin is **told** their student was approved | PASS |
| CS-20 | The *other* admin hears nothing about it | PASS |
| CS-22 | Super admin sees every consultancy's records | PASS |
| CS-23 | A wrong super key reads nothing (403) | PASS |
| CS-24 | **No admin role can read a student's actual answers** | PASS |
| CS-25 | The public read leaks nothing but the maintenance switch | PASS |

## 6. Suite totals

| Suite | What it covers | Result |
|---|---|---|
| `pilot-check.js` | the 29 case studies above | **29 / 29** |
| `lifecycle-check.js` | money and identity guarantees | **20 / 20** |
| `tenant-check.js` | seats and tenant isolation | **12 / 12** |
| `fraud-check.js` | abuse, referrals, rewards, kill switch | **19 / 19** |
| `journey-check.js` | the direct student journey end to end | **26 / 26** |
| `walk-check.js` | 78 walked steps across every page | **78, 0 bugs** |
| `adversarial-check.js` | deliberate attacks | **18 / 18** |

---

## 7. Three of my own tests were wrong, not the product

Recorded because a test that fails for the wrong reason is worse than no test.

1. I asserted a **second** Google account on one device should be blocked. The
   threshold is deliberately **four**, because a consultancy lab shares machines
   and punishing the second student to sit down would hurt exactly the people we
   are paid to serve.
2. I asserted only **one** of three repeat submits should succeed. Answering all
   three calmly is deliberate: a student shown a red error after sending real
   money either pays twice or decides he was cheated. What must never duplicate
   is the **queue item**, and it does not.
3. Lifecycle E6 tried to create a second order for one student — now correctly
   refused with 409 — so it never reached the duplicate-transaction guard. It
   now tests the real threat: a screenshot forwarded to a friend.

---

## 8. NOT PROVEN — do not claim these

No browser can be installed in this sandbox, so **nothing below has been seen
working by anything with eyes.** These need a human with a phone.

- [ ] The Google sign-in popup, and its redirect fallback when the popup is blocked
- [ ] **The double account-chooser you saw** — needs reproducing on the new build
- [ ] Camera and microphone permission on mobile Chrome and Safari
- [ ] The interview room on a real 360px phone, one-handed, on mobile data
- [ ] PWA install
- [ ] A dropped connection mid-answer
- [ ] Whether the AI feedback is any good — phase 2, not started

---

## 9. Two blockers before Monday

**BLOCKER 1 — push and verify.** Two commits are unpushed. Until they deploy,
the live site still has no sign-out, no signed-in identity, and the silent
sign-in loop. Push, wait for the Netlify build to actually succeed (a failed
deploy leaves the old site up looking fine), then confirm the SHA in super admin.

**BLOCKER 2 — one human, one phone, thirty minutes.** Walk Gate 3 of
`CHECKLIST-QA.md` on the deployed build: sign in, ten questions, see the report,
sign out, sign back in, pay, cancel, pay again. Everything in section 8 is
unproven until somebody does this.

**Then** open it to a hundred students.

---

## 10. For the investor conversation

What you can say honestly today:

- The money rules are proven by 124 automated assertions across seven suites,
  including the ones that stop a student getting a second free trial, reusing a
  friend's receipt, or being charged twice.
- Tenant isolation is proven: one consultancy cannot see or touch another's
  students, and a student who arrives from an ad belongs to nobody.
- No admin, at any level, can read what a student said in an interview.
- Provider cost is about **NPR 10 per mock interview**, against NPR 449 and 799
  retail. The margin is real and measured, not projected.

What you should not say:

- Do not claim the product has been used by students. It has not.
- Do not claim any pass rate, accuracy figure or student count. **Nothing has
  been measured**, and the AI is not connected yet.
- Do not call it "fully tested". Say the rules are tested and the browser
  journey is being walked this weekend. That is true, and it is enough.
