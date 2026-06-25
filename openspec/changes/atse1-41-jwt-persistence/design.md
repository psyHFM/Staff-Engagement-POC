## Context

The `AuthState` service currently keeps the authenticated JWT and username in Angular Signals only. This satisfies the original `frontend-state.yaml` policy of "In-Memory Only" persistence, but it also means every full-page refresh, deep-link open, or browser restart drops the session and redirects to `/login?redirectUrl=…`.

Jira ATSE1-41 requests that the JWT survive these events for the lifetime of the token. This is a deliberate deviation from the general in-memory-only state rule and therefore requires an explicit exception in the `frontend-foundation` spec.

## Goals / Non-Goals

**Goals:**
- Persist `token` and `username` to `sessionStorage` when login succeeds.
- Rehydrate `token` and `username` from `sessionStorage` when `AuthState` is constructed (i.e., on every app bootstrap).
- Ensure `logout()` and existing session-expired handling clear both signals and storage.
- Keep the existing Signal-based API (`isAuthenticated`, `currentUser`, `bearerToken()`) unchanged.
- Add BDD-style Jest unit tests covering the new behavior.

**Non-Goals:**
- Implementing a refresh-token flow or token rotation.
- Switching to `localStorage` (session-scoped storage is sufficient for the POC and reduces accidental long-term leakage).
- Changing backend auth endpoints or JWT expiry behavior.
- Persisting any non-auth global state (the in-memory-only rule still applies elsewhere).

## Decisions

- **Use `sessionStorage` over `localStorage`.** Rationale: closing the browser tab ends the POC session; reopening later should require a fresh login. This matches the ticket's "sessionStorage (or localStorage with a TTL)" guidance with the simpler option.
- **Storage keys are namespaced.** Use `staff-engagement:token` and `staff-engagement:username` to avoid collisions.
- **Signals remain the source of truth.** The constructor reads storage once and writes to the private signals. Login/logout update both signals and storage. Other code continues to read signals/computed values, never storage directly.
- **Storage errors are swallowed.** If `sessionStorage` is unavailable (private mode restrictions, disabled storage), the service degrades to in-memory behavior and keeps existing behavior intact. This avoids crashing the app over a non-essential enhancement.

## Risks / Trade-offs

- **[Security] Token stored in browser storage is XSS-accessible.** → Mitigation: this is acceptable for the POC scope; a production system would move to `httpOnly` cookies or a refresh-token architecture. This risk is documented but not resolved by this change.
- **[Constitution deviation] `frontend-state.yaml` currently forbids persistence across refresh.** → Mitigation: update `openspec/specs/frontend-foundation/spec.md` to explicitly allow an auth-token exception, and have the Constitution Guard subagent review the delta.
- **[Testability] Direct `sessionStorage` access complicates Jest tests.** → Mitigation: tests mock `Storage.prototype.getItem/setItem/removeItem` via `jest.spyOn` and assert on both signal values and storage calls.
