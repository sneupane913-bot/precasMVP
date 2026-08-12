# UX audit round 2, live site, 2026-08-12

Audited every public page, every route, the auth gate, the logos and the links on the deployed site. This is the defect list to fix before anything else. The approved designs are in `docs/design-reference/` and the live build does not match them.

Client verdict: the current build looks unprofessional and does not follow the approved Stitch design. Agreed after inspection.

---

## BLOCKERS

### B1. Anyone can start an interview without signing in (CRITICAL, security + business)
`POST /api/session/create` returns **200 ok with no authentication at all** (tested with `credentials:'omit'`). `/api/me` reports `signedIn:false` while a session is still created.
Also the home primary button points at `/universities`, not `/start`, so the whole sign-in gate is bypassed by design.
**Required:** no session, no interview, no university page action without a signed-in user. Home CTA goes to `/start`. `/universities`, `/interview/*`, `/results/*` require auth server-side, and `create` returns 401 when not signed in.

### B2. University logos are invisible (CRITICAL, visual)
`bpp.svg` and `uel.svg` contain `fill: #fff` (white artwork intended for dark backgrounds). On our light panels they disappear. This is exactly what the client saw on `/start`: BPP visible, the rest blank.
`coventry` is `#06c`, `wolverhampton` `#333`, `uwl` gradients, `ravensbourne` dark. The set is inconsistent, so no single background works.
**Required:** normalise the logo wall to a single ink tone (`filter: brightness(0)` plus opacity) so every mark is visible and consistent, or ship dark-background variants. Note: monochrome logo walls are standard, but `public/university-logos/README.md` says do not recolour, so record the decision.

### B3. The live design does not match the approved Stitch design
Home has only two sections (`Feedback on what you actually said`, `Pay once, not monthly`). The approved `landing_page` has: hero with **two** CTAs, trust strip, **Three steps to interview readiness**, feedback split **with the QUESTION ANALYSIS sample report card**, **Simple, transparent pricing**, FAQ, full footer.
Confirmed missing on live: secondary CTA `See how it works` (absent), the sample report card (absent).
`/universities` does not match `universities_catalogue`: no **Most applied** section, no filter chips, no per-card **Duration / Questions** stat boxes, no proper search styling.
**Required:** rebuild `/` and `/universities` to the approved screenshots.

---

## HIGH

### H1. Pricing is not attractive and has no hierarchy
Client reference: higgsfield.ai. Wants clear visual separation, colour, and **size hierarchy**: the **NPR 799 pack larger and the focus**, NPR 449 smaller, plus the **free** card kept.
Live pricing renders three cards with weak differentiation and the CTA hierarchy is flat.
**Required:** free card + 449 (smaller) + 799 (larger, elevated, badged BEST VALUE, brighter accent). Keep the honest per-mock comparison table.

### H2. No header or footer on half the product
Missing on `/start`, `/consultancy`, `/checkout`, `/admin`, `/super`, `/owner`, `/interview/*`, `/results/*`.
`/start` and the interview room are intentionally chrome-free, but `/consultancy` and `/checkout` should carry the shell, and the back office needs its own consistent shell.

### H3. Back office is unstyled and does not match its approved designs
`/admin` (1 button, 0 links), `/super` (1 button), `/owner` (2 buttons) render as bare forms. Approved designs exist: `consultancy_admin_dashboard`, `super_admin_dashboard`, `owner_kill_switch`.

### H4. `/results/fake-id` returns a 404 page with no way forward
Status 404, no header, no footer, no link home. A student who reloads an old result hits a dead end.

### H5. `/interview/fake-id` returns 200 for a session that does not exist
Should be 404 or a clear recovery screen, not a 200 shell.

---

## MEDIUM

- **M1.** `/nonexistent-page-xyz` shows the bare Next.js 404 with no header, footer or link home.
- **M2.** Home page has no FAQ section despite the approved design including one (the string match was a false positive from the footer).
- **M3.** `/checkout` (`Pay to continue`) has 0 links and 0 buttons in the server HTML, so it is entirely client-rendered with no no-JS fallback and no way back.
- **M4.** `/consultancy` has only 2 links and no shell, so a partner landing there cannot navigate anywhere.
- **M5.** The trust strip heading is `Trusted by students applying to top UK universities` while only 6 universities exist. Fine, but the slider must not look sparse once logos are normalised.

---

## What is actually correct (do not break)

- All 15 routes respond; no server errors.
- Header and footer correct and consistent on `/`, `/pricing`, `/universities`, `/privacy`, `/terms`, `/refund`.
- Every internal link resolves 200 (`/`, `/pricing`, `/privacy`, `/refund`, `/start`, `/terms`, `/universities`). No broken links.
- Legal pages exist and render.
- Pricing content is honest: free trial first, real packs, dated per-mock comparison, no invented plan, no NPR 240 seat leak.
- `/universities` correctly shows 5 public universities (Ravensbourne withheld pending logo permission) with `Free first try` badges.

---

## Fix order

1. B1 auth gate (security, and it changes routing everywhere).
2. B2 logo normalisation (one CSS change, instantly fixes the worst visual).
3. B3 rebuild `/` and `/universities` to the approved designs.
4. H1 pricing hierarchy with the 799 as hero.
5. H2 shell coverage, H4/H5/M1 dead ends and 404s.
6. H3 back office to its approved designs.
