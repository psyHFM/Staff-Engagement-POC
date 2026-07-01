# Plan: ATSE1-79 + ATSE1-80 — Portfolio gating & self-service page

## Tickets
- **ATSE1-79** — Portfolio: Fix gating to allow owner/admin to edit their own portfolio
- **ATSE1-80** — Portfolio: Restrict portfolio page to current user and remove search bar

## Current state
- Portfolio editing lives on the Profile page (`/employees/:id/profile` and `/profile`) via the reusable `PortfolioEditor`.
- `/portfolio` currently redirects to `/profile` in `app.routes.ts`.
- Backend enforces owner-or-admin RBAC on every portfolio mutation.
- `PortfolioEditor` has a best-effort RBAC backstop (`rbacReadOnly`) intended to keep edit affordances hidden from non-owner/non-admin viewers even if the host passes `readOnly=false`.
- The Profile page host already gates `editMode` behind its own `canEdit()` (owner or admin).

## Clarified requirement
`/portfolio` must be a **self-service page** that shows **only the signed-in user’s portfolio** and lets them edit it. It must **not** redirect to `/profile`. There must be **no search bar / employee picker** on the page.

## ATSE1-79 — Fix portfolio editor gating

### Problem
`PortfolioEditor.rbacReadOnly()` returns `true` whenever `portfolio.ownerEmail` is absent. That blocks:
1. **Admins** from editing an empty portfolio (the backend `emptyView` sets `ownerEmail` to `null` until the first entry is saved).
2. Reliable owner matching, because the code currently compares `auth.currentUser()` (the username typed at login) instead of the authoritative JWT `sub` claim (`auth.currentUserSubject()`).

### Approach
Make the RBAC backstop match the backend rule: **admin always editable; owner editable when we can prove ownership; everyone else read-only.**

1. In `frontend/src/app/features/portfolio/portfolio-editor/portfolio-editor.ts`:
   - Use `auth.currentUserSubject()` as the caller identity (per `AuthState` docs).
   - Short-circuit to editable if `isAdminToken(bearerToken)` is true.
   - Only perform the owner-email comparison when `ownerEmail` is present.
   - Keep the host `readOnly` input as the primary gate (`isReadOnly = readOnly || rbacReadOnly`).
2. In `frontend/src/app/features/portfolio/portfolio-editor/portfolio-editor.html`:
   - Fix the informational banner condition so it only appears when the RBAC backstop is actually making the view read-only due to a missing `ownerEmail`.
3. In `frontend/src/app/features/portfolio/portfolio-editor/portfolio-editor.spec.ts`:
   - Add fake for `currentUserSubject` and `bearerToken`.
   - Add tests:
     - owner can edit (matches `currentUserSubject` to `ownerEmail`);
     - admin can edit even when `ownerEmail` is absent;
     - non-owner, non-admin stays read-only;
     - host `readOnly=true` overrides everything.
   - Keep existing add/remove behaviour tests.

## ATSE1-80 — Make `/portfolio` a self-service page for the current user

### Approach
1. Create a new `frontend/src/app/features/portfolio/portfolio-page/` component:
   - Reads the current user's employee id from `AuthState.currentEmployeeId()`.
   - Calls `PortfolioStateService.loadPortfolio(id)` for that user only.
   - Renders `PortfolioEditor` with `[readOnly]="false"` and `[employeeId]="id"`.
   - Shows a simple empty/error state if no current employee id is available.
   - Contains **no search bar and no employee picker**.
2. Update `frontend/src/app/app.routes.ts`:
   - Replace the `/portfolio` redirect with a `loadComponent` route to the new `PortfolioPage`.
   - Keep `canActivate: [authGuard]`.
3. Update `frontend/src/app/shell/shell.html`:
   - Add a "Portfolio" nav link (or keep the user-menu "Your details"/"Profile" links; the requirement is to expose `/portfolio` as a reachable page).
4. Add tests:
   - `portfolio-page.spec.ts`: loads the current user's portfolio, passes the id to `PortfolioEditor`, no picker/search rendered.
   - Update `shell.spec.ts` if a nav link is added.
   - Update `app.spec.ts` / route tests if needed.

### Files changed
- `frontend/src/app/features/portfolio/portfolio-editor/portfolio-editor.ts`
- `frontend/src/app/features/portfolio/portfolio-editor/portfolio-editor.html`
- `frontend/src/app/features/portfolio/portfolio-editor/portfolio-editor.spec.ts`
- `frontend/src/app/features/portfolio/portfolio-page/portfolio-page.ts` (new)
- `frontend/src/app/features/portfolio/portfolio-page/portfolio-page.html` (new)
- `frontend/src/app/features/portfolio/portfolio-page/portfolio-page.scss` (new, minimal)
- `frontend/src/app/features/portfolio/portfolio-page/portfolio-page.spec.ts` (new)
- `frontend/src/app/app.routes.ts`
- `frontend/src/app/shell/shell.html` (optional nav link)
- `frontend/src/app/shell/shell.spec.ts` (if nav link changes)

## Out of scope
- No backend changes: RBAC enforcement already exists in `PortfolioService`.
- No API contract changes.
- No changes to the employee directory search (that search is for browsing employees, not for portfolio selection).

## Verification
```bash
cd frontend
npm test -- --testPathPattern='portfolio-editor|portfolio-page|shell|app.spec'
npm run build
```

## Constitution alignment
- `frontend-state.yaml`: continues to use Angular Signals and service-based state; no new global state.
- `angular-style-guide.md`: uses `inject()`, kebab-case file names, standalone components.
- `api-standards.yaml`: no API surface changes.
- `ROADMAP.md`: changes stay within the Portfolio feature folder (`features/portfolio/`) and the shared route file; no cross-module backend imports.
