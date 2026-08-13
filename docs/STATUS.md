# Status — 13 August 2026

**201 rules. 139 proven. 36 to build. 5 waiting on your eyes.**

| State | Count | What it means |
|---|---:|---|
| **BUILT+PROVEN** | **139** | code exists and a named test proves the rule |
| TODO | 36 | not built |
| BUILT | 11 | code exists, no test yet |
| BUILT (browser only) | 5 | real, but only a human in a browser can confirm it |
| OPEN / needs you | 6 | waiting on a decision or on research |

Suites, all run this session: **rules 59/59 · model 22/23 · lifecycle 20/20 ·
pilot 29/29 · tenant 12/12 · fraud 19/19 · journey 26/26 · walk 78 steps ·
adversarial 18/18.**

---

## What is finished

**The money.** Server owns every price. One wallet transaction claimed once. A
whole sitting costs exactly one credit, taken on the first answer. Approving
twice pays once. Balance is always the sum of an append-only ledger — there is
no mutable number to drift.

**Identity and isolation.** Log out and back in does not refill the trial. One
consultancy cannot see or touch another's students. A student who arrives from
an ad belongs to nobody. **No admin at any level can read a transcript.**

**The failures that used to be silent.** A broken store now returns 503 with an
honest message instead of pretending the student does not exist — that was the
sign-in loop you hit. A dropped connection keeps the recording. Every button
reports working, failed or done, and locks against a second tap.

**Questions are no longer identical for every student.** They were. Ten students
in one lab would have memorised the same ten and walked into a credibility
interview with rehearsed answers — the one thing that interview is built to
catch.

**The kill switch closes everything**, including `/admin` and `/super`. Nothing
is deleted while it is closed.

**The AI contract is fixed before the key exists.** Every input and output
defined, generic feedback rejected at runtime, nothing identifying ever sent to
a provider.

---

## What is left — 36 rules, in the order I would do them

### 1. The consultancy seat model — 8 rules · **the biggest block**
`N-1` `N-3` `N-4` `N-5` `N-6` `N-7` `N-8`

Seats carrying a chosen number of mocks (3, 6 or 10), a student who never sees a
price, renewal that costs the consultancy one seat, and admins buying more seats
themselves. `N-2` (Google-only, link-based) is settled in design but not wired.

**Why first:** it changes the entitlement model, and everything downstream —
dashboard, checkout, admin portal — reads from it.

### 2. Payment, QR and WhatsApp — 8 rules
`N-9` … `N-16`

QR at the top, super-admin-only control of the QR image and contact number,
pre-filled WhatsApp links, the payer's phone on every approval request, an
always-visible upgrade button, renewal pre-filled at one or two mocks left, and
the install prompt.

### 3. Super admin visibility and abuse — 7 rules
`N-18` … `N-24`

Device soft-block with a pre-filled WhatsApp escape, an editable contact number,
students and consultancies listed separately, bachelor/masters, WhatsApp
verification, **city only** at payment, and per-consultancy activity.

### 4. Questions — 5 rules · **the heart of the product**
`N-25` `N-27` `N-28` `N-29` and `Q-1` `Q-2`

Super admin adding questions without a deploy, students on the 799 pack
uploading their own, and the research itself.

### 5. Practice — 3 rules
`N-34` `N-36` `N-37`

It has a tab and its own credit, but the drill loop, the aim-at-your-weakness
default, and history marking are not built.

### 6. The AI — 5 rules · **blocked on you**
`Q-5` `Q-8` `Q-9` `AI-9`

Cannot start. `GROQ_API_KEY` and `GEMINI_API_KEY` are both empty.

---

## Waiting on your eyes — 5 rules

These are real and cannot be proven by any test I can write. Camera and
microphone permission, the mic meter reflecting the actual recording, the
on-screen countdown and question number, and the violation monitor not being
spammed by background noise. **First in the queue for the live session.**

---

## Two things I will not claim

**`N-29` — the question bank cites no sources.** Until that research exists, no
page may say these are the questions universities ask. You called the questions
the heart of the product and you are right; this is research, not code, and it is
the single most valuable thing left.

**No accuracy or success figure exists.** Nothing has been measured. Not in an
ad, not to an investor, not on a page.

---

## The honest headline

The machine is sound and the money is safe. What is missing is the **commercial
model you described today** — seats, renewals, the QR flow — and the **content**
that makes the product worth paying for.
