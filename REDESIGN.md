# The Redesign

**One file. Everything that changes, why, and the test that proves it.**

Written 16 August 2026. This supersedes nothing — `RULES.md` still governs
behaviour. This governs **what a person sees and can reach**, which is the layer
every defect of the last three days lived in.

---

## Part 0. Why the old rules were not good enough

The client's instruction was specific: *"some of the rules that we have were a
bit ambiguous, so make sure that this time whatever rules there are, it works to
be the best."*

He is right, and the reason is measurable. `RULES.md` has 100 rules marked
**BUILT + PROVEN** and 501 assertions behind them. Every single defect he found
by hand got past all of it. Not because the tests were weak, but because of
**how the rules were worded.**

A rule like *"the header shows who is signed in"* is ambiguous in the one way
that matters: it does not say **when**. So a test can prove the header renders a
name, and the product can still show "Sign in" to a signed-in student for four
seconds on every page load, and both statements are true at once.

### The rule for writing rules, from here on

> **A rule must name the thing that would make it false.**

If you cannot finish the sentence *"this rule is broken when..."* with something
a machine or a person can observe, the rule is not written yet. Every rule below
carries its own falsifier. No exceptions, no "obviously", no "should feel".

### The five defect shapes, named so they can be looked for

Every bug found on 13–16 August is one of these. They are listed because the
next person will introduce them again, and knowing the shape is faster than
knowing the instances.

| # | Shape | The instances |
|---|---|---|
| **F-1** | **A conclusion rendered where a state should be.** Two different situations collapsed into one sentence, and the sentence is false in one of them. | Header said "Sign in" while loading. `/universities` said "You have used your free questions" while a sitting was resumable. |
| **F-2** | **A number written down instead of derived.** Two sources of truth allowed to disagree on screen. | `currentIndex` vs answers → "Q 8/10 · 1 done, 9 left". `/consultancy` promised 12 mocks where 10 were granted. "From NPR 449" after the price changed. |
| **F-3** | **A control whose destination was never checked.** No API test can see where a `<Link>` points. | "Choose Prep" → `/start` → `/universities`. Skip advanced a browser counter and told the server nothing. |
| **F-4** | **A server feature with no door.** The endpoint works, no screen calls it, so the feature does not exist to the only person who needs it. | `setPaymentSettings` (QR, wallet, support number). `payerPhone` in the payments API. `whatsappNumber` in the directory. Ten more found by `reachable-check`. |
| **F-5** | **Proof of the code mistaken for proof of the product.** | Nine green suites while the live site served a build from before the price change. Four tests that passed by matching a code comment. |

**Every rule in this document states which shape it guards against.**

---

## Part 1. The design position

The client's words: *"minimalistic, plain, easy"*, Apple-like, and *"this UI is
not working with me at all."* Grounded in the genjutsu principles he pointed at,
plus what this product actually is.

### What this product is, which decides the design

A nineteen-year-old in Kathmandu, on a mid-range Android, on mobile data, is
about to sit an interview that decides whether they leave the country. They have
paid money they may not have much of. **They are frightened.**

That single fact settles most design arguments before they start:

- **Calm beats impressive.** Nothing bounces, nothing celebrates, nothing
  surprises. A product that feels playful while somebody is scared reads as not
  understanding them.
- **One decision per screen.** A frightened person scanning six options takes
  none of them.
- **Never hide state.** Every number that matters — questions left, mocks left,
  where you are in the paper — is visible without navigating.
- **Silence is a defect.** If nothing happens within 100ms of a tap, say so.

### D-1 · Tokens, and nothing outside them

Three to five durations, three to five easings, one type scale, one spacing
scale, one palette. Named and centralised in `app/tokens.css` and
`tailwind.config.ts`.

> **Broken when:** any `.tsx` file contains a raw hex colour, a raw `cubic-bezier`,
> a `duration-[...]` arbitrary value, or a font size outside the scale.
> **Test:** `design-check.js` greps every component. F-2.

### D-2 · Motion durations come from context, never from taste

| Context | Duration |
|---|---|
| Hover, focus, toggle | 120ms |
| Modal, drawer, tab, sheet | 240ms |
| Route transition | 320ms |
| Scroll-driven | no duration, progress-based |

The rule underneath: **the more often it plays, the shorter it must be.** A
button hover fires a thousand times a day and gets opacity. A first-report
reveal fires once and can afford choreography.

> **Broken when:** any transition exceeds 500ms, or a duration appears that is
> not one of the four. **Test:** `design-check.js`. D-2 guards F-2.

### D-3 · Easing comes from direction

Entering `ease-out`. Exiting `ease-in`. Between states `ease-in-out`.
Scroll-synced `linear`. **Exit is always more subtle than enter** — enter may
move and fade; exit only fades.

> **Broken when:** an entrance uses `ease-in`, or an exit animates transform.

### D-4 · Only `transform` and `opacity` are animated

Never `width`, `height`, `top`, `left` — they trigger layout every frame on the
exact hardware our students use. Never `scale(0)`; scale to 0.95 and fade.

> **Broken when:** a keyframe or transition names a layout property.

### D-5 · Reduced motion is a requirement, not a courtesy

`@media (prefers-reduced-motion: reduce)` must deliver **the finished state, not
a broken one.** A reduced-motion student sees the composition, not the journey.

> **Broken when:** the stylesheet has no reduced-motion block, or an element is
> left mid-transition when motion is disabled.

### D-6 · Mobile is the primary target, not the fallback

The client: *"the priority should also be given to the phone version."*

- Every tappable target **≥ 44×44px**, with ≥ 8px between adjacent targets.
- The primary action of every screen sits in the **bottom third** — the thumb
  zone — on viewports under 640px.
- **No behaviour may depend on hover.** Hover is decoration on top of something
  that already works by tap.
- Designed at **360px wide first**, then widened. Not the reverse.

> **Broken when:** a button computes below 44px, or a control's only affordance
> is a hover state. **Test:** `design-check.js` + the phone pass.

### D-7 · Nothing jumps

Every element that resolves asynchronously reserves its final size first. A
header that grows when a name arrives moves the button a thumb is already
travelling towards.

> **Broken when:** a placeholder has no explicit width and height. This is
> already enforced by `header-check` H-4 and generalises here.

### D-8 · Type carries the hierarchy, not colour or weight alone

One serif for headings (already `font-serif`), one sans for everything else.
Body text ≥ 16px — never smaller, because iOS zooms the page on focus for
anything under 16px and the layout breaks under the user.

Three floors, by what the text is *for*:

| Purpose | Floor | Token |
|---|---|---|
| Anything a student **reads** — prose, instructions, questions | 16px | `text-base` |
| Labels and captions | 15px | `text-sm` |
| Glanceable chrome — status chips, counters, the monitor panel | 13px | `text-micro` |

**Nothing below 13px, ever.** The first pass of this rule said "nothing below
15px" and immediately failed on twenty existing places using 10px and 11px. The
honest resolution was not to soften the rule to fit the code, and not to force a
15px status chip that no longer fits its badge — it was to separate *reading*
from *glancing*, which are different acts with different floors. 10px and 11px
are gone entirely; those were the ones doing real harm to a nervous
nineteen-year-old on a phone.

> **Broken when:** an input is below 16px, or any text is below 13px, or
> `text-micro` is used for prose rather than chrome.

### D-9 · Contrast holds at every frame

WCAG AA (4.5:1 body, 3:1 large) — **including mid-transition.** Fading text is
where contrast quietly drops below the line.

> **Broken when:** a computed pair fails AA. **Test:** contrast pairs asserted
> in `design-check.js` against the token values.

---

## Part 2. The student dashboard

The client's request, and the fix for the worst open defect at the same time.

### Why it is one job with D-41

D-41 is *"paying restarts the paper instead of unlocking the remaining 7."* His
own diagnosis of why it hid for so long is the design brief:

> *"If there was a dashboard, I could literally see that seven questions were
> remaining for me."*

There is no screen in the product that shows "7 questions remaining." So the
defect was invisible until he paid real money and pressed Continue. **Fixing
D-41 without building the surface that would have shown it just hides it
again.** Hence: one job.

### DB-1 · A paid student lands on the dashboard, and stays there

On Google sign-in, the server decides: **has this student ever paid?** Paid →
`/dashboard`. Unpaid → the current journey.

Crucially: **a paid student who exhausts everything stays on the dashboard.**
Today they are dropped onto the marketing home page, which tells somebody who
has already given us money to consider giving us money.

> **Broken when:** any route sends a `hasPaid` student to `/`.
> **Test:** `route-check.js` extended; `dashboard-check.js` drives both cases.
> Guards F-3.

### DB-2 · The dashboard shows state, never a conclusion

Every number is derived at request time from the ledger and the sessions. It
shows, always:

1. **The sitting in progress**, if there is one — university, `answered of
   total`, and one button that resumes it.
2. **Questions remaining in the current paper**, named as a number. This is the
   line that makes D-41 impossible to hide.
3. **Mocks left and practice left**, from `SUM(delta)`.
4. **Every past report**, newest first, each openable.
5. **The buy-again prompt**, and only here — never as an interstitial.

> **Broken when:** any figure on the dashboard is stored rather than computed, or
> the page says "you have used everything" while `inProgress` is non-null.
> Guards F-1 and F-2.

### DB-3 · No popup, ever

The client rejected it outright: *"I don't want the dismissible popup."*
Recorded so nobody rebuilds it.

> **Broken when:** any modal renders without a user action that requested it.

---

## Part 3. The open defects, each with its falsifier

| ID | Defect | Fix | Broken when |
|---|---|---|---|
| **D-41** | Paying restarts the paper instead of unlocking the remaining 7 | Paying raises `questionsAllowed` on the **existing** sitting; the paper is never rebuilt | A paid student's `questionIds` change, or `answers` are orphaned, after payment |
| **D-44** | Chip read "2 mocks left" before any sitting | Reconcile chip against `SUM(delta)`; find whether the chip lied or a credit was spent | Header count ≠ ledger balance at any moment |
| **D-42** | `/super` logs out on reload; no logout button | Persist the passcode session; add an explicit Log out | A reload of `/super` returns to the passcode box, or no logout control exists |
| **D-43** | "Answer again" silently costs a paid provider call | State the cost before the retry, and count it | A retry is offered without saying it re-marks the answer |
| **D-38** | Retry re-records instead of re-sending stored audio | Re-send the audio we already hold | A student is asked to re-speak an answer we still have |
| **D-32** | Super admin status dots unclear | Label them | A status is conveyed by colour alone (also fails D-9) |
| **D-34** | Results page colour coding | Tie colour to the band, and never colour alone | Same as above |

D-38 and D-43 are **one story** — the retry path — and get designed once.

---

## Part 4. The universities page

The client: *"I don't want the university page to be looking something like
this."*

### U-1 · Search first, and search that forgives

A Nepali student types "coventry", "Coventry Uni", "CU London". All three find
it. Diacritics, case and partial words all match.

> **Broken when:** a known university is not found by its common short form.

### U-2 · Real logos, self-hosted

Currently placeholder boxes. Download each, store in `public/logos/`, serve with
explicit width and height so nothing reflows (D-7).

> **Broken when:** a listed university has no logo file, or an `<img>` lacks
> dimensions.

### U-3 · One card, one action

No card shows two competing buttons. The action reflects real state:
Start / Continue / Buy a pack — never a label that promises something the server
will refuse.

> **Broken when:** a card's label and the server's answer disagree. Guards F-1.

---

## Part 5. The test plan that would have caught these

The client's diagnosis, which is correct: **we tested screens, not journeys.**

### T-1 · Journeys, not pages

Each journey is one test that walks a whole person end to end, in order, with no
resets:

1. **Never paid, finishes the free ten** → report → offered a pack.
2. **Never paid, abandons at Q2, returns three days later** → resumes at Q2,
   not Q3, with nothing lost.
3. **Pays mid-paper** → the remaining 7 unlock **on the same paper**. (D-41)
4. **Paid, exhausts everything** → stays on the dashboard, is offered more.
5. **Consultancy student** → never shown a price, never asked to pay.
6. **Super admin approves a payment** → student's balance changes, and the row
   and the dashboard agree.

> **Broken when:** any journey passes as a sequence of green steps while the
> end state is wrong. Each journey asserts the **end state**, not just the steps.

### T-2 · Every control is followed, not just called

`route-check.js` already extracts destinations statically. The journey suite
must additionally **click** the primary control of every screen and assert where
it lands. Guards F-3.

### T-3 · Reachability is a build gate

`reachable-check.js` fails the build when a server action has no screen calling
it. It exists because F-4 shipped ten times.

### T-4 · The deploy is verified, not assumed

After every push, assert the live build serves the commit we pushed. Nine green
suites once sat on top of a build from before the price change.

> **Broken when:** the live site's build id is not the last commit. Guards F-5.

### T-5 · The phone pass is part of the definition of done

Camera, microphone, the meter, the countdown, install, and the thumb zones — on
a real mid-range Android, on mobile data. **No suite substitutes for it, and
nothing ships without it.**

---

## Part 6. Order of work

1. Tokens and the motion system (`D-1`…`D-9`) — everything else is built on them.
2. The dashboard and sign-in routing (`DB-1`…`DB-3`), which carries **D-41**.
3. The universities page (`U-1`…`U-3`).
4. The remaining defects: **D-42, D-44, D-38 + D-43, D-32, D-34**.
5. `design-check.js` and `dashboard-check.js`, each verified by mutation.
6. The journey suite (`T-1`, `T-2`).
7. Deploy verification (`T-4`), then the new GitHub, Netlify, Firebase domain
   and environment variables.
8. The phone pass (`T-5`).

---

## Part 7. How every new test must be verified

Not negotiable, and it is the practice that has caught the most this week:

> **Break it on purpose before trusting it green.**

Every suite added here ships with its mutation log — the list of deliberate
breakages it was shown to catch. `copy-check` was written twice because its own
mutation test proved version one could not see a **stale** number, which was the
entire defect. **A suite that has never been seen to fail proves nothing.**

And one narrower rule, learned four times the hard way:

> **When asserting on source, strip comments first, or parse the construct.
> Never grep the raw file.**

---

## Part 8. Mutation log for `design-check.js`

Ten deliberate breakages, all caught:

| # | Breakage | Caught by |
|---|---|---|
| M1 | A raw hex creeps back into a component | D-1a |
| M2 | A duration exceeds 500ms | D-2b |
| M3 | A keyframe animates `height` | D-4a |
| M4 | `scale(0)` returns | D-4b |
| M5 | Reduced motion freezes instead of finishing | D-5b |
| M6 | The focus ring is removed | D-5c |
| M7 | An input drops below the 16px iOS floor | D-8a |
| M8 | 10px text returns | D-8b |
| M9 | A token pair drops below WCAG AA | D-9 |
| M10 | A control's only affordance becomes hover | D-6b |

### And one lesson from the mutation run itself, which matters more than the table

**M1 passed on the first attempt, and it should not have.** The check was fine —
the *mutation* never applied. It tried to replace a class name that did not exist
in the file it targeted, so nothing changed, the suite legitimately stayed green,
and for a moment it looked as though the flagship rule had a hole in it.

> **A mutation test that does not verify the mutation applied proves nothing.**

That is defect shape **F-5** wearing yet another costume: proof that the test
*ran*, mistaken for proof that the test was *tested*. Every mutation from here on
asserts that the file actually changed before reading the result.
