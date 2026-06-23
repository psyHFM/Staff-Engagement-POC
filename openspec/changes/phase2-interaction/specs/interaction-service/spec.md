## ADDED Requirements

### Requirement: Interaction entity and repository
The system SHALL provide an anemic `Interaction` JPA entity and a `InteractionRepository` within the `interaction` module, mapping the columns `id`, `type`, `subject_id`, `facilitator_id`, `note`, `created_at`, `updated_at`. The entity SHALL use typed IDs (`InteractionId`, `EmployeeId`) at the service boundary and `Long` for persistence.

#### Scenario: Entity persists the v1.1.0 domain model
- **WHEN** an `Interaction` is persisted
- **THEN** it stores `type` (an `InteractionType`), `subject` (an `EmployeeId`), `facilitator` (an `EmployeeId`), `note`, and timestamps

### Requirement: InteractionService implements the frozen InteractionContract
The system SHALL provide `InteractionService implements InteractionContract`, satisfying `findBySubject(EmployeeId)` by returning `List<InteractionSummary>` for every interaction recorded against the given subject, ordered by `createdAt` descending.

#### Scenario: findBySubject returns interactions for the subject
- **WHEN** `findBySubject(subjectId)` is called and interactions exist for that subject
- **THEN** it returns a `List<InteractionSummary>`, each exposing `id`, `type`, `subject`, `facilitator`, and `note`

#### Scenario: findBySubject is empty when none exist
- **WHEN** `findBySubject(subjectId)` is called and no interactions exist for that subject
- **THEN** it returns an empty list

### Requirement: Subject existence validation on create
The system SHALL reject creation of an interaction whose `subject` does not reference an existing employee, by calling `EmployeeContract.exists(subject)`. A missing subject SHALL produce a not-found error.

#### Scenario: Unknown subject is rejected
- **WHEN** an interaction is created with a `subject` for which `EmployeeContract.exists` returns false
- **THEN** the interaction is not persisted and a not-found error is raised

#### Scenario: Known subject is accepted
- **WHEN** an interaction is created with a `subject` for which `EmployeeContract.exists` returns true
- **THEN** creation proceeds (subject to facilitator and type validation)

### Requirement: Facilitator existence validation on create
The system SHALL require a `facilitator` `EmployeeId` in the create request and SHALL reject creation when `EmployeeContract.exists(facilitator)` returns false.

#### Scenario: Missing facilitator is rejected
- **WHEN** an interaction is created without a `facilitator`
- **THEN** creation is rejected with a validation error

#### Scenario: Unknown facilitator is rejected
- **WHEN** an interaction is created with a `facilitator` for which `EmployeeContract.exists` returns false
- **THEN** the interaction is not persisted and a not-found error is raised

### Requirement: Type validation against the frozen vocabulary
The system SHALL only accept an `InteractionType` from the frozen `InteractionType` enum (`check-in`, `mentoring`, `catch-up`, `performance`, `other`). An invalid type SHALL be rejected at deserialization.

#### Scenario: Valid type is accepted
- **WHEN** an interaction is created with `type` equal to one of the frozen vocabulary values
- **THEN** the interaction is created with that `type`

#### Scenario: Invalid type is rejected
- **WHEN** an interaction is created with a `type` not in the frozen vocabulary
- **THEN** the request is rejected with a 400 error before reaching the service

### Requirement: Cross-module dependency via EmployeeContract only
The system SHALL depend on the Employee module exclusively through the frozen `EmployeeContract` interface. The `interaction` module SHALL NOT import any `employee` module `repository` or `domain` package.

#### Scenario: No employee implementation imports
- **WHEN** the `interaction` module source is inspected
- **THEN** it contains no import of `com.staffengagement.employee.repository` or `com.staffengagement.employee.domain`

#### Scenario: ArchUnit boundary stays green
- **WHEN** the Phase 0 ArchUnit boundary tests run with the interaction module present
- **THEN** they pass