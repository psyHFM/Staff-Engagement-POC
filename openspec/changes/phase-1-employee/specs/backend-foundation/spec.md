## MODIFIED Requirements

### Requirement: Shared kernel value types
The system SHALL define typed ID value types `EmployeeId`, `InteractionId`, `TaskId`,
and `PortfolioId` in `shared/kernel`, an `InteractionType` enum with exactly the values
`check-in`, `mentoring`, `catch-up`, `performance`, `other`, and an `EmployeeRole` enum
with exactly the values `EMPLOYEE` and `ADMIN`. These types SHALL be used by the frozen
contracts instead of raw `Long` or `String`, and `EmployeeRole` SHALL be referenced by
both `shared/security` and the Employee module without any cross-module import.

#### Scenario: InteractionType vocabulary
- **WHEN** the `InteractionType` enum is referenced
- **THEN** it exposes exactly `check-in`, `mentoring`, `catch-up`, `performance`, `other`

#### Scenario: EmployeeRole vocabulary
- **WHEN** the `EmployeeRole` enum is referenced
- **THEN** it exposes exactly `EMPLOYEE` and `ADMIN`

#### Scenario: Typed IDs in contracts
- **WHEN** a frozen contract references an entity identifier
- **THEN** it uses the corresponding `shared/kernel` ID type, not a raw `Long`

### Requirement: JWT + RBAC security stub
The system SHALL configure Spring Security with a Bearer JWT stub and RBAC via
`@PreAuthorize`. The stub SHALL provide in-memory users `employee` and `admin` whose
usernames are email-shaped (`admin@staff.eng`, `employee@staff.eng`) so the authenticated
principal's name doubles as the Employee identity key. The roles SHALL be `EMPLOYEE` and
`ADMIN`; the `MANAGER` role SHALL NOT exist. At login, the JWT's role authority SHALL be
resolved from the Employee record via `EmployeeContract.findByEmail(principal.name)`, not
from the stub's role list; when no Employee record exists yet, it SHALL fall back to
`ROLE_EMPLOYEE`. Protected endpoints SHALL reject requests without a valid token.

#### Scenario: Protected endpoint without token
- **WHEN** a protected endpoint is called with no `Authorization` header
- **THEN** the request is rejected (401) with the uniform error envelope

#### Scenario: Protected endpoint with valid token
- **WHEN** a protected endpoint is called with a valid Bearer JWT
- **THEN** the request is authorized and proceeds

#### Scenario: Role resolved from employee record at login
- **WHEN** a user logs in and an Employee record exists for their email
- **THEN** the issued JWT carries `ROLE_<role>` taken from that Employee's `role`

#### Scenario: Fallback role when no employee record exists
- **WHEN** a user logs in before they have created their Employee profile
- **THEN** the issued JWT carries `ROLE_EMPLOYEE` so they can self-create their profile

### Requirement: Frozen cross-module contracts
The system SHALL define frozen port interfaces in `shared/api`:
`EmployeeContract` (`Optional<EmployeeSummary> findById(EmployeeId)`, `boolean
exists(EmployeeId)`, `Optional<EmployeeSummary> findByEmail(String email)`),
`InteractionContract` (`List<InteractionSummary> findBySubject(EmployeeId)`), `TaskContract`
(`List<TaskSummary> tasksForEmployee(EmployeeId)`, `List<TaskSummary> myTasks(EmployeeId
currentUser)`, creation accepting an optional source `InteractionId`), `PortfolioContract`
(`PortfolioSummary portfolioFor(EmployeeId)`), and `SkillsContract`
(`Paged<SkillStrength> strongIn(String skill, int minYears, PageRequest)`). Supporting
DTOs (`EmployeeSummary`, `InteractionSummary`, `TaskSummary`, `PortfolioSummary`,
`SkillStrength`, `Paged`, `PageRequest`) SHALL accompany them. `EmployeeSummary` SHALL
expose `id`, `fullName`, `email`, and `role` (`EmployeeRole`). `InteractionSummary`
SHALL expose `type` (`InteractionType`), `subject` (`EmployeeId`), `facilitator`
(`EmployeeId`), and note. The `findByEmail` and `EmployeeSummary.role` additions are
additive amendments made via a coordination PR (ROADMAP §2.2); no existing method signature
is removed or renamed. No implementations SHALL exist in Phase 0.

#### Scenario: Contracts compile and are interfaces
- **WHEN** the backend is compiled
- **THEN** every `shared/api` contract compiles and is declared as a Java interface

#### Scenario: Employee summary fields
- **WHEN** an `EmployeeSummary` is produced
- **THEN** it carries `id`, `fullName`, `email`, and `role`

#### Scenario: Employee lookup by email
- **WHEN** `EmployeeContract.findByEmail` is called with an existing employee's email
- **THEN** it returns an `Optional` of that `EmployeeSummary`; for an unknown email it returns an empty `Optional`

#### Scenario: Interaction summary fields
- **WHEN** an `InteractionSummary` is produced by a later phase
- **THEN** it carries `type`, `subject`, `facilitator`, and note