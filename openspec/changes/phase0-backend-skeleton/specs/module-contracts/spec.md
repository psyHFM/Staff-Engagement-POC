## ADDED Requirements

### Requirement: Frozen cross-module port interfaces
The system SHALL define port interfaces in `shared/api/` — `EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`, and `SkillsContract` — through which modules communicate. These interfaces are **frozen** on Phase 0 merge; later splices implement them and additive (non-breaking) changes only are permitted.

#### Scenario: Contracts compile standalone
- **WHEN** the `shared/api` package is compiled without any domain module implementation
- **THEN** compilation succeeds

#### Scenario: Contracts carry no business logic
- **WHEN** a port interface method body is inspected
- **THEN** it contains no business logic (empty/stub default or `UnsupportedOperationException` where a real impl is required)

### Requirement: Contract DTOs
The system SHALL define DTOs consumed by the port interfaces, including at minimum `InteractionSummary` (type, subject, facilitator, note), `TaskSummary`, `PortfolioSummary`, and `SkillStrength` (employee name, years, project count).

#### Scenario: InteractionSummary exposes required fields
- **WHEN** an `InteractionSummary` is constructed
- **THEN** it exposes `type` (`InteractionType`), `subject` (`EmployeeId`), `facilitator` (`EmployeeId`), and `note`

#### Scenario: SkillStrength exposes strength fields
- **WHEN** a `SkillStrength` is constructed
- **THEN** it exposes employee name, years, and project count

### Requirement: Cross-module communication via interfaces only
Modules SHALL NOT import another module's `repository` or `domain` packages; cross-module access SHALL occur only through the port interfaces in `shared/api`.

#### Scenario: No repository import across modules
- **WHEN** the `employee` module is inspected
- **THEN** it contains no import of `com.staffengagement.interaction.repository` (or any sibling module's repository/domain package)