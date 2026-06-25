## ADDED Requirements

### Requirement: ID value types
The system SHALL provide type-safe ID value types `EmployeeId`, `InteractionId`, `TaskId`, and `PortfolioId` in `shared/kernel`, each wrapping a `Long` and exposing its value.

#### Scenario: Construct and read an ID
- **WHEN** an `EmployeeId` is constructed with value `42`
- **THEN** `value()` returns `42L`

#### Scenario: IDs are value-equal
- **WHEN** two `TaskId` instances wrap the same `Long`
- **THEN** they are equal and have identical hash codes

### Requirement: Frozen InteractionType enum
The system SHALL define an `InteractionType` enum in `shared/kernel` whose values are exactly `CHECK_IN`, `MENTORING`, `CATCH_UP`, `PERFORMANCE`, `OTHER`, mapping to the controlled vocabulary `check-in`, `mentoring`, `catch-up`, `performance`, `other`. This enum is **frozen** on Phase 0 merge.

#### Scenario: Enum covers the controlled vocabulary
- **WHEN** `InteractionType.values()` is enumerated
- **THEN** it contains exactly the five interaction kinds and no others

#### Scenario: Wire name mapping
- **WHEN** `InteractionType.CHECK_IN` is serialized to JSON
- **THEN** it serializes as the string `"check-in"`

### Requirement: Base entity classes
The system SHALL provide Lombok-annotated base entity classes in `shared/kernel` supplying common audit fields (e.g., `id`, `createdAt`, `updatedAt`) for domain entities to extend.

#### Scenario: Base entity exposes audit fields
- **WHEN** a domain entity extends the base entity
- **THEN** it inherits `id`, `createdAt`, and `updatedAt` fields without redeclaring them