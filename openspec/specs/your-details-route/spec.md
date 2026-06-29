# your-details-route Specification

## Purpose
TBD - created by archiving change atse1-25-35-ux-walkthrough-fixes. Update Purpose after archive.
## Requirements
### Requirement: Top-level /profile route shows the current user's details

The application MUST expose a top-level `/profile` route that
renders the current authenticated user's profile in editable form.
The route MUST be guarded by `authGuard` and MUST resolve the
current user's employee id from the JWT subject.

#### Scenario: Authenticated user visits /profile

- **WHEN** an authenticated user navigates to `/profile`
- **THEN** the page MUST render the same `ProfilePage` component
  used for `/employees/{id}/profile`
- **AND** the form MUST be editable by the current user

#### Scenario: Unauthenticated user visits /profile

- **WHEN** an unauthenticated user navigates to `/profile`
- **THEN** the `authGuard` MUST redirect to
  `/login?redirectUrl=/profile`

#### Scenario: Shell user-name is a link to /profile

- **WHEN** the shell renders for an authenticated user
- **THEN** the `span.shell__user` element MUST be an `<a>` whose
  `href` is `/profile`
- **AND** clicking it MUST navigate to the user's own profile

### Requirement: /profile covers the same fields as the old inline form

The `/profile` page MUST support editing the same fields the old
inline "Your profile" form exposed: `fullName`, `jobTitle`,
`department`, `level`, `role`. Non-admin users MUST NOT be able to
edit `role`; admins MUST be able to.

#### Scenario: Non-admin edits own details

- **WHEN** a non-admin user saves edits on `/profile`
- **THEN** the `role` field MUST be read-only
- **AND** all other fields MUST be persisted via the existing
  `PUT /api/v1/employees/{id}` endpoint

#### Scenario: Admin edits own or any user's details

- **WHEN** an admin user saves edits on `/profile`
- **THEN** the `role` field MUST be editable
- **AND** all fields MUST be persisted

