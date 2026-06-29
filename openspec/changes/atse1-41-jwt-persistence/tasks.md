## 1. Update AuthState persistence

- [x] 1.1 Add private storage key constants and safe `sessionStorage` helpers to `AuthState`.
- [x] 1.2 Rehydrate `token` and `username` signals from `sessionStorage` in the constructor when both entries exist.
- [x] 1.3 Persist token and username to `sessionStorage` inside the `login()` `tap` handler.
- [x] 1.4 Clear `sessionStorage` entries inside `logout()` alongside the signal reset.

## 2. Add unit tests for AuthState

- [x] 2.1 Create `frontend/src/app/shared/auth/auth-state.spec.ts` with Jest setup for `ApiClient` mock and `sessionStorage` spies.
- [x] 2.2 Add test: login success writes token and username to `sessionStorage`.
- [x] 2.3 Add test: constructing `AuthState` with stored credentials rehydrates signals.
- [x] 2.4 Add test: constructing `AuthState` with no stored credentials remains unauthenticated.
- [x] 2.5 Add test: `logout()` clears both signals and `sessionStorage`.
- [x] 2.6 Add test: storage failure during login falls back to in-memory signals.

## 3. Update frontend-foundation spec

- [x] 3.1 Modify `openspec/specs/frontend-foundation/spec.md` to allow an explicit auth-token persistence exception and update the refresh scenario.

## 4. Verify and red-team

- [x] 4.1 Run `npm test -- --no-watch --no-progress` in `frontend/` and ensure new tests pass.
- [x] 4.2 Run `npm run lint` in `frontend/` and fix any issues.
- [x] 4.3 Run Constitution Guard and Angular State Architect subagents against the diff for compliance.
- [x] 4.4 Commit changes to `bugfix/ATSE1-41-jwt-persistence` and add summary comment to Jira ATSE1-41.
