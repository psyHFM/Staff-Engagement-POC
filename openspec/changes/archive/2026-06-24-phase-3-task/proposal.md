## Why

The system needs a way to track follow-up actions arising from staff interactions. Without a task system, the outcomes of mentoring, check-ins, and catch-ups are lost in personal notes. Phase 3 introduces "person-level" tasks, ensuring that follow-up actions are recorded and visible to the employee they relate to, regardless of who created the task.

## What Changes

- **Backend Task Module**: Implementation of a new modular-monolith module `com.staffengagement.task` containing:
    - `Task` entity with an optional link to a source `InteractionId`.
    - `TaskService` implementing the frozen `TaskContract`.
    - `TaskController` providing REST endpoints for task management.
- **Database Persistence**: A new `task` table created via Liquibase, including a nullable foreign key to `interaction`.
- **Frontend Task Feature**: A new Angular feature folder `features/task` providing:
    - A "My Tasks" view for authenticated users to see tasks relating to them.
    - A "Create Task" flow supporting both standalone creation and creation linked to an existing interaction.
    - `TaskStateService` using Angular Signals for reactive state management.
- **Routing**: Appending a lazy-loaded route for the Task feature to `routes.ts`.
- **Quality Assurance**: BDD-style unit tests for all business logic, verified via PITest (backend) and Stryker (frontend).

## Capabilities

### New Capabilities
- `task-management`: Ability to create, manage, and view person-level tasks, supporting both standalone and interaction-spawned origins.

### Modified Capabilities
None.

## Impact

- **Codebase**: New packages in `backend/` and `frontend/`.
- **API**: New endpoints under `/api/v1/tasks` and `/api/v1/employees/{id}/tasks`.
- **Dependencies**: High dependency on `EmployeeContract` (for task subjects) and `InteractionContract` (for optional interaction-linked task creation).
- **Database**: New table `task`.
