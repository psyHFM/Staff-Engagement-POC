## Context

Phase 3 introduces the Task module to the Staff Engagement POC. Following the Modular Monolith architecture, this module implements "person-level" follow-up actions. A task is conceptually an obligation or action item associated with an employee (the subject), regardless of who created the task. Tasks may be standalone or linked to a specific engagement (Interaction).

## Goals / Non-Goals

**Goals:**
- Implement the `Task` domain entity, repository, and service.
- Implement `TaskService` satisfying the frozen `TaskContract`.
- Provide REST endpoints for task creation (standalone and linked) and retrieval (by employee and for the current user).
- Build a frontend "My Tasks" view using Angular Signals.
- Maintain strict module boundaries via ArchUnit and frozen contracts.

**Non-Goals:**
- Complex task management features (e.g., priorities, deadlines, sub-tasks, status transitions beyond simple completion).
- Integration testing (explicitly disabled per `testing-strategy.yaml`).
- Persistence of frontend state across page refreshes.

## Decisions

- **Data Model**: The `Task` entity will contain:
    - `TaskId`: Primary key.
    - `EmployeeId subject`: The employee the task relates to (Mandatory).
    - `InteractionId sourceInteractionId`: Link to the interaction that spawned the task (Nullable).
    - `String description`: The task detail.
    - `Boolean completed`: Status flag.
    - Timestamps for creation and completion.
- **Security & "Me" Context**: The endpoint `/api/v1/me/tasks` will resolve the current authenticated user's `EmployeeId` from the JWT/Security context and delegate the query to `TaskService.tasksForEmployee(userId)`.
- **Frontend Architecture**: 
    - A `TaskStateService` will be created in `features/task/` using Angular Signals to hold the current user's task list.
    - Components will consume these signals, ensuring a unidirectional data flow as per `frontend-state.yaml`.
- **Cross-Module Communication**: `TaskService` will only interact with other modules via `EmployeeContract` and `InteractionContract`. For example, when creating a task from an interaction, it will use `InteractionContract.exists(interactionId)` to validate the source.

## Risks / Trade-offs

- [Risk] Potential circular dependency between Interaction and Task modules. → [Mitigation] Both modules are forbidden from importing each other's implementation packages. All communication happens via the frozen interfaces in `shared/api/`.
- [Risk] API performance for users with high task volumes. → [Mitigation] All list endpoints will strictly follow `api-standards.yaml` using offset pagination.
- [Risk] Data inconsistency if an Interaction is deleted but the Task remains. → [Mitigation] Given the POC scope, we will use a nullable foreign key and handle missing interactions gracefully in the UI.
