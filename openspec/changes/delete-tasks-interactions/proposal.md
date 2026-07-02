## Why

Jira ATSE1-83 requires the ability to delete (and archive) tasks and interactions from the UI with confirmation prompts. Currently, the application supports creating, updating, and completing tasks and interactions, but there is no delete or archive functionality. Users need to be able to hide or remove erroneous or obsolete records.

The acceptance criteria require:
- Delete tasks from the tasks UI with confirmation prompt
- Delete/archive interactions from the interactions UI with confirmation prompt
- Backend endpoints with appropriate ownership checks
- Immediate removal from list views after successful operation
- Interactions support both archive (hide from one party) and soft-delete (permanent removal when both parties agree)

## What Changes

### Interactions: Archive + Soft-Delete (Dual-Party Model)

Interactions involve two parties (subject and facilitator), so deletion requires independent tracking:

- **Archive functionality** (hide from one party's view):
  - `archivedBySubject` (boolean, default false) — subject has archived this interaction
  - `archivedByFacilitator` (boolean, default false) — facilitator has archived this interaction
  - Archived interactions are hidden from that party's list but visible to the other
  - Endpoint: `POST /api/v1/interactions/{id}/archive`

- **Soft-delete functionality** (permanent removal):
  - `deletedBySubject` (boolean, default false) — subject has deleted this interaction
  - `deletedByFacilitator` (boolean, default false) — facilitator has deleted this interaction
  - An interaction is only truly deleted from the database when BOTH flags are true
  - If one party deletes, the other still sees it until they delete too
  - Endpoint: `DELETE /api/v1/interactions/{id}`

- **Repository query updates**:
  - List queries filter out rows where the querying user's delete flag is set
  - List queries optionally filter archived rows based on user preference
  - New repository methods: `findBySubjectAndNotDeleted()`, `findByFacilitatorAndNotDeleted()`

- **Service methods**:
  - `archiveInteraction(interactionId, actor)` — toggles the actor's archive flag
  - `softDeleteInteraction(interactionId, actor)` — sets actor's delete flag; hard-deletes if both flags set

### Tasks: Hard-Delete (Single-Owner Model)

Tasks are owned by a single user (subject), so hard-delete is safe:

- **Hard-delete functionality**:
  - When a user deletes a task, it's completely removed from the database
  - Ownership verified before allowing deletion (404 if not owner)
  - Endpoint: `DELETE /api/v1/tasks/{id}`

### Authorization Model (Owner-Based, Not ADMIN-Gated)

- **Tasks**: The signed-in user can only access their own tasks via existing endpoints (`/api/v1/me/tasks`). No ADMIN check needed — ownership is implicit in the data access.
- **Interactions**: The signed-in user can only access their own interactions (as subject or facilitator). No ADMIN check needed — ownership is implicit.
- **RBAC**: Endpoints use `@PreAuthorize("hasAnyRole('USER','ADMIN')")` to allow any authenticated user; the service layer enforces ownership by filtering data per-user.

### Frontend

- **Task UI**: Add delete button to task cards and modal; confirmation dialog; remove from list on success
- **Interaction UI**: Add archive toggle and delete button to interaction rows; confirmation for delete; hide/show based on operation

## Capabilities

### New Capabilities

- `interaction-archive`: Archive/unarchive interactions per-party with `archivedBySubject` and `archivedByFacilitator` flags
- `interaction-soft-delete`: Soft-delete interactions with dual-party flags (`deletedBySubject`, `deletedByFacilitator`)
- `interaction-ui-archive`: Archive toggle button on interaction rows
- `interaction-ui-delete`: Delete button on interaction rows with confirmation
- `task-delete`: Hard-delete endpoint for tasks with ownership verification
- `task-ui-delete`: Delete button on task cards and modal with confirmation

### Modified Capabilities

- `task-management`: TaskController now supports full CRUD (previously C+R+U, now includes D)
- `interaction-history-list`: InteractionList now includes archive toggle and delete action

## Impact

- **Jira ticket closed by this change**: ATSE1-83

- **Frontend code touched** (Angular 22, Signals, unidirectional):
  - `frontend/src/app/features/task/task.ts` — add delete button, confirmation handler
  - `frontend/src/app/features/task/task-state.service.ts` — add deleteTask method
  - `frontend/src/app/features/interaction/interaction-list/interaction-list.ts` — add archive toggle, delete emitter
  - `frontend/src/app/features/interaction/interaction-page/interaction-page.ts` — handle archive/delete, refresh list
  - `frontend/src/app/features/interaction/interaction-state.service.ts` — add archiveInteraction, deleteInteraction methods
  - `frontend/src/app/features/interaction/interaction.types.ts` — add archive/delete flags to InteractionSummary

- **Backend code touched** (Java 21, Spring Boot, modular monolith):
  - `backend/src/main/java/com/staffengagement/interaction/domain/Interaction.java` — add 4 new boolean columns
  - `backend/src/main/java/com/staffengagement/interaction/controller/InteractionController.java` — add archive + delete endpoints
  - `backend/src/main/java/com/staffengagement/interaction/service/InteractionService.java` — add archiveInteraction, softDeleteInteraction methods
  - `backend/src/main/java/com/staffengagement/interaction/repository/InteractionRepository.java` — add findBySubjectAndNotDeleted, findByFacilitatorAndNotDeleted
  - `backend/src/main/java/com/staffengagement/task/web/TaskController.java` — add DELETE endpoint
  - `backend/src/main/java/com/staffengagement/task/service/TaskService.java` — add deleteTask with ownership check
  - `db/changelog/modules/interaction/` — new Liquibase changelog for 4 new columns
  - New test files for delete/archive functionality (BDD style, unit tests only)

- **Frozen contract changes**: 
  - `InteractionSummary` — additive fields: `archivedBySubject`, `archivedByFacilitator`, `deletedBySubject`, `deletedByFacilitator` (all optional, backward-compatible)

- **Architecture rules verified**: 
  - Controller → Service → Repository pattern maintained
  - Ownership checks in service layer (not ADMIN-gated)
  - Additive Liquibase migrations for existing table
  - No cross-module coupling introduced

- **Out of scope**: 
  - Undo/archive reversal UI (backend supports toggle)
  - Bulk archive/delete operations
  - Audit trail for archive/delete actions
