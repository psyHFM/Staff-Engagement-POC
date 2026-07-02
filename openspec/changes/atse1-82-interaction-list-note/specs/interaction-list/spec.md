# interaction-list Specification

## ADDED Requirements

### Requirement: Interaction list row uses interactionListNote as subject

The system SHALL render the `interactionListNote` field as the clickable subject text in each interaction list row, instead of the full `notes` content. The full notes SHALL only be visible in the detail modal.

#### Scenario: List row displays interactionListNote
- **WHEN** the interaction list renders with interactions that have `interactionListNote` values
- **THEN** each row displays the `interactionListNote` as the subject text, not the full `notes`

#### Scenario: List row handles missing interactionListNote
- **WHEN** an interaction has no `interactionListNote` value
- **THEN** the row displays a fallback text (e.g., "No note" or truncated `notes`)

### Requirement: Interaction list row click handler

The system SHALL attach a click handler to each interaction list row that opens the interaction detail modal. The click handler SHALL be on the row element, not just the subject text.

#### Scenario: Row click opens modal
- **WHEN** a user clicks on an interaction row
- **THEN** the interaction detail modal opens with that interaction's data

#### Scenario: Row click uses interaction state service
- **WHEN** a row is clicked
- **THEN** the `InteractionStateService` is called to set the selected interaction before opening the modal
