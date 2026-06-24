## ADDED Requirements

> **Persona mandate — required:** Persistence and the `Portfolio` aggregate are designed and audited by the **Constitution Guard** (`.claude/personas/constitution-guard.md`) against `tech-stack.yaml` and `backend-architecture.yaml`, and by the **Constitutional Backend Developer** / **Modular Monolith Architect** (`.claude/personas/`) for aggregate shape and package layering. The Liquibase changesets are reviewed by the **Constitution Guard** against the ROADMAP §2.3 migration rules (module-prefixed IDs, `includeAll`, no edits to `master.yaml`).

### Requirement: Portfolio schema owned by this splice
The system SHALL persist a per-employee portfolio using Liquibase changesets added only under `db/changelog/modules/portfolio/`, with changeset IDs prefixed `portfolio-` and zero-padded per module (e.g. `portfolio-001`). No changeset SHALL edit `master.yaml` or any other module's changelog folder.

#### Scenario: Changesets are module-scoped and uniquely prefixed
- **WHEN** the portfolio migrations are enumerated
- **THEN** every changeset lives under `db/changelog/modules/portfolio/` and carries a `portfolio-NNN` id, and `master.yaml` is unchanged

### Requirement: Portfolio and child tables
The system SHALL create a `portfolio` table with a unique `employee_id` foreign key to `employee(id)` (1:1), plus child tables `portfolio_skill`, `portfolio_education`, `portfolio_project`, and `portfolio_link`, each referencing `portfolio(id)`.

#### Scenario: 1:1 portfolio per employee
- **WHEN** a portfolio row is inserted for an employee that already has one
- **THEN** the unique constraint on `portfolio.employee_id` rejects the duplicate

#### Scenario: Child rows cascade with the portfolio
- **WHEN** a `portfolio_skill`, `portfolio_education`, `portfolio_project`, or `portfolio_link` row references a portfolio
- **THEN** each child table has a foreign key to `portfolio(id)`

### Requirement: Skill entries carry years and project count
The system SHALL persist each skill entry with a skill name, a non-negative `years` value, and a non-negative `project_count` value, so the Skills register (Phase 5) can aggregate them via the frozen `PortfolioContract`.

#### Scenario: Skill entry stores quantified experience
- **WHEN** a skill entry is persisted
- **THEN** the row records `skill`, `years`, and `project_count`, with `years >= 0` and `project_count >= 0`