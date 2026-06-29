## ADDED Requirements

### Requirement: Persist credentials on successful login
The `AuthState` service SHALL write the JWT and username to `sessionStorage` when a login response is received.

#### Scenario: Login stores token and username
- **WHEN** `login()` receives a successful `LoginResponse`
- **THEN** the token is written to `sessionStorage` under `staff-engagement:token`
- **AND** the username is written to `sessionStorage` under `staff-engagement:username`

### Requirement: Rehydrate credentials on service construction
The `AuthState` service SHALL read `staff-engagement:token` and `staff-engagement:username` from `sessionStorage` during construction and populate the internal signals if both values are present.

#### Scenario: Refresh with stored credentials keeps the user logged in
- **WHEN** a new `AuthState` instance is constructed and `sessionStorage` contains a token and username
- **THEN** `isAuthenticated()` is `true`
- **AND** `currentUser()` returns the stored username
- **AND** `bearerToken()` returns the stored token

#### Scenario: Refresh with no stored credentials remains anonymous
- **WHEN** a new `AuthState` instance is constructed and `sessionStorage` contains no auth entries
- **THEN** `isAuthenticated()` is `false`
- **AND** `currentUser()` is `null`
- **AND** `bearerToken()` is `null`

### Requirement: Clear persisted credentials on logout
The `AuthState` service SHALL remove the auth entries from `sessionStorage` and reset the internal signals when `logout()` is called.

#### Scenario: Logout wipes persisted session
- **WHEN** `logout()` is called
- **THEN** `staff-engagement:token` and `staff-engagement:username` are removed from `sessionStorage`
- **AND** `isAuthenticated()` becomes `false`
- **AND** `currentUser()` becomes `null`

### Requirement: Gracefully handle unavailable storage
The `AuthState` service SHALL continue to function in-memory only when `sessionStorage` access throws or is unavailable.

#### Scenario: Private-mode storage failure falls back to in-memory
- **WHEN** `sessionStorage.setItem` throws during login
- **THEN** the internal signals still hold the token and username
- **AND** subsequent reads from `sessionStorage` do not crash the service
