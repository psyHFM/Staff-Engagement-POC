# Implementation Tasks

## Backend: Entity & API
- [x] Update `TaskEntity` to include the `title` field.
- [x] Update `TaskRequestDto` to include `title` with `@NotBlank` and `@Size(max = 120)`.

## Backend: Security & API
- [x] Update `SecurityConfig` to ensure users with the `ADMIN` role can access `/api/v1/tasks` and `/api/v1/me/tasks`.
- [x] Ensure that authorization failures result in a `403 Forbidden` response instead of `500 Internal Server Error`.
- [x] Update `TaskService` and `TaskController` to map and persist the `title` field.

## Frontend: UI & State
- [x] Update `frontend/src/app/features/task/task.ts` model to include the `title` field.
- [x] Update the task creation form to include a required `Title` input (max 120 characters).
- [x] Update the task list component to render the `title` in the first column.
- [x] Implement sorting by `title` in the task list.
- [x] Update the task detail view to display the `title`.
- [x] Fix `TaskStateService` to push new tasks into the state immediately after a successful API response.

## Verification
- [ ] Verify DB migration applies correctly and existing tasks have the default title.
- [ ] Test task creation with valid/invalid titles (check for 400 on empty).
- [ ] Test `POST /api/v1/tasks` and `GET /api/v1/me/tasks` as an `ADMIN` user (confirm no more 500s).
- [ ] Verify new tasks appear in the UI list immediately after creation without reload.
- [ ] Verify sorting by title works as expected in the task list.
