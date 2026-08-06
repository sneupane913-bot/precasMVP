# MVP build specification

Read `PROJECT_CONTEXT.md` first. This document is the technical detail behind it.

---

## 1. Routes

### Student-facing

| Route | Purpose | Auth |
|---|---|---|
| `/` | Home page. One primary call to action. | None |
| `/universities` | Searchable, filterable catalogue | None |
| `/u/[slug]` | University detail, start interview | None |
| `/interview/[sessionId]` | The live mock interview | Session token |
| `/results/[sessionId]` | Results page | Session token |
| `/practice` | Single-question drilling | Session token |
| `/r/[shareCode]` | Public shared result, read only, no personal data | None |
| `/account` | Credits, history, delete data | Logged in |

### Consultancy branded entry

| Route | Purpose |
|---|---|
| `/c/[consultancySlug]` | Same as `/` but with the consultancy's logo and colours |

Branding is resolved server-side from the slug and injected as CSS variables. There is no separate codebase per consultancy.

### Admin

| Route | Purpose | Role |
|---|---|---|
| `/admin` | Consultancy dashboard, own students only | `admin` |
| `/admin/branding` | Logo, colours, share link | `admin` |
| `/admin/students` | Student list, sessions, scores | `admin` |
| `/super` | All consultancies, all students, revenue | `super_admin` |
| `/super/approvals` | Approve or reject pending admins | `super_admin` |

---

## 2. Data model

Postgres via Supabase. Row level security on every table. All ids are UUIDs.

### Multi-vertical from day one

```sql
verticals            -- 'uk-precas' seeded. 'german-a1' later, no rewrite.
  id, slug, name, is_active

institutions         -- universities, and later language schools
  id, vertical_id, slug, name, country, logo_url,
  description, interview_type, question_count,
  duration_minutes, is_active

questions
  id, vertical_id, institution_id (nullable = generic),
  order_index, category, text,
  audio_url,            -- pre-generated TTS, never generated at runtime
  time_limit_seconds,   -- default 60
  tips jsonb,           -- the AI-tips carousel
  model_answer,         -- a structure, never a script to memorise
  rubric_notes,         -- private, fed to the evaluator, never shown
  is_active
```

`question.category` uses the taxonomy from the research brief: `identity`, `education`, `study_gap`, `why_uk`, `why_university`, `why_course`, `progression`, `finance`, `accommodation`, `immigration`, `future_plans`, `conversational`.

### Accounts and abuse prevention

```sql
users
  id, phone_e164 UNIQUE,     -- the scarce resource, not email
  phone_verified_at, email, full_name,
  consultancy_id (nullable), role,  -- 'student' | 'admin' | 'super_admin'
  created_at, deleted_at

device_fingerprints
  id, user_id, fingerprint_hash, first_seen_at, last_seen_at, ip_inet

trial_claims                  -- one row per successful trial claim
  id, user_id, phone_e164, fingerprint_hash, ip_inet, claimed_at
  UNIQUE (phone_e164)
```

**The trial gate is three independent checks, all of which must pass:**

1. `phone_e164` has never appeared in `trial_claims`
2. `fingerprint_hash` has fewer than 2 claims ever
3. `ip_inet` has fewer than 5 claims in the last 24 hours

A student who borrows a sibling's phone number is stopped by check 2. A consultancy computer used by 30 students is stopped by check 3. Both limits are configuration values, not constants in code, because they will need tuning after launch.

### Plans and credits

```sql
plans
  id, code, name, price_npr, price_usd,
  full_interviews_per_month, practice_questions_per_month,
  max_questions_per_interview,   -- 10 for trial, 22 for paid
  is_active

subscriptions
  id, user_id, plan_id, status, started_at, expires_at

credit_ledger             -- append only, never updated
  id, user_id, delta, reason, session_id, created_at
```

Balance is `SUM(delta)`. Never store a mutable balance column. An append-only ledger cannot drift and it gives you a free audit trail for the super admin revenue view.

### Sessions

```sql
interview_sessions
  id, user_id, institution_id, vertical_id, consultancy_id,
  mode,                 -- 'test' | 'practice'
  status,               -- 'created'|'device_check'|'in_progress'|'completed'|'abandoned'
  question_ids uuid[],  -- fixed at creation, so a resume is deterministic
  current_index, started_at, completed_at,
  overall_score, verdict, summary jsonb,
  share_code UNIQUE (nullable)

interview_answers
  id, session_id, question_id, order_index,
  audio_duration_seconds, transcript,
  transcript_status,    -- 'pending'|'ok'|'too_short'|'silent'|'failed'
  transcript_confidence,
  evaluation jsonb, score,
  attempt_number, created_at

session_flags
  id, session_id, question_id, flag_type, severity, detail, occurred_at
```

`flag_type` values: `tab_switch`, `background_noise`, `face_not_visible`, `low_light`, `multiple_faces`, `no_audio`, `answer_too_short`.

### Consultancies

```sql
consultancies
  id, slug UNIQUE, name, logo_url,
  primary_color, secondary_color,
  status,               -- 'pending'|'approved'|'suspended'
  owner_user_id, revenue_share_percent,
  approved_by, approved_at, created_at
```

---

## 3. API contracts

Every route returns `{ ok: true, data }` or `{ ok: false, error: { code, message, userMessage } }`.

| Method | Path | Notes |
|---|---|---|
| `POST` | `/api/session/create` | Checks credits **before** creating. Fixes `question_ids` now. |
| `POST` | `/api/session/[id]/answer` | Multipart audio upload. **The hot path.** See section 4. |
| `POST` | `/api/session/[id]/retry` | Discards the last answer, increments `attempt_number` |
| `POST` | `/api/session/[id]/flag` | Client reports a violation. Rate limited, cheap, no AI call. |
| `POST` | `/api/session/[id]/complete` | Summary call over already-computed per-answer evaluations |
| `GET` | `/api/session/[id]` | Resume state |
| `POST` | `/api/auth/otp/send` | Rate limited: 3 per number per hour, 10 per IP per hour |
| `POST` | `/api/auth/otp/verify` | 6 digits, 5 minute expiry, max 5 attempts |
| `POST` | `/api/payment/esewa/initiate` | HMAC-SHA256 signed |
| `POST` | `/api/payment/esewa/webhook` | **Idempotent by transaction id.** Verified server-side. |
| `POST` | `/api/payment/khalti/initiate` | |
| `POST` | `/api/payment/khalti/webhook` | Same idempotency requirement |

---

## 4. The answer submission hot path

This is the most important sequence in the product. Get it right and everything else is easy.

```
1.  Client stops recording, produces an audio blob
2.  Client checks RMS level locally.
      If effectively silent -> show "we could not hear you" and offer retry.
      DO NOT UPLOAD. Do not pay to transcribe silence.
3.  Client uploads the blob to /api/session/[id]/answer
4.  Server: validate session ownership and status
5.  Server: check credit balance.  Insufficient -> 402, clear message, no AI call
6.  Server: reject if duration > 90s or file size below the silence threshold
7.  Server: send to Deepgram Nova-3 BATCH
8.  Server: branch on the result
      transcript empty or < 5 words -> status 'too_short'
                                       NO SCORE, NO FEEDBACK
                                       return a retry prompt
      transcript ok                  -> continue
9.  Server: redact obvious passport, bank account, and phone numbers
10. Server: evaluate this ONE answer with Gemini. Small, fast, well under 10s.
11. Server: persist answer, transcript, evaluation, and debit the credit ledger
12. Server: return transcript + a short live hint to the client
13. Client: advance to the next question ONLY on an ok status
```

**Step 8 is the competitor's fatal bug and our advantage. There is no path through this flow that produces a number from an empty transcript.**

**Step 10 must not become a whole-transcript evaluation.** Netlify times out at 10 seconds on the free tier. One answer at a time keeps every call small and keeps the results page instant at the end.

---

## 5. The evaluator prompt

Store this in `lib/ai/prompts/evaluate-answer.ts`. Version it. Any change to it requires a fresh feedback quality audit by the QA agent.

### System prompt

```
You are an experienced UK university admissions interviewer who also
coaches Nepali students preparing for the Pre-CAS credibility interview
and the UKVI genuine student interview.

You are assessing ONE answer.

WHO YOU ARE TALKING TO
The student is Nepali, aged 20 to 28. Their spoken English is often
weak. Many are nervous. Many have memorised answers from a teacher.
Many are applying to the UK after being refused or discouraged
elsewhere, and they know it.

Your job is to make them better, not to make them feel small.

ABSOLUTE RULES
1. If the transcript is empty, or fewer than five words, or is clearly
   not an answer, you must return needs_retry: true and nothing else.
   You must NOT produce a score. You must NOT produce feedback.
2. Never invent facts about the student. Only use what is in their
   profile and their transcript.
3. Never coach the student to lie. No invented work experience, no
   invented finances, no invented reasons. If their true answer is
   weak, help them present the truth better.
4. Never guarantee, imply, or hint at a visa or CAS outcome.
5. Never give immigration legal advice.

HOW TO WRITE FEEDBACK
- Quote the student's own words back to them at least once. This is
  mandatory. It is how they know you actually listened.
- Say one true good thing first. If there is genuinely nothing good,
  say the attempt itself was worth something and move on. Do not
  fabricate praise.
- Then give at most three specific fixes. Each fix is one sentence and
  starts with a verb.
- Use short sentences. A student with weak English must understand
  every line you write.
- Never use these words: leverage, articulate, robust, comprehensive,
  demonstrate, utilise, endeavour.

HOW TO WRITE THE MODEL ANSWER
- Write it in the student's own voice, using their real details from
  their profile. Never a generic template.
- Simple vocabulary only. If a word would not appear in a Nepali
  student's normal spoken English, do not use it.
- Four to six short sentences. No more.
- Structure: direct answer, personal reason, one concrete detail,
  link to the future plan.
- Label it clearly as a structure to adapt, not a script to memorise.

DETECTING MEMORISATION
If the answer is unusually fluent compared to the rest of the session,
uses vocabulary far above the student's level, has no hesitation
markers, or reads like written prose rather than speech, set
sounds_memorised: true and tell the student plainly that a real
interviewer will notice and will reword the question to test them.

SCORING
Score 0 to 100 on: relevance, specificity, personal truth, consistency
with the profile, and English clarity. Be honest. A generic answer is
a low score even if the English is good. Do not cluster every score
around 40 to 50.
```

### Output schema

```json
{
  "needs_retry": false,
  "retry_reason": null,
  "score": 62,
  "band": "needs_practice",
  "sounds_memorised": false,
  "quoted_back": "you said your father runs a shop in Butwal",
  "what_went_well": "...",
  "fixes": ["Say roughly how much your father earns each month.", "..."],
  "model_answer": "...",
  "flags": ["vague_finance"],
  "nepali_hint": "..."
}
```

`band` is one of `ready`, `almost_ready`, `needs_practice`, `risky`. Use the words from the research brief, and always show the label rather than only a bare number, because a bare number frightens a weak student.

`nepali_hint` is one line of Nepali explaining the single most important fix. This is a real differentiator over the competitor and it costs almost nothing in tokens.

---

## 6. Device check screen (before every interview)

Four checks, in this order. All must pass before Start becomes enabled.

1. **Camera.** Live preview. Detect a face. If none, say "we cannot see your face, move so the camera can see you".
2. **Lighting.** Sample average brightness. If too dark, say "your face is too dark, sit facing a window or a light". The competitor never does this and the founder was penalised for it.
3. **Microphone with playback.** Record three seconds, play it back, and say plainly what was heard: "we heard you clearly", or "we can hear a fan and people talking behind you, the real interviewer will hear this too". This is the intentional version of the accidental echo the founder liked.
4. **Connection.** Measure a small upload. Warn if it is slow.

Each check shows pass, warn, or fail with one line of plain-English guidance. **A warn does not block.** Only a hard fail on camera or microphone blocks, and even then there is a "continue with audio only" option, because a student who cannot get their camera working must not be locked out of the product entirely.

---

## 7. Interview screen layout

Match the competitor's realism, fix its three mistakes.

**Top bar:** institution logo, name, "Mock interview session", progress dots, "N done, M left".

**Main panel:**
- Question in large type, and the pre-generated audio plays automatically
- Live transcript area, filling as they speak
- Circular record button, "Tap to start recording"
- Countdown ring, and it turns amber at 15 seconds remaining
- Structure chips: `1 Point`, `2 Reason`, `3 Example`, `4 Wrap-up`
- Tips carousel

**Right column on desktop, collapsed on mobile:** webcam preview with timer overlay, disable camera link.

**The three fixes:**

1. **Live flags go next to the answer area**, not in a side panel the student never looks at. One line, one flag at a time, the most severe only: "You are looking away from the camera". The founder specifically identified this.
2. **A failed transcription never auto-advances.** It shows "We could not hear your answer" with two buttons: `Record again` and `Skip this question`. The student chooses.
3. **Every answer is persisted the moment recording stops.** A closed tab, a dropped connection, or a dead battery must never cost a student their session.

**Mobile layout at 360 px:** question at the top, record button large and centred in the thumb zone, webcam as a small floating picture-in-picture, tips collapsed behind a tap.

---

## 8. Results page

Follow the competitor's structure, which is good, with our accuracy.

1. **Verdict card:** band label first and prominent, number second and smaller. "Needs practice, 42%", not "42%".
2. **Four sub-scores:** English clarity, answer specificity, genuine student intent, interview behaviour.
3. **Behaviour table:** Parameter, Value, Status, What This Means. Plain English in the last column.
4. **Per-question blocks:**
   - Question number, score, band
   - **Your answer**, the transcript verbatim, and if it failed, an honest "we could not hear this answer" with no score
   - Two columns: **What the interviewer noticed** as bullets, and **A better way to say it** as the model answer, clearly labelled "this is a structure to adapt, not a script to memorise"
   - The Nepali one-line hint
5. **Next steps:** the three weakest categories, each with a `Practise this` button that goes straight to the practice page filtered to that category.
6. **Download report** as a PDF.
7. **Share:** WhatsApp, Facebook, and copy link. **Test every one on a real phone.** All three are broken on the competitor's site. The shared page shows the score and the band only, never the transcript, and never personal data.

---

## 9. Home page

The founder's instruction was explicit: one button, nothing competing with it.

**Above the fold, and nothing else above the fold:**
- Headline: what this is, in one line, in words a scared student understands
- One large button: **Start your free mock interview**
- One line of proof: "Practise the real Pre-CAS interview for your university"
- One line removing friction: "No account needed. Takes 15 minutes."

**Below the fold, in this order:**
1. University logo strip, because seeing their own university is what convinces them
2. How it works, three steps, three icons, twelve words each
3. What makes this different: real feedback on what you actually said, not on the question. This is the competitive wedge, say it plainly.
4. Price: NPR 500 per month, compared honestly against NPR 175 for one interview elsewhere
5. Frequently asked questions, four items maximum
6. Footer with the guardrail disclaimer: this is practice, not immigration advice, and no outcome is guaranteed

**Not on the home page:** referrals, vouchers, community, testimonials above the fold, a long explanation of what a Pre-CAS interview is. The competitor's cluttered dashboard is the specific failure being avoided here.

---

## 10. Progressive Web App

- `manifest.json` with name, short name, icons at 192 and 512 px, `display: standalone`, theme colour
- A service worker caching the shell and the question audio, and no more
- **The install prompt appears after the first completed interview**, not on first load. A student who has just seen their results has a reason to install. A student who has just arrived does not.
- On iOS, where `beforeinstallprompt` does not exist, show a simple illustrated instruction: tap Share, then Add to Home Screen
- Dismissing the prompt is remembered for 30 days

---

## 11. Security requirements

- Supabase service role key server-side only. The QA agent will search the built JavaScript bundle for it.
- Row level security on every table. A student can read only their own sessions. An admin can read only their own consultancy's students. Only the super admin sees everything.
- Session tokens are HTTP-only cookies, not localStorage.
- Payment webhooks verified by signature and made idempotent by transaction id. A replayed webhook must never grant credits twice.
- Rate limit every endpoint that costs money or sends an SMS.
- Redact passport numbers, bank account numbers, and phone numbers from transcripts before storing them.
- Delete audio after successful transcription. Store the transcript, not the recording, unless the student explicitly opts in.
- A working delete-my-data button that actually deletes.
