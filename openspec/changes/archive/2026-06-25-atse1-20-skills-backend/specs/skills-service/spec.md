## ADDED Requirements

### Requirement: SkillsService implements SkillsContract
The system SHALL provide `SkillsService implements SkillsContract` that aggregates skill strength across all employees by reading from the frozen `PortfolioContract` and `EmployeeContract`. It SHALL never import another module's repository or domain package.

#### Scenario: strongIn returns matching skill entries ranked by years
- **GIVEN** two employees have an "Angular" skill entry with 3 and 5 years respectively
- **WHEN** `strongIn("Angular", 0, PageRequest.of(0, 20))` is called
- **THEN** it returns both entries sorted by years descending by default

#### Scenario: minYears filter excludes weaker entries
- **GIVEN** employees have "Angular" entries with 2 and 4 years
- **WHEN** `strongIn("Angular", 3, PageRequest.of(0, 20))` is called
- **THEN** only the entry with 4 years is returned

#### Scenario: Skill name matching is case-insensitive
- **GIVEN** an employee has a skill entry named "Angular"
- **WHEN** `strongIn("angular", 0, ...)` is called
- **THEN** the "Angular" entry is included

#### Scenario: Empty result when no skill matches
- **GIVEN** no employee has a "Rust" skill entry
- **WHEN** `strongIn("Rust", 0, ...)` is called
- **THEN** an empty `Paged` result is returned

#### Scenario: Pagination is applied after filter and sort
- **GIVEN** 5 employees have matching "Java" skill entries
- **WHEN** `strongIn("Java", 0, PageRequest.of(0, 2))` is called
- **THEN** the returned page contains 2 items, offset 0, limit 2, total 5

#### Scenario: Sort by projectCount ascending
- **GIVEN** employees have matching skill entries with project counts 1 and 3
- **WHEN** `strongIn("Java", 0, ...)` is called with sort "projectCount,asc"
- **THEN** the result is ordered by projectCount ascending

### Requirement: Cross-module access is via contracts only
The system SHALL ensure the `skills` module depends exclusively on `EmployeeContract` and `PortfolioContract`. It SHALL NOT import `com.staffengagement.employee.*` or `com.staffengagement.portfolio.*` internals.

#### Scenario: No illegal imports
- **WHEN** the `skills` module source is inspected
- **THEN** it contains no imports from `employee.domain`, `employee.repository`, `portfolio.domain`, or `portfolio.repository`
