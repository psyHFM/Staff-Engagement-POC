# task-interaction-cascading Specification

## Purpose
New capability to provide cascading selection between Employee and Interaction in the Task Create form.

## Requirements

### Requirement: Employee selection filters Interaction dropdown

When an employee is selected in the Task Create form, the Interaction dropdown MUST only show interactions where the subject is that employee.

#### Scenario: Selecting employee filters interactions

- **WHEN** a user selects an employee in the subject dropdown
- **THEN** the interaction dropdown MUST only show interactions where `interaction.subject.value === selectedEmployeeId`
- **AND** interactions for other employees MUST NOT be visible

### Requirement: Interaction selection pins Employee dropdown

When an interaction is selected, the Employee dropdown MUST be pinned to that interaction's subject and shown as read-only.

#### Scenario: Selecting interaction pins employee

- **WHEN** a user selects an interaction in the dropdown
- **THEN** the employee dropdown MUST be set to the interaction's `subject.value`
- **AND** the employee dropdown MUST be disabled/read-only
- **AND** the interaction dropdown MUST remain enabled for changing the selection

### Requirement: Clear button resets both dropdowns

The form MUST provide a "Clear" affordance that resets both the Employee and Interaction selections.

#### Scenario: Clearing selections

- **WHEN** a user clicks the clear button
- **THEN** the employee selection MUST be cleared (null)
- **AND** the interaction selection MUST be cleared (null)
- **AND** both dropdowns MUST return to their full, unfiltered state

### Requirement: No selection shows all interactions

When neither employee nor interaction is selected, both dropdowns MUST show their complete unfiltered sets.

#### Scenario: Empty form shows all options

- **WHEN** the form opens with no pre-filled values
- **THEN** the employee dropdown MUST show all employees
- **AND** the interaction dropdown MUST show all interactions (no subject filter)
