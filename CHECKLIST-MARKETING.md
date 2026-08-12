# Marketing analyst checklist

**The job in one sentence:** make sure every claim we make is true, know which
number actually moves, and bring students in through channels that keep working.

The order matters. Honesty first, because this product's whole position is being
the one that does not lie to a frightened student. A single inflated claim on the
pricing page undoes more than a month of ads buys.

**Owner:** the marketing analyst.
**Cadence:** section 1 before every public change, sections 2 to 4 monthly,
section 5 whenever a competitor moves.

---

## 1. Claim verification — before ANYTHING goes public

This project has already had to retract two claims. Both sounded reasonable and
both were false:

- *"60% cheaper for the same thing"* — it compared a 6-mock pack against a
  5-mock pack. Different things.
- *"No other platform lets you try free"* — simply untrue.

So every claim gets treated as a defect until proved.

- [ ] M1.1 Every number on a public page traces to a source you can name
- [ ] M1.2 Every competitor figure carries the **date it was checked** and a screenshot in `docs/`
- [ ] M1.3 No superlative unless it is provable today: "cheapest", "best", "only", "number one", "most accurate"
- [ ] M1.4 No accuracy or success-rate claim until we have measured it. **We have not.** No "95% pass rate", no "trusted by 10,000 students"
- [ ] M1.5 University names and logos are used only to say *what a student is preparing for*, never to imply endorsement or partnership
- [ ] M1.6 Nothing implies we are connected to UKVI, a university, or an official body
- [ ] M1.7 Comparisons compare like with like — per mock interview, not headline pack price
- [ ] M1.8 Any deadline shown to a student is a **real** server-side deadline, personal to them, and does not reset on refresh
- [ ] M1.9 Testimonials are from real people who agreed. No invented students
- [ ] M1.10 Screenshots of the product show the real product

---

## 2. Pricing integrity

- [ ] M2.1 Every advertised price matches `lib/data/plans.ts` exactly
- [ ] M2.2 Home and `/pricing` agree (they diverged once and home advertised a monthly plan we never sold)
- [ ] M2.3 The consultancy wholesale price (NPR 300 a seat) **never** appears on a student-facing page. A student who sees it feels overcharged
- [ ] M2.4 The hidden Starter and Pro packs are not visible or purchasable
- [ ] M2.5 "One-time payment, nothing to cancel" is still true — no subscription language anywhere
- [ ] M2.6 The refund policy on the page is the policy we actually follow
- [ ] M2.7 If a price changes, all of: plans file, home, pricing, comparison table, ads, and any printed material for consultancies

---

## 3. The funnel — what to measure

Measure these five and nothing else at first. Vanity numbers hide the truth.

- [ ] M3.1 **Visit → sign-in.** If this is low the home page is not convincing, or sign-in is scary
- [ ] M3.2 **Sign-in → first question answered.** If this is low the device check or the room is failing. This is the number most likely to be a *technical* problem wearing a marketing costume
- [ ] M3.3 **Finished 10 free questions → saw report.** Should be near total. Anything else means the gate is confusing
- [ ] M3.4 **Saw report → bought.** This is the real conversion number
- [ ] M3.5 **Bought → used more than one mock.** Low here means the product disappointed, and no amount of ad spend fixes it

- [ ] M3.6 Track where students drop out *inside* the interview, question by question
- [ ] M3.7 Track how many trials are soft-denied. A rising number means either abuse or a broken gate — find out which before assuming abuse
- [ ] M3.8 Segment consultancy students separately from direct. They behave differently and their economics are different

---

## 4. Channels

- [ ] M4.1 **Consultancies are the main channel.** A seat costs them NPR 300 and they resell at their own price. That resale margin is the entire pitch — lead with it
- [ ] M4.2 Keep the consultancy pitch honest about what a seat gives: the full Serious pack, 12 mocks, 30 practice sessions, the same product a paying student gets
- [ ] M4.3 Give every consultancy their own `/c/{slug}` link and check it carries their branding before they send it out
- [ ] M4.4 Referral programme: the reward pays only on a **verified** payment, never on signup. Say that plainly so nobody feels cheated
- [ ] M4.5 Time campaigns to the intake calendar. UK Pre-CAS interviews cluster before September and January — the audience is seasonal and sharp
- [ ] M4.6 Test the free trial as the headline offer. Ten real questions with real feedback, no card, no account, is the strongest thing we have
- [ ] M4.7 Facebook and TikTok are where Nepali students applying abroad actually are. Instagram second. LinkedIn is for consultancies, not students
- [ ] M4.8 Every ad's landing page must match the ad. An ad promising a free trial must land on the free trial

---

## 5. Competitor watch

- [ ] M5.1 Re-check unimock / finduni.ai pricing and note the date. Current record: `docs/COMPETITOR-PRICING.md`, checked 6 August 2026
- [ ] M5.2 Screenshot their checkout, not their marketing page. Marketing pages lie about price
- [ ] M5.3 Note what they changed, not just what they charge
- [ ] M5.4 If they undercut us, do **not** reflexively cut price. Our cost per mock is about NPR 10 — the margin is real, so compete on the thing they are bad at: they score silence at 43%, we refuse to score an answer we could not hear
- [ ] M5.5 Update our comparison table with the new date, or remove it. A stale comparison is a false claim

---

## 6. Before any launch or push

- [ ] M6.1 QA has run `CHECKLIST-QA.md` and it is green. **Never drive traffic to an unverified build**
- [ ] M6.2 The free trial works right now, on a phone, on mobile data
- [ ] M6.3 Payment approval has somebody watching it. A student who pays at 9pm and hears nothing until morning will assume they were robbed
- [ ] M6.4 The owner kill switch has a current contact name and phone on it
- [ ] M6.5 Spend breaker limits are set for the traffic you are about to send

---

## 7. Things marketing must NOT do

- [ ] M7.1 No countdown timers that reset, no fake scarcity, no "3 people are viewing this"
- [ ] M7.2 No pressure on a student before they have seen their report. The gate after question 10 deliberately has no timer, and that stays
- [ ] M7.3 No claims about visa or CAS outcomes. We prepare people for an interview; we do not influence a decision, and saying otherwise is both false and cruel
- [ ] M7.4 No collecting student answers or transcripts for marketing. Ever. Those contain family income, refusals and finances
- [ ] M7.5 No naming a consultancy as a client without their written agreement
