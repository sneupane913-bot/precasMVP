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

**102 done, 6 partial, of 126 developer items — about 81 percent.**
Automated suites: `qa/lifecycle-check.js` **20/20**, `qa/tenant-check.js` **12/12**.

Phase 2 (connecting the real AI: Groq speech-to-text and the evaluator) is
0 of 4 and is deliberately last. The skeleton has to be right before we pay a
provider per call to prove it wrong.

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
