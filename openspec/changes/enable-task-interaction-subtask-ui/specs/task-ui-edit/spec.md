## ADDED Requirements

### Requirement: User can edit a task's title and description

The system SHALL allow an authenticated user to edit a task's `title`
and `description` from the task detail view.

#### Scenario: User saves a title change

- **WHEN** the authenticated user edits the task title in the detail
  view and submits the change
- **THEN** the system calls the task update endpoint with the new
  title
- **AND** the updated title is persisted and reflected in the detail
  view
- **AND** the task list is updated with the new title

#### Scenario: User saves a description change

- **WHEN** the authenticated user edits the task description in the
  detail view and submits the change
- **THEN** the system calls the task update endpoint with the new
  description
- **AND** the updated description is persisted and reflected in the
  detail view

#### Scenario: Edit fails due to missing title

- **WHEN** the authenticated user clears the title and submits
- **THEN** the system displays a validation error stating that the
  title is required
- **AND** no backend request is sent until a non-empty title is
  provided

## MODIFIED Requirements

### Requirement: Complete Task

The system SHALL allow users to update a task, including its
`completed` status, `title`, and `description`.

#### Scenario: Successful task completion

- **WHEN** a user sends a request to update a task's `completed`
  status to `true`
- **THEN** the system updates the task record and returns 200 OK

#### Scenario: Successful task title and description update

- **WHEN** a user sends a request to update a task's `title` and/or
  `description`
- **THEN** the system validates that `title` is non-empty
- **AND** the system persists the supplied fields
- **AND** the system returns 200 OK with the updated `TaskSummary`

#### Scenario: Update failure due to missing title

- **WHEN** a user sends a request to update a task with a blank or
  null `title`
- **THEN** the system returns 400 Bad Request with a uniform error
  envelope stating that `title` is required
