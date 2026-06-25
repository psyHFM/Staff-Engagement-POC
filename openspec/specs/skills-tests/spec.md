# skills-tests Specification

## Purpose
TBD - created by syncing change atse1-20-skills-backend. Update Purpose after archive.
## Requirements

> **Persona mandate — required:** Skills tests are authored and verified by the **BDD Test Engineer** (`.claude/personas/bdd-test-engineer.md`) in Given-When-Then form, designed to survive PITest mutation. All Skills tests SHALL be pure unit tests — JUnit 5 + Mockito with no Spring context, no MockMvc, no DB, and no `@SpringBootTest` — per `testing-strategy.yaml -> general_policy.scope: Unit Tests Only`.

### Requirement: SkillsServiceTest covers aggregation behavior
The system SHALL provide `SkillsServiceTest` using JUnit 5 and Mockito to mock `EmployeeContract` and `PortfolioContract`. Every test SHALL carry explicit `// Given`, `// When`, `// Then` markers.

#### Scenario: No employees yields empty page
- **GIVEN** `employeeContract.allEmployees()` returns an empty list
- **WHEN** `skillsService.strongIn("Angular", 0, ...)` is called
- **THEN** the returned page has empty content and total 0

#### Scenario: Employees without matching skill yield empty page
- **GIVEN** employees exist but none have a matching skill
- **WHEN** `skillsService.strongIn("Rust", 0, ...)` is called
- **THEN** the returned page has empty content and total 0

#### Scenario: minYears filter is applied (boundary inclusive)
- **GIVEN** matching entries with 2 and 4 years
- **WHEN** `minYears` is 2
- **THEN** both entries remain
- **WHEN** `minYears` is 3
- **THEN** only the 4-year entry remains

#### Scenario: Pagination window is honored
- **GIVEN** 5 matching entries
- **WHEN** `PageRequest.of(2, 2)` is requested
- **THEN** content size is 2, offset is 2, total is 5

#### Scenario: Aggregation collects multiple skills per employee
- **GIVEN** an employee has multiple matching skill entries
- **WHEN** the search runs
- **THEN** all of that employee's matching entries appear in the result

#### Scenario: Employee without a portfolio is skipped
- **GIVEN** an employee has no portfolio
- **WHEN** the search runs
- **THEN** the employee contributes zero entries

#### Scenario: Null skill name in a portfolio entry is skipped
- **GIVEN** a portfolio entry has `skill == null`
- **WHEN** the search runs
- **THEN** the entry is filtered out, not matched

### Requirement: SkillsControllerTest covers REST binding
The system SHALL provide `SkillsControllerTest` mocking `SkillsService` to verify query-parameter binding and HTTP status codes.

#### Scenario: Controller delegates parameters to service
- **WHEN** `GET /api/v1/skills?name=angular&minYears=3&sort=years,desc&offset=0&limit=10` is called
- **THEN** the controller invokes `skillsService.search("angular", 3, "years,desc", 0, 10)` (or the equivalent contract method) with sort "years,desc"

#### Scenario: Blank name returns 400 without calling the service
- **WHEN** `GET /api/v1/skills?name=` is called
- **THEN** the controller responds 400 AND `skillsService.search(...)` is never called

#### Scenario: Null name returns 400 without calling the service
- **WHEN** `GET /api/v1/skills` is called without `name`
- **THEN** the controller responds 400 AND `skillsService.search(...)` is never called

#### Scenario: Whitespace-only name is trimmed and rejected when blank
- **WHEN** `GET /api/v1/skills?name=%20%20` is called
- **THEN** the controller responds 400

#### Scenario: Default offset and limit are applied when omitted
- **WHEN** `GET /api/v1/skills?name=angular` is called
- **THEN** the controller forwards offset 0 and limit 20

### Requirement: SkillsAccessControlTest verifies RBAC
The system SHALL provide `SkillsAccessControlTest` asserting that `GET /api/v1/skills` is annotated with `@PreAuthorize("isAuthenticated()")`. The test SHALL use reflection (no Spring/AOP context).

#### Scenario: PreAuthorize annotation is present with exact value
- **WHEN** the controller method is inspected via reflection
- **THEN** it carries `@PreAuthorize("isAuthenticated()")`
