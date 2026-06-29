# auth-session Specification

## Purpose
TBD - created by archiving change atse1-25-35-ux-walkthrough-fixes. Update Purpose after archive.
## Requirements
### Requirement: Auth state persists across page reloads

The system SHALL persist the JWT issued by `POST /api/v1/auth/login` to
`sessionStorage` under the key `staff-engagement:token`. The
`AuthState` service MUST re-hydrate its in-memory token signal from
`sessionStorage` on construction so that a full page reload, a deep
link, or an external navigation does not bounce the user back to
`/login`.

The persistence backend is abstracted behind an injected
`AuthStorage` interface (`shared/auth/auth-storage.ts`); the
production binding `browserAuthStorage` is backed by
`window.sessionStorage` with `try`/`catch` swallow for SSR or
disabled storage.

A companion username is persisted under the auxiliary key
`staff-engagement:username` so the shell can rehydrate the
displayed identity on reload. The username is auxiliary
metadata for `currentUser()`, not domain state.

#### Scenario: Login writes the JWT to sessionStorage

- **WHEN** a user successfully authenticates via `POST /api/v1/auth/login`
- **THEN** the returned JWT MUST be written to `sessionStorage` under
  `staff-engagement:token`
- **AND** the in-memory `AuthState` token signal MUST be set to that
  same value

#### Scenario: Logout clears the JWT from sessionStorage

- **WHEN** a user invokes `AuthState.logout()`
- **THEN** the in-memory token signal MUST be set to `null`
- **AND** the `staff-engagement:token` key MUST be removed from
  `sessionStorage`
- **AND** the companion `staff-engagement:username` key MUST also
  be removed

#### Scenario: Cold start hydrates the token signal

- **WHEN** the Angular app bootstraps and `sessionStorage` contains a
  value at `staff-engagement:token`
- **THEN** the `AuthState` token signal MUST be set to that value
- **AND** the `Authorization: Bearer` header MUST be attached to
  subsequent HTTP requests via the existing `bearerAuthInterceptor`
- **AND** the user MUST NOT be redirected to `/login`

#### Scenario: 401 from any API call clears the persisted token

- **WHEN** any HTTP request returns `401 Unauthorized`
- **THEN** the in-memory token signal MUST be cleared
- **AND** the persisted `sessionStorage` entry MUST be removed
- **AND** the next navigation to a protected route MUST redirect
  to `/login`

#### Scenario: AuthGuard respects the hydrated token

- **WHEN** a protected route is requested after a reload
- **THEN** the `authGuard` MUST resolve to `true` if the hydrated
  token is present
- **AND** the route MUST render

#### Scenario: currentUserSubject reads the JWT sub claim

- **WHEN** `AuthState.currentUserSubject()` is read
- **THEN** it MUST return the decoded `sub` claim from the
  in-memory token
- **AND** it MUST return `null` when no token is present
- **AND** it MUST return `null` when the token is malformed
  (silently, so a bad token does not break the UI)

#### Scenario: Storage unavailable does not break the session

- **WHEN** `window.sessionStorage` access throws (SSR,
  disabled storage, private mode)
- **THEN** the in-memory `AuthState` signals MUST remain the
  source of truth
- **AND** the session MUST remain functional for the current tab

> **Implementation note:** the original §2 draft specified
> `localStorage` under `staff-engagement.auth.jwt`. This rebase
> aligns with the upstream ATSE1-41 decision in PR #37, which
> chose `sessionStorage` (scoping persistence to the JWT's
> lifetime) and a single-underscored key namespace. See
> `design.md -> D1 Decision history` for the rationale.

