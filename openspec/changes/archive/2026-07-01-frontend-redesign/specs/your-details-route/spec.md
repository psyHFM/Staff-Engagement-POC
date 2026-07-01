## MODIFIED Requirements

### Requirement: Top-level /profile route shows the current user's details

The application MUST keep a top-level `/profile` route guarded by
`authGuard` that resolves the current authenticated user's employee
id from the JWT subject, but it MUST route the user to their own
Profile page as the single self-service destination rather than a
separate standalone identity page. Self-service identity editing MUST
happen in the Profile page's Edit mode.

#### Scenario: Authenticated user visits /profile

- **WHEN** an authenticated user navigates to `/profile`
- **THEN** they MUST land on their own Profile page resolved from the
  JWT subject (the same page as `/employees/{id}/profile`)
- **AND** they MUST be able to enter Edit mode to change their
  identity fields

#### Scenario: Unauthenticated user visits /profile

- **WHEN** an unauthenticated user navigates to `/profile`
- **THEN** the `authGuard` MUST redirect to
  `/login?redirectUrl=/profile`

#### Scenario: Shell user-name is a link to the user's own profile

- **WHEN** the shell renders for an authenticated user
- **THEN** the username chip MUST navigate to the user's own Profile
  page without requiring a typed id

### Requirement: /profile covers the same fields as the old inline form

The self-service identity editor on the Profile page MUST support
editing the same fields the old inline "Your profile" form exposed:
`fullName`, `jobTitle`, `department`, `level`, `role`. Non-admin
users MUST NOT be able to edit `role`; admins MUST be able to. These
fields MUST be edited within the Profile page's Edit mode, not on a
separate standalone page.

#### Scenario: Non-admin edits own details

- **WHEN** a non-admin user saves identity edits in Profile Edit mode
- **THEN** the `role` field MUST be read-only
- **AND** all other fields MUST be persisted via the existing
  `PUT /api/v1/employees/{id}` endpoint

#### Scenario: Admin edits own or any user's details

- **WHEN** an admin user saves identity edits in Profile Edit mode
- **THEN** the `role` field MUST be editable
- **AND** all fields MUST be persisted
