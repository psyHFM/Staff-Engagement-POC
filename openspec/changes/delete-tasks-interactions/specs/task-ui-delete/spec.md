# Task UI Delete Specification

## Component: Task (task.ts)

### Delete Button Placement

**In task card footer** (after subtasks toggle):
```html
<button
  type="button"
  class="icon-button icon-button--danger"
  (click)="deleteTask(task); $event.stopPropagation()"
  aria-label="Delete task">
  <i class="pi pi-trash"></i>
</button>
```

**In task detail modal footer** (after Done button):
```html
<div class="task-edit-form__actions">
  <button type="submit" class="btn-primary">Save changes</button>
  <button type="button" class="btn-secondary">Done</button>
  <button 
    type="button" 
    class="btn-secondary btn-secondary--danger"
    (click)="deleteTask(selectedTask())">
    Delete task
  </button>
</div>
```

### Delete Handler

```typescript
protected deleteTask(task: TaskModel): void {
  if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
    return;
  }
  this.state.deleteTask(task.id.value.toString());
}
```

### Styling

```scss
.icon-button--danger {
  color: var(--danger);
  
  &:hover:not(:disabled) {
    background: var(--danger);
    color: #ffffff;
  }
}

.btn-secondary--danger {
  color: var(--danger);
  border-color: var(--danger);
  
  &:hover:not(:disabled) {
    background: var(--danger);
    color: #ffffff;
  }
}
```

## Component: TaskStateService (task-state.service.ts)

### Delete Method

```typescript
deleteTask(taskId: string): void {
  const taskNumberId = Number(taskId);
  
  this.http.delete(`/api/v1/tasks/${taskNumberId}`).subscribe({
    next: () => {
      // Remove from signal state - UI updates automatically
      this.tasks.update(tasks => 
        tasks.filter(t => t.id.value.toString() !== taskId)
      );
      // Also clear items for this task
      this.itemsByTaskId.update(map => {
        const newMap = new Map(map);
        newMap.delete(taskId);
        return newMap;
      });
    },
    error: (err) => {
      this.handleError('Failed to delete task', err);
    }
  });
}
```

## Testing

### Unit Tests (task.spec.ts)

```typescript
describe('Task delete', () => {
  it('shows confirmation and calls deleteTask on confirm', () => {
    // Given
    const mockTask: TaskModel = { id: new TaskId(1), title: 'Test', ... };
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(component['state'], 'deleteTask');
    
    // When
    component.deleteTask(mockTask);
    
    // Then
    expect(window.confirm).toHaveBeenCalledWith(
      jasmine.stringContaining('Are you sure you want to delete')
    );
    expect(component['state'].deleteTask).toHaveBeenCalledWith('1');
  });

  it('does not delete on cancel', () => {
    // Given
    const mockTask: TaskModel = { id: new TaskId(1), title: 'Test', ... };
    spyOn(window, 'confirm').and.returnValue(false);
    spyOn(component['state'], 'deleteTask');
    
    // When
    component.deleteTask(mockTask);
    
    // Then
    expect(window.confirm).toHaveBeenCalled();
    expect(component['state'].deleteTask).not.toHaveBeenCalled();
  });
});
```

### Unit Tests (task-state.service.spec.ts)

```typescript
describe('TaskStateService', () => {
  describe('deleteTask', () => {
    it('removes task from state on success', () => {
      // Given
      const taskId = '1';
      httpMock.expectOne('DELETE /api/v1/tasks/1').flush(null, { status: 204, statusText: 'No Content' });
      
      // When
      service.deleteTask(taskId);
      
      // Then
      const tasks = service.tasks();
      expect(tasks.find(t => t.id.value.toString() === taskId)).toBeUndefined();
    });

    it('calls handleError on error', () => {
      // Given
      const taskId = '1';
      spyOn(service, 'handleError');
      httpMock.expectOne('DELETE /api/v1/tasks/1').flush('Not Found', { status: 404, statusText: 'Not Found' });
      
      // Then
      expect(service.handleError).toHaveBeenCalledWith('Failed to delete task', jasmine.any(Object));
    });
  });
});
```

## Accessibility

- Delete button has `aria-label="Delete task"`
- Button is focusable via keyboard (Tab key)
- Confirmation dialog uses native `confirm()` which is accessible
- Icon uses PrimeIcons `pi-trash` with `aria-hidden="true"` (decorative)

## Out of Scope

- Custom modal confirmation (deferred - using native `confirm()`)
- Undo/delete reversal (deferred)
- Toast notification on success (only on error via existing handler)
