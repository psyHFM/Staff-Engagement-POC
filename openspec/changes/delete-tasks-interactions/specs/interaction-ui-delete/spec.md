# Interaction UI Archive/Delete Specification

## Component: InteractionList (interaction-list.ts)

### New Output Emitters

```typescript
@Output() archiveRequested = new EventEmitter<InteractionSummary>();
@Output() deleteRequested = new EventEmitter<InteractionSummary>();
```

### Archive Toggle Button in Template (interaction-list.html)

```html
<div class="interaction-row__actions">
  <!-- Archive toggle -->
  <button 
    type="button" 
    class="btn-secondary btn-secondary--sm"
    [class.active]="isArchivedByCurrentUser(interaction)"
    (click)="onArchive(interaction)"
    aria-label="{{ isArchivedByCurrentUser(interaction) ? 'Unarchive' : 'Archive' }} interaction">
    <i class="pi pi-archive"></i>
    <span class="btn-text">{{ isArchivedByCurrentUser(interaction) ? 'Unarchive' : 'Archive' }}</span>
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

### Helper Method and Handlers

```typescript
protected isArchivedByCurrentUser(interaction: InteractionSummary): boolean {
  // Check if the current user (subject or facilitator) has archived this interaction
  // This requires knowing the current user's role, which can be passed as @Input
  return this.currentUserIsSubject 
    ? interaction.archivedBySubject 
    : interaction.archivedByFacilitator;
}

protected onArchive(interaction: InteractionSummary): void {
  this.archiveRequested.emit(interaction);
}

protected onDelete(interaction: InteractionSummary): void {
  this.deleteRequested.emit(interaction);
}
```

### New @Input for Current User Context

```typescript
@Input() currentUserIsSubject = true;  // Default to subject view
```

## Component: InteractionPage (interaction-page.ts)

### Archive and Delete Handlers

```typescript
protected onArchive(interaction: InteractionSummary): void {
  // No confirmation needed - archive is reversible
  this.interactionStateService.archiveInteraction(interaction.id.value.toString());
}

protected onDelete(interaction: InteractionSummary): void {
  if (!confirm(
    'Are you sure you want to delete this interaction?\n\n' +
    'If the other party hasn\'t deleted it, they will still see it.\n' +
    'This action cannot be undone for you.'
  )) {
    return;
  }
  this.interactionStateService.deleteInteraction(interaction.id.value.toString());
}
```

### Template Wiring

```html
<app-interaction-list
  [history]="history()"
  [loading]="loading()"
  [currentUserIsSubject]="true"
  (pageRequested)="onPageRequested($event)"
  (rowEdit)="onEdit($event)"
  (createTask)="onCreateTask($event)"
  (archiveRequested)="onArchive($event)"
  (deleteRequested)="onDelete($event)">
</app-interaction-list>
```

## Component: InteractionStateService (interaction-state.service.ts)

### Archive Method

```typescript
archiveInteraction(interactionId: string): void {
  const id = Number(interactionId);
  
  this.http.post<InteractionSummary>(`/api/v1/interactions/${id}/archive`, {}).subscribe({
    next: () => {
      // Reload the history to reflect the archive toggle
      this.loadHistory(this.subjectId());
    },
    error: (err) => {
      this.handleError('Failed to archive interaction', err);
    }
  });
}
```

### Delete Method

```typescript
deleteInteraction(interactionId: string): void {
  const id = Number(interactionId);
  
  this.http.delete(`/api/v1/interactions/${id}`).subscribe({
    next: () => {
      // Reload the history to reflect the deletion
      this.loadHistory(this.subjectId());
    },
    error: (err) => {
      this.handleError('Failed to delete interaction', err);
    }
  });
}
```

## Component: Interaction Types (interaction.types.ts)

### Updated InteractionSummary Interface

```typescript
export interface InteractionSummary {
  readonly id: InteractionId;
  readonly type: InteractionType;
  readonly subject: EmployeeId;
  readonly facilitator: EmployeeId;
  readonly subjectText?: string;
  readonly note?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  
  // Archive/Delete flags (ATSE1-83)
  readonly archivedBySubject?: boolean;
  readonly archivedByFacilitator?: boolean;
  readonly deletedBySubject?: boolean;
  readonly deletedByFacilitator?: boolean;
}
```

## Styling (interaction-list.scss)

```scss
.interaction-row__actions {
  display: flex;
  gap: var(--space-sm);
  align-items: center;
}

.btn-secondary--sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  min-height: 28px;
  
  &.active {
    background: var(--accent-soft);
    color: var(--accent-hover);
    border-color: var(--accent-soft);
  }
}

.icon-button--danger {
  color: var(--danger);
  
  &:hover:not(:disabled) {
    background: var(--danger);
    color: #ffffff;
  }
}
```

## Testing

### Unit Tests (interaction-list.spec.ts)

```typescript
describe('InteractionList', () => {
  describe('archive button', () => {
    it('emits archiveRequested event when clicked', () => {
      // Given
      const mockInteraction: InteractionSummary = { id: new InteractionId(1), ... };
      spyOn(component.archiveRequested, 'emit');
      
      // When
      component['onArchive'](mockInteraction);
      
      // Then
      expect(component.archiveRequested.emit).toHaveBeenCalledWith(mockInteraction);
    });

    it('shows "Unarchive" when interaction is archived by current user', () => {
      // Given
      component.currentUserIsSubject = true;
      const mockInteraction: InteractionSummary = { 
        id: new InteractionId(1),
        archivedBySubject: true,
        ... 
      };
      
      // When
      const isArchived = component.isArchivedByCurrentUser(mockInteraction);
      
      // Then
      expect(isArchived).toBe(true);
    });
  });

  describe('delete button', () => {
    it('emits deleteRequested event when clicked', () => {
      // Given
      const mockInteraction: InteractionSummary = { id: new InteractionId(1), ... };
      spyOn(component.deleteRequested, 'emit');
      
      // When
      component['onDelete'](mockInteraction);
      
      // Then
      expect(component.deleteRequested.emit).toHaveBeenCalledWith(mockInteraction);
    });
  });
});
```

### Unit Tests (interaction-state.service.spec.ts)

```typescript
describe('InteractionStateService', () => {
  describe('archiveInteraction', () => {
    it('reloads history on success', () => {
      // Given
      const interactionId = '1';
      spyOn(service, 'loadHistory');
      httpMock.expectOne('POST /api/v1/interactions/1/archive').flush({ 
        id: { value: 1 }, 
        archivedBySubject: true 
      });
      
      // When
      service.archiveInteraction(interactionId);
      
      // Then
      expect(service.loadHistory).toHaveBeenCalledWith(service.subjectId());
    });
  });

  describe('deleteInteraction', () => {
    it('reloads history on success', () => {
      // Given
      const interactionId = '1';
      spyOn(service, 'loadHistory');
      httpMock.expectOne('DELETE /api/v1/interactions/1').flush(null, { status: 204, statusText: 'No Content' });
      
      // When
      service.deleteInteraction(interactionId);
      
      // Then
      expect(service.loadHistory).toHaveBeenCalledWith(service.subjectId());
    });

    it('calls handleError on error', () => {
      // Given
      const interactionId = '1';
      spyOn(service, 'handleError');
      httpMock.expectOne('DELETE /api/v1/interactions/1').flush('Not Found', { status: 404, statusText: 'Not Found' });
      
      // Then
      expect(service.handleError).toHaveBeenCalledWith('Failed to delete interaction', jasmine.any(Object));
    });
  });
});
```

## Accessibility

- Archive button has dynamic `aria-label` ("Archive interaction" or "Unarchive interaction")
- Delete button has `aria-label="Delete interaction"`
- Buttons are focusable via keyboard (Tab key)
- Confirmation dialog uses native `confirm()` which is accessible
- Icons use PrimeIcons with `aria-hidden="true"` (decorative)

## Out of Scope

- Custom modal confirmation (deferred - using native `confirm()`)
- Separate "Archived" tab/view for browsing archived interactions
- Undo/delete reversal (delete is permanent per-party)
- Toast notification on success (only on error via existing handler)
