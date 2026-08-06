# Competitor teardown: UniMock (unimock.ai)

Based on a full hands-on walkthrough by the founder on 2026-08-05, plus 39 screenshots stored in `../screenshot/`.

Read this before designing any screen. Section 3 is the most important part of this document.

---

## 1. What they are

`unimock.ai` sells AI mock interviews for UK university admissions. Their catalogue covers **104 universities**. Each university is tagged by interview type: Pre-CAS, CAS, or Pre-Admission Interview. They charge **GBP 1 per single mock interview** through Razorpay.

They are further along than an MVP. They have a working product with a wide feature surface, which tells us two things: the market is real, and they have spread themselves thin.

Their navigation: Home, CAS AI Predictor, Available Interviews, Resume, Completed, Purchased Credits, Offers and Vouchers, Applications, Trails, Community, Profile.

---

## 2. What they do well (copy these)

### 2.1 University-first browsing

This is their single best idea. The student does not fill in a profile form and hope. They **search for their actual university** and start an interview built for it.

The Available Interviews screen has: a search box by university name, filters for Country, Practice Type, Interview Mode, and Time-Based, a per-page selector, and cards showing the university logo, a one-line description, an "AI" badge, an interview-type badge (Pre-CAS, CAS, Pre-Admission), a View Details button, and a Start Interview button.

**Take this pattern wholesale.** The founder called it out unprompted as the thing he most wants. A student who sees their own university's logo believes the product is for them.

### 2.2 The interview screen feels like a real exam

This is genuinely strong and it is why the founder liked the product despite everything else. The layout, from screenshot 22:

- **Top bar:** university logo, university name, "Mock interview session", question counter as **filled and hollow dots** (Q 3/22), and "2 done, 19 left" on the right.
- **Main panel, left:** the question in large serif type. Below it, "Your answer space" with a live transcript area, a time limit of 1:00, and a large microphone button reading "Tap to start recording". An animated waveform fills the panel while recording.
- **Answer scaffolding chips** below the recorder: `1 Point`, `2 Reason`, `3 Example`, `4 Wrap-up`. A student who freezes has a structure to hold onto.
- **AI Tips carousel** at the bottom: "AI TIPS: QUESTION 3 OF 22 / Be specific: Use real examples from your studies, work, or personal experience", with left and right arrows to page through tips.
- **Right column:** live webcam picture-in-picture with a countdown timer overlaid, a "Disable camera" link, and a **Monitor** panel with a red status dot showing violations in real time, for example "Screen Sharing, 22 violations, 4:51:20 PM, Student may be switching tabs or windows".

**Take all of this.** The realism is the product. A student who practises under pressure is prepared for pressure.

### 2.3 The accidental echo

The founder heard his own voice echoed back through his laptop while answering. He was unsure whether it was a bug or a feature, and concluded it helped, because **he could hear his own background noise** and understand why the system was flagging it.

**Make this intentional and controlled.** Not a live echo during the answer, which is distracting, but a **pre-flight microphone check** where the student records three seconds, hears it played back, and is told plainly: "we can hear a fan and people talking behind you, the real interviewer will hear this too". That converts an accident into a designed moment.

### 2.4 Realistic background-noise flagging

Their monitor detects and flags background noise. This mirrors the real UKVI and university interview, where environment matters. Keep it.

### 2.5 Results page structure

From screenshots 26 to 39:

- Overall verdict with a headline percentage, for example "Interview needs improvement, 42.02%".
- Four sub-score cards: English fluency, voice clarity, student intent, rule compliance.
- **Interview Behaviour and Completion table** with columns Parameter, Value, Status, What This Means. Rows for Behaviour Score, Rule Violations, and Completion Status, each with a coloured status pill (Needs Work, Many Issues, Complete) and a plain-English explanation.
- **"What the Interviewer Said About Your Performance"**, a prose summary section.
- **Per-question breakdown**, and this is the best part: `Question 02`, a score, the question in large type, **YOUR ANSWER TRANSCRIPT** in a quoted box, then two columns: **INTERVIEWER FEEDBACK** as bullets and **RECOMMENDED APPROACH** as a model answer in italics.
- A downloadable report.

**Take this structure.** It is well organised and the two-column feedback plus model answer layout is exactly right.

### 2.6 Resume and history

Interviews can be resumed where the student left off, and completed sessions are filterable by university, practice type, and mode. Good. Students do abandon halfway.

---

## 3. Where they are weak (this is where we win)

### 3.1 THE BIG ONE: the feedback appears to be keyword matching, not comprehension

This is the most important finding in this document.

Screenshot 36 shows Question 02, "Why did you choose to study in the UK instead of another country?". The transcript box reads:

> "Your recording was too short to capture a transcript."

**There is no transcript. The system heard nothing.** And yet it still awarded a score of **43.00%** and produced this feedback:

> "Also make sure you speak directly to the question wording, consider mentioning: **instead, country, choose, and study**."

Those four words are lifted directly out of the question text. The system is checking whether the student's words overlap with the question's words and with a stored example answer. It is not understanding the answer. It cannot be, because there was no answer.

Confirming evidence: several different questions returned the identical score of 43.00%, and the feedback bullet "Your answer does not address this question in the way the Example Answer does" recurs verbatim across questions.

**Consequences for us:**

1. **Never produce a score without a transcript.** If we could not hear the student, we say so, we do not score it, and we offer a retry. This is a correctness issue and a trust issue.
2. **Our feedback must reference what the student actually said.** Quote their own words back to them. "You said your father is a businessman, but you did not say what business or roughly what he earns. The interviewer will ask that next." That is something UniMock structurally cannot do, and a student can tell the difference immediately.
3. **This is the marketing wedge.** Not "we are cheaper". The wedge is "our feedback is about your answer, not about the question".

### 3.2 Signup is broken and slow

- WhatsApp OTP took **seven minutes** to arrive. Some students will have given up and left.
- The founder entered an 11-digit number in the mobile field. The Continue button silently stayed disabled. **There was no red error text explaining why.** He could not tell whether the button was disabled or the site was broken.

**Our rules:** use SMS through a Nepali gateway, not WhatsApp. Target OTP delivery under 15 seconds. Every disabled button must be accompanied by visible red text stating exactly what is wrong. Validate the phone number format inline as they type, against Nepali mobile formats specifically.

### 3.3 The "Try Now" modal trap

Clicking "Try it" on the CAS Success Predictor banner opened a new tab, and **the same blocking modal appeared again in the new tab** (screenshots 10 and 11 are identical). The student is stuck in a loop.

**Our rule:** a modal that blocks the app must be dismissible, and a call to action must never land the user on a screen where the same blocker reappears.

### 3.4 Transcription fails silently and auto-advances

When an answer could not be transcribed, the system showed a brief message and then **moved to the next question on its own, with no input from the student**. The student loses that answer with no chance to retry.

**This is the worst bug in their product and it is the one to beat.** Our rule: transcription failure stops the flow, explains itself in plain language, and offers "Record again" or "Skip this question". The student decides, never the system.

### 3.5 Sharing is entirely broken

The results page offers Share via WhatsApp, Facebook, Twitter, LinkedIn, and Copy Link. The founder tested them. **Copy Link did not work. WhatsApp did not work. Facebook did not work.**

Sharing results is genuinely valuable for viral growth among Nepali student groups. Build it, and test every single channel on a real phone.

### 3.6 The home page is cluttered

The dashboard leads with refer-and-earn credits, vouchers, community, applications, and trails. The founder's reaction: he did not want any of it. He wanted a button to start an exam.

**Our rule, and this is binding:** the home page has **one** primary call to action, which starts an interview. Everything else is below the fold or in a menu.

### 3.7 The "Trails" learning modules are boring and will be skipped

Regent College London's trail is 101 minutes, 17 units, 5 modules, made of articles: "How your two-stage credibility check works, Article, 7 min", "What assessors are really testing, Article, 6 min". The founder's verdict, verbatim: "This is quite boring. I don't think any students are going to read this."

He is right, and this matches the student psychology in `PROJECT_CONTEXT.md`. A scared student with weak English will not read a 7-minute English article before practising.

**Our rule:** practice first, always. Any teaching content is delivered **inside the feedback**, at the moment the student needs it, in one or two sentences. No article-first onboarding. This is why "Trails" is out of scope for our MVP.

### 3.8 No camera guidance despite recording video

The founder moved to a darker spot and the system said nothing. It records video and flags violations, but never tells the student "your face is too dark, move towards a window" or "look at the camera, not at the screen".

**Our rule:** run a lighting and framing check **before** the interview starts, and show a single non-intrusive nudge during the interview if framing degrades badly. Not a stream of interruptions.

### 3.9 The violations panel is ignored in the moment

The founder said he was concentrating on answering and never looked at the Monitor panel on the right. Twenty-two violations accumulated without him noticing.

**Our fix, which he proposed himself and is correct:** surface flags **on or immediately next to the answer area** where the eye already is, not in a side column. And keep it to one line, not a growing list.

---

## 4. Their pricing

**GBP 1 per single mock interview**, taken through Razorpay, which offers cards and UPI. Note that the Razorpay checkout displayed the founder's Nepali number (+977) but offered card entry, not eSewa or Khalti. For a Nepali student without an international card this is a **hard stop**.

**This is a structural advantage for us.** Native eSewa and Khalti checkout removes a barrier their product cannot easily remove.

---

## 5. Summary: our positioning against them

| Dimension | UniMock | Us |
|---|---|---|
| Interview realism | Strong | Match it |
| University-first browsing | Strong | Match it |
| Feedback quality | Keyword matching, scores empty answers | Real comprehension, quotes the student's own words, refuses to score silence |
| Error handling | Silent failures, auto-advance, dead ends | Never a dead end, always a retry, every error explained |
| Signup | 7-minute WhatsApp OTP, silent validation failures | Sub-15-second Nepali SMS, inline errors in red |
| Payment | Razorpay cards, hard stop for Nepali students | eSewa and Khalti native |
| Onboarding | 101 minutes of articles before practice | Straight into practice, teaching delivered inside feedback |
| Home page | Cluttered with referrals and vouchers | One button |
| Price | GBP 1 per interview, roughly NPR 175 | NPR 500 for 10 interviews, roughly NPR 50 each |
| Language | English only | English interview, Nepali coaching layer |

**The one-line pitch:** they built a convincing exam room with a fake examiner. We are building the same exam room with a real one, at a third of the price, payable in rupees.
