# Proposal: Enable task interaction and sub-task (task item) management in the UI

## Why

The task module already persists and serves sub-tasks (`TaskItem`), but the task list page remains read-only: tasks cannot be opened, edited, or expanded, and the existing sub-task CRUD methods in `TaskStateService` have no UI affordance driving them. This change exposes those capabilities so users can manage tasks and their checklists end-to-end.

## What Changes

- Make task cards in the task list clickable so they open a detail view.
- Add task editing: `title` and `description` updates.
- Wire the existing sub-task checklist UI to the backend:
  - Add new sub-task.
  - Toggle completion.
  - Edit title.
  - Delete sub-task.
  - Reorder sub-tasks.
- Update the task update endpoint so it supports `title`/`description` changes (currently it only toggles completion).
- Add / update unit tests for new backend and frontend behavior.

## Capabilities

### New Capabilities
- `task-ui-detail`: Open a task from the list and view its details plus sub-tasks.
- `task-ui-edit`: Edit a task's title and description.
- `task-subtask-ui`: Add, complete, edit, delete, and reorder sub-tasks in the task detail view.

### Modified Capabilities
- `task-management`: Extend the existing task update endpoint beyond completion toggling to include `title` and `description` edits.

## Impact

- Backend: `TaskController`, `TaskService`, and related test files.
- Frontend: `TaskComponent`, `TaskStateService`, `task.model.ts`, and possibly a new detail sub-component.
- API contract: additive change to `PUT /api/v1/tasks/{id}` (or a new dedicated endpoint if cleaner).
- No integration tests; all verification is unit-test based per project policy.
