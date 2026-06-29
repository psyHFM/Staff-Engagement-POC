# task-subject-dropdown Specification

## Purpose
TBD - created by archiving change atse1-25-35-ux-walkthrough-fixes. Update Purpose after archive.
## Requirements
### Requirement: Task create form uses a shared employee picker

The task create form MUST replace the free-text
`<input name="subjectId" placeholder="e.g. EMP-123">` with a shared
`EmployeePicker` component. The picker MUST show employee full
names (and ideally email + role) and MUST bind to a numeric
employee id.

#### Scenario: User opens the task create form

- **WHEN** the task create form is rendered
- **THEN** the form MUST contain an `EmployeePicker` for the
  subject field
- **AND** the picker MUST show the full name of each employee
- **AND** the value bound on submit MUST be the numeric employee id

#### Scenario: Picker is searchable for >50 employees

- **WHEN** the picker renders for an employee list of more than 50
  entries
- **THEN** the picker MUST provide a typeahead filter that narrows
  the visible options by the typed substring
- **AND** the bound value MUST be the id of the highlighted option

#### Scenario: Picker defaults to the current user

- **WHEN** the form opens
- **THEN** the picker MUST default to the current authenticated
  user's employee id, if it can be resolved
- **AND** the default selection MUST be visible in the picker

### Requirement: EmployeePicker is a reusable signal-driven shared component

The `EmployeePicker` component MUST live in
`frontend/src/app/shared/forms/employee-picker/` and MUST be
reusable by any feature that needs an employee id. It MUST load
its data via the existing `EmployeeApi` (no new service). It MUST
speak Signals only — `value = input<number | null>()` plus
`valueChange = output<number | null>()` — and MUST NOT use
template-driven `[(ngModel)]` (per `frontend-state.yaml ->
primary_mechanism` and ROADMAP §2.4). Hosting features that want
two-way ngModel wiring at their layer may keep it; the shared
picker itself stays signal-only.

#### Scenario: Picker is a standalone signal-driven component

- **WHEN** a feature imports `EmployeePicker`
- **THEN** the picker MUST accept a signal input `value: number | null`
- **AND** it MUST emit a `valueChange` event (output) when the user
  picks a different employee
- **AND** it MUST NOT depend on any feature module's state

