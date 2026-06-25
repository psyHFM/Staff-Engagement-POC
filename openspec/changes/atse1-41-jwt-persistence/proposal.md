## Why

Currently the `AuthState` service stores the issued JWT and username only in Angular Signals. Any full-page refresh, deep-link open, or browser restart wipes this state and forces the user back to `/login?redirectUrl=…`. This is a poor UX and a blocker for the POC walkthrough (Jira ATSE1-41).

## What Changes

- Persist `token` and `username` from `AuthState` to `sessionStorage` on successful login.
- Rehydrate `token` and `username` from `sessionStorage` when `AuthState` is constructed, so refresh / deep-link keeps the session alive until the JWT expires.
- Keep `logout()` clearing both the signals and `sessionStorage`.
- Leave existing session-expired handling intact.
- Add BDD-style Jest unit tests covering persistence, rehydration, and logout.

## Capabilities

### New Capabilities

- `auth-persistence`: defines how `AuthState` persists, rehydrates, and clears the JWT and username across browser sessions using `sessionStorage`.

### Modified Capabilities

- `frontend-foundation`: amend the in-memory-only state persistence policy to allow an explicit exception for authentication tokens, and update the "State resets on refresh" scenario to reflect that auth state is rehydrated.

## Impact

- `frontend/src/app/shared/auth/auth-state.ts` — adds storage read/write and rehydration logic.
- `frontend/src/app/shared/auth/auth-state.spec.ts` — new unit tests.
- `openspec/specs/frontend-foundation/spec.md` — updates the persistence requirement and scenario to allow auth-token persistence.
