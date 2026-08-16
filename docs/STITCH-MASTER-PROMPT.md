# Google Stitch — Master Prompt

**Paste Block 0 first. It sets the system for the whole project. Then paste any
screen block; every one of them assumes Block 0 is already in effect.**

Rules for using this file:

- The **behaviour is fixed and must not change.** Every screen below describes a
  flow that has already been built and tested. Stitch is redesigning the surface,
  not inventing the product. Where a rule below says "must", it is because a real
  student broke on it.
- **All copy is final.** Use it verbatim. It has been through a G-9 honesty pass —
  no claim appears that we cannot back.
- **All numbers are real.** NPR 449 = 3 mocks + 15 practice. NPR 799 = 10 mocks +
  20 practice. A mock is 17 questions. The free trial is 10 questions.

---

## BLOCK 0 — THE DESIGN SYSTEM (paste this first, once)

```
You are designing PreCAS Practice, a premium mock-interview product for Nepali
students preparing for the UK Pre-CAS / UKVI credibility interview.

WHO THIS IS FOR, WHICH DECIDES EVERYTHING
A nineteen-year-old in Kathmandu, on a mid-range Android, on mobile data, is
about to sit an interview that decides whether they leave the country. They have
paid money their family may not have much of. They are frightened.

So: calm beats impressive. Nothing bounces, nothing celebrates, nothing
surprises. Premium here means CONFIDENT AND QUIET — the feeling of a serious
institution, not a startup. Think a good university prospectus or a private
bank: generous whitespace, restrained colour, real photography, type doing the
work. Never neon, never gradient-heavy, never playful illustration, never
emoji.

DESIGN FOR MOBILE FIRST AT 360px WIDE, then widen to desktop. The phone is the
primary device, not the fallback.

COLOUR — use these exact values and no others
  Ink (primary text, dark surfaces)   #0d1b2a
  Ink soft (secondary text)           #475467
  Ink quiet (tertiary, captions)      #7a8699
  Paper (page background)             #f7f8fb
  Surface (cards)                     #ffffff
  Surface sunk (tinted panels)        #eff4ff
  Line (borders)                      #e6e9ef
  GO (the single accent)              #0f9d63
  GO dark (accent text/hover)         #0b7d4e
  GO tint (accent backgrounds)        #eaf7f0
  Warn                                #9a6209  on tint #fdf5e7
  Stop                                #b3261e  on tint #fdeceb
  Focus ring                          #2563eb

  GO is used for ONE thing: the action to take on this screen. If two things on
  a screen are green, one of them is wrong. Warn and Stop are never decorative.
  Never use colour as the only carrier of meaning — always pair it with a word
  or an icon.

TYPE
  Headings: Noto Serif. Body and UI: Hanken Grotesk.
  Display 36px/1.1, tight tracking — page titles only
  Title 24px/1.25 — section titles
  Lead 18px/1.55 — the one intro paragraph
  Body 16px/1.6 — the floor, never smaller for anything a person READS
  Label 15px/1.5 — form labels, captions
  Micro 13px/1.35 — status chips and counters ONLY, never prose
  Nothing below 13px anywhere. Inputs are always 16px.

SHAPE AND DEPTH
  Corner radius 12px on controls, 16px on cards.
  One shadow only: 0 1px 2px rgba(13,27,42,.04), 0 8px 24px rgba(13,27,42,.06).
  Borders 1px #e6e9ef. Cards sit on paper, never on other cards.

SPACING
  8px base. Sections breathe: 64px between blocks on mobile, 96px on desktop.
  Max content width 1120px. Text columns never exceed 68 characters.

MOTION
  Tap/hover/focus 120ms. Panels and sheets 240ms. Route change 320ms.
  Nothing exceeds 500ms. Entrances decelerate in; exits just fade, faster and
  more subtly than they entered. Only opacity and transform ever animate.
  Respect prefers-reduced-motion by showing the finished state immediately.

TOUCH
  Every tappable target at least 48x48px with 8px between neighbours.
  On phones the primary action sits in the bottom third of the screen, where a
  thumb rests. Nothing important is reachable only by hover.

TONE OF THE WRITING
  Plain English, short sentences, second person. Never blame the student for
  our failure. Never promise an outcome we cannot deliver — we never say we can
  get anyone a visa or a CAS. When something is locked, say why and say exactly
  what unlocks it.
```

---

## BLOCK 1 — THE IMAGE SYSTEM (paste second, once)

The single biggest gap in the current site is that it has no images at all. This
defines what to add and, just as importantly, what to keep clean.

```
IMAGERY

Photography style: real Nepali students, natural light, muted and slightly
desaturated, shallow depth of field, warm neutral tones that sit beside
#f7f8fb without fighting it. Candid and calm — someone concentrating, not
someone cheering. No handshakes, no thumbs up, no whiteboards, no stock
"business" imagery, no westerners in a UK campus that our student has never
seen.

Every photograph is overlaid with a subtle #0d1b2a gradient at 0 to 55% opacity
where text sits on it, so text always clears 4.5:1 contrast.

WHERE IMAGES GO
  Home hero          One full-bleed portrait-orientation photo on mobile,
                     16:9 on desktop: a young Nepali woman at a small desk with
                     a laptop, headphones around her neck, evening light from a
                     window. Ink gradient from the left on desktop, from the
                     bottom on mobile.
  Home, three steps  Three 4:3 photos: choosing on a phone; speaking to a
                     laptop camera; reading a report on a phone. Same subject
                     across all three, so it reads as one person's journey.
  Home, proof strip  Six university monogram tiles (see below), greyscale at
                     60% opacity, moving slowly and pausing on hover.
  Universities       A monogram tile per university (see below). No photos —
                     this page is a list and photos would slow the scan.
  Interview room     NO IMAGERY AT ALL except the student's own camera feed.
                     This screen is the exam. Anything decorative here is a
                     distraction during the one task that matters.
  Results            No photography. Data visualisation only.
  Dashboard          No photography. One warm illustration in the empty state
                     only.
  Empty states       Simple two-colour line illustrations in #0d1b2a and
                     #0f9d63, thin strokes, no fill, no faces.

UNIVERSITY LOGO PLACEHOLDER — design this as a proper component
  A 56x56px rounded-12px tile, background #eff4ff, 1px #e6e9ef border.
  Inside: the university's initials in Noto Serif, 20px, #0d1b2a, letter-spaced.
  BPP University -> "BPP". University of East London -> "UEL".
  University of West London -> "UWL". University of Wolverhampton -> "WLV".
  Ravensbourne University London -> "RAV". Coventry University -> "CU".
  When a real logo file exists it replaces the initials inside the same tile,
  contained not cropped, with 8px padding. The tile never changes size, so a
  missing logo never shifts the layout.
```

---

## BLOCK 2 — HOME `/`

```
Design the marketing home page for PreCAS Practice.

HEADER (sticky, on every public page)
Left: a 32px rounded-lg #0f9d63 square with a white serif "P", then
"PreCAS Practice" in Noto Serif 18px.
Centre (desktop only): Universities · Practise one question · Pricing
Right, signed out: "Sign in" as text, then a filled ink "Start free" button.
Right, signed in: the student's first name in #7a8699, a pill showing
"3 mocks · 15 practice" in #eff4ff (the pill turns #fdf5e7 with #9a6209 text
when only 1 or 0 mocks remain), "My practice", and an outlined "Sign out".
On mobile the centre nav collapses; the right side keeps the pill and the
primary button only.

HERO — full-bleed photo, ink gradient, text over it
Eyebrow pill: "For Nepali students applying to the UK"
Display heading: "Practise your UK interview before it counts"
Lead: "Sit a real mock Pre-CAS interview for your own university. We listen to
your answers and tell you exactly what to fix."
Primary GO button: "Start free practice"
Secondary text link with a small play triangle: "See how it works"
Under the buttons, micro, muted: "No card, no payment. 10 real questions free."
On mobile the two buttons stack full width and sit in the bottom third.

PROOF STRIP
Micro uppercase label, letter-spaced, centred: "STUDENTS PRACTISE FOR THESE
UNIVERSITIES". Below it the six monogram tiles moving slowly left.

THREE STEPS — three cards, each with its 4:3 photo above the text
Section title: "Three steps to interview readiness"
Sub: "Built to calm your nerves and build real speaking habits."
  1  "Pick your university" — "Questions come from the credibility themes
     universities publish."
  2  "Answer out loud" — "Camera on and timer running, exactly like the real
     interview."
  3  "Get real feedback" — "We tell you what you actually said and how to say
     it better."

WHAT THE FEEDBACK LOOKS LIKE — two columns on desktop, stacked on mobile
Left, title: "Feedback in simple English, on what you actually said"
Body: "We do not just hand you a score. We show you your own words, tell you
what to fix, and give you a better way to say it that you can actually use."
Four ticked lines in #0f9d63:
  "We quote your own words back to you, so you know we listened."
  "If we cannot hear you, we say so and let you try again. We never score an
   answer we did not hear."
  "A better answer in simple English you can say, not a paragraph to memorise."
  "The one most important fix, explained in Nepali."
Right: a realistic sample card, micro label "SAMPLE ANSWER".
  Question, in serif: "Why did you choose to study in the UK?"
  Label "What we heard you say", then in a #eff4ff panel:
   "I choose UK because it have very good education and the degree is recognize
    everywhere."
  Label "A better way to say it", then in a #eaf7f0 panel with a #0f9d63 left
  border: "I chose the UK because it offers a world class education and the
  degree is recognised everywhere."

PRICING — see Block 4 for the card design; on home show the compact version.

FAQ — four rows, chevron accordions, one open by default
  "Is it really free to try?" — "Yes. You get 10 real questions with real
  feedback, with no card and no payment. You only pay if you want to carry on
  after that."
  "Are these the exact questions my university will ask?" — "No, and anyone who
  promises that is not being honest with you. Our questions are built from the
  credibility themes universities publish, so you practise the right subjects
  in the right way."
  "Who can see my answers?" — "Only you. Not your consultancy, not anyone else.
  Your answers cover family income and visa history, and those belong to you."
  "Can you get me a visa or a CAS?" — "No. Nobody can, and anyone who says they
  can is lying to you. We help you practise so you speak clearly and honestly on
  the day."

FOOTER
Three columns: product links, legal (Privacy, Terms, Refund), and contact —
the WhatsApp mark, a "Message us on WhatsApp" button, and the number in plain
readable text underneath, because a button is useless if it fails.
```

---

## BLOCK 3 — SIGN IN `/start`

```
A calm, two-panel sign-in. Left panel (desktop only, hidden on mobile):
background #eff4ff, a soft photo of a student at a laptop, and one quiet line
in serif: "Ten real questions. No card. No account to fill in."

Right panel, centred, max 400px wide:
Title: "Sign in to start"
Body: "We use Google so you never have to make another password. We only ever
see your name and email."
One large white button with the official four-colour Google G and the text
"Continue with Google". This is the ONLY sign-in method — there is no password
field anywhere in this product, and there must never be one.
Below, micro, muted: "By continuing you agree to our Terms and Privacy."
While signing in the button becomes "Signing you in..." with a spinner and stays
the same size, so nothing jumps.
If the popup is blocked, show a calm inline panel — not an error — saying
"Your browser blocked the pop-up. We will open Google in this tab instead."
```

---

## BLOCK 4 — PRICING `/pricing`

```
Title: "Price". Lead: "Pay once. No monthly bill, nothing to cancel. Your
credits do not expire."

THREE CARDS, stacked on mobile, side by side on desktop, the middle one raised.

CARD 1 — free trial, full width above the other two, #eaf7f0 with a 2px
#0f9d63 border.
  Micro uppercase: "START HERE"
  Title: "10 real questions, free"
  Body: "A real mock interview with real feedback. No payment, no account. Find
  out if this is any good before you spend a rupee."
  GO button: "Start free"

CARD 2 — Prep. White, 1px border.
  Micro uppercase: "PREP"     Chip on the right: "MOST POPULAR"
  Sub: "Get comfortable"
  Price, display size: "NPR 449"   then muted "one time"
  Ticked list:
    "3 full mock interviews" — sub "17 questions each, camera on, real exam
    conditions"
    "15 practice sessions" — sub "drill one question at a time"
    "Feedback in English and Nepali"
  Outlined ink button: "Choose Prep"

CARD 3 — Serious. Ink #0d1b2a background, white text, raised, the focal card.
  Micro uppercase: "SERIOUS"   Chip: "BEST VALUE"
  Sub: "Build real confidence"
  Price, display: "NPR 799"   then "one time"
  Ticked list in #0f9d63 ticks:
    "10 full mock interviews" — "17 questions each, camera on, real exam
    conditions"
    "20 practice sessions" — "drill one question at a time"
    "Feedback in English and Nepali"
  GO button: "Choose Serious"

DO NOT show a price-per-mock anywhere. It is deliberately withdrawn.

COMPARISON TABLE below, quiet, bordered, three columns:
  Platform | Entry pack | Try before paying
  PreCAS Practice (row tinted #eaf7f0) | NPR 449 | 10 real questions, free
  Another Nepali platform | NPR 799 | —
Footnote, micro, muted: "Competitor prices taken from their public checkout on
6 August 2026. Packs contain different numbers of interviews, so this compares
only the entry price and the free trial. Prices change, so please check theirs
before you decide."
```

---

## BLOCK 5 — UNIVERSITIES `/universities`

```
Title: "Choose your university"
Sub: "Questions are built from the credibility themes universities publish, not
from any leaked question list."

A large rounded search field, full width, with a magnifier icon:
placeholder "Search for universities, cities...". Below it four filter pills:
All · Pre-CAS · CAS · Pre-Admission. The active pill is #0f9d63 with white text.

RESUME BANNER — when the student has an unfinished interview, this sits ABOVE
everything else, #eaf7f0 with a 2px #0f9d63 border:
  Bold: "You have an interview in progress"
  Body: "You answered 1 of 10 questions. Nothing is lost — pick up exactly where
  you stopped."
  GO button: "Continue your interview"

Section heading with a small #0f9d63 star: "Most applied"
A two-column grid on desktop, one column on mobile. Each card:
  The 56px monogram tile, then the university name in serif 18px, then the city
  in #7a8699.
  A status chip top right: "Free first try" on #eaf7f0, or "In progress" on
  #eaf7f0, or "Needs a pack" on #fdf5e7.
  Two small bordered stat boxes side by side: "Duration / 30 mins" and
  "Questions / 17 Qs".
  One full-width ink button at the bottom. Its label is exactly one of:
  "Start interview", "Continue your interview", "Buy a pack to start",
  "Sign in to start". Never two buttons on one card.

Then "All UK universities" with the count, same card design.

EMPTY STATE, when the search finds nothing — never a dead end:
  "Your university is not on our list yet"
  "That does not stop you. A Pre-CAS interview asks the same themes wherever you
  apply, so you can practise the general UK paper right now and it will still be
  the interview you are about to sit."
  Ink button: "Practise the general UK interview"
  Muted line: "Or try a shorter search — 'Coventry' rather than 'Coventry
  University London'."
```

---

## BLOCK 6 — STUDENT DASHBOARD `/dashboard` (new, and the most important screen)

```
This is the home screen for a student who has paid. It must be readable in
three seconds by a nervous person on a phone. Simple, not sparse — one clear
next action and the numbers they care about, nothing else.

Greeting, serif title: "Good evening, Sita" with the date underneath in muted
micro.

THE BALANCE — the single most important element on this screen, at the very top.
Two large cards side by side (still side by side on mobile, they are only
numbers):
  Card A: a thin circular progress ring in #0f9d63, the number "7" in display
  size at its centre, label under it "mock interviews left", and micro muted
  "of 10 in your pack".
  Card B: same ring in #0d1b2a, "14", "practice questions left", "of 20".
  When either falls to 1 or 0 the ring and number turn #9a6209 and a micro line
  appears: "Running low — top up before your interview."

CONTINUE CARD — only when a sitting is unfinished. Full width, #eaf7f0, 2px
#0f9d63 border, directly under the balance:
  "You have an interview in progress"
  "BPP University · you answered 3 of 17 questions"
  A thin progress bar showing 3/17.
  GO button: "Continue where you left off"
  Muted micro: "Nothing is lost. Your answers are saved."

START CARD — when nothing is in progress:
  "Ready for your next mock?"
  "17 questions, camera on, about 30 minutes."
  GO button: "Start a mock interview"
  Secondary text link: "Or drill one question"

YOUR REPORTS — a simple list, newest first, no table chrome:
  Each row: the monogram tile, the university name in serif, the date in muted
  micro, a coloured band chip on the right (see Block 8 for the four band
  colours), and a chevron. Tapping opens the report.
  Empty state: a small line illustration and "Your first report will appear here
  once you finish a mock interview."

BUY AGAIN — quiet, at the BOTTOM, never a popup and never an interstitial.
A bordered card, not coloured:
  "Need more practice?"
  "Your credits never expire. Add a pack whenever you want."
  Outlined button: "See the packs"

A paid student who has used everything STAYS on this screen. Never send them
back to the marketing home page — they have already bought.
```

---

## BLOCK 7 — THE INTERVIEW ROOM `/interview/[id]`

```
This is the exam. It is the calmest screen in the product and carries no
decoration, no marketing, no imagery except the student's own camera.

STAGE 1 — SETUP CHECK
Title: "Check your setup". Sub: "This interview is recorded with your camera on.
Let us make sure everything works."
A large 16:9 camera preview with rounded corners.
Four status rows, each with a state icon AND a word (never colour alone):
  "Camera — Ready"
  "Microphone — Ready"
  "Internet — Your connection is good"
  "Sound check — Press the button and say your name out loud for three seconds."
A live level meter under the sound check: a thin bar that fills #0f9d63 and
turns #9a6209 with the words "Too quiet — speak louder" when input is low.
Full-width GO button at the bottom, disabled until camera and mic are ready:
"I am ready — start the interview".

STAGE 2 — LIVE
Top bar, ink background, fixed: the monogram tile, university name, "Pre-CAS
mock interview", and on the right "Q 8 of 17" with "3 answered" underneath in
micro. A thin segmented progress rail under the bar — one segment per question,
filled #0f9d63 when answered, hollow when not, outlined when current.

Main column: the question in Noto Serif at 24-28px, generous line height,
never truncated. It is always shown in writing; audio playback is optional and
off by default.

The answer panel below it: a large rounded #ffffff card.
  Header row: "Your answer" on the left, a clock and the countdown on the right.
  The countdown turns #9a6209 in the last 15 seconds.
  DO NOT display live speech-to-text while recording — a student watching their
  own half-finished sentences appear will stop and correct themselves. Show
  instead: "Recording. Keep going — you will see what we heard when you stop."
  If nothing is being picked up after 5 seconds, replace that with a #9a6209
  panel: "We cannot hear you yet. Speak louder, and a little closer to the
  microphone."
  After the answer is processed, show the transcript here in plain text.

The record control: one large circular button, 72px, #0f9d63, white microphone
icon, with a soft pulsing ring while recording. Below it micro muted text:
"Tap to start. Tap again when you have finished."

Right rail on desktop, collapsible sheet on mobile — "Monitor":
  The camera thumbnail with a "Recording" dot.
  Three chips: "Camera On", "Mic On", "Flags 2".
  A sound level bar with a word label.
  Any behaviour notices in plain, non-accusing language, e.g. "Room is too dark
  — your face is a bit dark. Sit facing a window or a light if you can."
  A quiet outlined button: "End interview and see results".

Below the fold, a permanent reminder card, "BUILD EVERY ANSWER THIS WAY":
  P — Point: "Answer the question directly, in one sentence. No long
  introduction."
  E — Evidence: "Give a real fact: a name, a number, a date, a module, a place."
  E — Explain: "Say why that matters for your study plan."
  Wrap up: "One sentence that answers the question again."

FAILURE PANEL — when an answer cannot be used. #fdf5e7 with a #9a6209 border.
Heading must never blame the student. Two buttons: "Record again (2 left)" as
the primary and "Skip this question" as the outlined secondary.

STAGE 3 — THE FREE TRIAL GATE, after question 10 for unpaid students
Two equal choices, the report FIRST:
  Card 1, bordered ink: "See my report" — "Free, ready now, and it is the same
  report a paying student gets for these 10 answers. Nothing is held back."
  Card 2, #eaf7f0: "Finish the whole interview" — "A real Pre-CAS interview is
  17 questions. Buying a pack unlocks the remaining 7 of this same sitting."
  Button "See the packs", and under it "From NPR 449. Pay once, nothing to
  cancel."
No countdown and no urgency on this screen.
```

---

## BLOCK 8 — THE REPORT `/results/[id]` (colour-coded, as discussed)

```
This is the screen the student came for. It is colour-coded by section so they
can see at a glance where they stand, and every colour is paired with a word.

HEADER
Serif display: "Your interview report"
Muted: "BPP University · Pre-CAS mock · 14 August 2026 · 17 questions"

THE BAND — one large card, tinted by result, with the band word large:
  Ready            #eaf7f0 tint, #0b7d4e text, "Ready"
  Almost ready     #eff4ff tint, #1b3a5c text, "Almost ready"
  Needs practice   #fdf5e7 tint, #9a6209 text, "Needs practice"
  At risk          #fdeceb tint, #b3261e tint text, "At risk"
Inside: the overall score as a large number out of 100, a thin horizontal
gauge with four labelled zones so the number has context, and one sentence
written about THIS student that names something they actually said.

THE FOUR SUB-SCORES — a 2x2 grid on mobile, a row of four on desktop.
Each is a card with its own colour band down the left edge, coloured by that
sub-score's own value using the same four-band scale:
  "English clarity", "Real detail in your answers", "Sounding like a genuine
  student", "Interview behaviour".
Each card shows the score, a thin bar, and one line of advice.
When a sub-score could not be judged, show an em dash and the words "Not
assessed — we could not hear enough to judge this." NEVER show zero for
something we did not measure.

CONTRADICTIONS — only when one exists. #fdeceb card with a #b3261e left border:
  "Two of your answers do not match"
  Then both quotes, side by side, each with its question number, and one line
  explaining why an officer would notice.
This is the highest-value thing on the page. Give it real weight.

ANSWER BY ANSWER — an accordion list, one row per question.
  Collapsed row: question number, the question in serif, a small coloured dot
  AND a word for the result, and a chevron.
  Expanded: four labelled blocks, each visually distinct:
    "What you said" — plain text on #eff4ff
    "Point" — white
    "Evidence — your own words" — #eaf7f0 with a #0f9d63 left border, the
    quoted phrase in italic serif
    "What to change" — #fdf5e7 with a #9a6209 left border
  Then one Nepali line in a bordered panel labelled "नेपालीमा": only what went
  wrong and what to do. Never a translation of the whole report.
  A small "Play my answer" audio control.

THE ONE THING TO FIX — a full width ink card near the bottom, white text:
  "If you change one thing before your interview, change this"
  Then the single weakest assessed area and its concrete advice.

ACTIONS at the bottom: GO button "Practise this weakness" and outlined
"Download my report (PDF)".
```

---

## BLOCK 9 — CHECKOUT `/checkout`

```
Title: "Pay to continue". Under it: "Prep: 3 mock interviews and 15 practice
sessions."

PACK SWITCHER at the top — two selectable cards side by side so nobody has to
press Back to change their mind:
  "NPR 449 — 3 mock interviews, 15 practice"
  "NPR 799 — 10 mock interviews, 20 practice"
The selected one has a 2px #0f9d63 border and a filled radio.

THE AMOUNT — a bordered card, centred:
  Micro label "Amount to pay", then the price in display size.

THE QR — directly under the amount, the largest element on the screen:
  A white card containing the payment QR at 220x220px with 16px padding.
  Under it: the wallet name, the wallet number in large mono with a "Copy the
  number" button beside it, and the account name.
  When no QR is set: a #fdf5e7 panel — "Payment details are not set up yet.
  Please contact us on WhatsApp to pay."

AFTER YOU HAVE PAID — a white card:
  "Open your wallet app and copy the transaction number from the receipt. That
  number is how we find your payment."
  Field "Transaction number", with helper text above it: "On your receipt this
  may be called Transaction Code, Transaction ID or Reference Code. They are
  all the same thing." Placeholder: "1NOH8C2  or  697873804".
  Field "Name you paid with".
  Field "Last 4 digits of your phone number", helper: "The phone number your
  wallet is registered to. If it is 98432 05222, type 5222." Placeholder "5222".
  Field "Picture of the receipt (optional)" — a dashed drop zone. Helper: "It
  helps us find your payment faster, but the transaction number above is what
  we actually check. You can skip this."
  Full width GO button: "I have paid".

CONTACT BLOCK under the button, always: the WhatsApp mark, a green "Message us
on WhatsApp" button, and below it "Or call +977 98XXXXXXXX" with the number as
readable, tappable text.

WAITING STATE — after submitting, replace the form with a #eff4ff card:
  "We have your payment details"
  "We are checking your transaction number against our bank record. This is a
  person, not a machine, so it can take a little time. You do not need to pay
  again, and you do not need to stay on this page."
  A three-step tracker: "Payment details received" ticked, "Checking our bank
  record" active, "Credits added" pending.
  A small receipt block showing the amount, transaction number and a short
  reference, with "Keep this reference."
  Then the contact block again, headed "If this is urgent, reach us now."
```

---

## BLOCK 10 — MY PRACTICE `/account`

```
For students who have not paid, this is their history page. Same balance rings
as the dashboard but smaller, then:
  "Your reports" — the same list design as the dashboard.
  "Your details" — level, target university, city, WhatsApp number, each
  editable inline with a pencil icon.
  "Invite a friend" — the referral code in a #eff4ff mono block with a copy
  button, and one honest line: "If they buy a pack, you both get an extra mock."
  "Sign out" as a quiet outlined button at the very bottom.
```

---

## BLOCK 11 — PRACTICE `/practice`

```
Single question drill. Deliberately lighter than the interview room.
Title: "Practise one question"
Sub: "One question at a time, aimed at whatever your last report said you should
work on."
A single large serif question card, the same record control as the room, and a
"Skip to another question" text link. A chip at the top shows what this drill is
for, e.g. "Working on: real detail in your answers".
Balance line, micro: "14 practice questions left."
```

---

## BLOCK 12 — CONSULTANCY PARTNER PAGE `/consultancy`

```
A quieter, more corporate page for a business buyer. No student marketing.
Its own slim header with only the logo and "Partner sign in".
Title: "Give your students the practice"
Lead: "Buy seats in bulk, put your own logo on it, and give your students their
own link. You keep the difference between what you pay and what you charge
them."
Three bundle cards: 20 seats NPR 6,000 · 30 seats NPR 9,000, each showing "about
NPR X per student".
"What each seat gives a student": 10 full mock interviews of 17 questions each,
20 practice sessions, feedback in English with a Nepali summary, your logo and
colours.
A #eff4ff panel, "What you can and cannot see": "You see which of your students
are practising, how much of their pack is left, and how they are progressing
overall. You do NOT see what they actually said. Their answers cover family
income, visa history and personal circumstances, and those belong to the
student. We think that is the right line, and we would rather tell you plainly
than let you find out later."
Two buttons: green "Talk to us on WhatsApp" and outlined "I already have an
account".
```

---

## BLOCK 13 — BACK OFFICE `/admin`, `/super`, `/owner`

```
These are internal tools. Same tokens, denser, no marketing, no imagery.

SHARED LOGIN CARD (all three)
Centred, max 400px. Title, one line of context, one passcode field with a
"Show" / "Hide" toggle on the right inside the field, and one full-width ink
button. Errors appear directly under the field in #b3261e.

/super — SUPER ADMIN
A 240px left sidebar: Dashboard · Students · Payments (with a count badge) ·
Flagged · Payment details. Active item is a filled #0f9d63 pill.
Top bar: "System overview", "Analytics and approvals", and on the right
"Refresh" and "Export to CSV".
Only ONE status banner may be visible at a time — never a success and an error
together.
Dashboard: four stat cards (Total students · Active consultancies · Total
revenue · Pending approvals), then "Where students come from" and "Referral
leaders".
Payments table: Student · Pack · Amount · Transaction ID · Phone (as a tappable
number, with "paid from ...5222" underneath) · State chip · Approve / Reject.
Students table: Student · Phone · Source · Applying through · Status · action.
Payment details tab: the QR upload with a live preview at the size students
see it, wallet name, wallet number, account name, support WhatsApp number, and
one Save button with a "Saved. Students see this now." confirmation.

/owner — a deliberately stark single page. One passcode field, the message
students will see while paused, and one large red-outlined button: "Pause the
whole platform". Under it, plainly: "This closes every page and every action
for everyone, including admins. Nothing is deleted."
```

---

## BLOCK 14 — LEGAL `/privacy`, `/terms`, `/refund`

```
One narrow column, max 68 characters wide, serif headings, generous spacing,
no cards. A short plain-English summary in a #eff4ff panel at the top of each,
then the full text. Privacy leads with: "Your answers belong to you. Nobody at
your consultancy can read them, and nobody at PreCAS Practice reads them either
unless you ask us to."
```

---

## What to hand back

Ask Stitch for each screen at **360px and 1280px**, plus the component sheet:
buttons in all five states, the monogram tile, the balance ring, the status
chips, the four band colours, form fields including the error state, and the
accordion row collapsed and expanded.

**Do not accept any output that changes a flow.** If a screen comes back with an
extra step, a removed confirmation, or two green buttons, it is wrong on the
behaviour and the copy above is the source of truth.
