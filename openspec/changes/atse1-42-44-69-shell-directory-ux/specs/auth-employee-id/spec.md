## ADDED Requirements

### Requirement: Login response includes current user's employee id
The backend `POST /api/v1/auth/login` response SHALL include the current user's `employeeId` when an Employee record exists for the authenticated principal, and SHALL omit it (or return a null sentinel) when no record exists yet.

#### Scenario: Existing employee record
- **WHEN** an authenticated user with an Employee record logs in
- **THEN** the response body contains the matching `employeeId`

#### Scenario: No employee record yet
- **WHEN** a user logs in before creating their Employee profile
- **THEN** the response body contains no usable `employeeId` and the frontend falls back to not showing a profile link

### Requirement: AuthState persists and rehydrates employee id
The frontend `AuthState` service SHALL persist the `employeeId` returned from login to `sessionStorage` alongside the token and username, and SHALL rehydrate it on construction.

#### Scenario: Refresh keeps the employee id
- **WHEN** the page is refreshed after a login that returned an `employeeId`
- **THEN** `AuthState` restores the `employeeId` so the shell profile link is still available
