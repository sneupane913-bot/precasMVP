# PROJECT_CONTEXT.md

**Read this file first. Every agent, every session, before any other action.**

This is the single source of truth for the product. If anything in another file contradicts this file, this file wins. If you need to change something in this file, do not edit it silently: write the proposed change into `HANDOFF.md` and wait for the human to approve it.

---

## 1. What we are building

A web app that lets a Nepali student practise the **UK Pre-CAS credibility interview** and the **UKVI genuine student interview**, under conditions that feel like the real thing, and get honest, level-appropriate AI feedback afterwards.

The product name is a placeholder: **PreCAS Practice** (final brand TBD).

**One sentence for the student:** press one button, sit a real mock interview for your actual university, and find out exactly what to fix before the real one.

**One sentence for the business:** a white-label mock interview engine that Nepali education consultancies resell to their own students under their own logo.

---

## 2. Who the student is (this drives every design decision)

The founder taught Pre-CAS preparation to roughly 80 to 90 students in Nepal. The following is field observation, not speculation, and it is binding on the design.

- The UK is often the **third destination choice**. Australia and the USA get first pick. A large share of UK applicants are students who were filtered out elsewhere, or who never had the profile to try. Not all of them, but enough that the product must assume a weak baseline.
- Many students are **frightened of the answer screen itself**. They freeze when they see a wall of text.
- Many students **cannot pronounce English comfortably**. Some cannot read a long English paragraph at speed.
- Many students **memorise a script** and collapse when the question is reworded.
- Students do not read long articles. They will abandon a "learning module" and never come back.

### Binding design consequences

| Observation | Consequence |
|---|---|
| Student is scared | The first screen must have one obvious button and nothing else competing with it |
| Student has low English | Model answers must use simple, natural, short sentences. No advanced vocabulary. No idioms. |
| Student memorises | Feedback must explicitly detect and name memorised delivery |
| Student will not read | No article-first onboarding. Practice first, explanation only if asked. |
| Student may be on a cheap Android phone | Mobile first, low bandwidth, works on a mid-range phone over 4G |

### Tone rules for all student-facing copy and AI feedback

- Never humiliating. Never sarcastic. Never "you failed".
- Always say what to do next, in one concrete instruction.
- Praise something real before criticising, but do not invent praise.
- Short sentences. A student with weak English must understand every line.
- Nepali is allowed in the UI and in the coaching layer. The mock interview itself is always in English, because the real one is.

---

## 3. Scope of the MVP

### In scope (this is the whole MVP, nothing more)

**Public site**

1. **Home page.** Marketing page. One primary call to action that goes straight into a test. Everything else is secondary.
2. **Test page.** The full timed mock interview. This is the product.
3. **Practice page.** Single-question drilling with immediate feedback.
4. **Results page.** Per-question transcript, feedback, model answer, and an overall verdict.

**Backend**

5. **Admin portal.** For consultancies. Own logo, own branded link, see their own students only.
6. **Super admin portal.** Full transparency across the whole system: every admin, every student, every session, revenue, and approval of new admins.

### Explicitly out of scope for the MVP

Do not build these. If you think one is needed, write it in `HANDOFF.md` instead of building it.

- Live AI voice interviewer that talks back in real time
- Native mobile apps
- OCR upload of tutor question screenshots
- Deep proctoring beyond tab-switch and background-noise flags
- Automated university scraping
- Community, referrals, vouchers, "trails", learning modules, application tracking
- Any second vertical (German classes, IELTS, and so on)

### Built for expansion, but not built yet

The database and routing must be **vertical-agnostic** from day one. A `verticals` table, and every question and session row keyed to a vertical id. The MVP ships with exactly one vertical seeded: `uk-precas`. Adding "German A1 speaking practice" later must be a data change plus a new question pack, not a rewrite. Do not build the German vertical. Just do not block it.

---

## 4. The core loop (build this and nothing else first)

```
Home page
  -> [Start your free mock interview]
  -> Pick your university (search + filter)
  -> Device check (camera, microphone, echo test, lighting check)
  -> Consent screen (recording, data, guardrails)
  -> Interview runs: question by question, timed, recorded, transcribed
  -> Results page: per-question transcript + feedback + model answer + overall verdict
  -> [Practise your weakest answers] -> Practice page
```

The student must be able to reach the first interview question in **under 60 seconds** from landing on the home page, on a phone, with no account. Account creation happens **after** they have tasted it, not before. This is the single most important funnel decision in the product.

---

## 5. Commercial model (decided)

- **Primary plan: NPR 500 per month.** Generous limits. See `docs/UNIT_ECONOMICS.md` for the exact caps and the margin proof.
- The **$1 per month** case has also been modelled and is viable with tighter caps. Keep the pricing tiers in configuration, not hard-coded, so we can switch without a deploy.
- **Free trial:** limited by verified Nepali phone number plus device fingerprint plus IP rate limit, not by Gmail address. Gmail is free and infinite. A Nepali SIM is not.
- Revenue is collected in NPR through a Nepali gateway (eSewa or Khalti). Card and international payment is a later addition.

Every architectural choice must be checked against the cost model. If a feature raises the per-student cost above the ceiling in `docs/UNIT_ECONOMICS.md`, it does not ship. Write it in `HANDOFF.md` instead.

---

## 6. Technology decisions (fixed)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | One repo, one deploy, API routes included |
| Hosting | Netlify | Founder's choice. See the timeout warning below. |
| Database, auth, storage | Supabase | Postgres, row level security, file storage, generous free tier |
| Speech to text | Deepgram Nova-3, **batch mode** | $0.0043 per minute batch versus $0.0077 streaming. Batch is 44 percent cheaper and accurate enough. |
| Feedback model | Gemini 2.5 Flash-Lite, with a documented fallback | Cheapest capable model at $0.10 in and $0.40 out per million tokens |
| Interviewer voice | Pre-generated audio files, cached in Supabase Storage | Questions are fixed per university, so text to speech is a one-off cost, not a per-student cost |
| Payments | eSewa and Khalti | Nepali students do not have international cards |
| SMS OTP | Sparrow SMS or equivalent Nepali gateway | Not WhatsApp. See competitor failure in `docs/COMPETITOR_ANALYSIS.md`. |

### Netlify timeout warning (critical, read before writing any API route)

Netlify synchronous functions time out at **10 seconds** on the free tier and 26 seconds on paid. A single call that evaluates a whole 22-question transcript **will** exceed this.

**The mandated pattern:** evaluate **each answer immediately after it is recorded**, in a small fast call, while the student is already reading the next question. Store the per-answer evaluation as you go. At the end, run one short summarisation call over the already-computed per-answer results.

This is not only a workaround. It is better product design: results appear instantly at the end instead of after a 40 second spinner, and a crashed session still has everything up to the last answered question.

---

## 7. Quality bar

The founder's stated policy is **zero bugs**. Interpret that as: no student ever hits a dead end, a silent failure, or a screen with no way forward.

Non-negotiable requirements:

1. **No silent failures.** If transcription fails, the student is told, in plain language, and is offered a retry. Never auto-advance past a failed answer. The competitor does this and it is their worst bug.
2. **Never fabricate a score.** If there is no transcript, there is no score. Show "we could not hear you, please try again", not a number. The competitor scores empty answers at 43 percent and it destroys their credibility.
3. **Every disabled button explains itself.** If a Continue button is disabled, there is visible red text saying exactly what is wrong. The competitor greys out a button silently and the user cannot tell why.
4. **Mobile first.** Every screen is designed at 360 px wide first, then widened. Not the reverse.
5. **Works on Firefox and Safari, not only Chrome.** Do not depend on the Web Speech API.
6. **Progressive Web App.** On a phone, after a student finishes their first interview, prompt them to add the app to their home screen. Manifest, icons, and service worker are part of the MVP.
7. **Never lose an answer.** Persist each answer to the server the moment recording stops. A dropped connection or a closed tab must not cost the student their session.

---

## 8. Ethical guardrails (hard limits on the AI)

These are not optional and they are not negotiable for cost or conversion reasons.

- **Never coach a student to lie.** No fabricated work experience, no invented finances, no false visa history, no made-up reasons.
- **Never guarantee a CAS or a visa outcome.** Not in marketing copy, not in results, not in the model's feedback.
- **Never present as immigration legal advice.** Point students to their university and a licensed adviser for official facts.
- **Model answers are structures and examples, not scripts to memorise.** Always frame them as "here is how to organise your own true answer", and say so on screen.
- **Sensitive data.** Explicit consent before recording. Clear retention policy. A working delete button. Auto-redact obvious passport numbers, bank account numbers, and phone numbers from transcripts.

---

## 9. The competitor

**UniMock** at `https://unimock.ai/pre-cas-interview`. Full teardown with 39 annotated screenshots is in `docs/COMPETITOR_ANALYSIS.md`. Read it before designing any screen.

Short version:
- Their **interview screen is genuinely good** and we should match its realism.
- Their **university-first browsing** (104 universities, searchable, filterable) is their best idea and we should copy the pattern.
- Their **feedback engine appears to be keyword matching, not comprehension**. This is the gap we win on.
- Their **signup, sharing, and error handling are broken**. This is the second gap we win on.
- They charge **GBP 1 per single interview** via Razorpay. That is our price anchor.

---

## 10. How the two agents work

Two agents share this repository. Neither one does both jobs.

- **Claude Code is the builder.** Senior developer. Writes all code. Reads `AGENT_BUILDER.md`.
- **Codex is the QA and analyst.** Senior QA plus product analyst plus the student's advocate. Writes no feature code. Reads `AGENT_QA.md`.

They communicate **only** through `HANDOFF.md`. Neither agent may assume the other has read anything that is not written in that file.

---

## 11. Definition of done for the MVP

The MVP is done when a student in Nepal, on an Android phone, over mobile data, can:

1. Land on the home page and understand what this is in under five seconds.
2. Start a mock interview for their real university in under 60 seconds, with no account.
3. Complete a timed interview where the questions are spoken, the answers are recorded, and the transcript appears on screen as they speak.
4. See per-question feedback that is specific to what they actually said, plus a model answer written in language they can actually use.
5. Pay NPR 500 through eSewa or Khalti and continue.
6. Add the app to their home screen.

And a consultancy admin can log in, see their own students' sessions, and put their own logo on the student-facing pages.

And the super admin can see every admin, every student, every session, and total revenue, and approve or reject a new admin.
