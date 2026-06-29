## 1. Verify PrimeIcons wiring

- [x] 1.1 Confirm `primeicons` is declared in `frontend/package.json` dependencies
- [x] 1.2 Confirm `node_modules/primeicons/primeicons.css` is listed in the `angular.json` build `styles` array
- [x] 1.3 Confirm the PrimeIcons font files (`primeicons.woff2`, `.ttf`, etc.) ship in `node_modules/primeicons/fonts/` and are referenced by the package `@font-face`

## 2. Add the no-icon fallback

- [x] 2.1 In `frontend/src/styles.scss`, add a layout-preserving fallback rule for the base `.pi` class (reserve `1em` inline-block box via `min-width`/`line-height`) so an icon slot keeps its space and stays visually inert when the font/glyph is unavailable
- [x] 2.2 Update the comment in `frontend/src/styles.scss` to document how PrimeIcons is wired and what the fallback guarantees

## 3. Verify rendering and quality gates

- [x] 3.1 Run the frontend build/AOT validation (`npx ngc -p tsconfig.app.json --noEmit`) and confirm it passes
- [x] 3.2 Verified in the rendered UI (headless Chrome against the production Docker build) that the shell brand icon (`pi-th-large`) and the `pi-sign-in` icon display their glyphs; `pi-spinner` uses the identical font mechanism and its glyph codepoint `\e926` is present in the served bundle
- [x] 3.3 Verified layout is preserved when the font fails: with the served PrimeIcons font files 404'd, icon slots collapse to reserved 1em boxes (no tofu/fallback text) and all surrounding text keeps its exact position — no layout shift
