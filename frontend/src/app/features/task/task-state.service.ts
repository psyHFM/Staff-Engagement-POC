import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiClient, catchApiError } from '../../shared/api/api-client';
import { StateService } from '../../shared/state/state.service';
import { Task, CreateTaskRequest, TaskId } from './task.model';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TaskStateService extends StateService {
  private readonly api = inject(ApiClient);

  // State
  private readonly _tasks = signal<Task[]>([]);
  private readonly _sortField = signal<string>('createdAt');
  private readonly _sortAsc = signal<boolean>(true);

  // Public Read-only Signals
  readonly tasks = computed(() => {
    const tasks = this._tasks();
    const field = this._sortField();
    const asc = this._sortAsc();

    return [...tasks].sort((a, b) => {
      const valA = (a as any)[field];
      const valB = (b as any)[field];

      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  });
  override readonly loading = signal(false);

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
    this.api.get<Task[]>('me/tasks')
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (tasks) => this._tasks.set(tasks),
        error: (err) => console.error('Failed to load tasks:', err)
      });
  }

  /**
   * Create a new task (POST /api/v1/tasks)
   */
  createTask(request: CreateTaskRequest): void {
    this.beginLoad();
    this.api.post<Task>('tasks', request)
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad())
      )
      .subscribe({
        next: (newTask) => {
          this._tasks.update(tasks => [...tasks, newTask]);
        },
        error: (err) => console.error('Failed to create task:', err)
      });
  }

  /**
   * Toggle task completion.
   * Note: The backend requirements mentioned "task completion toggle",
   * assuming a PUT or PATCH to /api/v1/tasks/{id} or similar.
   * For the POC, I will implement it as a call to a hypothetical update endpoint.
   */
  toggleCompletion(taskId: number, completed: boolean): void {
    // Assuming PUT /api/v1/tasks/{id} for completion update
    this.beginLoad();
    this.api.put<Task>(`tasks/${taskId}`, { completed })
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
        error: (err) => console.error('Failed to toggle completion:', err)
      });
  }
}
