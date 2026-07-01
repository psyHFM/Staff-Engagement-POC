import { Injectable, signal, computed, inject, Signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import { ApiClient, catchApiError } from '../../shared/api/api-client';
import { StateService } from '../../shared/state/state.service';
import {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskItem,
  TaskItemReorderRequest,
  TaskWithItems
} from './task.model';

@Injectable({ providedIn: 'root' })
export class TaskStateService extends StateService {
  private readonly api = inject(ApiClient);

  // State
  private readonly _tasks = signal<Task[]>([]);
  // Items are stored in a single map keyed by parent task id so the checklist
  // can be opened lazily per card without needing a per-task signal. The map
  // is treated as immutable (replace on every update) so the `computed()`
  // graph re-runs deterministically.
  private readonly _itemsByTask = signal<ReadonlyMap<string, readonly TaskItem[]>>(new Map());
  // Sorting state
  private readonly _sortField = signal<string>('createdAt');
  private readonly _sortAsc = signal<boolean>(true);

  // Public Read-only Signals
  readonly tasks = computed(() => {
    const tasks = this._tasks();
    const field = this._sortField();
    const asc = this._sortAsc();

    return [...tasks].sort((a, b) => {
      // Type assertion: convert to unknown first, then access with bracket notation
      const valA = (a as unknown as Record<string, unknown>)[field];
      const valB = (b as unknown as Record<string, unknown>)[field];

      // Compare as strings or numbers - TypeScript cannot infer runtime type
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      // String coerce for comparison
      const strA = String(valA);
      const strB = String(valB);
      if (strA < strB) return asc ? -1 : 1;
      if (strA > strB) return asc ? 1 : -1;
      return 0;
    });
  });
  readonly itemsByTaskId = computed(() => this._itemsByTask());
  override readonly loading = signal(false);

  /** Returns a `computed()` view of the items for a single task, or `[]` when none loaded. */
  itemsFor(taskId: string): Signal<readonly TaskItem[]> {
    return computed(() => this._itemsByTask().get(taskId) ?? []);
  }

  /** Update sorting field and direction */
  setSort(field: string): void {
    if (this._sortField() === field) {
      this._sortAsc.update(v => !v);
    } else {
      this._sortField.set(field);
      this._sortAsc.set(true);
    }
  }

  /**
   * Fetch tasks for the authenticated user (GET /api/v1/me/tasks)
   */
  loadMyTasks(): void {
    this.beginLoad();
    console.log('[TaskStateService] Loading tasks from me/tasks');
    this.api.get<Task[]>('me/tasks')
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (tasks) => {
          console.log('[TaskStateService] Loaded tasks:', tasks.length, 'tasks');
          this._tasks.set(tasks);
        },
        error: (err) => console.error('[TaskStateService] Failed to load tasks:', err)
      });
  }

  /**
   * Create a new task (POST /api/v1/tasks).
   *
   * <p>Returns the server-created task so the caller can react to the response.
   * State is updated from the server response, not an optimistic copy (ATSE1-65).
   *
   * <p>NOTE: Caller must subscribe or the side effect (state update) will not run.
   */
  createTask(request: CreateTaskRequest): Observable<Task> {
    this.beginLoad();
    return this.api.post<Task>('tasks', request).pipe(
      catchApiError(),
      finalize(() => this.endLoad()),
      tap({
        next: (newTask) => {
          // Upsert based on server response: replace if ID exists, append if new
          this._tasks.update(tasks => {
            const existingIndex = tasks.findIndex(t => t.id.value === newTask.id.value);
            if (existingIndex >= 0) {
              const copy = [...tasks];
              copy[existingIndex] = newTask;
              return copy;
            }
            return [...tasks, newTask];
          });
        },
        error: (err) => console.error('Failed to create task:', err)
      })
    );
  }

  /**
   * Toggle task completion.
   * Calls the extended PUT /api/v1/tasks/{id} with only the completed flag.
   */
  toggleCompletion(taskId: number, completed: boolean): void {
    this.updateTask(taskId, { completed });
  }

  /**
   * Update a task's title, description, and/or completed flag.
   * Null/undefined fields leave existing values untouched on the backend.
   */
  updateTask(taskId: number, patch: UpdateTaskRequest): void {
    this.beginLoad();
    this.api.put<Task>(`tasks/${taskId}`, patch)
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (updatedTask) => {
          this._tasks.update(tasks =>
            tasks.map(t => t.id.value === taskId ? updatedTask : t)
          );
        },
        error: (err) => console.error('Failed to update task:', err)
      });
  }

  // --- Task sub-items (ATSE1-34) -------------------------------------------

  /**
   * Lazy-load the sub-items for a single task via the additive detail endpoint
   * {@code GET /api/v1/tasks/{id}}, which returns a {@link TaskWithItems}
   * wrapper. Replaces the entire map entry for the task.
   */
  loadTaskItems(taskId: string): void {
    this.beginLoad();
    this.api.get<TaskWithItems>(`tasks/${taskId}`)
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (wrapped) => {
          this.upsertItems(taskId, wrapped.items ?? []);
        },
        error: (err) => console.error('Failed to load sub-items:', err)
      });
  }

  /**
   * Add a sub-item to a task (POST /api/v1/tasks/{taskId}/items).
   * On success the returned item is appended to the existing list (or starts
   * a new one).
   */
  addTaskItem(taskId: string, title: string): void {
    this.beginLoad();
    this.api.post<TaskItem>(`tasks/${taskId}/items`, { title })
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (created) => this.appendItem(taskId, created),
        error: (err) => console.error('Failed to add sub-item:', err)
      });
  }

  /**
   * Patch a sub-item's title and/or completion flag
   * (PATCH /api/v1/tasks/{taskId}/items/{itemId}). On success the matching
   * item is replaced in place (not appended).
   */
  patchTaskItem(
    taskId: string,
    itemId: string,
    patch: { title?: string; completed?: boolean }
  ): void {
    this.beginLoad();
    this.api.patch<TaskItem>(`tasks/${taskId}/items/${itemId}`, patch)
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (updated) => this.replaceItem(taskId, updated),
        error: (err) => console.error('Failed to patch sub-item:', err)
      });
  }

  /**
   * Delete a sub-item (DELETE /api/v1/tasks/{taskId}/items/{itemId}).
   * On success the item is removed from the map entry; the entry is dropped
   * entirely if the list becomes empty.
   */
  removeTaskItem(taskId: string, itemId: string): void {
    this.beginLoad();
    this.api.delete<void>(`tasks/${taskId}/items/${itemId}`)
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: () => this.removeItemById(taskId, itemId),
        error: (err) => console.error('Failed to remove sub-item:', err)
      });
  }

  /**
   * Reorder sub-items (PUT /api/v1/tasks/{taskId}/items/reorder).
   * The body wraps the desired id order. On success the returned list replaces
   * the map entry. No optimistic local mutation — matches the existing
   * `toggleCompletion` / `removeSkill` pattern.
   */
  reorderTaskItems(taskId: string, orderedIds: string[]): void {
    this.beginLoad();
    const request: TaskItemReorderRequest = {
      itemIds: orderedIds.map(id => Number(id))
    };
    this.api.put<TaskItem[]>(`tasks/${taskId}/items/reorder`, request)
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (items) => this.upsertItems(taskId, items ?? []),
        error: (err) => console.error('Failed to reorder sub-items:', err)
      });
  }

  // --- private helpers -----------------------------------------------------

  private upsertItems(taskId: string, items: readonly TaskItem[]): void {
    const next = new Map(this._itemsByTask());
    // Always keep the entry — even when empty — so the component's lazy-load
    // guard (`!itemsByTaskId().has(task.id)`) can short-circuit re-fetches on
    // a collapse/re-expand cycle. The `itemsFor(taskId)` view still returns []
    // for empty entries.
    next.set(taskId, [...items]);
    this._itemsByTask.set(next);
  }

  private appendItem(taskId: string, item: TaskItem): void {
    const current = this._itemsByTask().get(taskId) ?? [];
    this.upsertItems(taskId, [...current, item]);
  }

  private replaceItem(taskId: string, item: TaskItem): void {
    const current = this._itemsByTask().get(taskId) ?? [];
    const next = current.map(existing => (existing.id === item.id ? item : existing));
    this.upsertItems(taskId, next);
  }

  private removeItemById(taskId: string, itemId: string): void {
    const current = this._itemsByTask().get(taskId);
    if (!current) {
      return;
    }
    const next = current.filter(existing => existing.id !== itemId);
    this.upsertItems(taskId, next);
  }
}
