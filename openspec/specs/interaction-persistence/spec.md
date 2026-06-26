# interaction-persistence Specification

## Purpose
TBD - created by archiving change phase2-interaction. Update Purpose after archive.
## Requirements
### Requirement: Interaction table migration
The system SHALL create an `interaction` table via a Liquibase changeset placed under `db/changelog/modules/interaction/`, with columns `id` (bigint PK), `type` (varchar), `subject_id` (bigint not null), `facilitator_id` (bigint not null), `note` (text), `created_at` (timestamp not null), `updated_at` (timestamp not null). The migration SHALL NOT add a database foreign key to an `employee` table.

#### Scenario: Migration applies cleanly
- **WHEN** Liquibase runs against a database with the Phase 0 baseline applied
- **THEN** the `interaction` table is created with the specified columns and no employee FK

#### Scenario: Migration is discovered by master.yaml
- **WHEN** `master.yaml` runs its `includeAll` over `db/changelog/modules/`
- **THEN** the interaction changeset is picked up without any edit to `master.yaml`

### Requirement: Module-prefixed changeset IDs
The system SHALL prefix the interaction changeset ID with the module and zero-pad it (`interaction-001`), so it cannot collide with any other module's changeset ID.

#### Scenario: No ID collisions
- **WHEN** all changesets across modules are enumerated
- **THEN** the interaction changeset ID is `interaction-001` and no other module uses the `interaction-` prefix

### Requirement: No shared migration file edits
The system SHALL NOT edit `master.yaml` or any changelog outside `db/changelog/modules/interaction/`.

#### Scenario: master.yaml is untouched
- **WHEN** the splice's migration changes are reviewed
- **THEN** `db/changelog/master.yaml` is unchanged and only files under `db/changelog/modules/interaction/` are added

