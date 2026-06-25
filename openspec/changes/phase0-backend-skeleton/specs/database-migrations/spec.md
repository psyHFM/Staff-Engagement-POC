## ADDED Requirements

### Requirement: Liquibase master changelog
The system SHALL provide a Liquibase `master.yaml` at `backend/src/main/resources/db/changelog/master.yaml` using `includeAll` over `db/changelog/modules/` (recursive). This file is **frozen** after Phase 0; splices MUST NOT edit it.

#### Scenario: master.yaml includes all module changelogs
- **WHEN** Liquibase runs
- **THEN** it discovers and applies every changeset under `db/changelog/modules/` recursively via `includeAll`

#### Scenario: Modules folder is the only append point
- **WHEN** a later splice adds a migration
- **THEN** it adds a file under `db/changelog/modules/<its-module>/` and does not edit `master.yaml`

### Requirement: Baseline changeset
The system SHALL include one baseline changeset under `db/changelog/modules/` (or the shared changelog root) establishing the migration baseline, so Liquibase has a starting state.

#### Scenario: Baseline applies cleanly
- **WHEN** `mvn -pl backend spring-boot:run` starts against an empty Postgres
- **THEN** Liquibase applies the baseline changeset without error

### Requirement: Module-prefixed changeset IDs
Changeset IDs SHALL be prefixed by module and zero-padded per module (e.g., `employee-001`), so no two modules share an ID prefix.

#### Scenario: No ID collisions across modules
- **WHEN** changesets across all modules are enumerated
- **THEN** no two changesets share the same ID