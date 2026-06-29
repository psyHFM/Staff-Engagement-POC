# portfolio-add-row-fix Specification

## Purpose
TBD - created by archiving change atse1-25-35-ux-walkthrough-fixes. Update Purpose after archive.
## Requirements
### Requirement: Portfolio add-* forms append one row per submission

The portfolio page MUST support successive "Add skill", "Add
education", "Add project", and "Add link" submissions. Each
submission MUST append a fresh row to the relevant section. The
form model MUST reset between submissions. Rapid double-clicks MUST
NOT produce duplicate rows.

#### Scenario: User adds a skill, then another

- **WHEN** the user submits the "Add skill" form once
- **THEN** the skills list MUST grow by exactly one entry
- **WHEN** the user then types a different skill and submits again
- **THEN** the skills list MUST grow by exactly one more entry
- **AND** the form MUST be visibly reset (inputs empty) after each
  success

#### Scenario: Rapid double-click does not duplicate

- **WHEN** the user double-clicks the "Add skill" submit button
- **THEN** the skills list MUST grow by exactly one entry
- **AND** the second click MUST be ignored while the first is
  in-flight (button disabled during submission)

#### Scenario: Add education, project, and link behave the same way

- **WHEN** the user submits "Add education" / "Add project" /
  "Add link" forms
- **THEN** the same per-submission append-and-reset behavior MUST
  apply

#### Scenario: Server error is visible to the user

- **WHEN** a form submission fails (e.g. 4xx or 5xx)
- **THEN** the form MUST display the server error message
- **AND** the form state MUST be preserved so the user can correct
  the input and resubmit

