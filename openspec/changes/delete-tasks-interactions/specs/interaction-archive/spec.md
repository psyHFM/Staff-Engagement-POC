# Interaction Archive Specification

## Endpoint

```
POST /api/v1/interactions/{id}/archive
```

## Request

**Path Parameters:**
- `id` (required): Interaction ID (Long)

**Headers:**
- `Authorization: Bearer <JWT token>` (required)

**Body:** (empty object, or omit body entirely)
```json
{}
```

## Response

**Success (200 OK):**
```json
{
  "id": 123,
  "type": "check-in",
  "subject": 100,
  "facilitator": 200,
  "subjectText": "Q2 Check-in",
  "note": "Discussed progress",
  "createdAt": "2026-07-01T10:00:00Z",
  "updatedAt": "2026-07-02T10:30:00Z",
  "archivedBySubject": true,
  "archivedByFacilitator": false,
  "deletedBySubject": false,
  "deletedByFacilitator": false
}
```

**Not Found (404):**
```json
{
  "timestamp": "2026-07-02T10:30:00.000Z",
  "status": 404,
  "error": "Not Found",
  "message": "Interaction not found: 123",
  "path": "/api/v1/interactions/123/archive"
}
```

**Forbidden (403) - Not Authorized:**
```json
{
  "timestamp": "2026-07-02T10:30:00.000Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Not authorized to archive this interaction",
  "path": "/api/v1/interactions/123/archive"
}
```

## Authorization

- Role requirement: `hasAnyRole('USER', 'ADMIN')`
- **Ownership check**: Only the subject or facilitator can archive the interaction
- The endpoint is not ADMIN-gated; any authenticated user can access it, but ownership is verified in the service layer

## Archive Semantics

Interactions involve two parties (subject and facilitator), so archiving is independent per-party:

| archivedBySubject | archivedByFacilitator | Behavior |
|-------------------|----------------------|----------|
| false | false | Interaction visible to both parties (default) |
| true | false | Interaction hidden from subject's list; visible to facilitator |
| false | true | Interaction hidden from facilitator's list; visible to subject |
| true | true | Interaction hidden from both parties' lists |

**Key behaviors:**
- Archive is a toggle — calling the endpoint again un-archives (restores visibility)
- Each party controls only their own archive flag
- Archived interactions remain in the database and are accessible via direct ID lookup
- Archive does not affect the other party's view

## Implementation

### InteractionController

```java
@PostMapping("/interactions/{id}/archive")
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public ResponseEntity<InteractionSummary> archiveInteraction(@PathVariable Long id) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    String username = auth.getName();
    
    // Resolve actor ID from username
    EmployeeId actor = new EmployeeId(Long.parseLong(username));
    
    InteractionSummary updated = interactionService.archiveInteraction(new InteractionId(id), actor);
    return ResponseEntity.ok(updated);
}
```

### InteractionService

```java
@Transactional
public InteractionSummary archiveInteraction(InteractionId id, EmployeeId actor) {
    Interaction interaction = interactionRepository.findById(id.value())
        .orElseThrow(() -> new InteractionNotFoundException(id));
    
    // Determine actor's role
    boolean isSubject = interaction.getSubjectId().equals(actor.value());
    boolean isFacilitator = interaction.getFacilitatorId().equals(actor.value());
    
    if (!isSubject && !isFacilitator) {
        throw new AccessDeniedException("Not authorized to archive this interaction: " + id.value());
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

## Repository Query Methods

The existing list endpoints should filter out archived interactions by default:

```java
// In InteractionRepository
@Query("SELECT i FROM Interaction i WHERE i.subjectId = :subjectId " +
       "AND i.deletedBySubject = false " +
       "AND (:includeArchived OR i.archivedBySubject = false)")
Page<Interaction> findBySubjectIdAndNotDeleted(
    @Param("subjectId") Long subjectId,
    @Param("includeArchived") boolean includeArchived,
    Pageable pageable);

@Query("SELECT i FROM Interaction i WHERE i.facilitatorId = :facilitatorId " +
       "AND i.deletedByFacilitator = false " +
       "AND (:includeArchived OR i.archivedByFacilitator = false)")
Page<Interaction> findByFacilitatorIdAndNotDeleted(
    @Param("facilitatorId") Long facilitatorId,
    @Param("includeArchived") boolean includeArchived,
    Pageable pageable);
```

**Note:** The `includeArchived` parameter allows the UI to optionally show archived items (e.g., in a separate "Archived" tab).

## Testing

### Unit Tests (InteractionServiceTest)

```java
@Test
@DisplayName("archiveInteraction by subject toggles archivedBySubject")
void archiveInteraction_subject_togglesFlag() {
    // Given
    InteractionId interactionId = new InteractionId(1L);
    EmployeeId subjectId = new EmployeeId(100L);
    Interaction interaction = mock(Interaction.class);
    when(interaction.getSubjectId()).thenReturn(100L);
    when(interaction.getFacilitatorId()).thenReturn(200L);
    when(interaction.isArchivedBySubject()).thenReturn(false);
    when(interactionRepository.findById(1L)).thenReturn(Optional.of(interaction));
    when(interactionRepository.save(interaction)).thenReturn(interaction);
    
    // When
    interactionService.archiveInteraction(interactionId, subjectId);
    
    // Then
    verify(interaction).setArchivedBySubject(true);
}

@Test
@DisplayName("archiveInteraction toggles back (unarchive)")
void archiveInteraction_subject_unarchive() {
    // Given
    InteractionId interactionId = new InteractionId(1L);
    EmployeeId subjectId = new EmployeeId(100L);
    Interaction interaction = mock(Interaction.class);
    when(interaction.getSubjectId()).thenReturn(100L);
    when(interaction.getFacilitatorId()).thenReturn(200L);
    when(interaction.isArchivedBySubject()).thenReturn(true);  // Already archived
    when(interactionRepository.findById(1L)).thenReturn(Optional.of(interaction));
    when(interactionRepository.save(interaction)).thenReturn(interaction);
    
    // When
    interactionService.archiveInteraction(interactionId, subjectId);
    
    // Then
    verify(interaction).setArchivedBySubject(false);  // Toggled back
}

@Test
@DisplayName("archiveInteraction by facilitator toggles archivedByFacilitator")
void archiveInteraction_facilitator_togglesFlag() {
    // Given
    InteractionId interactionId = new InteractionId(1L);
    EmployeeId facilitatorId = new EmployeeId(200L);
    Interaction interaction = mock(Interaction.class);
    when(interaction.getSubjectId()).thenReturn(100L);
    when(interaction.getFacilitatorId()).thenReturn(200L);
    when(interaction.isArchivedByFacilitator()).thenReturn(false);
    when(interactionRepository.findById(1L)).thenReturn(Optional.of(interaction));
    when(interactionRepository.save(interaction)).thenReturn(interaction);
    
    // When
    interactionService.archiveInteraction(interactionId, facilitatorId);
    
    // Then
    verify(interaction).setArchivedByFacilitator(true);
}

@Test
@DisplayName("archiveInteraction by non-owner throws AccessDeniedException")
void archiveInteraction_nonOwner_throwsAccessDenied() {
    // Given
    InteractionId interactionId = new InteractionId(1L);
    EmployeeId strangerId = new EmployeeId(999L);
    when(interaction.getSubjectId()).thenReturn(100L);
    when(interaction.getFacilitatorId()).thenReturn(200L);
    when(interactionRepository.findById(1L)).thenReturn(Optional.of(mock(Interaction.class)));
    
    // When/Then
    assertThrows(AccessDeniedException.class, () -> 
        interactionService.archiveInteraction(interactionId, strangerId)
    );
}
```

## Dependencies

- `InteractionRepository` (existing)
- `InteractionId` from `shared.kernel` (existing)
- Spring Security `Authentication` (existing)

## Out of Scope

- Bulk archive operations
- Archive notifications to the other party
- Automatic archival based on age or other criteria
