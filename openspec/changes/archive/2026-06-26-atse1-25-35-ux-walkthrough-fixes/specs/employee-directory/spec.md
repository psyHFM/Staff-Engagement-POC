## ADDED Requirements

### Requirement: /employees renders the directory only

The `/employees` route MUST render the employee directory component
already built in PR #28. The page MUST NOT contain an inline "Your
profile" edit form, an "Your details" edit form, or any other
section that duplicates the current user's own profile editing
surface.

#### Scenario: Visiting /employees shows the directory

- **WHEN** an authenticated user navigates to `/employees`
- **THEN** the page MUST render the employee directory list
- **AND** the page MUST NOT render a "Your profile" heading
- **AND** the page MUST NOT render an inline form for editing the
  current user's own details

#### Scenario: Directory rows are clickable to the per-employee profile

- **WHEN** the directory list is rendered
- **THEN** each row MUST be a link to `/employees/{id}/profile`
- **AND** clicking the link MUST navigate to that per-employee
  profile page (the existing `ProfilePage`)

#### Scenario: Directory uses GET /api/v1/employees

- **WHEN** the directory loads
- **THEN** it MUST call `GET /api/v1/employees` with the
  existing offset/limit/sort query parameters
- **AND** the existing pagination and sort controls MUST work as
  they did before PR #28
