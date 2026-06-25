## ADDED Requirements

### Requirement: SkillsServiceTest covers aggregation behavior
The system SHALL provide `SkillsServiceTest` using JUnit 5 and Mockito to mock `EmployeeContract` and `PortfolioContract`.

#### Scenario: No employees yields empty page
- **GIVEN** `employeeContract.allEmployees()` returns an empty list
- **WHEN** `skillsService.strongIn("Angular", 0, ...)` is called
- **THEN** the returned page has empty content and total 0

#### Scenario: Employees without matching skill yield empty page
- **GIVEN** employees exist but none have a matching skill
- **WHEN** `skillsService.strongIn("Rust", 0, ...)` is called
- **THEN** the returned page has empty content and total 0

#### Scenario: minYears filter is applied
- **GIVEN** matching entries with 2 and 4 years
- **WHEN** `minYears` is 3
- **THEN** only the 4-year entry remains

#### Scenario: Pagination window is honored
- **GIVEN** 5 matching entries
- **WHEN** `PageRequest.of(2, 2)` is requested
- **THEN** content size is 2, offset is 2, total is 5

### Requirement: SkillsControllerTest covers REST binding
The system SHALL provide `SkillsControllerTest` mocking `SkillsService` to verify query-parameter binding and HTTP status codes.

#### Scenario: Controller delegates parameters to service
- **WHEN** `GET /api/v1/skills?name=angular&minYears=3&sort=years,desc&offset=0&limit=10` is called
- **THEN** the controller invokes `skillsService.strongIn("angular", 3, PageRequest.of(0, 10))` with sort "years,desc"

#### Scenario: Blank name returns 400
- **WHEN** `GET /api/v1/skills?name=` is called
- **THEN** the controller responds 400 without calling the service

### Requirement: SkillsAccessControlTest verifies RBAC
The system SHALL provide `SkillsAccessControlTest` asserting that `GET /api/v1/skills` is annotated with `@PreAuthorize("isAuthenticated()")`.
