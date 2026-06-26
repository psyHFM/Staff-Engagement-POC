## ADDED Requirements

### Requirement: phase-6-rounded-profile openSpec change is reconciled and archived

The active `openspec/changes/phase-6-rounded-profile/` change MUST
be reconciled against the code on `main` (which already includes
PRs #33 and #34) and then archived.

#### Scenario: All implemented items are ticked off

- **WHEN** the reconciliation runs
- **THEN** every numbered task that landed in PR #33 (backend) or
  PR #34 (frontend) MUST have a checked checkbox
- **AND** a "Verified by merged PRs #33 + #34" note MUST be added
  at the top of the change file

#### Scenario: Frontend-only items reflect the PR #34 merge

- **WHEN** the reconciliation runs
- **THEN** the frontend scaffold, state service, and page/routing
  items (§7, §8, §9 of the original openSpec) MUST be marked done
  with a "merged in PR #34" reference

#### Scenario: Change is moved to the date-prefixed archive folder

- **WHEN** the reconciliation is complete
- **THEN** the change directory MUST be copied to
  `openspec/changes/archive/2026-06-25-phase-6-rounded-profile/`
  with the same `.openspec.yaml`, `design.md`, `proposal.md`,
  `tasks.md`, and `specs/` files
- **AND** the active `openspec/changes/phase-6-rounded-profile/`
  directory MUST be removed
