## Context

PrimeIcons glyphs are used across the entire UI (shell brand, spinners, empty states,
action buttons). ATSE1-68 reports them rendering as empty boxes during the UX
walkthrough. Investigation of the current state shows the wiring is already correct:

- `frontend/package.json` declares `"primeicons": "^7.0.0"`.
- `frontend/angular.json` lists `node_modules/primeicons/primeicons.css` first in the
  build `styles` array.
- The package ships the font files (`primeicons.woff2/.woff/.ttf/.eot/.svg`) and a
  standard `@font-face` plus `.pi` base class. `@angular/build:application` rewrites the
  relative `url()` references and bundles/serves the fonts.

So the dependency/build wiring needs only **verification**, not repair. The genuinely
missing piece is resilience: there is no fallback, so if the font ever fails to load
(CDN/proxy stripping, cache miss, MIME issue, offline) icon slots collapse or show
tofu, breaking layout — exactly the failure mode the ticket describes.

## Goals / Non-Goals

**Goals:**
- Confirm and document the existing PrimeIcons dependency + build-styles wiring.
- Add a layout-preserving "no icon" fallback in `styles.scss` for the `.pi` base class.
- Keep the change minimal and confined to the three files named in the ticket.

**Non-Goals:**
- Replacing PrimeIcons with SVGs or an alternative icon system.
- Touching individual component templates or per-icon classes.
- Backend, API, or build-pipeline changes.

## Decisions

- **Treat dependency/styles wiring as a verification step, not a code change.** Both
  are already correct; re-adding them would be churn. The tasks capture the verification
  explicitly so the acceptance criteria are evidenced. *(Alternative: blindly re-add —
  rejected as unnecessary and risk of duplicate style entries.)*

- **Implement the fallback by giving `.pi` a reserved inline-block box.** Add a rule in
  `styles.scss` that ensures every `.pi` slot has `display: inline-block` with a
  `min-width`/`line-height` of `1em` so the slot occupies consistent space whether or
  not the glyph paints. Combined with PrimeIcons' own `font-display: block` (which keeps
  the glyph area blank rather than swapping in a system font during/after a failed
  load), this means a failed font shows an empty-but-correctly-sized slot instead of
  tofu or shifted layout. *(Alternative: a `::before { content: "" }` reset on `.pi` —
  rejected because PrimeIcons sets the glyph via the element's own font/content and a
  blanket reset could blank working icons.)*

- **Keep the rule additive and scoped to `.pi`.** It augments, never overrides, the
  PrimeIcons stylesheet that loads ahead of `styles.scss` in the `styles` array, so the
  cascade order guarantees our fallback wins only on layout properties, not on glyph
  content.

## Risks / Trade-offs

- [The "empty box" may be caused by something environment-specific (e.g. a dev proxy
  not serving `.woff2`) rather than missing config] → The fallback makes the failure
  graceful regardless of root cause; verification tasks document the wiring so a future
  environment-specific issue is faster to triage.
- [A `min-width` on `.pi` could slightly affect spacing of inline icons that currently
  rely on natural glyph width] → Use `1em`, matching the icons' own `line-height: 1`
  font box, so visible-icon layout is unchanged.
- [No automated test can truly assert font rendering in jsdom] → Coverage is the spec
  scenarios (wiring inspection + manual UX verification of brand icon and spinner);
  jsdom cannot load fonts, so visual confirmation stays a manual walkthrough step.
