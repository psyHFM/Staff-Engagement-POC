## ADDED Requirements

### Requirement: Get rounded person profile endpoint
The system SHALL expose `GET /api/v1/employees/{id}/profile` returning an unwrapped `PersonProfile` JSON payload with camelCase keys when the employee exists, and a uniform `ErrorEnvelope` with HTTP 404 when the employee does not exist.

#### Scenario: Existing employee returns full rounded view
- **WHEN** `GET /api/v1/employees/{id}/profile` is called for an existing employee
- **THEN** the response is 200 with a `PersonProfile` containing `employee`, `interactions`, `tasks`, `portfolio`, and `topSkills`

#### Scenario: Unknown employee returns 404
- **WHEN** `GET /api/v1/employees/{id}/profile` is called for a non-existent employee
- **THEN** the response is 404 with the uniform `ErrorEnvelope` (`timestamp`, `status`, `error`, `message`, `path`)

### Requirement: API casing and versioning
The endpoint SHALL sit under `/api/v1`, use kebab-case URL segments, camelCase JSON keys, unwrapped responses, `application/json`, and ISO-8601 timestamps per `api-standards.yaml`.

#### Scenario: Path and JSON follow standards
- **WHEN** the response is inspected
- **THEN** the path is `/api/v1/employees/{id}/profile`, keys are camelCase, and the body is not wrapped in a `data` envelope

### Requirement: Read-only orchestration through frozen contracts
The profile endpoint SHALL compose data only through the frozen cross-module contracts in `shared/api/` and SHALL NOT import another module's `repository` or `domain` packages. The contracts may be extended additively to expose the read fields the profile needs.

#### Scenario: Architecture boundary check
- **WHEN** ArchUnit scans the `profile` module
- **THEN** there are no illegal cross-module imports and the controller depends only on `profile.service` and the frozen contracts

### Requirement: Profile module isolation in ArchUnit
`ArchUnitTest.java` SHALL include a rule that prevents `com.staffengagement.profile..` from importing other modules' `repository` or `domain` packages, mirroring the existing task/portfolio/skills rules.

#### Scenario: ArchUnit profile rule
- **WHEN** the ArchUnit test suite runs
- **THEN** the profile module boundary rule passes
