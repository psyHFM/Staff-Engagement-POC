## ADDED Requirements

### Requirement: Profile service orchestrates frozen contracts
`ProfileService` SHALL constructor-inject `EmployeeContract`, `InteractionContract`, `TaskContract`, and `PortfolioContract`, and use them to build a `PersonProfile` for a given `EmployeeId`.

#### Scenario: Happy path assembly
- **GIVEN** an existing employee with interactions, tasks, portfolio skills, education, projects, and links
- **WHEN** `profileFor(employeeId)` is called
- **THEN** it returns a `PersonProfile` containing the full employee summary (including job title, department, level), the interaction list (with timestamps), the task list (with descriptions), the portfolio summary (with skills, education, projects, links), and the top skills sorted by years descending

### Requirement: Missing employee handling
`ProfileService` SHALL reject requests for unknown employees by throwing `ProfileNotFoundException`, which the controller maps to HTTP 404.

#### Scenario: Unknown employee
- **GIVEN** `EmployeeContract.findById(id)` returns `Optional.empty()`
- **WHEN** `profileFor(id)` is called
- **THEN** it throws `ProfileNotFoundException`

### Requirement: Empty collections are allowed
If an employee has no interactions, tasks, or portfolio entries, the service SHALL return a `PersonProfile` with empty collections rather than failing.

#### Scenario: New employee with empty data
- **GIVEN** an existing employee with no interactions, tasks, or portfolio
- **WHEN** `profileFor(id)` is called
- **THEN** the returned profile has non-null empty lists and a portfolio summary with empty child lists

### Requirement: Skill ordering
The `topSkills` list in the profile SHALL be derived from the employee's portfolio skills and ordered by `years` descending, with `projectCount` descending as tie-breaker.

#### Scenario: Multiple skills
- **GIVEN** portfolio skills `[{skill: "Angular", years: 5, projectCount: 3}, {skill: "Java", years: 7, projectCount: 2}]`
- **WHEN** the profile is assembled
- **THEN** `topSkills` is `[Java, Angular]`
