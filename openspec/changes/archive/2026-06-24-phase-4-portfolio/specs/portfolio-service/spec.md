## ADDED Requirements

> **Persona mandate — required:** `PortfolioService` business logic and its unit tests are authored and verified by the **BDD Test Engineer** (`.claude/personas/bdd-test-engineer.md`) in Given-When-Then form, designed to survive PITest mutation, with Mockito isolating the `EmployeeContract` dependency (no Spring context, no DB → Unit-Tests-Only). The module boundaries and cross-module communication are audited by the **Constitution Guard** (`.claude/personas/constitution-guard.md`) against `backend-architecture.yaml` and verified via the `/arch-verify` skill.

### Requirement: PortfolioService implements the frozen PortfolioContract
The system SHALL provide a `PortfolioService` in `com.staffengagement.portfolio.service` that implements the frozen `PortfolioContract` from `shared/api/`, exposing `PortfolioSummary portfolioFor(EmployeeId)` returning the employee's skill entries as `List<SkillStrength>` (each with `employeeId`, `employeeName`, `skill`, `years`, `projectCount`).

#### Scenario: portfolioFor returns skill strengths for an employee
- **WHEN** `portfolioFor(employeeId)` is called for an employee with skill entries
- **THEN** the service returns a `PortfolioSummary` whose `skills` list maps each stored skill entry to a `SkillStrength`, with `employeeName` resolved from `EmployeeContract`

#### Scenario: portfolioFor returns an empty summary when no portfolio exists
- **WHEN** `portfolioFor(employeeId)` is called for an existing employee with no portfolio
- **THEN** the service returns a `PortfolioSummary` with an empty `skills` list

### Requirement: Cross-module access via EmployeeContract only
The system SHALL resolve employee existence and display name exclusively through the frozen `EmployeeContract` (`exists`, `findById`). `PortfolioService` SHALL NOT import `employee/` implementation, repository, or domain packages.

#### Scenario: Subject existence is validated via the contract
- **WHEN** a portfolio write targets an employee
- **THEN** the service calls `EmployeeContract.exists(employeeId)` and rejects the write when it returns false

#### Scenario: Employee name is resolved via the contract
- **WHEN** building a `SkillStrength`
- **THEN** the service resolves `employeeName` from `EmployeeContract.findById(employeeId)`, never from the employee module's internals

### Requirement: Skill entry validation
The system SHALL reject skill entries whose `years` or `projectCount` are negative, and whose `skill` name is blank.

#### Scenario: Negative years is rejected
- **WHEN** a skill entry with `years < 0` is submitted
- **THEN** the service rejects it with a 400 uniform error envelope

#### Scenario: Blank skill name is rejected
- **WHEN** a skill entry with a blank `skill` name is submitted
- **THEN** the service rejects it with a 400 uniform error envelope

### Requirement: Idempotent upsert of the 1:1 portfolio
The system SHALL ensure at most one portfolio per employee. Creating or editing a portfolio for an employee that has none SHALL insert it; a concurrent duplicate SHALL be rejected by the unique constraint and surfaced as a recoverable error rather than corrupting data.

#### Scenario: First edit creates the portfolio
- **WHEN** a portfolio write targets an employee with no existing portfolio
- **THEN** the service creates the portfolio row and applies the entry changes

#### Scenario: Duplicate portfolio creation is prevented
- **WHEN** two concurrent creates target the same employee
- **THEN** the unique constraint on `portfolio.employee_id` rejects one and the service surfaces a clear error rather than producing two rows