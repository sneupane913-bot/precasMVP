# Checklists — start here

There are three, because three different people need three different lists and
mixing them is how things get missed.

| File | Who | What it is | How often |
|---|---|---|---|
| **[CHECKLIST-DEV.md](CHECKLIST-DEV.md)** | whoever is coding | Everything that still has to be BUILT. Ticked once, then it stays ticked. | Work top to bottom |
| **[CHECKLIST-QA.md](CHECKLIST-QA.md)** | whoever is QA | Everything that must be CONFIRMED. A release gate. | **From the top, every single release** |
| **[CHECKLIST-MARKETING.md](CHECKLIST-MARKETING.md)** | marketing analyst | Claim honesty, pricing integrity, funnel, channels. | Claims before every public change; the rest monthly |

The difference that matters: **the developer list is ticked once and moves on.
The QA list is run again from the top every time, forever**, because its whole
job is catching the thing that used to work.

---

## Where the project stands

**120 done, 6 partial, 0 open, of 126 developer items.**
Every developer item is built. The six partial items are built in code and await
a real handset or real students to confirm.

**Automated: 453 checks across 17 suites, all green, 14 August 2026.**
walk 78 · model 70 · rules 59 · pilot 32 · journey 26 · contract 25 · lifecycle 20 ·
fraud 19 · adversarial 18 · backoffice-ui 18 · ai 17 · backoffice 12 · tenant 12 ·
copy 8 · header 8 · reachable 6 · route 5. `tsc` clean, `next build` clean.

**Phase 2, the AI, is 2 of 4.** L4 (no fabricated score ever reaches a student)
is done and has its own suite, `ai-check.js`, 17 cases. The honest fallback is
done: with no key, students see clearly marked sample text, no score is ever
invented, and the super admin dashboard says so in an amber panel rather than
leaving the owner to find out from a student.
**L1 and L2 need the client's own keys** (`GROQ_API_KEY`, `GEMINI_API_KEY`), set
in the host and redeployed. Keys stay out of the dashboard on purpose: an API
key that can be typed into a web form can be read by anyone who gets into it.
**L3, the Nepali-accent benchmark, needs real student audio** and has not run.
Groq was chosen on price, which is verified; that it beats Deepgram on
Nepali-accented English was asserted without evidence and is still unproven.

---

## Decisions taken, 12 August 2026

These are settled. Do not re-litigate them without the client.

**A seat is the Serious pack** — 12 mocks, 30 practice sessions, exactly what a
paying student gets for NPR 799. A consultancy student must never receive a
lesser product than someone who walked in off the street: the consultancy gets
the discount, the student gets the same thing. `SEAT_GRANT` in
`lib/data/plans.ts` is derived from the plan so it cannot drift.

**Bundles are 20 and 30 seats at NPR 300 a seat** (NPR 6,000 and NPR 9,000). The
50 and 100 tiers are gone. NPR 300 against NPR 799 retail is a 62 percent
discount, and that is deliberate: the consultancy resells to their own students,
so they need room underneath our price or the channel stops existing.

**Consultancy admins may approve their own students' payments.** The money lands
in *our* wallet, not theirs, so they are asserting something they cannot verify.
The client accepted that trade for speed. The mitigation is a paper trail, not a
block: every consultancy approval is stamped with who did it and carries the note
"Approved by the consultancy, not checked against our wallet ledger", and the
order stays visible to the super admin.

**The full page-by-page, button-by-button audit happens after the lifecycle is
finished** — Gate 3 of `CHECKLIST-QA.md` — so the three unbuilt pages are not
audited twice.

---

## Decisions taken, 14 August 2026

**No dismissible popup for a student who has used their free questions.** The
client rejected it outright. Do not build one. Locked pages state plainly what
is locked and carry a control to act on, which is a different thing.

**API keys are NOT editable from the dashboard.** Payment details, questions and
the offer are all editable with no deploy, because the client asked for that and
because none of them is a secret. A provider key is a secret, and a key that can
be typed into a web form can be read by anyone who reaches that form. It stays
in the host and needs a redeploy.

**A consultancy can never approve its own seat purchase.** They may approve a
STUDENT'S payment, which is vouching for somebody else and is merely optimistic.
Approving their own would be taking NPR 6,000 of seats on their own say-so. Only
the super admin, who can see our wallet, approves seat orders.

**The post-trial offer window is clamped to 15 minutes to 24 hours.** A shorter
window is pressure; a longer one is not a real deadline. The public reason cannot
be blank, because it sits next to a real countdown and has to name a real reason.

---

## Corrections on the record

Kept here because a wrong number that gets quietly fixed comes back.

**Seat value, corrected 12 August 2026.** An earlier version said a seat was 3
mocks. That came from reading `costNpr: 241` as the Prep pack's cost when it is
Pro's. Prep costs NPR 59 and Serious costs NPR 118 — and every bundle had always
been costed at exactly NPR 118 a seat, which is Serious. The client's own numbers
had always meant a full Serious pack.

**Two marketing claims retracted.** "60% cheaper for the same thing" compared
different pack sizes. "No other platform lets you try free" was untrue. Both are
why `CHECKLIST-MARKETING.md` section 1 exists.
