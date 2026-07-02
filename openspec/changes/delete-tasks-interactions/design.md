## Architecture

### Backend Design

**Task Delete Endpoint**
```
DELETE /api/v1/tasks/{id}
Response: 204 No Content (success), 404 Not Found
```

**Interaction Archive Endpoint**
```
POST /api/v1/interactions/{id}/archive
Response: 200 OK with updated InteractionSummary
```

**Interaction Delete Endpoint**
```
DELETE /api/v1/interactions/{id}
Response: 204 No Content (success), 404 Not Found
```

### Database Schema Changes

**Interaction Entity** (4 new columns):
```java
@Column(name = "archived_by_subject", nullable = false)
@Builder.Default
private boolean archivedBySubject = false;

@Column(name = "archived_by_facilitator", nullable = false)
@Builder.Default
private boolean archivedByFacilitator = false;

@Column(name = "deleted_by_subject", nullable = false)
@Builder.Default
private boolean deletedBySubject = false;

@Column(name = "deleted_by_facilitator", nullable = false)
@Builder.Default
private boolean deletedByFacilitator = false;
```

**Liquibase Migration** (`db/changelog/modules/interaction/003-add-interaction-archive-delete-flags.yaml`):
```yaml
databaseChangeLog:
  - changeSet:
      id: add-interaction-archive-delete-flags
      author: opsx
      changes:
        - addColumn:
            tableName: interaction
            columns:
              - column:
                  name: archived_by_subject
                  type: BOOLEAN
                  defaultValueBoolean: false
              - column:
                  name: archived_by_facilitator
                  type: BOOLEAN
                  defaultValueBoolean: false
              - column:
                  name: deleted_by_subject
                  type: BOOLEAN
                  defaultValueBoolean: false
              - column:
                  name: deleted_by_facilitator
                  type: BOOLEAN
                  defaultValueBoolean: false
```

### Component Hierarchy

```
Task (feature component)
├── Task cards (inline delete button)
└── Task detail modal (delete button in footer)

TaskStateService
└── deleteTask(taskId: string) → void

InteractionPage (feature component)
└── InteractionList (presentational)
    └── Interaction rows (archive toggle + delete button per row)

InteractionStateService
├── archiveInteraction(interactionId: string) → void
└── deleteInteraction(interactionId: string) → void
```

## Data Flow

### Task Delete Flow (Hard-Delete)

1. User clicks delete button on task card or modal
2. Confirmation dialog shown
3. On confirm: `TaskStateService.deleteTask(taskId)` called
4. HTTP DELETE request sent to `DELETE /api/v1/tasks/{id}`
5. Backend verifies ownership (task.subjectId matches authenticated user)
6. On success (204): remove task from signal state, UI updates automatically
7. On error (404/500): show error notification, task remains in list

### Interaction Archive Flow

1. User clicks archive toggle button on interaction row
2. `InteractionStateService.archiveInteraction(interactionId)` called
3. HTTP POST request sent to `POST /api/v1/interactions/{id}/archive`
4. Backend toggles the actor's archive flag
5. On success (200): reload list (archived items filtered out by default)
6. On error: show error notification

### Interaction Delete Flow (Soft-Delete)

1. User clicks delete button on interaction row
2. Confirmation dialog shown ("This will permanently delete the interaction")
3. On confirm: `InteractionStateService.deleteInteraction(interactionId)` called
4. HTTP DELETE request sent to `DELETE /api/v1/interactions/{id}`
5. Backend sets actor's delete flag; if both flags set, hard-delete from DB
6. On success (204): reload list (deleted item no longer visible to this user)
7. On error: show error notification

## Backend Service Design

### TaskService.deleteTask

```java
@Transactional
public void deleteTask(TaskId id, EmployeeId actor) {
    Task task = taskRepository.findById(id.value())
        .orElseThrow(() -> new TaskNotFoundException(id));
    
    // Ownership check: only the subject can delete their task
    if (!task.getSubjectId().equals(actor.value())) {
        throw new AccessDeniedException("Not authorized to delete this task");
    }
    
    taskRepository.delete(task);
}
```

### InteractionService.archiveInteraction

```java
@Transactional
public InteractionSummary archiveInteraction(InteractionId id, EmployeeId actor, boolean isSubject) {
    Interaction interaction = interactionRepository.findById(id.value())
        .orElseThrow(() -> new InteractionNotFoundException(id));
    
    // Ownership check: only subject or facilitator can archive
    boolean isFacilitator = interaction.getFacilitatorId().equals(actor.value());
    if (!isSubject && !isFacilitator) {
        throw new AccessDeniedException("Not authorized to archive this interaction");
    }
    
    // Toggle the appropriate archive flag
    if (isSubject) {
        interaction.setArchivedBySubject(!interaction.isArchivedBySubject());
    } else {
        interaction.setArchivedByFacilitator(!interaction.isArchivedByFacilitator());
    }
    
    Interaction saved = interactionRepository.save(interaction);
    return toSummary(saved);
}
```

### InteractionService.softDeleteInteraction

```java
@Transactional
public void softDeleteInteraction(InteractionId id, EmployeeId actor, boolean isSubject) {
    Interaction interaction = interactionRepository.findById(id.value())
        .orElseThrow(() -> new InteractionNotFoundException(id));
    
    // Ownership check: only subject or facilitator can delete
    boolean isFacilitator = interaction.getFacilitatorId().equals(actor.value());
    if (!isSubject && !isFacilitator) {
        throw new AccessDeniedException("Not authorized to delete this interaction");
    }
    
    // Set the appropriate delete flag
    if (isSubject) {
        interaction.setDeletedBySubject(true);
    } else {
        interaction.setDeletedByFacilitator(true);
    }
    
    // If both parties have deleted, hard-delete from DB
    if (interaction.isDeletedBySubject() && interaction.isDeletedByFacilitator()) {
        interactionRepository.delete(interaction);
    } else {
        interactionRepository.save(interaction);
    }
}
```

## Repository Query Methods

### InteractionRepository

```java
public interface InteractionRepository extends JpaRepository<Interaction, Long> {
    
    // Find interactions for a subject, excluding deleted (and optionally archived)
    @Query("SELECT i FROM Interaction i WHERE i.subjectId = :subjectId " +
           "AND i.deletedBySubject = false " +
           "AND (:includeArchived OR i.archivedBySubject = false)")
    Page<Interaction> findBySubjectIdAndNotDeleted(
        @Param("subjectId") Long subjectId,
        @Param("includeArchived") boolean includeArchived,
        Pageable pageable);
    
    // Find interactions for a facilitator, excluding deleted (and optionally archived)
    @Query("SELECT i FROM Interaction i WHERE i.facilitatorId = :facilitatorId " +
           "AND i.deletedByFacilitator = false " +
           "AND (:includeArchived OR i.archivedByFacilitator = false)")
    Page<Interaction> findByFacilitatorIdAndNotDeleted(
        @Param("facilitatorId") Long facilitatorId,
        @Param("includeArchived") boolean includeArchived,
        Pageable pageable);
}
```

## Security & Authorization

| Endpoint | Role Requirement | Ownership Check |
|----------|------------------|-----------------|
| `DELETE /api/v1/tasks/{id}` | `hasAnyRole('USER','ADMIN')` | Subject can delete own task |
| `POST /api/v1/interactions/{id}/archive` | `hasAnyRole('USER','ADMIN')` | Subject/facilitator can toggle own archive |
| `DELETE /api/v1/interactions/{id}` | `hasAnyRole('USER','ADMIN')` | Subject/facilitator can soft-delete; hard-delete when both agree |

**Key principle**: Authenticated users can only access their own data. The existing endpoints (`/api/v1/me/tasks`, `/api/v1/employees/{id}/interactions`) already scope data to the authenticated user. No ADMIN gate needed.

## UI/UX Specifications

### Task Delete Button Placement

Same as original design — trash icon in task card footer and modal.

### Interaction Row Actions

```html
<div class="interaction-row__actions">
  <!-- Archive toggle -->
  <button 
    type="button" 
    class="btn-secondary btn-secondary--sm"
    [class.active]="interaction.archivedBySubject || interaction.archivedByFacilitator"
    (click)="onArchive(interaction)"
    aria-label="Archive interaction">
    <i class="pi pi-archive"></i> Archive
  </button>
  
  <!-- Edit button -->
  <button (click)="onEdit(interaction)" class="btn-secondary btn-secondary--sm">Edit</button>
  
  <!-- Create task button -->
  <button (click)="onCreateTask(interaction)" class="btn-secondary btn-secondary--sm">Create task</button>
  
  <!-- Delete button -->
  <button 
    type="button" 
    class="icon-button icon-button--danger"
    (click)="onDelete(interaction)"
    aria-label="Delete interaction">
    <i class="pi pi-trash"></i>
  </button>
</div>
```

### Confirmation Dialogs

**Task delete**:
```
Are you sure you want to delete this task? This action cannot be undone.
```

**Interaction delete**:
```
Are you sure you want to delete this interaction? 
If the other party hasn't deleted it, they will still see it.
This action cannot be undone for you.
```

**Archive**: No confirmation needed (reversible operation).

## Error Handling

**Backend**: Standard error envelope per `api-standards.yaml`:
```json
{
  "timestamp": "2026-07-02T10:30:00.000Z",
  "status": 404,
  "error": "Not Found",
  "message": "Interaction not found: 123",
  "path": "/api/v1/interactions/123"
}
```

**Frontend**: HTTP interceptor catches 4xx/5xx, shows toast notification via existing error handling infrastructure.

## Testing Strategy

**Backend Unit Tests** (BDD style, JUnit 5):
- `TaskServiceTest.deleteTask_owner_success()`
- `TaskServiceTest.deleteTask_nonOwner_throwsAccessDenied()`
- `InteractionServiceTest.archiveInteraction_subject_success()`
- `InteractionServiceTest.archiveInteraction_facilitator_success()`
- `InteractionServiceTest.archiveInteraction_nonOwner_throwsAccessDenied()`
- `InteractionServiceTest.softDeleteInteraction_oneParty_setsFlag()`
- `InteractionServiceTest.softDeleteInteraction_bothParties_hardDeletes()`
- `InteractionServiceTest.softDeleteInteraction_nonOwner_throwsAccessDenied()`

**Frontend Unit Tests** (BDD style, Jest):
- `Task.deleteTask_showsConfirmation_andCallsDelete()`
- `InteractionList.archiveButton_emitsArchiveEvent()`
- `InteractionList.deleteButton_emitsDeleteEvent()`

**No integration tests** per `testing-strategy.yaml` (unit tests only).
