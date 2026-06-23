## 1. Backend Foundation

- [ ] 1.1 Create Liquibase migration for `task` table (including `source_interaction_id` nullable FK)
- [ ] 1.2 Implement `Task` entity in `com.staffengagement.task.domain`
- [ ] 1.3 Implement `TaskRepository` in `com.staffengagement.task.repository`
- [ ] 1.4 Implement `TaskService` implementing the frozen `TaskContract` in `com.staffengagement.task.service`

## 2. Backend API

- [ ] 2.1 Create `TaskController` with `POST /api/v1/tasks` and `GET /api/v1/employees/{id}/tasks`
- [ ] 2.2 Implement `GET /api/v1/me/tasks` utilizing the security context to resolve the current employee
- [ ] 2.3 Implement validation for `subject` existence via `EmployeeContract`
- [ ] 2.4 Implement validation for `sourceInteractionId` via `InteractionContract`

## 3. Frontend Foundation

- [ ] 3.1 Create `TaskStateService` using Angular Signals in `features/task/`
- [ ] 3.2 Append lazy-loaded route for `/tasks` to `routes.ts`
- [ ] 3.3 Implement HTTP client calls for task management endpoints

## 4. Frontend UI

- [ ] 4.1 Build "My Tasks" view displaying the authenticated user's tasks
- [ ] 4.2 Build "Create Standalone Task" form
- [ ] 4.3 Build "Create Task from Interaction" action/form (linked to interaction context)
- [ ] 4.4 Implement task completion toggle in the UI

## 5. Verification & Quality

- [ ] 5.1 Write BDD unit tests for `TaskService` (Given-When-Then)
- [ ] 5.2 Run PITest to verify mutation score >= 80% for the task module
- [ ] 5.3 Write frontend unit tests for `TaskStateService` and components
- [ ] 5.4 Run Stryker to verify mutation score >= 80% for the task feature
- [ ] 5.5 Run ArchUnit tests to ensure no illegal cross-module imports from `task` to other modules' internals
