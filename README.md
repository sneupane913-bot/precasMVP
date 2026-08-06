# PreCAS Practice

AI mock interview practice for the UK Pre-CAS credibility interview and the UKVI genuine student interview. Built for Nepali students, sold through Nepali education consultancies.

---

## Read the documents in this order

| Order | File | Who reads it |
|---|---|---|
| 1 | `PROJECT_CONTEXT.md` | **Everyone, every session.** Source of truth. |
| 2 | `HANDOFF.md` | **Everyone, every session.** The two agents talk here. |
| 3 | `AGENT_BUILDER.md` | Claude Code only |
| 3 | `AGENT_QA.md` | Codex only |
| 4 | `docs/MVP_SPEC.md` | Both |
| 5 | `docs/UNIT_ECONOMICS.md` | Both. Every technical choice is constrained by this. |
| 6 | `docs/COMPETITOR_ANALYSIS.md` | Both, before designing any screen |
| 7 | `docs/SPRINT_48H.md` | Both |
| 8 | `../pre-cas-app-research.md` | Background research on the domain |

---

## The two-agent setup

Two agents share this repository and neither does both jobs. An agent that reviews its own work approves it every time, which is why the split exists.

**Claude Code is the builder.** Senior developer. Writes all feature code. May mark work `READY_FOR_QA` and nothing further.

**Codex is the QA and analyst.** Senior QA, product analyst, and the student's advocate. Writes no feature code. Owns the final deploy. Only Codex may mark anything `VERIFIED`.

They communicate only through `HANDOFF.md`. Append only, newest at the bottom.

### Starting the builder

Open Claude Code in this folder and give it this:

```
Read PROJECT_CONTEXT.md, then AGENT_BUILDER.md, then HANDOFF.md,
then docs/MVP_SPEC.md and docs/UNIT_ECONOMICS.md.

You are the builder. Start Phase 0.

Do not mark your own work verified. When Phase 0 is done, write the
[BUILD] entry in HANDOFF.md, set the status to READY_FOR_QA, and stop.
```

### Starting the QA agent

Open Codex in this folder and give it this:

```
Read PROJECT_CONTEXT.md, then AGENT_QA.md, then HANDOFF.md,
then docs/MVP_SPEC.md and docs/COMPETITOR_ANALYSIS.md.

You are the QA agent and product analyst. Review whatever is marked
READY_FOR_QA in HANDOFF.md.

You do not fix code. You file defects. Test the deployed Netlify URL,
not localhost. If you find nothing, you did not look hard enough.
```

Run them in turns, not at the same time, until both have written at least one entry each. After that they can overlap, since the builder works on phase N+1 while QA reviews phase N.

---

## The two things this product exists to do better

Everything else is a detail.

### 1. Never fabricate a score

The competitor awarded 43.00% to an answer whose own transcript field read "Your recording was too short to capture a transcript". Their scoring is keyword overlap against the question wording, not comprehension of the answer.

**No transcript means no score. Ever.** If we cannot hear the student, we say so and offer a retry.

### 2. Never dead-end the student

The competitor auto-advances past a failed transcription, silently destroying the answer. We stop, explain in plain language, and let the student choose to record again or skip.

---

## Commercial summary

| | |
|---|---|
| Primary plan | NPR 500 per month, 10 full interviews plus 100 practice questions |
| Worst-case AI cost | $1.44 per student per month |
| Worst-case gross margin | 55 percent, roughly NPR 246 profit per student |
| Cost per full 22-question interview | roughly 10 US cents |
| $1 per month tier | Viable at 3 interviews plus 20 practice questions, 60 percent worst-case margin |
| Competitor price | GBP 1 per single interview, roughly NPR 175 |
| Our effective price | roughly NPR 50 per interview |

Full working in `docs/UNIT_ECONOMICS.md`.

---

## Stack

Next.js and TypeScript, Supabase, Netlify, Deepgram Nova-3 batch transcription, Gemini 2.5 Flash-Lite, eSewa and Khalti.

Built multi-vertical from day one. The MVP seeds one vertical, `uk-precas`. Adding German language practice later is a data change and a question pack, not a rewrite.
