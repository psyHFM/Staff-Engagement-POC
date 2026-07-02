# interaction-detail-modal Specification

## ADDED Requirements

### Requirement: Interaction detail modal component

The system SHALL provide an `InteractionDetailModalComponent` that displays full details of a selected interaction including the complete `notes` field. The component SHALL use Angular Signals for inputs and follow the established modal pattern from `TaskDetailModalComponent`.

#### Scenario: Modal displays interaction details
- **WHEN** an interaction is selected and the modal opens
- **THEN** the modal displays `id`, `type`, `subject`, `facilitator`, `note` (full notes), `createdAt`, and `interactionListNote`

#### Scenario: Modal uses Signal-based input
- **WHEN** the modal component is instantiated
- **THEN** it receives the interaction data via a Signal input using `input.required<InteractionSummary>()`

#### Scenario: Modal closes on dismiss
- **WHEN** the user clicks the close button or presses Escape
- **THEN** the modal closes and clears the selected interaction state

### Requirement: Modal trigger from interaction list

The system SHALL open the interaction detail modal when a user clicks on an interaction row in the list. The entire row SHALL be clickable with a visual hover state.

#### Scenario: Click opens modal
- **WHEN** a user clicks anywhere on an interaction row
- **THEN** the `InteractionDetailModalComponent` opens displaying that interaction's full details

#### Scenario: Hover state indicates clickability
- **WHEN** a user hovers over an interaction row
- **THEN** the row displays a visual hover state (cursor: pointer, background change)
