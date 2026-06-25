## ADDED Requirements

### Requirement: Auth state persists across page reloads

The system SHALL persist the JWT issued by `POST /api/v1/auth/login` to
`localStorage` under the key `staff-engagement.auth.jwt`. The
`AuthState` service MUST re-hydrate its in-memory token signal from
`localStorage` on construction so that a full page reload, a deep
link, or an external navigation does not bounce the user back to
`/login`.

#### Scenario: Login writes the JWT to localStorage

- **WHEN** a user successfully authenticates via `POST /api/v1/auth/login`
- **THEN** the returned JWT MUST be written to `localStorage` under
  `staff-engagement.auth.jwt`
- **AND** the in-memory `AuthState` token signal MUST be set to that
  same value

#### Scenario: Logout clears the JWT from localStorage

- **WHEN** a user invokes `AuthState.logout()`
- **THEN** the in-memory token signal MUST be set to `null`
- **AND** the `staff-engagement.auth.jwt` key MUST be removed from
  `localStorage`

#### Scenario: Cold start hydrates the token signal

- **WHEN** the Angular app bootstraps and `localStorage` contains a
  value at `staff-engagement.auth.jwt`
- **THEN** the `AuthState` token signal MUST be set to that value
- **AND** the `Authorization: Bearer` header MUST be attached to
  subsequent HTTP requests via the existing `bearerAuthInterceptor`
- **AND** the user MUST NOT be redirected to `/login`

#### Scenario: 401 from any API call clears the persisted token

- **WHEN** any HTTP request returns `401 Unauthorized`
- **THEN** the in-memory token signal MUST be cleared
- **AND** the persisted `localStorage` entry MUST be removed
- **AND** the user MUST be redirected to `/login`

#### Scenario: AuthGuard respects the hydrated token

- **WHEN** a protected route is requested after a reload
- **THEN** the `authGuard` MUST resolve to `true` if the hydrated
  token is present
- **AND** the route MUST render
