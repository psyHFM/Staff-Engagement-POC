# skills-service Specification

## Purpose
TBD - created by syncing change atse1-20-skills-backend. Update Purpose after archive.
## Requirements

> **Persona mandate — required:** `SkillsService` business logic and its unit tests are authored and verified by the **BDD Test Engineer** (`.claude/personas/bdd-test-engineer.md`) in Given-When-Then form, designed to survive PITest mutation, with Mockito isolating the `EmployeeContract` and `PortfolioContract` dependencies (no Spring context, no DB → Unit-Tests-Only). The module boundaries and cross-module communication are audited by the **Constitution Guard** (`.claude/personas/constitution-guard.md`) against `backend-architecture.yaml` and verified via the `/arch-verify` skill.

### Requirement: SkillsService implements SkillsContract
The system SHALL provide a `SkillsService` in `com.staffengagement.skills.service` that implements the frozen `SkillsContract`, aggregating skill strength across all employees by reading from the frozen `PortfolioContract` and `EmployeeContract`. It SHALL never import another module's repository or domain package.

#### Scenario: strongIn returns matching skill entries ranked by years
- **GIVEN** two employees have an "Angular" skill entry with 3 and 5 years respectively
- **WHEN** `strongIn("Angular", 0, PageRequest.of(0, 20))` is called
- **THEN** it returns both entries sorted by years descending by default

#### Scenario: minYears filter excludes weaker entries (boundary inclusive)
- **GIVEN** employees have "Angular" entries with 2 and 4 years
- **WHEN** `strongIn("Angular", 2, PageRequest.of(0, 20))` is called
- **THEN** both entries are returned (boundary is inclusive)
- **WHEN** `strongIn("Angular", 3, PageRequest.of(0, 20))` is called
- **THEN** only the entry with 4 years is returned

#### Scenario: Negative minYears is normalized to 0
- **WHEN** `strongIn("java", -1, ...)` is called
- **THEN** it behaves as if `minYears` were 0

#### Scenario: Skill name matching is case-insensitive (contains, not equals)
- **GIVEN** an employee has a skill entry named "Angular"
- **WHEN** `strongIn("angular", 0, ...)` is called
- **THEN** the "Angular" entry is included
- **WHEN** `strongIn("angu", 0, ...)` is called
- **THEN** the "Angular" entry is included (partial match)

#### Scenario: Empty result when no skill matches
- **GIVEN** no employee has a "Rust" skill entry
- **WHEN** `strongIn("Rust", 0, ...)` is called
- **THEN** an empty `Paged` result is returned

#### Scenario: Pagination is applied after filter and sort
- **GIVEN** 5 employees have matching "Java" skill entries
- **WHEN** `strongIn("Java", 0, PageRequest.of(0, 2))` is called
- **THEN** the returned page contains 2 items, offset 0, limit 2, total 5

#### Scenario: limit is clamped to a maximum (default ceiling)
- **WHEN** `PageRequest.of(0, 10_000)` is requested
- **THEN** the effective limit is `SkillsService.maxLimit()` (clamp applied)

#### Scenario: Negative limit falls back to default
- **WHEN** `PageRequest.of(0, 0)` is requested
- **THEN** the default limit (20) is applied

#### Scenario: Negative offset is normalized to 0
- **WHEN** `PageRequest.of(-5, 20)` is requested
- **THEN** the effective offset is 0

#### Scenario: Sort by projectCount ascending
- **GIVEN** employees have matching skill entries with project counts 1 and 3
- **WHEN** `strongIn("Java", 0, ...)` is called with sort "projectCount,asc"
- **THEN** the result is ordered by projectCount ascending

#### Scenario: Default sort tie-break is deterministic
- **GIVEN** two entries have identical years and project counts
- **WHEN** `strongIn(...)` is called with the default sort
- **THEN** the result is ordered by the other strength indicator descending, then employee name ascending

#### Scenario: Default direction when sort has no direction
- **WHEN** `strongIn("Java", 0, ...)` is called with sort "years"
- **THEN** the default direction (desc) is applied

#### Scenario: Blank sort falls back to default
- **WHEN** `strongIn("Java", 0, ...)` is called with sort ""
- **THEN** the default sort (`years,desc`) is applied

#### Scenario: Unknown sort field is rejected
- **WHEN** `strongIn(...)` is called with sort "foo,asc"
- **THEN** it throws `IllegalArgumentException`

#### Scenario: Malformed sort direction is rejected
- **WHEN** `strongIn(...)` is called with sort "years,sideways"
- **THEN** it throws `IllegalArgumentException`

#### Scenario: Null skill name in a portfolio entry is ignored
- **GIVEN** an employee portfolio entry has `skill == null`
- **WHEN** `strongIn("Angular", 0, ...)` is called
- **THEN** the null entry is skipped, not matched

#### Scenario: Null employee name in a tie-break is handled
- **GIVEN** two entries tie and one has `employeeName == null`
- **WHEN** the comparator falls back to name
- **THEN** nulls are placed consistently (nulls-first or nulls-last per implementation)

#### Scenario: Employee without a portfolio is skipped
- **GIVEN** an employee has no portfolio
- **WHEN** `strongIn("Angular", 0, ...)` is called
- **THEN** the employee contributes zero entries

#### Scenario: Empty employee list short-circuits (no portfolio lookups)
- **GIVEN** `employeeContract.allEmployees()` returns an empty list
- **WHEN** `strongIn("Angular", 0, ...)` is called
- **THEN** `portfolioContract` is never invoked

### Requirement: Cross-module access is via contracts only
The system SHALL ensure the `skills` module depends exclusively on `EmployeeContract` and `PortfolioContract`. It SHALL NOT import `com.staffengagement.employee.*` or `com.staffengagement.portfolio.*` internals.

#### Scenario: No illegal imports
- **WHEN** the `skills` module source is inspected
- **THEN** it contains no imports from `employee.domain`, `employee.repository`, `portfolio.domain`, or `portfolio.repository`
