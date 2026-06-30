# interaction-picker Specification

## Purpose
New capability to support linking tasks to interactions via the Create Task form.

## Requirements

### Requirement: InteractionPicker is a reusable signal-driven shared component

The `InteractionPicker` component MUST live in `frontend/src/app/shared/forms/interaction-picker/` and MUST be reusable by any feature that needs an interaction id. It MUST load its data via the existing `InteractionApi` (no new service). It MUST speak Signals only — `value = input<number | null>()` plus `valueChange = output<number | null>()` — and MUST NOT use template-driven `[(ngModel)]` (per `frontend-state.yaml -> primary_mechanism` and ROADMAP §2.4).

#### Scenario: Picker is a standalone signal-driven component

- **WHEN** a feature imports `InteractionPicker`
- **THEN** the picker MUST accept a signal input `value: number | null`
- **AND** it MUST emit a `valueChange` event (output) when the user picks a different interaction
- **AND** it MUST NOT depend on any feature module's state

#### Scenario: Picker shows interaction options with subject name and note preview

- **WHEN** the picker renders interaction options
- **THEN** each option MUST display the interaction's subject name (employee full name)
- **AND** the first 60 characters of the interaction's note
- **AND** the bound value on selection MUST be the numeric interaction id

#### Scenario: Picker filters by subject when subjectId is provided

- **WHEN** the picker receives a `subjectId` input (employee id)
- **THEN** the picker MUST only show interactions where `interaction.subject.value === subjectId`
- **AND** when `subjectId` is null or cleared, ALL interactions MUST be shown

### Requirement: InteractionPicker loads data efficiently

#### Scenario: Picker fetches interactions on initial render

- **WHEN** the picker component initializes
- **THEN** the picker MUST call `GET /api/v1/employees/[subjectId]/interactions` if subjectId is provided
- **OR** call `GET /api/v1/interactions` with wide pagination (offset: 0, limit: 100) if no subjectId
- **AND** subsequent mounts MUST read from cached data, not re-fetch

### Requirement: InteractionPicker handles loading and error states

#### Scenario: Picker shows loading state

- **WHEN** the picker is fetching interactions
- **THEN** the picker MUST show a loading indicator in the dropdown

#### Scenario: Picker shows error state

- **WHEN** the interaction fetch fails
- **THEN** the picker MUST display an error message
- **AND** the dropdown MUST remain rendered (not hide the picker)
