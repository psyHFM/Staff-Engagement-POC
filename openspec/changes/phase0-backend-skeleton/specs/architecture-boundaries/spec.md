## ADDED Requirements

### Requirement: Layer separation enforced
The system SHALL enforce via ArchUnit that classes in a `controller` package do not depend on any `repository` package, enforcing the layered architecture constraint from `backend-architecture.yaml`.

#### Scenario: Controller must not touch repository
- **WHEN** the ArchUnit layer test runs
- **THEN** it fails if any controller class depends on a repository class

### Requirement: No cross-module repository/domain imports
The system SHALL enforce via ArchUnit that no class in one domain module package depends on another domain module's `repository` or `domain` packages.

#### Scenario: Cross-module repository import is rejected
- **WHEN** a class in `com.staffengagement.interaction` imports `com.staffengagement.employee.repository`
- **THEN** the ArchUnit boundary test fails

#### Scenario: Cross-module domain import is rejected
- **WHEN** a class in `com.staffengagement.task` imports `com.staffengagement.interaction.domain`
- **THEN** the ArchUnit boundary test fails

### Requirement: Cross-module access via shared.api only
The system SHALL enforce via ArchUnit that any cross-module dependency targets only the `com.staffengagement.shared.api` package (the frozen contracts).

#### Scenario: Cross-module access to shared.api is allowed
- **WHEN** a class in `com.staffengagement.task` depends on `com.staffengagement.shared.api`
- **THEN** the ArchUnit boundary test passes

#### Scenario: Baseline test is green on Phase 0 skeleton
- **WHEN** `mvn -pl backend test` runs against the Phase 0 skeleton
- **THEN** all ArchUnit boundary tests pass

### Requirement: No circular module dependencies
The system SHALL enforce via ArchUnit that no circular dependencies exist between modules.

#### Scenario: Cycles are rejected
- **WHEN** a dependency cycle is introduced between two modules
- **THEN** the ArchUnit test detects and fails on the cycle