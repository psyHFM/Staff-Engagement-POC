# task-subtasks Specification

## Purpose
TBD - created by archiving change atse1-25-35-ux-walkthrough-fixes. Update Purpose after archive.
## Requirements
### Requirement: Tasks support subtasks / checklist items

A task MUST be able to own a list of `TaskItem` records. Each
`TaskItem` has `id`, `taskId`, `ordinal`, `title`, `completed`,
`createdAt`. Subtasks are added, reordered, edited, and deleted via
dedicated REST endpoints.

#### Scenario: User adds a subtask

- **WHEN** the user submits a new subtask on a task
- **THEN** the system MUST call
  `POST /api/v1/tasks/{id}/items` with the title
- **AND** the new subtask MUST appear in the task's checklist
- **AND** the task's `isComplete` MUST be false until all subtasks
  are completed (or `allowPartialComplete` is true)

#### Scenario: User toggles a subtask completed flag

- **WHEN** the user toggles a subtask between completed and
  incomplete
- **THEN** the system MUST call
  `PATCH /api/v1/tasks/{taskId}/items/{itemId}` with the new
  `completed` value
- **AND** the task's `isComplete` MUST reflect the new aggregate

#### Scenario: User reorders subtasks

- **WHEN** the user reorders subtasks within a task
- **THEN** the system MUST call
  `PUT /api/v1/tasks/{taskId}/items/reorder` with the new ordinal
  order
- **AND** the rendered checklist MUST reflect the new order

#### Scenario: User deletes a subtask

- **WHEN** the user deletes a subtask
- **THEN** the system MUST call
  `DELETE /api/v1/tasks/{taskId}/items/{itemId}`
- **AND** the subtask MUST be removed from the checklist

### Requirement: task_item table and TaskItem JPA entity

The backend MUST persist subtasks in a new `task_item` table
(separate from `task`) with a foreign key to `task.id`. The JPA
entity MUST live in
`com.staffengagement.task.domain.TaskItem`. The items MUST be
exposed via the additive `TaskSummaryWithItems` wrapper returned
by `TaskContract.taskWithItems(TaskId)` (no change to the v1.0.0
`TaskSummary` record — additive contract only, per
`backend-architecture.yaml -> modularization.communication`).

#### Scenario: TaskSummaryWithItems exposes items

- **WHEN** the system returns a `TaskSummaryWithItems` for a task
- **THEN** the `items` field MUST contain every non-deleted
  `TaskItem` ordered by `ordinal` ascending
- **AND** the field MUST be omitted from JSON when empty (api
  standards: exclude nulls)

#### Scenario: Liquibase adds task_item table

- **WHEN** the backend starts up
- **THEN** Liquibase MUST apply the
  `003-create-task-item-table.yaml` changeset under
  `db/changelog/modules/task/`
- **AND** the new `task_item` table MUST exist
- **AND** `master.yaml` MUST NOT be edited

