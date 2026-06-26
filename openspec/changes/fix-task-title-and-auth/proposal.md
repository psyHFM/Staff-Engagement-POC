## Why

The `Task` model is currently inconsistent across the system, missing a required `title` field in the database and UI, which hinders task identification and sorting. Additionally, a critical security regression prevents administrative users from managing tasks (returning 500 Access Denied), and a frontend state bug prevents new tasks from appearing in the list immediately after creation.

## What Changes

- **Database**: Ensure the `title` column (already added via `002-add-task-title.yaml`) is correctly mapped and utilized.
- **Backend API**: 
    - Update `Task` entity and `TaskRequestDto` to include the `title` field.
    - Enforce that `title` is required and non-empty on task creation (return 400 Bad Request).
- **Security**: 
    - Fix authorization logic to allow users with the `ADMIN` role to access `POST /api/v1/tasks` and `GET /api/v1/me/tasks`.
    - Ensure authorization failures return `403 Forbidden` instead of `500 Internal Server Error`.
- **Frontend UI**:
    - Add a `Title` input field (max 120 chars, required) to the create-task form.
    - Display the `title` as the primary identifier in the task list (first column) and in the task detail view.
    - Implement sorting functionality by `title` in the task list.
- **Frontend State**: Fix the `TaskStateService` to ensure that the task list is updated immediately upon successful creation of a new task.

## Capabilities

### New Capabilities
(None)

### Modified Capabilities
- `task-management`: Update requirements to include the `title` field (DB, API, UI) and correct authorization behavior for administrative users.

## Impact

- **Database**: Schema change to `task` table.
- **Backend**: `SecurityConfig`, `TaskController`, `TaskService`, `TaskEntity`, `TaskRequestDto`, and Liquibase changelogs.
- **Frontend**: `task.ts` (model), `task-create-form.ts`, `task-list.html`, `task-state.service.ts`.
- **APIs**: `POST /api/v1/tasks` and `GET /api/v1/me/tasks` behavior changes.
