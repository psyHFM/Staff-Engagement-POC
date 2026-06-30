## Why

Three UX defects discovered in the 2026-06-25 walkthrough (Jira ATSE1-48, ATSE1-49, ATSE1-50) all block basic navigation and data correctness:

- **ATSE1-48**: Clicking a skill tile or search result doesn't navigate to the detail view — users can only see the list, not individual skill details.
- **ATSE1-49**: Portfolio defaults to employee ID 1 regardless of logged-in user — users edit the wrong portfolio on first load.
- **ATSE1-50**: "Sign in" link visible when authenticated — clicking it logs out the user unexpectedly.

All three are critical priority in Jira and affect core user flows.

## What Changes

### ATSE1-48: Skills Detail Navigation

**Problem**: The skills page (`skills-page.ts`) has no detail view — tiles call `onTileClick()` which just re-runs the search. No route exists for `/skills/:name`.

**Fix**:
- Add route `/skills/:name` to `app.routes.ts` that loads the same `SkillsPage` component.
- Add a detail panel to `skills-page.html` that shows when a skill is selected (via route param or search result click).
- Wire tile clicks to navigate via `Router.navigate(['/skills', skillName])` instead of just searching.
- Reuse the same component — no copy-pasted markup.

**Files**: `frontend/src/app/features/skills/skills-page.ts`, `frontend/src/app/features/skills/skills-page.html`, `frontend/src/app/app.routes.ts`

### ATSE1-49: Portfolio Employee ID Default

**Problem**: `portfolio.ts` line 223 has `employeeId = signal('1')` — hardcoded default ignores the logged-in user.

**Fix**:
- Default `employeeId` to `auth.currentEmployeeId()` (already populated from JWT on login, see `auth-state.ts`).
- Fall back to `'1'` only if no authenticated user (defensive, shouldn't happen on protected route).
- Keep the manual input for admins to switch employees — that stays editable.
- Add `readonly` binding for non-admins (UI mirrors backend RBAC, see ticket #41).

**Files**: `frontend/src/app/features/portfolio/portfolio.ts`

### ATSE1-50: Shell Sign In Link Visibility

**Problem**: `shell.html` lines 30-32 show "Sign in" link unconditionally in the `@else` block — but the `@if (auth.isAuthenticated())` guard should hide it.

**Fix**:
- The template already guards correctly — the issue is the link is still rendered visible in some states.
- Verify the `@if/@else` block is correct (it appears correct in current code).
- Check if there's a timing issue with `auth.isAuthenticated()` signal not being tracked.

**Files**: `frontend/src/app/shell/shell.html`

## Capabilities

### New Capabilities

- `skill-detail-navigation`: Tile and result click navigate to `/skills/:name` detail view.
- `skill-deep-link`: Direct URL `/skills/Angular` renders the skill detail without search.

### Modified Capabilities

- `portfolio-default-employee`: Portfolio initializes to current user's employee ID from JWT.
- `shell-auth-visibility`: Sign in link only shows when unauthenticated.

## Impact

- **Jira tickets closed by this change**: ATSE1-48, ATSE1-49, ATSE1-50.
- **Frontend code touched** (Angular 22, Signals, unidirectional):
  - `frontend/src/app/features/skills/skills-page.ts` — add router injection, route param handling, detail panel.
  - `frontend/src/app/features/skills/skills-page.html` — add detail panel markup.
  - `frontend/src/app/app.routes.ts` — add `/skills/:name` route.
  - `frontend/src/app/features/portfolio/portfolio.ts` — change default employee ID to `auth.currentEmployeeId()`.
  - `frontend/src/app/shell/shell.html` — verify auth guard (may already be correct).
- **Backend code touched**: None — all three are frontend-only fixes.
- **Frozen contract changes**: None.
- **Architecture rules verified**: All changes stay within feature boundaries; `SkillsPage` remains self-contained with its own `SkillsStateService` provider.
- **Out of scope**: Backend skill-detail endpoint (already exists via search API), any changes to `shared/api/*` interfaces.

## Testing

- **Unit tests**: 
  - `skills-page.spec.ts` — add scenarios for tile click navigation, route param handling.
  - `portfolio.spec.ts` — verify default employee ID equals `auth.currentEmployeeId()`.
- **Playwright e2e**:
  - `e2e/tests/skills.spec.ts` — verify tile click opens detail view.
  - `e2e/tests/portfolio.spec.ts` — verify portfolio loads correct employee on first load.
  - `e2e/tests/auth.spec.ts` — verify "Sign in" link hidden when authenticated.

## Persona Reviews Required

- **Constitution Guard**: Verify tech stack (Angular 22, Signals), API standards (no backend changes), testing strategy (BDD unit tests).
- **Angular State Architect**: Verify signal usage, unidirectional data flow, route param handling.
- **BDD Test Engineer**: Verify test coverage matches acceptance criteria.
