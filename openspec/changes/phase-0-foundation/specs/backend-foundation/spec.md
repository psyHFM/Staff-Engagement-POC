## ADDED Requirements

### Requirement: Modular-monolith backend skeleton
The system SHALL provide a Spring Boot 3.3.x backend on Java 21, built with Maven and a
`mvnw` wrapper, with base package `com.staffengagement` and package-based modules. Each
module SHALL be internally layered as `controller/ → service/ → repository/` with an
anemic `domain/`. The backend SHALL start and expose endpoints under `/api/v1`.

#### Scenario: Backend starts
- **WHEN** the backend is started (locally or via Docker Compose)
- **THEN** Spring Boot boots without errors and the context loads

#### Scenario: API prefix
- **WHEN** any Phase 0 endpoint is invoked
- **THEN** its path is under `/api/v1` using kebab-case segments

### Requirement: Shared kernel value types
The system SHALL define typed ID value types `EmployeeId`, `InteractionId`, `TaskId`,
and `PortfolioId` in `shared/kernel`, and an `InteractionType` enum with exactly the
values `check-in`, `mentoring`, `catch-up`, `performance`, `other`. These types SHALL
be used by the frozen contracts instead of raw `Long` or `String`.

#### Scenario: InteractionType vocabulary
- **WHEN** the `InteractionType` enum is referenced
- **THEN** it exposes exactly `check-in`, `mentoring`, `catch-up`, `performance`, `other`

#### Scenario: Typed IDs in contracts
- **WHEN** a frozen contract references an entity identifier
- **THEN** it uses the corresponding `shared/kernel` ID type, not a raw `Long`

### Requirement: Uniform error envelope
The system SHALL return all errors through a single uniform envelope
(`timestamp`, `status`, `error`, `message`, `path`) via `@RestControllerAdvice` in
`shared/error`, per `api-standards.yaml`. Successful responses SHALL be unwrapped JSON
with camelCase keys and nulls excluded.

#### Scenario: Error response shape
- **WHEN** a request triggers an error (e.g. not found, unauthorized)
- **THEN** the response body is the uniform envelope with ISO-8601 timestamp, integer
  status, HTTP error name, message, and request path

#### Scenario: Success response shape
- **WHEN** a request succeeds
- **THEN** the response is unwrapped JSON with camelCase keys and no null fields

### Requirement: JWT + RBAC security stub
The system SHALL configure Spring Security with a Bearer JWT stub and RBAC via
`@PreAuthorize`. Phase 0 SHALL provide one in-memory user with roles `EMPLOYEE` and
`MANAGER`. Protected endpoints SHALL reject requests without a valid token.

#### Scenario: Protected endpoint without token
- **WHEN** a protected endpoint is called with no `Authorization` header
- **THEN** the request is rejected (401) with the uniform error envelope

#### Scenario: Protected endpoint with valid token
- **WHEN** a protected endpoint is called with a valid Bearer JWT
- **THEN** the request is authorized and proceeds

### Requirement: Frozen cross-module contracts
The system SHALL define frozen port interfaces in `shared/api`:
`EmployeeContract` (`Optional<EmployeeSummary> findById(EmployeeId)`, `boolean
exists(EmployeeId)`), `InteractionContract` (`List<InteractionSummary>
findBySubject(EmployeeId)`), `TaskContract` (`List<TaskSummary>
tasksForEmployee(EmployeeId)`, `List<TaskSummary> myTasks(EmployeeId currentUser)`,
creation accepting an optional source `InteractionId`), `PortfolioContract`
(`PortfolioSummary portfolioFor(EmployeeId)`), and `SkillsContract`
(`Paged<SkillStrength> strongIn(String skill, int minYears, PageRequest)`). Supporting
DTOs (`EmployeeSummary`, `InteractionSummary`, `TaskSummary`, `PortfolioSummary`,
`SkillStrength`, `Paged`, `PageRequest`) SHALL accompany them. `InteractionSummary`
SHALL expose `type` (`InteractionType`), `subject` (`EmployeeId`), `facilitator`
(`EmployeeId`), and note. No implementations SHALL exist in Phase 0.

#### Scenario: Contracts compile and are interfaces
- **WHEN** the backend is compiled
- **THEN** every `shared/api` contract compiles and is declared as a Java interface

#### Scenario: Interaction summary fields
- **WHEN** an `InteractionSummary` is produced by a later phase
- **THEN** it carries `type`, `subject`, `facilitator`, and note

### Requirement: Liquibase foundation
The system SHALL wire Liquibase with a `master.yaml` that uses `includeAll` over
`db/changelog/modules/` (recursive) plus one baseline changeset. No module-specific
changelogs SHALL exist in Phase 0 beyond the baseline.

#### Scenario: Master changelog aggregates modules
- **WHEN** Liquibase runs
- **THEN** it applies the baseline changeset and recursively includes any future
  per-module changelogs under `db/changelog/modules/`

### Requirement: ArchUnit boundary baseline
The system SHALL include an ArchUnit test that enforces: controllers do not import
repositories; no module imports another module's `repository/` or `domain/` package;
`shared/api` contracts are interfaces; and there are no circular module dependencies.

#### Scenario: Controller bypasses service to repository
- **WHEN** a controller class imports from a `repository/` package
- **THEN** the ArchUnit test fails

#### Scenario: Cross-module internal import
- **WHEN** a module imports another module's `repository/` or `domain/` package
- **THEN** the ArchUnit test fails

#### Scenario: Boundaries hold
- **WHEN** the ArchUnit baseline runs against the Phase 0 skeleton
- **THEN** it passes (green)

### Requirement: Health endpoint stub
The system SHALL expose `GET /api/v1/health` returning HTTP 200, protected by the
security stub, proving the layered layout compiles and runs.

#### Scenario: Health check
- **WHEN** `GET /api/v1/health` is called with a valid token
- **THEN** the response is HTTP 200

### Requirement: Backend unit-testing baseline
The system SHALL configure PITest (mutation) and JaCoCo (coverage ≥ 80%, soft) for the
backend, and the Phase 0 stub logic SHALL have BDD (Given-When-Then) unit tests.

#### Scenario: Tests and mutation run
- **WHEN** `./mvnw test` and PITest mutation coverage are run
- **THEN** the unit tests pass and PITest produces a report