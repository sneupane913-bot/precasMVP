# The money sheet

Everything about cost and price in one file. Plain tables, no jargon.

Rate used throughout: **1 USD = NPR 140**.

---

## 1. THE ANSWER: what you put on the card

**Load $35, one time. That is about NPR 4,900.**

That buys roughly **600 full mock interviews**. If you sell those at even our cheapest rate, they bring back around NPR 31,000. Nothing else needs paying until you exceed that.

| Service | What it does | Model | Load now | What that buys |
|---|---|---|---|---|
| **Groq** | Turns student speech into text | Pay as you go, prepaid | **$25** | ~600 mock interviews |
| **Google AI Studio** | Writes the feedback | Pay as you go, monthly bill | **$10** | ~2,500 feedback reports |
| Netlify | Hosts the website | Free tier | **$0** | ~4,000 interviews a month |
| Supabase | Stores accounts later | Free tier | **$0** | 50,000 users |
| **Total** | | | **$35** | |

### Is it pay-as-you-go?

**Yes, both of them, and neither is a subscription.**

- **Groq** works like phone top-up. You add credit, it counts down as students use it. It stops when it runs out. It cannot overspend.
- **Google AI Studio** bills your card monthly for what you actually used. There is a free tier first. **Set a spending cap in the Google Cloud console on day one** so it can never surprise you.

You are never locked in and there is no monthly fee.

---

## 2. What one student actually costs us

A full mock interview is 22 questions, one minute each.

| | Cost in USD | Cost in NPR |
|---|---|---|
| Speech to text, 22 minutes | $0.041 | NPR 5.7 |
| Feedback on 22 answers | $0.004 | NPR 0.6 |
| **One full mock interview** | **$0.045** | **NPR 6.3** |
| One practice session, 5 questions | $0.010 | NPR 1.4 |
| Free trial, 10 questions | $0.021 | NPR 2.9 |

**Read that again: a full mock interview costs us about six and a half rupees.** Our competitors charge between NPR 143 and NPR 199 for the same thing.

### Why this is much cheaper than I first told you

I originally budgeted NPR 14 per interview using Deepgram. Groq runs the same class of speech model at **$0.111 per hour against Deepgram's $0.258 per hour**, so switching cuts our single biggest cost line by more than half.

There is an even cheaper Groq model at $0.04 per hour, but it is less accurate. **We use the accurate one.** Saving four rupees is not worth mis-hearing a nervous student.

### Correction: an accuracy claim I made without evidence

An earlier version of this file said Groq is "better at accented English". **The price is verified. That accuracy claim was not, and QA was right to flag it.**

It has to be measured, not assumed: record ten real Nepali students, on a real mid-range Android and an iPhone, and compare word error rate against Deepgram on the same audio. Until that is done, Groq is a **cost** decision only. If it turns out to mis-hear Nepali students more often, we switch back, and the extra NPR 8 per interview is a price worth paying. Switching is one environment variable.

**These numbers are a model, not an invoice.** Track the real Groq and Gemini spend separately during the pilot and correct this file against actual bills.

---

## 3. What we charge

One-time packs, matching how competitors sell, priced well underneath them.

| Pack | Price | Mocks | Practice | Per mock | Costs us | **We keep** | Margin |
|---|---|---|---|---|---|---|---|
| **Free trial** | NPR 0 | 10 questions | 0 | free | NPR 3 | (NPR 3) | acquisition |
| **Starter** | NPR 149 | 2 | 5 | NPR 75 | NPR 20 | **NPR 129** | 87% |
| **Prep** ← most popular | NPR 449 | 6 | 15 | NPR 75 | NPR 59 | **NPR 390** | 87% |
| **Serious** ← best value | NPR 799 | 12 | 30 | NPR 67 | NPR 118 | **NPR 681** | 85% |
| **Pro** | NPR 1,299 | 25 | 60 | NPR 52 | NPR 241 | **NPR 1,058** | 81% |

### Side by side with finduni.ai

| | They charge | We charge | Student saves |
|---|---|---|---|
| 5 to 6 mocks | NPR 799 | NPR 449 | **44%** |
| 12 to 14 mocks | NPR 1,999 (14) | NPR 799 (12) | **60%** |
| 25 mocks | not offered | NPR 1,299 | |
| Try before paying | not possible | 10 free questions | |

**Even at 60% below them we keep 85 rupees of every 100.** That is the whole point of the cost work.

---

## 4. Consultancies (the admin accounts)

Consultancies buy seats in bulk and resell to their own students under their own logo.

| Bundle | They pay us | Seats | Per seat | Costs us | **We keep** |
|---|---|---|---|---|---|
| Small | NPR 6,000 | 20 | NPR 300 | NPR 2,360 | **NPR 3,640** |
| Medium | NPR 13,500 | 50 | NPR 270 | NPR 5,900 | **NPR 7,600** |
| Large | NPR 24,000 | 100 | NPR 240 | NPR 11,800 | **NPR 12,200** |

Each seat carries the Serious pack, 12 mocks and 30 practice.

**Why a consultancy says yes:** they pay NPR 300 and resell at NPR 800 to NPR 1,000. They make NPR 500 to NPR 700 per student for doing nothing but handing over a link. Neither competitor offers them anything like this.

**Why this matters more than retail:** one consultancy with 50 students is worth more than 50 students found one at a time, and it costs nothing to acquire.

---

## 5. Projections

Assume the middle pack, NPR 449, and that a paying student uses everything they bought.

| Students in a month | Revenue | AI cost | **Profit** | Card top-up needed |
|---|---|---|---|---|
| 25 | NPR 11,225 | NPR 1,475 | **NPR 9,750** | already covered by the $35 |
| 100 | NPR 44,900 | NPR 5,900 | **NPR 39,000** | add $10 |
| 500 | NPR 224,500 | NPR 29,500 | **NPR 195,000** | add $180 |
| 2,000 | NPR 898,000 | NPR 118,000 | **NPR 780,000** | add $810, plus Netlify $19 |

Free users cost NPR 3 each. Even at a 10% conversion rate, 1,000 free trials cost NPR 3,000 and the 100 who convert bring NPR 44,900.

**Your worst case is not losing money. It is spending $35 and nobody signing up.**

---

## 6. Rules that keep it this cheap

These are already enforced in the code. Do not remove them.

1. **Check credits on the server before every AI call.** Never trust the browser.
2. **Cap recordings at 90 seconds.** A student who leaves the microphone running costs money.
3. **Never send silence for transcription.** Checked twice, in the browser and on the server.
4. **Never call text to speech at runtime.** Question audio is generated once and reused forever.
5. **Cap retries at 3 per question.**
6. **Set spending alerts on Groq and Google today, not after launch.**

---

## 7. Getting the keys, in order

1. **console.groq.com** → API Keys → create one → add $25 credit. Five minutes.
2. **aistudio.google.com/apikey** → create a key → enable billing → **set a spending cap of $20**. Five minutes.
3. Put both into Netlify under Site configuration, then Environment variables:
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
4. Redeploy.

The purple "demo mode" banner disappears on its own once the keys are live, because the app reports its own state.

---

## 8. What the pilot actually costs to start (updated 2026-08-10, incl. auth)

The client asked for one clean number including authentication. Good news: **the new verification model adds almost nothing.**

| Service | What it does | Pilot cost | Note |
|---|---|---|---|
| **Groq (STT)** | speech → text | **$25** | ~600 mocks; the phase-2 API |
| **Google AI Studio (feedback)** | writes feedback | **$10** | ~2,500 reports; the phase-2 API |
| **Auth & verification buffer (Firebase + WhatsApp OTP)** | Google sign-in + phone OTP at pay | **$5 reserved** | Google/social sign-in is **free to 50,000 MAU** and WhatsApp OTP is a few cents per converting student, so real spend is near $0 — but per the client we **earmark a conservative $5 buffer** so nothing surprises us. Firebase phone-SMS auth (the part that costs) is **not** used. |
| **Netlify** | hosting | **$0** | free tier ≈ 4,000 mocks/month |
| **Supabase** | database/accounts | **$0** | free tier to 50,000 MAU |
| **Total to start** | | **≈ $40** | STT $25 + feedback $10 + $5 auth/verification buffer |

**So the number to load is about $40 (~NPR 5,600):** STT + feedback + a conservative **$5 earmarked for Firebase Auth + WhatsApp OTP** (real auth spend is near $0 at pilot scale; the $5 is deliberate headroom the client asked to keep). Set spend caps on Groq and Google AI on day one. The only new *operational* task (not a cost) is standing up a WhatsApp Business API sender via a BSP for the payment-step OTP; until that is live, Google sign-in alone runs the trial and the STT key stays off.

Sources: [Firebase Auth 2026 pricing — social/Google free to 50k MAU](https://blog.logto.io/firebase-authentication-pricing); [Firebase Auth cost guide](https://www.metacto.com/blogs/the-complete-guide-to-firebase-auth-costs-setup-integration-and-maintenance); [WhatsApp Business API 2026 pricing](https://eazybe.com/blog/whatsapp-business-api-pricing); [Nepal WhatsApp standalone rate card from Oct 2026](https://amanmishra.com.np/whatsapp-business-api-pricing-2026/).

## Sources

- [Groq pricing: Whisper Large v3 at $0.111/hr, Turbo at $0.04/hr](https://www.eesel.ai/blog/groq-pricing)
- [Whisper API pricing compared, OpenAI vs Groq vs Google](https://tokenmix.ai/blog/whisper-api-pricing)
- [Deepgram Nova-3 at $0.0043/min batch](https://convertaudiototext.com/blog/deepgram-nova-3-explained)
- [Gemini 2.5 Flash-Lite at $0.10 in, $0.40 out per 1M tokens](https://devtk.ai/en/models/gemini-2-5-flash-lite/)
- finduni.ai and unimock.ai checkout pages, observed 2026-08-06
