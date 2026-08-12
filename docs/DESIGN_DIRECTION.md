# Design direction and Stitch prompts

Author: QA plus UI/UX. Date 2026-08-11. Companion to docs/UX_AUDIT.md.
Goal: one consistent, calm, professional, high trust look across the whole product, front office and back office. No dashes in copy, clean and to the point.

## CANONICAL DESIGN REFERENCE (client approved, 2026-08-11)

The client generated and approved a full set of designs in Google Stitch and exported them. They are saved in the repo at `docs/design-reference/`. Each folder has `code.html` (the exact Tailwind markup) and `screen.png` (the approved visual). The design system spec is `docs/design-reference/academic_clarity/DESIGN.md`.

Approved screens: landing_page, sign_in, universities_catalogue, results_report, consultancy_b2b_page, consultancy_admin_dashboard, super_admin_dashboard, owner_kill_switch. Build every page to match these.

Design system name "Academic Clarity": Deep Navy Ink `#0F172A`, Emerald `#10B981` accent, white and light slate (`#F8FAFC`) surfaces, **Noto Serif** display headings, **Hanken Grotesk** body, 8px spacing base, 4px/8px radii, minimal shadows, tonal layering, 48px tap targets, mobile first at 375px, max container 1140px.

**CRITICAL when porting:** use the Stitch LAYOUT only, never its placeholder CONTENT. The Stitch landing invented a "£29 Full Mastery, unlimited" pricing card. Ignore it. Our real offer is unchanged: free 10 question trial, then one time packs NPR 449 (6 mocks) and NPR 799 (12 mocks), each mock 17 questions. Keep the real universities and the honesty guardrails.

## Ported into the codebase this session
- Fonts: Noto Serif + Hanken Grotesk via `next/font` in `app/layout.tsx`, wired to `font-serif` / `font-sans` in `tailwind.config.ts`, body set in `globals.css`. This upgrades typography on every page at once.
- `marquee` keyframe/animation added; `components/TrustedBy.tsx` is the self-moving "Trusted by students applying to top UK universities" logo slider (pauses on hover, static under reduced motion). Wired into the home page in place of the old chips.
- Earlier this session: `SiteHeader`, `SiteFooter`, header/footer on `/` and `/pricing`, consultancy block removed from public pricing, solid pricing CTA, legal pages `/privacy` `/terms` `/refund`.

## Ordered rebuild plan (match each page to docs/design-reference)
1. Home `/`: align hero, three step cards, the "feedback on what you actually said" split with the sample QUESTION ANALYSIS card, and pricing teaser to `landing_page`. Keep real packs.
2. Sign in `/start`: two column split per `sign_in` (value prop left, Google button right, Terms/Privacy links). Add logo linking home.
3. Universities `/universities`: card grid per `universities_catalogue`, real logos, six pinned as "Most applied", rest searchable.
4. Results `/results/[id]`: verdict card + sub score tiles + per question blocks per `results_report`, keeping "Not assessed" and no fabricated score.
5. Consultancy B2B `/consultancy`: per `consultancy_b2b_page`, holds the seat/bundle pricing.
6. Admin `/admin`, Super admin `/super`, Owner `/owner`: rebuild to `consultancy_admin_dashboard`, `super_admin_dashboard`, `owner_kill_switch`. Calm dashboards, cards, clear tables, same palette. No transcript content to admins, least privilege.
7. Add a 404 page.

## Lifecycle screens still to design and build (client question: generalise, do NOT need new Stitch mockups)
The 8 Stitch screens cover the main surfaces. The remaining lifecycle screens can be built by generalising Academic Clarity, no new Stitch needed: device check, interview room, the report gate after question 10 (choice: pay to continue or see report), the QR payment screen with payer details + screenshot upload, the approval pending / contact on WhatsApp state, the soft deny state, and the various empty/error/loading states. Build these in the same system.

## Open data gap
The larger UK university list Codex reportedly saved as CSV is NOT in the current repo (only the 6 approved in `lib/data/institutions.ts` plus 6 SVGs in `public/university-logos/`). To populate the full catalogue and the trust slider with many logos, that CSV and its logos must be located. Until then the slider and catalogue use the 6 approved.

## merotestbooking.com colour note
Client asked to note it for future alignment but keep the Stitch palette for now. merotestbooking.com is a client rendered React app (theme-color `#000000`); its full palette needs a rendered look via the browser. Deferred: align to Mero colour theory later; today the Stitch "Academic Clarity" palette stands.

## Design system (already in the codebase, keep it consistent)

- Colours: ink navy `#0d1b2a` (headings, primary buttons, footer), paper `#f7f8fb` (page background), white cards, emerald green as the single accent for success and primary highlights. Brand colour is a CSS variable so a consultancy can override it at `/c/[slug]`.
- Type: serif (Georgia stack) for display headings, system sans for body. Body minimum 16px.
- Controls: every button and tappable control is at least 48px tall. Solid ink or emerald for primary actions, outline for secondary. No low contrast disabled looking buttons as the main call to action.
- Layout: mobile first at 360px, then widen. Content in a centred max width container with generous whitespace. Every marketing page uses the shared `SiteHeader` and `SiteFooter`.
- Tone: calm, warm, plain English. Trust cues sit next to the sign in button and the pay button, not only in the footer.

## What has been coded this session

- `components/SiteHeader.tsx`: sticky header, logo links home, nav (Universities, How it works, Pricing), Sign in link and a solid Start free button. Collapses cleanly on mobile.
- `components/SiteFooter.tsx`: full footer with brand block, Practise, Help and Legal link columns, WhatsApp contact, the practice not immigration advice disclaimer, and a dynamic year copyright.
- Home `/`: header and footer wired in, how it works section given an id anchor.
- Pricing `/pricing`: header and footer wired in, the primary pack button is now solid high contrast, and the consultancy wholesale block (NPR 240 per seat) was removed from this public student page (moves to the unlisted `/consultancy`).
- Legal pages created so footer links resolve: `/privacy`, `/terms`, `/refund` (working drafts, grounded in the recorded data and pricing decisions, marked for Nepali legal review).

## Remaining coding tasks (for the coder at reset)

1. Wire the real university logos everywhere (catalogue cards, home chips, interview top bar). The six SVGs are in `public/university-logos/`. Add a `logoUrl` to the institution data and render it with the monogram as fallback. This is the biggest single trust win still open.
2. Add `SiteHeader` and `SiteFooter` to `/universities` and `/consultancy` for consistency. Do not add them to the interview room or results, which have their own top bar.
3. Frame the sign in page `/start`: add the logo at top linking home, a short line saying what they are signing into, and on wide screens a two column split with the value proposition on the left and the Google button on the right. Add small Terms and Privacy links under the button.
4. Build the `/consultancy` B2B page (unlisted, like `/owner`) that holds the seat and bundle pricing removed from `/pricing`.
5. Universities catalogue at scale: keep the six approved universities pinned and labelled Most applied, with the rest of the UK universities searchable below. Show a total count.
6. Redesign the back office to the same standard (see prompts below): `/admin`, `/super`, `/owner`. These currently look like bare forms. They should feel like a calm, modern dashboard: a simple top bar, cards, clear tables, and the same ink and emerald palette.
7. Add a 404 page with a way home.

## Stitch prompts (paste one at a time into Google Stitch, Web mode)

Keep the brand line in each prompt so the set looks like one product.

Brand line to reuse: calm, professional, student first, deep navy ink with an emerald green accent, serif display headings, clean sans body, mobile first, generous whitespace, large tap targets, no clutter.

1. Landing page: "A calm, professional, student first landing page for PreCAS Practice, a tool that helps Nepali students practise the UK Pre CAS interview and get honest AI feedback. Deep navy ink with an emerald accent, serif headings, clean sans body, mobile first. Sticky header with logo left and links Universities, How it works, Pricing plus a solid Start free button. Hero with a short confident headline, one sentence, a primary Start free button, a secondary See how it works link, and a small line No card, no account, 10 real questions free. A strip of UK university logos. A three step how it works row. A benefit section about feedback on what you actually said in simple English. A small results report preview card. A two pack pricing teaser. A short FAQ. A full footer with contact, WhatsApp, Privacy, Terms and a practice not immigration advice disclaimer."

2. Sign in page: "A calm sign in screen for PreCAS Practice, deep navy ink with emerald accent, serif heading, clean sans body, mobile first. Two column on desktop: left side has the logo, a short headline Practise your UK interview, three reassurance points and a strip of university logos; right side has a single Continue with Google button with a short privacy line under it and small Terms and Privacy links. On mobile it stacks with the button clearly in the thumb area. Uncluttered and high trust."

3. Universities catalogue: "A clean catalogue page to choose a university, deep navy ink with emerald accent, mobile first. Sticky header. A big heading Choose your university, a short honest line saying questions are built from published credibility themes. A search box. Filter chips. A grid of university cards, each with the real university logo, name, city, duration and question count, a Free first try badge and a solid Start interview button. Six featured universities pinned at the top labelled Most applied, more universities searchable below."

4. Results report: "A calm results page for a practice interview, deep navy ink with emerald accent, mobile first. A verdict card showing a band label first and a smaller percentage, but if an answer was not heard it clearly says Not assessed and never a score. Four sub score tiles. A behaviour table with plain English. Per question blocks each showing the student answer, what the interviewer noticed, and a better way to say it labelled as a structure to adapt not a script to memorise, plus one line of Nepali. Buttons to practise the weakest answers and to download a report."

5. Consultancy B2B page: "A professional business page for education consultancies, deep navy ink with emerald accent. A clear value proposition: buy seats in bulk, put your own logo on it, give students their own link, keep the margin. Seat and bundle pricing tiers as cards. A short how it works for consultancies. A Contact us on WhatsApp button. Trustworthy and simple, aimed at a business buyer not a student."

6. Admin dashboard: "A calm, modern consultancy admin dashboard, deep navy ink with emerald accent, clean and uncluttered. A simple top bar with the consultancy name and a sign out. Summary cards showing seats total, seats used, seats left and active students. A clear table of the consultancy own students with name, status, last active, mocks used and entitlement, but no transcript content. A share your link box. A branding settings area for logo and colour."

7. Super admin dashboard: "A calm, modern super admin dashboard for the whole platform, deep navy ink with emerald accent. A top bar and a left menu. Overview cards for total students, total consultancies, estimated revenue and pending approvals. Sections, clearly separated, for direct students and for each consultancy. An approvals queue with approve and reject and a running count. A flagged trials review queue. A referral leaderboard. An attribution report of which consultancies direct students named. Export to CSV buttons. Least privilege, no passwords or transcript text shown."

8. Owner kill switch: "A very simple, serious owner control page, dark and calm, deep navy ink with emerald accent. One clear switch to pause or resume the whole platform, a field for a contact name and phone shown to students while paused, and a small audit list of who changed it and when. Minimal, unmistakable, hard to press by accident."

## How to use the output

Stitch gives a visual and exportable markup. Do not paste its markup in raw. Rebuild each screen with the existing Tailwind tokens and the shared header and footer so the whole product stays consistent, then QA each against docs/UX_AUDIT.md and the four states rule in AGENT_BUILDER.md.
