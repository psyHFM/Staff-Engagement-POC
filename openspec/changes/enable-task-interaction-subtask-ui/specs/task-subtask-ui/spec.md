## ADDED Requirements

### Requirement: User can add a sub-task from the task detail view

The system SHALL allow an authenticated user to add a new sub-task to
an open task from the task detail view.

#### Scenario: User adds a sub-task

- **WHEN** the authenticated user types a sub-task title and submits
  the add form in the task detail view
- **THEN** the system calls `POST /api/v1/tasks/{id}/items`
- **AND** the new sub-task appears in the checklist after the response
  is received
- **AND** the new sub-task is initially incomplete and assigned the
  next available ordinal

#### Scenario: Add sub-task with empty title fails

- **WHEN** the authenticated user submits the add form with an empty
  title
- **THEN** the system displays a validation error and does not send
  the request

### Requirement: User can complete and uncomplete a sub-task

The system SHALL allow an authenticated user to toggle the `completed`
flag of a sub-task from the task detail view.

#### Scenario: User checks a sub-task

- **WHEN** the authenticated user checks the checkbox next to a
  sub-task
- **THEN** the system calls `PATCH /api/v1/tasks/{taskId}/items/{itemId}`
  with `completed: true`
- **AND** the sub-task is rendered as completed

#### Scenario: User unchecks a sub-task

- **WHEN** the authenticated user unchecks the checkbox next to a
  completed sub-task
- **THEN** the system calls `PATCH /api/v1/tasks/{taskId}/items/{itemId}`
  with `completed: false`
- **AND** the sub-task is rendered as incomplete

### Requirement: User can edit a sub-task title

The system SHALL allow an authenticated user to edit the title of an
existing sub-task.

#### Scenario: User saves a sub-task title change

- **WHEN** the authenticated user edits a sub-task title and confirms
- **THEN** the system calls `PATCH /api/v1/tasks/{taskId}/items/{itemId}`
  with the new title
- **AND** the checklist reflects the updated title

#### Scenario: Sub-task title cannot be empty

- **WHEN** the authenticated user clears a sub-task title and confirms
- **THEN** the system displays a validation error and does not send
  the request

### Requirement: User can delete a sub-task

The system SHALL allow an authenticated user to delete a sub-task from
the task detail view.

#### Scenario: User deletes a sub-task

- **WHEN** the authenticated user clicks the delete control for a
  sub-task
- **THEN** the system calls `DELETE /api/v1/tasks/{taskId}/items/{itemId}`
- **AND** the sub-task is removed from the checklist
- **AND** the remaining sub-tasks are renumbered to keep ordinals
  contiguous

### Requirement: User can reorder sub-tasks

The system SHALL allow an authenticated user to reorder sub-tasks within
a task.

#### Scenario: User moves a sub-task up or down

- **WHEN** the authenticated user clicks the up or down arrow on a
  sub-task
- **THEN** the system computes the new order locally and calls
  `PUT /api/v1/tasks/{taskId}/items/reorder` with the ordered item ids
- **AND** the checklist re-renders in the returned order

#### Scenario: User moves the first sub-task up

- **WHEN** the authenticated user clicks the up arrow on the first
  sub-task
- **THEN** the move action is disabled and no request is sent

#### Scenario: User moves the last sub-task down

- **WHEN** the authenticated user clicks the down arrow on the last
  sub-task
- **THEN** the move action is disabled and no request is sent
