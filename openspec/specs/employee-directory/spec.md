# employee-directory Specification

## Purpose
TBD - created by archiving change atse1-25-35-ux-walkthrough-fixes. Update Purpose after archive.
## Requirements
### Requirement: /employees renders the directory only

The `/employees` route MUST render the employee directory as a
browse-only page for non-admins. The page MUST NOT contain an
inline "Your profile" edit form, a "Your details" edit form, or any
other section that duplicates the current user's own profile editing
surface. The page MUST provide a header toolbar with a search box
(matching name / email / department) and a sort dropdown, and MUST
render rows as semantic cards using the design system: avatar, full
name (in a heading element), job title, department, level badge, and
role badge — not a single long button label. Rows MUST show a
visible hover/active/focus state.

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
  they did before, restyled to the design tokens

#### Scenario: Rows are semantic cards with badges and avatar

- **WHEN** a directory row is rendered
- **THEN** it MUST show an initials avatar, the full name in a
  heading element, and meta (job title, department) in spans
- **AND** it MUST render capitalized level and role badges
- **AND** it MUST show a visible hover/active/focus state

