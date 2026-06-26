# interaction-create-task Specification

## Purpose
TBD - created by archiving change atse1-25-35-ux-walkthrough-fixes. Update Purpose after archive.
## Requirements
### Requirement: Inline "Create task from this interaction" action

Every interaction history row MUST expose a "Create task" action
that opens the existing `TaskCreateForm` inline (modal or drawer),
pre-filled with:
- `subjectId` = the interaction's `subjectId`
- `sourceInteractionId` = the interaction's `id`

The form MUST submit via the existing
`POST /api/v1/tasks` endpoint. On success, the new task MUST be
visible from the Tasks tab.

#### Scenario: User clicks Create task on a row

- **WHEN** the user clicks "Create task" on an interaction history
  row
- **THEN** the task create form MUST open
- **AND** the `subjectId` field MUST be pre-filled with the
  interaction's `subjectId`
- **AND** the form MUST carry a hidden `sourceInteractionId` field
  pre-filled with the interaction's `id`

#### Scenario: User submits the inline task form

- **WHEN** the user submits the inline task form with a valid title,
  description, and the pre-filled subject
- **THEN** the system MUST call `POST /api/v1/tasks` with
  `subjectId`, `sourceInteractionId`, `title`, and `description`
- **AND** on success the form MUST close
- **AND** the new task MUST be visible from the Tasks tab

#### Scenario: Inline form pre-fill survives a reload

- **WHEN** the user reopens the page after a reload
- **THEN** the task form MUST NOT retain any pre-filled values from
  a previous submission
- **AND** the form MUST reset to its default empty state

