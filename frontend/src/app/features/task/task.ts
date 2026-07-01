import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStateService } from './task-state.service';
import { TaskCreateForm } from './task-create-form';
import { Task as TaskModel, TaskItem } from './task.model';

type TaskFilter = 'all' | 'open' | 'done';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCreateForm],
  template: `
    <div class="task-page">
      <header class="task-header">
        <h1 class="page-title">Tasks</h1>
        <button (click)="showCreateModal.set(true)" class="ui-btn ui-btn--primary">
          <i class="pi pi-plus" aria-hidden="true"></i> Create task
        </button>
      </header>

      <div class="task-filters" role="group" aria-label="Filter tasks">
        @for (f of filters; track f.value) {
          <button
            type="button"
            class="task-filter"
            [class.task-filter--active]="filter() === f.value"
            (click)="filter.set(f.value)">
            {{ f.label }}
          </button>
        }
      </div>

      <div *ngIf="state.loading()" class="loading-overlay">
        <i class="pi pi-spin pi-spinner"></i> Loading tasks...
      </div>

      <div class="task-container" *ngIf="!state.loading()">
        <div *ngIf="state.tasks().length === 0" class="empty-state">
          <i class="pi pi-list"></i>
          <p>No tasks assigned to you. Take a break!</p>
        </div>

        <div *ngIf="state.tasks().length > 0" class="task-list">
          <div *ngFor="let task of visibleTasks()" class="task-card" [class.task-card--done]="task.completed">
            <div class="task-card-main">
              <div class="task-status">
                <input
                  type="checkbox"
                  [checked]="task.completed"
                  (change)="toggleTask(task)"
                  class="task-checkbox"
                  [attr.aria-label]="task.title"
                />
                <span class="task-title" [class.completed]="task.completed">
                  {{ task.title }}
                </span>
              </div>
              <p class="task-desc">{{ task.description }}</p>
            </div>
            <div class="task-footer">
              <span class="task-date">Created: {{ task.createdAt | date:'shortDate' }}</span>
              @if (task.sourceInteractionId) {
                <span class="task-badge task-badge--interaction">
                  <i class="pi pi-link" aria-hidden="true"></i> From interaction
                </span>
              }
              @if (progressFor(task); as p) {
                @if (p.total > 0) {
                  <span class="task-badge task-badge--progress">{{ p.done }}/{{ p.total }}</span>
                }
              }
              <button
                type="button"
                class="task-subtasks-toggle"
                (click)="toggleExpand(task)"
                [attr.aria-expanded]="isExpanded(task)"
                [attr.aria-controls]="itemsRegionId(task)">
                <i class="pi" [class.pi-chevron-down]="!isExpanded(task)" [class.pi-chevron-up]="isExpanded(task)"></i>
                Sub-tasks
              </button>
            </div>

            <div *ngIf="isExpanded(task)"
                 class="task-items"
                 [id]="itemsRegionId(task)"
                 role="group"
                 [attr.aria-label]="'Sub-tasks for ' + task.title">
              <p *ngIf="itemsFor(task).length === 0" class="task-items__empty">
                No sub-tasks yet.
              </p>
              <ul *ngIf="itemsFor(task).length > 0" class="task-items__list" role="list">
                <li *ngFor="let item of itemsFor(task); let first = first; let last = last"
                    class="task-items__row"
                    [attr.data-item-id]="item.id">
                  <input
                    type="checkbox"
                    class="task-items__checkbox"
                    [checked]="item.completed"
                    (change)="toggleItem(task, item, $any($event.target).checked)"
                    [attr.aria-label]="'Mark ' + item.title + (item.completed ? ' incomplete' : ' complete')" />
                  <span class="task-items__title" [class.completed]="item.completed">
                    {{ item.title }}
                  </span>
                  <button type="button"
                          class="task-items__btn"
                          (click)="moveItem(task, item, -1)"
                          [disabled]="first"
                          [attr.aria-label]="'Move ' + item.title + ' up'">
                    <i class="pi pi-arrow-up"></i>
                  </button>
                  <button type="button"
                          class="task-items__btn"
                          (click)="moveItem(task, item, +1)"
                          [disabled]="last"
                          [attr.aria-label]="'Move ' + item.title + ' down'">
                    <i class="pi pi-arrow-down"></i>
                  </button>
                  <button type="button"
                          class="task-items__btn task-items__btn--danger"
                          (click)="removeItem(task, item)"
                          [attr.aria-label]="'Remove ' + item.title">
                    <i class="pi pi-trash"></i>
                  </button>
                </li>
              </ul>

              <form (ngSubmit)="addItem(task)"
                    #itemForm="ngForm"
                    class="task-items__form"
                    data-testid="task-items-form">
                <input
                  name="title"
                  [(ngModel)]="newItemTitle"
                  required
                  maxlength="255"
                  placeholder="Add a sub-task…"
                  class="task-items__input"
                  data-testid="task-items-input" />
                <button type="submit"
                        class="btn-secondary"
                        [disabled]="!itemForm.form.valid || newItemTitle.trim().length === 0"
                        data-testid="task-items-add">
                  Add
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <app-task-create-form
        *ngIf="showCreateModal()"
        (formClosed)="showCreateModal.set(false)">
      </app-task-create-form>
    </div>
  `,
  styles: [`
    .task-page { padding: 0; max-width: 1000px; margin: 0 auto; }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: calc(var(--space) * 2);
    }

    .task-filters {
      display: flex;
      gap: var(--space);
      margin-bottom: calc(var(--space) * 2);
      border-bottom: 1px solid var(--border);
      padding-bottom: calc(var(--space) * 1.5);
    }
    .task-filter {
      height: 32px;
      padding: 0 calc(var(--space) * 1.5);
      border: 1px solid var(--border);
      border-radius: 999px;
      background: var(--surface);
      color: var(--text-muted);
      font: inherit;
      font-weight: 500;
      cursor: pointer;
      transition: background-color var(--ease), color var(--ease);
    }
    .task-filter:hover { background: var(--surface-2); }
    .task-filter--active {
      background: var(--accent-soft);
      color: var(--accent-hover);
      border-color: transparent;
    }

    .loading-overlay {
      text-align: center;
      padding: calc(var(--space) * 4);
      color: var(--text-muted);
    }

    .empty-state {
      text-align: center;
      padding: calc(var(--space) * 6);
      color: var(--text-faint);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space);
    }
    .empty-state i { font-size: 40px; }

    .task-checkbox { width: 18px; height: 18px; cursor: pointer; }

    .task-list { display: grid; gap: var(--space); }
    .task-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      padding: calc(var(--space) * 2);
    }
    .task-card--done { opacity: 0.7; }

    .task-card-main { margin-bottom: calc(var(--space) * 1.5); }
    .task-status { display: flex; align-items: center; gap: var(--space); }
    .task-title { font-weight: 600; font-size: 15px; color: var(--text); }
    .task-title.completed { text-decoration: line-through; color: var(--text-faint); }
    .task-desc { color: var(--text-muted); margin: calc(var(--space) * 0.5) 0 0; line-height: 1.5; }

    .task-footer {
      display: flex;
      align-items: center;
      gap: var(--space);
      font-size: 13px;
      color: var(--text-muted);
      border-top: 1px solid var(--surface-2);
      padding-top: calc(var(--space) * 1.5);
    }
    .task-date { margin-right: auto; }

    .task-badge {
      display: inline-flex;
      align-items: center;
      gap: calc(var(--space) * 0.5);
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .task-badge--interaction { background: var(--accent-soft); color: var(--accent-hover); }
    .task-badge--progress { background: var(--surface-2); color: var(--text-muted); }

    .task-subtasks-toggle {
      background: none;
      border: none;
      color: var(--accent);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: calc(var(--space) * 0.5);
      font: inherit;
      font-weight: 500;
      padding: calc(var(--space) * 0.5) var(--space);
    }
    .task-subtasks-toggle:hover { color: var(--accent-hover); }

    .task-items {
      margin-top: calc(var(--space) * 1.5);
      border-top: 1px solid var(--surface-2);
      padding-top: calc(var(--space) * 1.5);
    }
    .task-items__empty { color: var(--text-faint); font-style: italic; margin: 0 0 var(--space); font-size: 13px; }
    .task-items__list { list-style: none; padding: 0; margin: 0 0 var(--space); }
    .task-items__row { display: flex; align-items: center; gap: var(--space); padding: calc(var(--space) * 0.5) 0; }
    .task-items__checkbox { width: 16px; height: 16px; cursor: pointer; }
    .task-items__title { flex: 1; color: var(--text); }
    .task-items__title.completed { text-decoration: line-through; color: var(--text-faint); }
    .task-items__btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: calc(var(--space) * 0.25) calc(var(--space) * 0.5);
      border-radius: var(--radius-sm);
    }
    .task-items__btn:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
    .task-items__btn:disabled { color: var(--text-faint); cursor: not-allowed; }
    .task-items__btn--danger:hover:not(:disabled) { color: var(--danger); }
    .task-items__form { display: flex; gap: var(--space); margin-top: var(--space); }
    .task-items__input {
      flex: 1;
      min-height: 36px;
      padding: 0 calc(var(--space) * 1.25);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font: inherit;
    }
    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      padding: 0 calc(var(--space) * 1.5);
      border-radius: var(--radius-sm);
      cursor: pointer;
      font: inherit;
      font-weight: 500;
    }
    .btn-secondary:disabled { color: var(--text-faint); cursor: not-allowed; }
    .btn-secondary:hover:not(:disabled) { background: var(--surface-2); }
  `]
})
export class Task implements OnInit {
  protected readonly state = inject(TaskStateService);
  protected readonly showCreateModal = signal(false);

  /** All / Open / Done filter (frontend-redesign §5.7). */
  protected readonly filter = signal<TaskFilter>('all');
  protected readonly filters: readonly { value: TaskFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'done', label: 'Done' }
  ];

  /** Tasks after applying the active filter. */
  protected readonly visibleTasks = computed(() => {
    const all = this.state.tasks();
    switch (this.filter()) {
      case 'open': return all.filter((t) => !t.completed);
      case 'done': return all.filter((t) => t.completed);
      default: return all;
    }
  });

  /** Single-card expansion — only one checklist open at a time. */
  protected readonly expandedTaskId = signal<string | null>(null);
  /** Bound to the inline add form via {@code [(ngModel)]}. */
  protected newItemTitle = '';

  ngOnInit() {
    this.state.loadMyTasks();
  }

  /** Sub-task progress ({@code done}/{@code total}) for the loaded items of a task. */
  protected progressFor(task: TaskModel): { done: number; total: number } {
    const items = this.itemsFor(task);
    return { done: items.filter((i) => i.completed).length, total: items.length };
  }

  toggleTask(task: TaskModel) {
    this.state.toggleCompletion(task.id.value, !task.completed);
  }

  protected isExpanded(task: TaskModel): boolean {
    return this.expandedTaskId() === task.id.value.toString();
  }

  protected itemsRegionId(task: TaskModel): string {
    return `task-items-${task.id.value}`;
  }

  protected itemsFor(task: TaskModel): readonly TaskItem[] {
    return this.state.itemsFor(task.id.value.toString())();
  }

  protected toggleExpand(task: TaskModel): void {
    if (this.isExpanded(task)) {
      this.expandedTaskId.set(null);
      return;
    }
    this.expandedTaskId.set(task.id.value.toString());
    // Lazy first-load: fetch items the first time the card is opened.
    if (!this.state.itemsByTaskId().has(task.id.value.toString())) {
      this.state.loadTaskItems(task.id.value.toString());
    }
  }

  protected toggleItem(task: TaskModel, item: TaskItem, completed: boolean): void {
    this.state.patchTaskItem(task.id.value.toString(), item.id, { completed });
  }

  protected removeItem(task: TaskModel, item: TaskItem): void {
    this.state.removeTaskItem(task.id.value.toString(), item.id);
  }

  protected moveItem(task: TaskModel, item: TaskItem, delta: -1 | 1): void {
    const current = this.itemsFor(task);
    const index = current.findIndex(existing => existing.id === item.id);
    if (index < 0) {
      return;
    }
    const target = index + delta;
    if (target < 0 || target >= current.length) {
      return;
    }
    const reordered = [...current];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(target, 0, moved!);
    this.state.reorderTaskItems(task.id.value.toString(), reordered.map(existing => existing.id));
  }

  protected addItem(task: TaskModel): void {
    const title = this.newItemTitle.trim();
    if (title.length === 0) {
      return;
    }
    this.state.addTaskItem(task.id.value.toString(), title);
    this.newItemTitle = '';
  }
}
