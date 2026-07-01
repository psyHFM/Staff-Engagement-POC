## ADDED Requirements

### Requirement: User can open a task from the task list

The system SHALL allow an authenticated user to open a task from the
My Tasks view and see the task's title, description, completion state,
creation date, source interaction link (if any), and sub-task checklist.

#### Scenario: User clicks a task row

- **WHEN** the authenticated user clicks a task row or card on the My
  Tasks page
- **THEN** the system loads the task detail via `GET /api/v1/tasks/{id}`
- **AND** the detail view displays the task's title, description,
  completed flag, created-at timestamp, and source-interaction link
  indicator when applicable

#### Scenario: Task detail loads sub-tasks automatically

- **WHEN** the task detail view opens
- **THEN** the system calls `TaskStateService.loadTaskItems(taskId)` to
  fetch the `TaskSummaryWithItems` response
- **AND** it renders the returned items ordered by `ordinal` ascending

#### Scenario: Empty task detail shows empty checklist state

- **WHEN** the task detail view opens for a task that has no sub-tasks
- **THEN** the system displays an empty checklist message and an input
  to add the first sub-task

## MODIFIED Requirements

### Requirement: TaskSummaryWithItems exposes subtasks

`TaskContract.taskWithItems(TaskId)` MUST return a
`TaskSummaryWithItems` wrapper carrying the task plus its ordered
sub-items. The wrapper is additive; `TaskSummary` itself is unchanged.

#### Scenario: TaskSummaryWithItems returns ordered items

- **WHEN** the system returns a `TaskSummaryWithItems` for a task that
  has sub-items
- **THEN** the `items` field MUST contain every non-deleted `TaskItem`
  ordered by `ordinal` ascending
- **AND** the `items` field MUST be omitted from JSON when empty

#### Scenario: TaskSummaryWithItems used by task detail view

- **WHEN** the task detail component requests task details
- **THEN** it receives the task inside the `base` field of
  `TaskSummaryWithItems`
- **AND** it receives the sub-tasks inside the `items` field
