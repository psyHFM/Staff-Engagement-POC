## Why

During the UX walkthrough (2026-06-25, ticket ATSE1-68, Critical) the shell brand
icon (`pi-th-large`) and loading spinners (`pi-spinner`) rendered as empty boxes or
fell back to bare text. Icons appear across the whole UI (shell, spinners, empty
states, action buttons), so a missing or unloaded PrimeIcons font degrades every
screen. The PrimeIcons wiring needs to be verified and made resilient so the layout
never breaks when the icon glyph is unavailable.

## What Changes

- **Verify** (no code change expected) that `primeicons` is declared in
  `frontend/package.json` and that `node_modules/primeicons/primeicons.css` is loaded
  via the `angular.json` build `styles` array. Investigation confirms both are already
  in place and the font files (`.woff2`, `.ttf`, etc.) ship with the package, so the
  build correctly bundles and serves the font.
- Add a resilient **"no icon" fallback** in `frontend/src/styles.scss` so that if the
  PrimeIcons font fails to load (or a glyph is missing), `.pi` icon slots reserve their
  layout space and stay visually inert instead of collapsing the layout or showing
  tofu/garbled fallback text.
- Document in `styles.scss` how PrimeIcons is wired so the loading mechanism is
  discoverable from the stylesheet.

## Capabilities

### New Capabilities
<!-- None. This is a bug fix to existing frontend foundation behaviour. -->

### Modified Capabilities
- `frontend-foundation`: extends the existing "Angular 22 workspace shell" wiring
  ("PrimeIcons SHALL be wired") with a requirement that the icon font loading is
  verifiable and that icon rendering degrades gracefully via a layout-preserving
  fallback when the font or a glyph is unavailable.

## Impact

- `frontend/package.json` — verify `primeicons` dependency (no change expected).
- `frontend/angular.json` — verify `primeicons.css` in build `styles` (no change expected).
- `frontend/src/styles.scss` — add the no-icon fallback rule and wiring documentation.
- No backend, API, or data-model impact. No breaking changes.
