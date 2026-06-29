## MODIFIED Requirements

### Requirement: Create Standalone Task

The system SHALL allow any authenticated user with role `USER` or
`ADMIN` to create a task for any employee without linking it to a
source interaction. The task body MUST include both `title` and
`description`; both MUST be persisted in separate columns.

#### Scenario: Successful standalone task creation by USER

- **WHEN** a user with `ROLE_USER` sends a `POST` request to
  `/api/v1/tasks` with a valid `subject` (EmployeeId), a `title`,
  and a `description`, but no `sourceInteractionId`
- **THEN** the system creates the task, assigns it to the subject,
  and returns 201 Created with the new Task id
- **AND** the persisted row MUST have both `title` and `description`
  populated from the request

#### Scenario: Successful standalone task creation by ADMIN

- **WHEN** a user with `ROLE_ADMIN` sends a `POST` request to
  `/api/v1/tasks` with a valid `subject`, `title`, and `description`
- **THEN** the system creates the task and returns 201 Created

#### Scenario: Creation failure due to invalid subject

- **WHEN** a user sends a `POST` request to `/api/v1/tasks` with a
  non-existent `subject` EmployeeId
- **THEN** the system returns 400 Bad Request with a uniform error
  envelope stating the employee does not exist

#### Scenario: Creation failure due to missing title

- **WHEN** a user sends a `POST` request to `/api/v1/tasks` without
  a `title` (null or empty)
- **THEN** the system returns 400 Bad Request with a uniform error
  envelope stating that `title` is required

### Requirement: Create Task from Interaction

The system SHALL allow any authenticated user with role `USER` or
`ADMIN` to create a task that is linked to a specific interaction.

#### Scenario: Successful linked task creation

- **WHEN** a user sends a `POST` request to `/api/v1/tasks` with a
  valid `subject`, `title`, `description`, and a valid
  `sourceInteractionId`
- **THEN** the system creates the task, links it to the interaction,
  and returns 201 Created
- **AND** the persisted row MUST have all four fields populated

#### Scenario: Creation failure due to invalid interaction

- **WHEN** a user sends a `POST` request to `/api/v1/tasks` with a
  `sourceInteractionId` that does not exist
- **THEN** the system returns 400 Bad Request with an error stating
  the source interaction was not found

## ADDED Requirements

### Requirement: TaskSummary exposes title distinctly

The `TaskSummary` returned by the system MUST expose a `title`
field that is distinct from `description`. (The v1.0.0 record
already has both fields — the change is to populate them
independently in `TaskService.toSummary`, not to mutate the
record.)

#### Scenario: TaskSummary returns title and description separately

- **WHEN** the system returns a `TaskSummary` for a task that has a
  non-empty `title` and a non-empty `description`
- **THEN** the `title` JSON field MUST equal the persisted `title`
- **AND** the `description` JSON field MUST equal the persisted
  `description`
- **AND** the two fields MUST NOT be equal unless both persisted
  values are identical

### Requirement: TaskSummaryWithItems exposes subtasks

`TaskContract.taskWithItems(TaskId)` MUST return a
`TaskSummaryWithItems` wrapper carrying the task plus its
ordered sub-items. The wrapper is additive; `TaskSummary` itself
is unchanged.

#### Scenario: TaskSummaryWithItems returns ordered items

- **WHEN** the system returns a `TaskSummaryWithItems` for a task
  that has sub-items
- **THEN** the `items` field MUST contain every non-deleted
  `TaskItem` ordered by `ordinal` ascending
- **AND** the `items` field MUST be omitted from JSON when empty

### Requirement: Task subtasks

A task MUST be able to own a list of `TaskItem` records. Each
`TaskItem` has `id`, `taskId`, `ordinal`, `title`, `completed`,
`createdAt`. The task's effective completion SHALL be true when
every subtask is completed OR when the task has the
`allowPartialComplete` flag set.

#### Scenario: All subtasks completed implies task complete

- **WHEN** a task has one or more subtasks and every subtask is
  marked completed
- **THEN** the task's effective `completed` MUST be true

#### Scenario: Partial subtask completion keeps task incomplete

- **WHEN** a task has one or more subtasks and at least one is
  incomplete
- **THEN** the task's effective `completed` MUST be false

#### Scenario: allowPartialComplete override

- **WHEN** a task has `allowPartialComplete = true` and at least
  one subtask is complete
- **THEN** the task's effective `completed` SHALL be set to true
  regardless of the remaining subtask state

## REMOVED Requirements

*None.*

## RENAMED Requirements

*None.*