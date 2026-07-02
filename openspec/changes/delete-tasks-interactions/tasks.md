## Implementation Tasks

### Database Migration

- [x] **Create Liquibase changelog for Interaction flags**
  - File: `db/changelog/modules/interaction/003-add-interaction-archive-delete-flags.yaml`
  - Add 4 boolean columns: `archived_by_subject`, `archived_by_facilitator`, `deleted_by_subject`, `deleted_by_facilitator`
  - All with `defaultValueBoolean: false` and `nullable: false`

### Backend - Interaction Entity

- [x] **Update Interaction entity with 4 new flags**
  - `archivedBySubject` (boolean, default false)
  - `archivedByFacilitator` (boolean, default false)
  - `deletedBySubject` (boolean, default false)
  - `deletedByFacilitator` (boolean, default false)
  - Add getters/setters via Lombok `@Getter @Setter`

### Backend - Interaction Repository

- [x] **Add query methods to InteractionRepository**
  - `findBySubjectIdAndNotDeleted(subjectId, includeArchived, pageable)` — filters out deleted, optionally filters archived
  - `findByFacilitatorIdAndNotDeleted(facilitatorId, includeArchived, pageable)` — filters out deleted, optionally filters archived

### Backend - Interaction Service

- [x] **Add archiveInteraction method**
  - Signature: `public InteractionSummary archiveInteraction(InteractionId id, EmployeeId actor, boolean isSubject)`
  - Toggle the actor's archive flag
  - Return updated InteractionSummary
  - Unit tests: archive by subject, archive by facilitator, non-owner denied

- [x] **Add softDeleteInteraction method**
  - Signature: `public void softDeleteInteraction(InteractionId id, EmployeeId actor, boolean isSubject)`
  - Set actor's delete flag
  - If both flags set, hard-delete; otherwise save
  - Unit tests: delete by one party (sets flag), delete by both parties (hard delete), non-owner denied

- [x] **Update existing find methods** to respect delete flags (filter out rows where user's delete flag is true)

### Backend - Interaction Controller

- [x] **Add archive endpoint**
  - `POST /api/v1/interactions/{id}/archive`
  - `@PreAuthorize("hasAnyRole('USER','ADMIN')")`
  - Determine if actor is subject or facilitator
  - Call `interactionService.archiveInteraction()`
  - Return updated InteractionSummary

- [x] **Add delete endpoint**
  - `DELETE /api/v1/interactions/{id}`
  - `@PreAuthorize("hasAnyRole('USER','ADMIN')")`
  - Determine if actor is subject or facilitator
  - Call `interactionService.softDeleteInteraction()`
  - Return 204 No Content

### Backend - Task Service

- [x] **Add deleteTask method**
  - Signature: `public void deleteTask(TaskId id, EmployeeId actor)`
  - Verify ownership (task.subjectId == actor.value())
  - Call `taskRepository.delete(task)`
  - Unit tests: delete by owner success, delete by non-owner throws AccessDeniedException

### Backend - Task Controller

- [x] **Add delete endpoint**
  - `DELETE /api/v1/tasks/{id}`
  - `@PreAuthorize("hasAnyRole('USER','ADMIN')")`
  - Resolve actor from security context
  - Call `taskService.deleteTask()`
  - Return 204 No Content

### Backend - Shared API

- [x] **Update InteractionSummary** (additive, backward-compatible)
  - Add `archivedBySubject` (optional boolean)
  - Add `archivedByFacilitator` (optional boolean)
  - Add `deletedBySubject` (optional boolean)
  - Add `deletedByFacilitator` (optional boolean)

### Frontend - Interaction Types

- [x] **Update InteractionSummary interface**
  - Add `archivedBySubject?: boolean`
  - Add `archivedByFacilitator?: boolean`
  - Add `deletedBySubject?: boolean`
  - Add `deletedByFacilitator?: boolean`

### Frontend - Interaction State Service

- [x] **Add archiveInteraction method**
  ```typescript
  archiveInteraction(interactionId: string): void {
    this.http.post(`/api/v1/interactions/${interactionId}/archive`, {}).subscribe({
      next: () => this.loadHistory(this.subjectId()),
      error: (err) => this.handleError('Failed to archive interaction', err)
    });
  }
  ```

- [x] **Add deleteInteraction method**
  ```typescript
  deleteInteraction(interactionId: string): void {
    this.http.delete(`/api/v1/interactions/${interactionId}`).subscribe({
      next: () => this.loadHistory(this.subjectId()),
      error: (err) => this.handleError('Failed to delete interaction', err)
    });
  }
  ```

### Frontend - Interaction List Component

- [x] **Add archive toggle button** to each interaction row
  - Icon: `pi-archive`
  - Label: "Archive" (or "Unarchive" if already archived by this user)
  - Emit `archiveRequested` event with interaction

- [x] **Add delete button** to each interaction row
  - Icon: `pi-trash`
  - Styling: danger variant
  - Emit `deleteRequested` event with interaction

- [x] **Add new output emitters**
  - `@Output() archiveRequested = new EventEmitter<InteractionSummary>()`
  - `@Output() deleteRequested = new EventEmitter<InteractionSummary>()`

### Frontend - Interaction Page

- [x] **Handle archiveRequested event**
  - Call `interactionStateService.archiveInteraction(interaction.id.value.toString())`
  - No confirmation needed (reversible)

- [x] **Handle deleteRequested event**
  - Show confirmation dialog
  - On confirm, call `interactionStateService.deleteInteraction(interaction.id.value.toString())`

### Frontend - Task Component

- [x] **Add delete button to task card footer**
  - Icon: `pi-trash`
  - Styling: danger variant (icon-button--danger)
  - Click handler: show confirmation, call `state.deleteTask()`

- [x] **Add delete button to task detail modal**
  - Location: footer actions, after "Done" button
  - Label: "Delete task"
  - Same confirmation and delete logic

### Frontend - Task State Service

- [x] **Add deleteTask method**
  ```typescript
  deleteTask(taskId: string): void {
    this.http.delete(`/api/v1/tasks/${taskId}`).subscribe({
      next: () => {
        this.tasks.update(tasks => tasks.filter(t => t.id.value.toString() !== taskId));
        this.itemsByTaskId.update(map => {
          const newMap = new Map(map);
          newMap.delete(taskId);
          return newMap;
        });
      },
      error: (err) => this.handleError('Failed to delete task', err)
    });
  }
  ```

### Verification

- [ ] Run Liquibase migration successfully
- [ ] Manual test: Delete task from task card (confirmation → success → removed from list)
- [ ] Manual test: Delete task from detail modal
- [ ] Manual test: Archive interaction (toggles, hides from list)
- [ ] Manual test: Unarchive interaction (toggles back, reappears in list)
- [ ] Manual test: Delete interaction (one party) — still visible to other party
- [ ] Manual test: Delete interaction (both parties) — removed from database
- [ ] Manual test: Cancel delete (click X on confirmation) — item not deleted
- [ ] Manual test: Error handling (simulate 404/500) — notification shown, item remains
- [ ] Run backend unit tests: all pass
- [ ] Run frontend unit tests: all pass

## Dependencies

- No cross-module dependencies
- Uses existing `EmployeeContract` for actor resolution (already available)
- Uses existing HTTP client and error handling infrastructure
