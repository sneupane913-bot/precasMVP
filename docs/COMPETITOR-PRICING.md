# Competitor pricing intelligence

**Standing reference. Keep this current. Every pricing decision checks against this file first.**

Last updated: 2026-08-06. Sources: direct screenshots of live checkout pages.

---

## 1. finduni.ai

Nepali-facing, prices in NPR, **one-time credit packs, not subscriptions**. Six tiers.

| Tier | Price | Mocks | Practice | Their per-mock | Label |
|---|---|---|---|---|---|
| Starter | NPR 199 | 1 | 0 | NPR 199 | "Try it out" |
| Practice Only | NPR 499 | 0 | 12 | n/a, NPR 42 per practice | "Drill at your pace" |
| Prep | NPR 799 | 5 | 6 | NPR 160 | **MOST POPULAR** |
| Mock Only | NPR 899 | 5 | 0 | NPR 180 | "The real exam feel" |
| Serious | NPR 1,099 | 7 | 10 | NPR 157 | **BEST VALUE** |
| Pro | NPR 1,999 | 14 | 15 | NPR 143 | "Go all in" |

They also run a WhatsApp channel and a Student Portal, and they sell a promo-code field on the checkout page.

## 2. UniMock (unimock.ai)

UK-facing, prices in GBP, charged through Razorpay.

| | |
|---|---|
| Price | GBP 1 per single mock interview |
| In NPR | roughly **NPR 175** |
| Payment | Card only. **No eSewa or Khalti.** |

---

## 3. What their pricing tells us

### They have all converged on NPR 143 to 199 per mock interview

Two independent companies, different countries, different currencies, landing in the same band. That band is the **market price** for one AI mock interview for this student.

### They sell one-time packs, not subscriptions

This is correct for this market and we should copy it. A student needs this product for **three to six weeks** before their interview and then never again. A monthly subscription asks them to think about cancelling. A one-time pack does not. Our earlier plan for a monthly subscription was wrong for this reason.

### They are pricing on urgency, not on cost

Their actual cost per mock is a few rupees, the same as ours. A student facing a CAS interview that decides whether they go to the UK is not price-shopping in the way they would for a streaming service. **This means there is enormous room underneath them.**

### They anchor high and steer to the middle

Starter at NPR 199 for a single mock exists to make Prep at NPR 799 look sensible. Pro at NPR 1,999 exists to make Serious at NPR 1,099 look like restraint. The two labelled tiers, MOST POPULAR and BEST VALUE, are where they expect the volume.

### The gaps they have left open

1. **No free trial anywhere.** Starter at NPR 199 is the cheapest way in. A student cannot find out whether the product is any good without paying. That is a real barrier for a nervous student who has never bought software before.
2. **Splitting mock and practice into separate paid products** (Practice Only, Mock Only) feels like nickel-and-diming.
3. UniMock takes cards only, which is a **hard stop** for most Nepali students.
4. Neither offers anything for consultancies. There is no wholesale tier, so no consultancy can resell either product under its own name.

---

## 4. Our position

Our cost per mock interview is **NPR 6.3** (working in `docs/MONEY.md`). Theirs is similar. The difference is that we are going to pass some of it on.

| | finduni.ai best rate | Our best rate | Difference |
|---|---|---|---|
| Per mock interview | NPR 143 | **NPR 52** | **64% cheaper** |
| Their Pro: NPR 1,999 | 14 mocks | Our Pro NPR 1,299: **25 mocks** | 35% cheaper for 79% more |
| Free trial | none | **10 real questions, free** | they cannot match without rebuilding their funnel |
| Payment | cards, or NPR via their own rails | eSewa, Khalti | |
| Consultancy resale | none | wholesale seats | new channel they do not serve |

### The three things we beat them on, in order of importance

1. **A genuinely free trial.** Ten real questions with real feedback, no card, no account. This is the single biggest lever, because their entire funnel requires payment before proof.
2. **Feedback that quotes the student's own words.** UniMock scores answers it never heard. If finduni does the same, and the identical per-question price band suggests a similar engine, this is a quality gap a student notices in one session.
3. **Price.** Third, not first. Being cheapest is easy to copy. The other two are not.

### The rule

**Never price above NPR 100 per mock interview at our mid tier.** If a competitor drops below that, we revisit. As long as our cost stays near NPR 6, we can win a price war we start and they cannot.
