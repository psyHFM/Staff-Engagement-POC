# Interaction Soft-Delete Specification

## Endpoint

```
DELETE /api/v1/interactions/{id}
```

## Request

**Path Parameters:**
- `id` (required): Interaction ID (Long)

**Headers:**
- `Authorization: Bearer <JWT token>` (required)

## Response

**Success (204 No Content):**
```
HTTP/1.1 204 No Content
```

**Not Found (404):**
```json
{
  "timestamp": "2026-07-02T10:30:00.000Z",
  "status": 404,
  "error": "Not Found",
  "message": "Interaction not found: 123",
  "path": "/api/v1/interactions/123"
}
```

**Forbidden (403) - Not Authorized:**
```json
{
  "timestamp": "2026-07-02T10:30:00.000Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Not authorized to delete this interaction",
  "path": "/api/v1/interactions/123"
}
```

## Authorization

- Role requirement: `hasAnyRole('USER', 'ADMIN')`
- **Ownership check**: Only the subject or facilitator can delete the interaction
- The endpoint is not ADMIN-gated; any authenticated user can access it, but ownership is verified in the service layer

## Soft-Delete Semantics

Interactions involve two parties (subject and facilitator), so deletion uses a dual-party soft-delete model:

| deletedBySubject | deletedByFacilitator | Behavior |
|------------------|----------------------|----------|
| false | false | Interaction visible to both parties |
| true | false | Interaction hidden from subject; visible to facilitator |
| false | true | Interaction hidden from facilitator; visible to subject |
| true | true | Interaction hard-deleted from database |

**Key behaviors:**
- When one party deletes, only their delete flag is set; the interaction remains in the database
- The other party still sees the interaction in their list
- When both parties delete, the interaction is hard-deleted from the database
- Delete is permanent — there is no "undelete" operation

## Implementation

### InteractionController

```java
@DeleteMapping("/interactions/{id}")
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public ResponseEntity<Void> deleteInteraction(@PathVariable Long id) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    String username = auth.getName();
    
    // Resolve actor ID from username
    EmployeeId actor = new EmployeeId(Long.parseLong(username));
    
    // Determine if actor is subject or facilitator
    // (The service will verify ownership)
    interactionService.softDeleteInteraction(new InteractionId(id), actor, false);
    return ResponseEntity.noContent().build();
}
```

### InteractionService

```java
@Transactional
public void softDeleteInteraction(InteractionId id, EmployeeId actor, boolean isSubject) {
    Interaction interaction = interactionRepository.findById(id.value())
        .orElseThrow(() -> new InteractionNotFoundException(id));
    
    // Determine actor's role if not specified
    if (!isSubject && !interaction.getFacilitatorId().equals(actor.value())) {
        isSubject = interaction.getSubjectId().equals(actor.value());
    }
    
    // Ownership check: must be subject or facilitator
    boolean isFacilitator = interaction.getFacilitatorId().equals(actor.value());
    if (!isSubject && !isFacilitator) {
        throw new AccessDeniedException("Not authorized to delete this interaction: " + id.value());
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

### InteractionNotFoundException (may already exist)

```java
public class InteractionNotFoundException extends RuntimeException {
    public InteractionNotFoundException(InteractionId id) {
        super("Interaction not found: " + id.value());
    }
}
```

## Testing

### Unit Tests (InteractionServiceTest)

```java
@Test
@DisplayName("softDeleteInteraction by subject sets deletedBySubject flag")
void softDeleteInteraction_subject_setsFlag() {
    // Given
    InteractionId interactionId = new InteractionId(1L);
    EmployeeId subjectId = new EmployeeId(100L);
    Interaction interaction = mock(Interaction.class);
    when(interaction.getSubjectId()).thenReturn(100L);
    when(interaction.getFacilitatorId()).thenReturn(200L);
    when(interactionRepository.findById(1L)).thenReturn(Optional.of(interaction));
    
    // When
    interactionService.softDeleteInteraction(interactionId, subjectId, true);
    
    // Then
    verify(interaction).setDeletedBySubject(true);
    verify(interactionRepository).save(interaction);
}

@Test
@DisplayName("softDeleteInteraction by both parties hard-deletes")
void softDeleteInteraction_bothParties_hardDeletes() {
    // Given
    InteractionId interactionId = new InteractionId(1L);
    EmployeeId subjectId = new EmployeeId(100L);
    Interaction interaction = mock(Interaction.class);
    when(interaction.getSubjectId()).thenReturn(100L);
    when(interaction.getFacilitatorId()).thenReturn(200L);
    when(interaction.isDeletedBySubject()).thenReturn(true);  // Already deleted by subject
    when(interaction.isDeletedByFacilitator()).thenReturn(false);
    when(interactionRepository.findById(1L)).thenReturn(Optional.of(interaction));
    
    // When
    interactionService.softDeleteInteraction(interactionId, new EmployeeId(200L), false);
    
    // Then
    verify(interactionRepository).delete(interaction);
}

@Test
@DisplayName("softDeleteInteraction by non-owner throws AccessDeniedException")
void softDeleteInteraction_nonOwner_throwsAccessDenied() {
    // Given
    InteractionId interactionId = new InteractionId(1L);
    EmployeeId strangerId = new EmployeeId(999L);
    when(interaction.getSubjectId()).thenReturn(100L);
    when(interaction.getFacilitatorId()).thenReturn(200L);
    when(interactionRepository.findById(1L)).thenReturn(Optional.of(mock(Interaction.class)));
    
    // When/Then
    assertThrows(AccessDeniedException.class, () -> 
        interactionService.softDeleteInteraction(interactionId, strangerId, false)
    );
}

@Test
@DisplayName("softDeleteInteraction with non-existent ID throws InteractionNotFoundException")
void softDeleteInteraction_notFound_throwsNotFoundException() {
    // Given
    InteractionId interactionId = new InteractionId(999L);
    EmployeeId subjectId = new EmployeeId(100L);
    when(interactionRepository.findById(999L)).thenReturn(Optional.empty());
    
    // When/Then
    assertThrows(InteractionNotFoundException.class, () -> 
        interactionService.softDeleteInteraction(interactionId, subjectId, true)
    );
}
```

## Dependencies

- `InteractionRepository` (existing)
- `InteractionId` from `shared.kernel` (existing)
- Spring Security `Authentication` (existing)

## Out of Scope

- Undo/delete reversal (delete is permanent per-party)
- Audit trail for deletions
- Notifications to the other party when one party deletes
