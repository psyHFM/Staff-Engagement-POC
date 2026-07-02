# Task Delete Endpoint Specification

## Endpoint

```
DELETE /api/v1/tasks/{id}
```

## Request

**Path Parameters:**
- `id` (required): Task ID (Long)

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
  "message": "Task not found: 123",
  "path": "/api/v1/tasks/123"
}
```

**Forbidden (403) - Not Owner:**
```json
{
  "timestamp": "2026-07-02T10:30:00.000Z",
  "status": 403,
  "error": "Forbidden",
  "message": "Not authorized to delete this task",
  "path": "/api/v1/tasks/123"
}
```

## Authorization

- Role requirement: `hasAnyRole('USER', 'ADMIN')`
- **Ownership check**: Only the task subject (owner) can delete their task
- The endpoint is not ADMIN-gated; any authenticated user can access it, but ownership is verified in the service layer

## Implementation

### TaskController

```java
@DeleteMapping("/tasks/{id}")
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    String username = auth.getName();
    
    // Resolve actor ID from username (same pattern as other endpoints)
    EmployeeId actor = new EmployeeId(Long.parseLong(username));
    
    taskService.deleteTask(new TaskId(id), actor);
    return ResponseEntity.noContent().build();
}
```

### TaskService

```java
@Transactional
public void deleteTask(TaskId id, EmployeeId actor) {
    Task task = taskRepository.findById(id.value())
        .orElseThrow(() -> new TaskNotFoundException(id));
    
    // Ownership check: only the subject can delete their task
    if (!task.getSubjectId().equals(actor.value())) {
        throw new AccessDeniedException("Not authorized to delete this task: " + id.value());
    }
    
    taskRepository.delete(task);
}
```

### TaskNotFoundException

```java
public class TaskNotFoundException extends RuntimeException {
    public TaskNotFoundException(TaskId id) {
        super("Task not found: " + id.value());
    }
}
```

## Testing

### Unit Tests (TaskServiceTest)

```java
@Test
@DisplayName("deleteTask by owner removes task successfully")
void deleteTask_owner_success() {
    // Given
    TaskId taskId = new TaskId(1L);
    EmployeeId ownerId = new EmployeeId(100L);
    Task task = mock(Task.class);
    when(task.getSubjectId()).thenReturn(100L);
    when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
    
    // When
    taskService.deleteTask(taskId, ownerId);
    
    // Then
    verify(taskRepository).delete(task);
}

@Test
@DisplayName("deleteTask by non-owner throws AccessDeniedException")
void deleteTask_nonOwner_throwsAccessDenied() {
    // Given
    TaskId taskId = new TaskId(1L);
    EmployeeId nonOwnerId = new EmployeeId(200L);
    Task task = mock(Task.class);
    when(task.getSubjectId()).thenReturn(100L);
    when(taskRepository.findById(1L)).thenReturn(Optional.of(task));
    
    // When/Then
    assertThrows(AccessDeniedException.class, () -> 
        taskService.deleteTask(taskId, nonOwnerId)
    );
}

@Test
@DisplayName("deleteTask with non-existent ID throws TaskNotFoundException")
void deleteTask_notFound_throwsNotFoundException() {
    // Given
    TaskId taskId = new TaskId(999L);
    EmployeeId ownerId = new EmployeeId(100L);
    when(taskRepository.findById(999L)).thenReturn(Optional.empty());
    
    // When/Then
    assertThrows(TaskNotFoundException.class, () -> 
        taskService.deleteTask(taskId, ownerId)
    );
}
```

## Dependencies

- `TaskRepository` (existing)
- `TaskId` from `shared.kernel` (existing)
- Spring Security `Authentication` (existing)

## Out of Scope

- Soft-delete (hard-delete only)
- Audit trail for deletions
- Cascade delete notifications (task items deleted via JPA cascade)
