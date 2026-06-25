# skills-contract Specification

## Purpose
TBD - created by syncing change atse1-20-skills-backend. Update Purpose after archive.
## Requirements

> **Persona mandate — required:** The contract surface is owned by the **Constitution Guard** (`.claude/personas/constitution-guard.md`) against `backend-architecture.yaml` — frozen interfaces, additive changes only. The **Modular Monolith Architect** verifies via ArchUnit that no module imports another module's internals and that contract implementations live in the module that owns the contract.

### Requirement: SkillsContract is the frozen interface for the skills module
The system SHALL provide a `SkillsContract` interface in `com.staffengagement.shared.api` declaring the skills search operation. The contract SHALL be an interface only (not a class); its implementation SHALL live in `com.staffengagement.skills.service`.

#### Scenario: SkillsContract is an interface
- **WHEN** the `shared/api/SkillsContract.java` source is inspected
- **THEN** it is declared as `interface`, not `class` or `record`

#### Scenario: SkillsService implements SkillsContract
- **WHEN** `SkillsService.java` is inspected
- **THEN** it is declared as `class SkillsService implements SkillsContract`

### Requirement: EmployeeContract exposes all employees for aggregation
The system SHALL extend the frozen `EmployeeContract` with an additive method `List<EmployeeSummary> allEmployees()` that returns every employee in the system as a summary. No other `EmployeeContract` method SHALL be removed or renamed.

#### Scenario: allEmployees returns every employee
- **GIVEN** employees exist in the repository
- **WHEN** `employeeContract.allEmployees()` is called
- **THEN** it returns a list containing an `EmployeeSummary` for every employee

#### Scenario: allEmployees is empty when no employees exist
- **GIVEN** no employees exist in the repository
- **WHEN** `employeeContract.allEmployees()` is called
- **THEN** it returns an empty list

#### Scenario: allEmployees does not expose repository internals
- **WHEN** the `EmployeeContract` source and its implementation are inspected
- **THEN** the method signature is additive and no other `EmployeeContract` method is removed or renamed
