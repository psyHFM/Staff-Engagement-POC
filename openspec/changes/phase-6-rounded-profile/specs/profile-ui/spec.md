## ADDED Requirements

### Requirement: Profile page route
The Angular application SHALL provide a lazy-loaded route `/employees/:id/profile` that renders the rounded person view and is protected by `authGuard`.

#### Scenario: Navigation to profile
- **WHEN** a user navigates to `/employees/42/profile`
- **THEN** the `ProfilePage` component loads and fetches the profile from `/api/v1/employees/42/profile`

### Requirement: Profile page sections
`ProfilePage` SHALL render the rounded view in distinct sections:
1. **Header** — employee full name, email, role, job title, department, level
2. **Interactions** — list of interactions with type, facilitator, note, and timestamp
3. **Tasks** — list of tasks with title/description, completed status, and optional source interaction link
4. **Portfolio** — skills (with years/project count), education, projects, and public links

#### Scenario: Full profile renders all sections
- **GIVEN** a populated `PersonProfile` loaded into `ProfileStateService`
- **WHEN** `ProfilePage` renders
- **THEN** all four sections are visible with the correct data, including job title/department/level in the header, timestamps on interactions, descriptions on tasks, and education/projects/links in the portfolio

### Requirement: Loading and error states
`ProfilePage` SHALL reflect the `loading` and `error` signals from `ProfileStateService`, showing a loading indicator while fetching and an error message on failure.

#### Scenario: Loading state
- **GIVEN** the profile request is in flight
- **WHEN** the page renders
- **THEN** a loading indicator is shown and sections are not rendered

#### Scenario: Error state
- **GIVEN** the profile request fails
- **WHEN** the page renders
- **THEN** an error message is shown

### Requirement: Entry point from employee directory
The `EmployeeList` component SHALL provide a link or button that navigates to `/employees/${id.value}/profile` for each row.

#### Scenario: Open profile from directory
- **GIVEN** the employee directory is displayed
- **WHEN** the user clicks a row's profile action
- **THEN** the router navigates to `/employees/:id/profile`
