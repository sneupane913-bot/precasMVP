# 48-hour MVP sprint plan

The target is a **demoable product**, not a complete one. At the end of 48 hours a real Nepali student should be able to sit a mock interview on their phone and get real feedback. Payments, admin portals, and polish come after that.

Times are working hours, not wall-clock hours. Sleep is not optional and a tired builder writes the bugs the QA agent then spends longer finding.

---

## Before hour zero: accounts to create

Do this first. Every one of these has a signup delay and blocking on a signup at hour 14 is how a 48-hour sprint becomes a 72-hour one.

| Service | What you need | Note |
|---|---|---|
| Supabase | Project, URL, anon key, service role key | Free tier |
| Deepgram | API key | $200 free credit on signup, which covers roughly 2,000 mock interviews |
| Google AI Studio | Gemini API key | Free tier available for development |
| Netlify | Site connected to the repo | Free tier |
| GitHub | Private repository | Both agents work against it |
| Sparrow SMS or equivalent | Nepali SMS gateway account | **Start this first.** Merchant verification in Nepal takes days, not hours. |
| eSewa merchant | `merchant.esewa.com.np` | Also days. Start now, integrate later. |
| Khalti merchant | `merchant.khalti.com` | Same. |

**Set a hard spend alert on Deepgram and Google AI Studio today, before writing any code.** A runaway loop in development is the cheapest possible time to discover you had no alert.

---

## Day 1

### Hours 0 to 3: foundation

- Next.js with TypeScript and Tailwind, App Router
- Supabase project, run the full schema from `docs/MVP_SPEC.md` section 2
- Seed one vertical (`uk-precas`), **five** universities, and 22 questions for each
- Netlify connected, auto-deploy on push, environment variables set
- A deployed URL that renders "hello"

**Deploy on day one.** Not at the end. The gap between localhost and Netlify is where the surprises live, and you want to meet them now.

`READY_FOR_QA` -> QA verifies the deploy pipeline and the schema before anything else is built.

### Hours 3 to 5: question content

This is content work and it is more valuable than it looks. **Do it properly, because the quality of the question set is the quality of the product.**

- Write 22 questions per university, using the taxonomy in the research brief
- Roughly 60 percent generic credibility questions, 40 percent university-specific
- For each: the tips carousel text, the model answer, and the private rubric notes
- Generate all the audio with a text to speech service **once**, upload to Supabase Storage, store the URLs

Five universities at 22 questions is 110 audio files. Script it, do not do it by hand.

### Hours 5 to 12: the interview engine

The core. Everything else is packaging.

- Device check screen: camera, lighting, microphone with playback, connection
- Consent screen
- Interview screen matching `docs/MVP_SPEC.md` section 7
- Audio recording via MediaRecorder, capped at 90 seconds
- Client-side silence detection, so silence is never uploaded
- `POST /api/session/[id]/answer`, following the hot path in section 4 exactly
- Deepgram batch transcription
- Per-answer Gemini evaluation
- **The retry flow on failed transcription.** Do not defer this. It is the single feature that beats the competitor.
- Persist after every answer
- Resume a partially completed session

`READY_FOR_QA` -> QA runs the full adversarial pass and the feedback quality audit.

### Hours 12 to 15: results page

- Verdict, sub-scores, behaviour table
- Per-question blocks: transcript, feedback, model answer, Nepali hint
- Next steps linking into practice
- Share links, and test all three on a real phone

**End of day 1 target: a full interview runs end to end on a deployed URL and produces real feedback.** If that is true at hour 15, the sprint is on track. If it is not, cut university count, cut the results page styling, but do not cut the retry flow or the empty-transcript guard.

---

## Day 2

### Hours 15 to 19: catalogue and home page

- University list with search and filters, following the competitor's pattern
- University detail page
- Home page per section 9 of the spec. One button.
- Mobile layout at 360 px, checked on a real phone, not in a browser emulator

### Hours 19 to 24: accounts, credits, trial gating

- Phone OTP send and verify
- Device fingerprinting
- The three-check trial gate
- Credit ledger and server-side balance checks on every paid call
- Free trial capped at 10 of the 22 questions

`READY_FOR_QA` -> QA runs the cost and abuse attack list. **Expect at least one of the attacks to succeed on the first pass.** That is normal and it is exactly why this agent exists.

### Hours 24 to 28: practice page

- Category-filtered single-question practice
- Immediate feedback after each answer
- Entry point from the results page's weak areas

### Hours 28 to 32: PWA and mobile hardening

- Manifest, icons, service worker
- Install prompt after the first completed interview
- iOS Safari fallback instructions
- **Test microphone recording on a real iPhone.** This is the highest-risk environment in the whole product and it is the one most likely to eat an hour.

### Hours 32 to 36: payments

- eSewa checkout with HMAC-SHA256 signing
- Khalti checkout
- Idempotent webhooks
- Credit top-up on a verified webhook

If merchant accounts are not approved yet, build against the sandbox and ship with a "pay by eSewa transfer, we will credit you manually" fallback. A manual fallback that works beats an automated one that is not approved.

### Hours 36 to 42: admin and super admin

- Consultancy signup, pending by default
- Super admin approval queue
- Branding: logo, colours, branded slug URL
- Admin student list scoped by row level security
- Super admin overview: consultancies, students, sessions, revenue from the credit ledger

### Hours 42 to 48: QA, fixes, and launch

- QA runs the full release checklist from `AGENT_QA.md`
- Builder closes every `CRITICAL` and `HIGH` defect
- QA re-tests each closed defect personally
- A complete interview on a real Android phone, on mobile data, start to finish
- QA writes the sign-off in `HANDOFF.md`
- Ship

---

## What to cut if you fall behind

Cut in this order. Do not improvise a different order at hour 30 when you are tired.

1. Admin and super admin portals. Run consultancies manually over WhatsApp for the first two weeks.
2. Automated payments. Take eSewa transfers manually and credit by hand.
3. The practice page. The test page alone is a product.
4. Share links.
5. The PDF report.
6. Reduce to two universities instead of five.

## What you may never cut

These are not features. They are the reasons the product is worth building.

1. **The empty-transcript guard.** No transcript means no score. Ever.
2. **The retry flow.** A failed transcription never auto-advances.
3. **Server-side credit checks.** Without these you are funding the internet's transcription bills.
4. **Feedback that quotes the student's own words.** This is the entire competitive advantage. A product that does not do this is just a cheaper UniMock, and cheaper is not a business.
5. **Mobile at 360 px.** Nearly every user is on a phone.

---

## The one-question test at hour 48

Put the product in front of one real Nepali student who is actually preparing for a Pre-CAS interview. Watch them use it. Say nothing.

Then ask one question: **"Would you pay 500 rupees for this?"**

Their face answers before their mouth does. That answer is worth more than the whole QA report.
