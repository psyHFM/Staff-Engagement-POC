## MODIFIED Requirements

### Requirement: Frontend employee feature
The system SHALL provide `frontend/.../features/employee/**` with an `EmployeeList`
component, an `EmployeeDetail` component, and an `EmployeeStateService` using Angular
Signals (in-memory only). A lazy route for the feature SHALL be appended as exactly one
line in `routes.ts`. The create form SHALL omit the email and role fields (derived
server-side). The employee directory SHALL be a directory-only list; each row SHALL link
to the dedicated profile page (`/employees/:id/profile`). The list SHALL be visible to all
authenticated users.

#### Scenario: Lazy route loads
- **WHEN** the employee route is navigated to
- **THEN** the feature loads on demand via `loadChildren`

#### Scenario: Create form has no email or role field
- **WHEN** an authenticated user opens the create form
- **THEN** the form collects `fullName`, `jobTitle`, `department`, and `level` only; email and role are not entered

#### Scenario: Directory links to profile page
- **WHEN** an authenticated user views the employee directory
- **THEN** each row links to `/employees/{id}/profile` and the directory does not show an inline detail/edit panel

## REMOVED Requirements

### Requirement: Directory detail panel
**Reason:** Employee profile details are now viewed on the dedicated profile page (`/employees/:id/profile`), so the inline directory detail/edit panel is no longer needed.
**Migration:** Directory rows link to the profile page; editing any employee record happens on the profile page.

### Requirement: Directory detail read-only message
**Reason:** The directory no longer has an inline detail panel, making the read-only note redundant.
**Migration:** None; the read-only note is removed from `employee-detail` when the directory context no longer exists.
