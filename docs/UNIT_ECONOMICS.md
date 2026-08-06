# Unit economics and AI cost model

All prices verified August 2026. Sources at the end. Re-verify before launch, because model pricing moves and Gemini 2.5 Flash-Lite is scheduled for retirement on 16 October 2026.

**The headline answer: yes, $1 per month works. NPR 500 per month works comfortably. Both are modelled below.**

---

## 1. Exchange rate assumption

The founder quoted NPR 155 to the dollar. Market rate has been closer to NPR 138 to 142. Revenue is modelled at the **conservative** end, meaning fewer dollars per rupee, so the margins below are the floor, not the ceiling.

| Amount | At NPR 155 | At NPR 140 (used in this model) |
|---|---|---|
| NPR 500 | $3.23 | $3.57 |
| NPR 1,000 | $6.45 | $7.14 |

Revenue is modelled at **$3.20 for NPR 500** after the payment gateway fee. That is the number to hold yourself to.

---

## 2. Cost of one full mock interview (22 questions, 60 seconds each)

| Component | Unit price | Quantity | Cost |
|---|---|---|---|
| Speech to text, Deepgram Nova-3 **batch** | $0.0043 per minute | 22 minutes | **$0.0946** |
| Per-answer evaluation, Gemini 2.5 Flash-Lite | $0.10 in, $0.40 out per 1M tokens | ~700 in, ~250 out per answer, 22 answers | **$0.0037** |
| Final summary call | same | ~2,500 in, ~600 out | **$0.0005** |
| Interviewer voice (text to speech) | one-off, cached | 0 per session | **$0.0000** |
| Storage (audio deleted after transcription) | negligible | | **$0.0000** |
| **Total per full interview** | | | **$0.099** |

Call it **10 US cents per full mock interview.**

### Why batch and not streaming

Deepgram streaming is $0.0077 per minute. Batch is $0.0043. Over 22 minutes that is $0.169 versus $0.095. **Streaming costs 78 percent more.** The student records an answer, the answer is uploaded when they stop, and the transcript comes back in one to three seconds. That is fast enough. Do not use streaming.

### Why the interviewer voice is free

The questions for a given university are fixed. Generate the audio once, store the MP3 in Supabase Storage, serve it to every student forever. One-off cost across 104 universities at 22 questions each is roughly 206,000 characters, which is about **$3 total, once**. Amortised across even 100 students that is 3 cents each, and across 10,000 students it is nothing.

**Do not call a text to speech API at runtime.** That single mistake would multiply the per-session cost.

---

## 3. Cost of one practice question

| Component | Cost |
|---|---|
| Speech to text, 1 minute batch | $0.0043 |
| Single-answer evaluation | $0.0002 |
| **Total** | **$0.0045** |

Roughly **half a cent per practice question.**

---

## 4. Other per-student costs

| Item | Cost | Note |
|---|---|---|
| SMS OTP on signup | ~$0.01 | Sparrow SMS, roughly NPR 1 to 1.5 per message. One per account, not per session. |
| Payment gateway fee | 2 to 3.5 percent of transaction | eSewa and Khalti merchant discount rate. Already deducted from the $3.20 revenue figure. |
| Supabase | $0 up to 50,000 monthly active users, 500 MB database, 1 GB storage | Free tier carries the MVP and well beyond |
| Netlify | $0 up to 100 GB bandwidth and 125,000 function invocations per month | See the invocation ceiling below |

### Netlify function invocation ceiling

One full interview costs roughly **30 function invocations** (22 transcription calls, 22 evaluation calls batched into fewer, plus session management). At 125,000 free invocations per month that is about **4,000 full interviews per month before the free tier runs out.** Netlify Pro at $19 per month lifts it. At 4,000 interviews per month you are already earning far more than $19, so this is a non-issue, but budget for it.

---

## 5. The NPR 500 per month plan (recommended, decided)

**Proposed caps:** 10 full mock interviews, 100 practice questions per month.

| Scenario | Interviews | Practice Qs | AI cost | Revenue | Gross margin |
|---|---|---|---|---|---|
| **Worst case** (student maxes every cap) | 10 | 100 | $1.44 | $3.20 | **55%** (NPR 246 profit) |
| **Heavy user** (realistic top decile) | 5 | 40 | $0.68 | $3.20 | **79%** (NPR 353 profit) |
| **Typical user** (observed pattern in this category) | 2 | 15 | $0.28 | $3.20 | **91%** (NPR 409 profit) |

Add the one-off SMS cost of $0.01 and roughly $0.05 per student of amortised infrastructure and the picture barely moves.

**Even the absolute worst case, a student who exhausts every credit, leaves NPR 246 of gross profit.** The founder's stated requirement was at least NPR 100 of profit per student. This clears it by a factor of two and a half at the worst case.

---

## 6. The $1 per month plan (the founder's first priority)

**It works, but only with tighter caps.**

**Proposed caps for the $1 tier:** 3 full mock interviews, 20 practice questions per month.

| Scenario | Interviews | Practice Qs | AI cost | Revenue after 3% fee | Gross margin |
|---|---|---|---|---|---|
| **Worst case** (maxes every cap) | 3 | 20 | $0.39 | $0.97 | **60%** |
| **Typical user** | 1 | 8 | $0.14 | $0.97 | **86%** |

**Verdict: $1 per month is viable at 3 interviews and 20 practice questions.** It is not viable with unlimited usage. At 10 interviews the cost is $1.03 against $0.97 of revenue, which is a loss.

### The hard ceiling to remember

At $1 per month, your total AI budget per student per month is **$0.60** if you want a 40 percent floor on margin. That is **6 full interviews, or 133 practice questions, or any mix in between.** Print this number on the wall.

---

## 7. Recommended tiering

Keep these in a `plans` database table, not in code, so they can change without a deploy.

| Plan | Price | Full interviews | Practice questions | Worst-case AI cost | Worst-case margin |
|---|---|---|---|---|---|
| **Free trial** | NPR 0 | 1, capped at 10 of 22 questions | 3 | $0.06 | Acquisition cost, not revenue |
| **Starter** | $1 / NPR 140 | 3 | 20 | $0.39 | 60% |
| **Standard** | NPR 500 | 10 | 100 | $1.44 | 55% |
| **Consultancy seat** | NPR 350 per student, minimum 20 students | 10 | 100 | $1.44 | 42% at volume |

### On the free trial

Cap it at **10 of the 22 questions**, not 3 or 5. The founder is right that 10 is the win-win number: enough for the student to feel the value and see real feedback, not enough to replace paying. It costs you 4.5 cents. That is a cheap acquisition cost by any measure.

---

## 8. Cost control rules that must be enforced in code

These are not suggestions. Each one is a real way to lose money.

1. **Hard server-side credit check before every transcription call.** Never trust the client. A student with browser dev tools open must not be able to spend your Deepgram balance.
2. **Cap answer recording at 90 seconds, enforced server-side.** Reject uploads longer than that. A student leaving the recorder running is a direct cost.
3. **Reject silent or near-silent audio before sending it to Deepgram.** Check for a minimum RMS level client-side and again server-side by file size. Do not pay to transcribe silence.
4. **Never call text to speech at runtime.** Pre-generate and cache. If a cache miss occurs, log it loudly.
5. **Cap the evaluation prompt.** Truncate any single answer transcript at 400 words before sending it to the model. A runaway transcript is a runaway bill.
6. **Set a hard monthly spend alert on Deepgram and Google AI Studio at the start.** Not after launch. Before.
7. **Rate limit per IP and per fingerprint** on the trial endpoint, independently of the phone number check.

---

## 9. When these numbers change

Re-run this model if any of the following happens:

- Gemini 2.5 Flash-Lite retires on 16 October 2026. The named successor is Gemini 3.1 Flash-Lite at $0.25 in and $1.50 out per million tokens, which is **2.5x input and 3.75x output**. Under that model the per-interview LLM cost rises from $0.004 to roughly $0.013. Still trivial next to the $0.095 speech to text cost, so the headline numbers hold. Verify before switching.
- You move from batch to streaming transcription for any reason. That alone adds 78 percent to your dominant cost line.
- You start storing video. Currently the model assumes video is used for live framing feedback only and is never uploaded. Storing video changes the storage and bandwidth picture completely.

---

## 10. Competitor price anchor

UniMock charges **GBP 1 per single mock interview**, collected through Razorpay. At roughly NPR 175 per pound that is **NPR 175 for one interview.**

Our NPR 500 plan gives 10 interviews. That is **NPR 50 per interview, or 3.5 times better value**, at a price point a Nepali student can justify. That is the marketing line, and it is true.

---

## Sources

- [Deepgram Nova-3 Pricing 2026: $0.0043/min Batch, $0.0077 Streaming](https://convertaudiototext.com/blog/deepgram-nova-3-explained)
- [Deepgram Pricing 2026: Speech-to-Text, Nova-3, Flux and Voice Agent API Costs](https://diyai.io/ai-tools/speech-to-text/deepgram-pricing-2026/)
- [Gemini 2.5 Flash-Lite API Pricing (May 2026): $0.1/$0.4 per 1M Tokens](https://devtk.ai/en/models/gemini-2-5-flash-lite/)
- [Gemini API Pricing 2026: per-1M-token cost guide](https://www.aifreeapi.com/en/posts/gemini-api-pricing-2026)
- [Guide to Nepali API Integrations: eSewa, Khalti, Fonepay (2026)](https://praxiumlabs.com/blog/api-integration-nepal/)
- [eSewa Merchant Account and API Access: The 2026 Guide](https://paybridgenp.com/blog/esewa-merchant-account-api-guide)
- UniMock pricing observed directly in Razorpay checkout, screenshot dated 2026-08-05
