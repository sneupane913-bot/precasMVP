# UX & completeness audit — is this a real product, or an internal tool?

**Author: QA + marketing analyst. Date: 2026-08-11. Method: the live deployed site inspected in a real browser at desktop (1280) and reviewed against current market norms.**

The client's instruction: judge the site the way a normal person judges any website they open — against what everyone unconsciously expects a real product to look like — not just "does the code run."

## Verdict in one line

The new build has **good bones** (the six correct universities, honest 17-question packs, a sane funnel, working auth logic) but is **missing the entire "storefront" layer** that makes a site read as a real, trustworthy product: a public landing page, a global header, a footer, real university logos, legal pages, and trust signals. Right now it looks and behaves like an **internal tool**, not something you would pay through. That is a conversion and credibility problem, not a code problem.

---

## The big structural gaps (site-wide, fix these first)

### G1 — There is no public landing page. `/` redirects straight to a bare sign-in. **(P0, worst problem)**
A first-time visitor from an ad lands on `/` and is immediately bounced to `/start`, which is one Google button floating in an empty grey screen. They are asked to sign in **before being told what this is, who it's for, what it costs, or why to trust it.** Every norm says the opposite: let people understand and *want* the product first, then gate. The median SaaS landing page converts ~3.8% and the top quartile 11.6%+ precisely because they answer the visitor's mental checklist (what is this, is it for me, does it work, what does it cost, what's the risk) **before** asking for anything. ([SaaS landing page conversion 2026](https://unicornplatform.com/blog/saas-landing-page-conversion-system-in-2026/)) Right now we ask for sign-in at second zero. **Fix:** build a real public landing page at `/`; sign-in happens only when they click "Start free."

### G2 — There is no global header / navigation.
No logo, no way home, no menu. Every page starts abruptly with content. A user cannot orient, cannot get back, cannot find pricing or "how it works." Standard is a persistent top bar: **logo (links home) · Universities · How it works · Pricing · [Sign in / Start free]**, collapsing to a hamburger on mobile.

### G3 — There is no footer, anywhere. **(P0 for legitimacy)**
Pages just… end. A missing footer is one of the fastest "this site is unfinished / not real" signals. Minimum expected: business name, contact (WhatsApp + email), **Privacy Policy, Terms of Service, Refund policy**, the practice-not-immigration-advice disclaimer, social links, and a copyright line with a **dynamic year**. Privacy/terms links are legally expected in many jurisdictions and by users. ([Footer essentials 2026](https://www.orbitmedia.com/blog/website-footer-design-best-practices/), [privacy policy placement](https://support.wix.com/en/article/adding-your-privacy-policy-or-terms-and-conditions-to-your-sites-footer))

### G4 — There are no legal / policy pages at all.
No Privacy Policy, no Terms, no Refund/《how manual QR payment works》 page. These are table stakes for taking money, and the Nepal Privacy Act 2075 requires a real privacy notice naming who processes student data (audio/transcripts). Without them the footer links have nowhere to go and the product is not launch-legal.

### G5 — University logos are placeholder monograms, not the real marks. **(P1, client called this out)**
The catalogue shows coloured squares with initials (BP, UE, UW, WV, CU). The six official SVGs are already in `public/university-logos/` — wire them in (cards, detail, interview top bar). A student's own university logo is the single strongest "this is real and for me" trust cue on the page. (Trademarks: display truthfully, don't recolour or imply endorsement; Ravensbourne stays pilot-only until written permission.)

### G6 — No trust signals or social proof anywhere.
No student count, no testimonial, no "as used by X consultancy," no security reassurance near the sign-in/payment moment. Trust cues should sit **next to the friction** — the sign-in button and the pay button — not be absent. ([trust signals near friction](https://unicornplatform.com/blog/saas-landing-page-conversion-system-in-2026/)) Do **not** fabricate any of these; add them as real numbers/quotes appear. Until then, use honest reassurance (the privacy line, the "no card, no account" line, the disclaimer).

### G7 — Consultancy (B2B) pricing is leaking onto the public student pricing page. **(P0 — violates a locked decision)**
The bottom of `/pricing` shows "Are you a consultancy? Buy seats in bulk from **NPR 240 each**… Consultancy portal." The locked decision (spec §17) is that wholesale pricing lives **only** on the unlisted `/consultancy` page, precisely so a student never sees a lower per-seat number and feels overcharged. Remove this block from `/pricing`.

### G8 — Desktop layouts feel empty and unfinished.
Content sits in a narrow centre column with vast blank margins (the sign-in page is the worst — a small card in a sea of grey). Mobile-first is right (79–83% of visits are mobile), but the desktop view still has to look composed, not broken. ([mobile share + layout](https://www.grafit.agency/blog/saas-landing-page-best-practices)) Use a hero/section rhythm, a max-width container with intentional whitespace, and a two-column split on wide screens where it helps (e.g. sign-in: value prop left, button right).

---

## Page-by-page

### Landing `/` — **currently missing; build it**
Follow the standard six-section anatomy, each answering one question before asking for action ([anatomy](https://unicornplatform.com/blog/saas-landing-page-conversion-system-in-2026/)):
1. **Header** (G2) + **Hero:** one-line headline a scared student understands, one subline, primary **Start free** button, secondary **See how it works**. One line of friction-removal ("No account or card. 10 real questions free.").
2. **Trust bar:** the real university logos (their uni is here).
3. **Problem → benefit:** "The real Pre-CAS interview is stressful and you get one shot" → "practise it for real and get honest feedback."
4. **How it works:** 3 steps, 3 icons, ~12 words each (pick uni → answer out loud → get real feedback).
5. **The wedge:** feedback on *what you actually said*, in simple English — the competitor gap. Show a small, honest sample results snippet if possible (interactive preview beats a screenshot).
6. **Pricing teaser + FAQ + final CTA + footer.**

### Sign-in `/start` — **too bare; frame it**
- Add the **logo / brand** at top (and it should link home). Right now there is no branding at all.
- Keep it minimal but not empty: on desktop, a **two-column split** — left: "Practise your UK interview. 10 questions free." + 2–3 reassurance bullets + a university logo strip; right: the Google button. On mobile, stack.
- Keep the existing privacy microcopy (good) and add a small **"By continuing you agree to our Terms and Privacy Policy"** with links (once those pages exist).
- The error state is actually well done (it surfaces the code) — keep it, but the student-facing wording can stay calm.
- Provide a visible way back to the marketing page (logo or a "← What is this?" link) so a curious visitor isn't trapped on the gate.

### Universities `/` catalogue — **good content, needs the shell + real logos**
- Content, copy ("built from published credibility themes, not leaked questions"), the six correct universities, 17-question counts, "Free first try" badges: **all good — keep.**
- Add header + footer (G2/G3). Wire real logos (G5).
- Scale plan (client wants *all* UK universities, six featured): keep the six **pinned/featured** at top with a "Most applied" label; below, a searchable list of the rest. Show a total ("120+ UK universities") once populated. Each row still needs city · duration · question count. Empty-state search message is already good.

### Pricing `/pricing` — **strong and honest; three fixes**
- Keep: "Pay once, no monthly bill," the two packs (6/449, 12/799 with 17-question mocks + practice), the per-mock comparison table dated 6 Aug 2026, "check theirs before deciding." This is genuinely good, honest work — protect it.
- **Remove the consultancy block (G7).**
- Add header + footer. Add a short **FAQ** (how manual QR payment works, refunds, what happens after the free 10, is my data private).
- The **"Choose Prep / Choose Serious" buttons are low-contrast outline** — make the primary pack's button a filled/solid button so the CTA is obvious; a pricing card whose button doesn't look clickable loses conversions.

### Interview `/interview/[id]` and Results `/results/[id]` — **re-audit once sign-in works**
Not re-inspected this round (they sit behind the now-fixed sign-in). Must confirm: real university logo in the top bar (not a monogram), no placeholder/`[DEMO]` text visible to a student, an always-available exit/"leave interview" path, and the results page's per-question blocks + honest "not assessed" states (the Behaviour-0% defect QA-204 must be closed).

### Consultancy `/consultancy` — **the home for B2B pricing**
The unlisted page (spec §17) is where the seat/bundle pricing belongs. Give it a proper B2B layout: value prop for consultancies (own logo, own link, keep the margin), the seat tiers, and a "contact us on WhatsApp" CTA. Keep it out of student navigation.

### Missing utility pages
- **404 / error page** with a way home (don't dump a raw Next error on a student).
- **Privacy Policy, Terms, Refund policy** (G4).
- **How it works** (can be a landing section or its own page).

---

## Prioritised punch list

**P0 — blocks a credible public launch**
1. Build a public landing page at `/`; stop redirecting logged-out visitors to `/start`.
2. Add a global footer with legal links, contact, disclaimer, dynamic-year copyright.
3. Create Privacy Policy + Terms + Refund pages (Nepal Privacy Act-compliant).
4. Remove consultancy wholesale pricing from `/pricing` (move to `/consultancy`).

**P1 — needed before inviting real students**
5. Global header/nav with logo + menu (mobile hamburger).
6. Wire the six real university logos everywhere; plan the "all UK universities, six featured" catalogue.
7. Frame the sign-in page (branding, split layout, terms links, back-to-home).
8. Make pricing CTAs solid/high-contrast; add a pricing FAQ.

**P2 — polish that raises perceived quality**
9. Trust signals/social proof near sign-in and pay (only real ones).
10. Desktop composition pass (kill the empty-canvas feel).
11. Interactive/sample results preview on the landing page.
12. 404 and other utility states.

---

## What is genuinely good (protect it)
The honest pricing page, the correct six universities with truthful "themes not leaked questions" copy, the 17-question model, the calm privacy microcopy on sign-in, and the diagnosable sign-in error state are all solid, market-appropriate work. The gaps above are about the missing *frame* around this good content, not the content itself.

Sources: [SaaS landing page conversion 2026](https://unicornplatform.com/blog/saas-landing-page-conversion-system-in-2026/), [SaaS landing best practices](https://www.grafit.agency/blog/saas-landing-page-best-practices), [footer essentials](https://www.orbitmedia.com/blog/website-footer-design-best-practices/), [privacy/terms placement](https://support.wix.com/en/article/adding-your-privacy-policy-or-terms-and-conditions-to-your-sites-footer); plus the live deployed pages and `docs/COMPETITOR_ANALYSIS.md`.
