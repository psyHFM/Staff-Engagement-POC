import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStateService } from './task-state.service';
import { TaskCreateForm } from './task-create-form';
import { Task as TaskModel, TaskItem } from './task.model';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCreateForm],
  template: `
    <div class="task-page">
      <header class="task-header">
        <h1>My Tasks</h1>
        <button (click)="showCreateModal.set(true)" class="btn-primary">
          <i class="pi pi-plus"></i> Create Task
        </button>
      </header>

      <div *ngIf="state.loading()" class="loading-overlay">
        <i class="pi pi-spin pi-spinner"></i> Loading tasks...
      </div>

      <div class="task-container" *ngIf="!state.loading()">
        <div *ngIf="state.tasks().length === 0" class="empty-state">
          <i class="pi pi-list"></i>
          <p>No tasks assigned to you. Take a break!</p>
        </div>

        <table class="task-table" *ngIf="state.tasks().length > 0">
          <thead>
            <tr>
              <th (click)="state.setSort('title')" class="sortable">
                Title <i class="pi pi-sort-alt"></i>
              </th>
              <th>Description</th>
              <th (click)="state.setSort('createdAt')" class="sortable">
                Created <i class="pi pi-sort-alt"></i>
              </th>
              <th class="text-center">Done</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let task of state.tasks()" [class.completed]="task.completed">
              <td class="font-bold">{{ task.title }}</td>
              <td>{{ task.description }}</td>
              <td>{{ task.createdAt | date:'shortDate' }}</td>
              <td class="text-center">
                <input
                  type="checkbox"
                  [checked]="task.completed"
                  (change)="toggleTask(task)"
                  class="task-checkbox"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="state.itemsByTaskId().size > 0" class="task-list">
          <div *ngFor="let task of state.tasks()" class="task-card">
            <div class="task-card-main">
              <div class="task-status">
                <input
                  type="checkbox"
                  [checked]="task.completed"
                  (change)="toggleTask(task)"
                  class="task-checkbox"
                />
                <span class="task-title" [class.completed]="task.completed">
                  {{ task.title }}
                </span>
              </div>
              <p class="task-desc">{{ task.description }}</p>
            </div>
            <div class="task-footer">
              <span class="task-date">Created: {{ task.createdAt | date:'shortDate' }}</span>
              <button
                type="button"
                class="task-subtasks-toggle"
                (click)="toggleExpand(task)"
                [attr.aria-expanded]="isExpanded(task)"
                [attr.aria-controls]="itemsRegionId(task)">
                <i class="pi" [class.pi-chevron-down]="!isExpanded(task)" [class.pi-chevron-up]="isExpanded(task)"></i>
                Sub-tasks
              </button>
              <i *ngIf="task.sourceInteractionId"
                 class="pi pi-link"
                 title="Created from Interaction"></i>
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
    .task-page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
    }
    .btn-primary:hover { background: #2563eb; }

    .loading-overlay {
      text-align: center;
      padding: 3rem;
      color: #6b7280;
      font-size: 1.2rem;
    }

    .empty-state {
      text-align: center;
      padding: 4rem;
      color: #9ca3af;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      font-size: 1.2rem;
    }
    .empty-state i { font-size: 3rem; }

    .task-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-radius: 0.75rem;
      overflow: hidden;
    }
    .task-table th, .task-table td {
      padding: 1rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .task-table th {
      background: #f9fafb;
      color: #4b5563;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.05em;
    }
    .task-table .sortable {
      cursor: pointer;
      user-select: none;
    }
    .task-table .sortable:hover {
      background: #f3f4f6;
    }
    .task-table tr.completed td {
      color: #9ca3af;
    }
    .task-table tr.completed .font-bold {
      text-decoration: line-through;
    }
    .font-bold {
      font-weight: 600;
      color: #1f2937;
    }
    .text-center {
      text-align: center;
    }
    .task-checkbox {
      width: 1.2rem;
      height: 1.2rem;
      cursor: pointer;
    }

    .task-title {
      font-weight: 600;
      font-size: 1.1rem;
      color: #1f2937;
    }
    .task-title.completed {
      text-decoration: line-through;
      color: #9ca3af;
    }
    .task-desc {
      color: #4b5563;
      font-size: 0.95rem;
      margin: 0;
      line-height: 1.5;
    }
    .task-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: #9ca3af;
      border-top: 1px solid #f3f4f6;
      padding-top: 0.75rem;
      gap: 0.5rem;
    }
    .task-subtasks-toggle {
      background: none;
      border: none;
      color: #3b82f6;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 0.25rem 0.5rem;
    }
    .task-subtasks-toggle:hover { color: #2563eb; }

    .task-items {
      margin-top: 0.75rem;
      border-top: 1px solid #f3f4f6;
      padding-top: 0.75rem;
    }
    .task-items__empty {
      color: #9ca3af;
      font-style: italic;
      margin: 0 0 0.5rem 0;
      font-size: 0.85rem;
    }
    .task-items__list {
      list-style: none;
      padding: 0;
      margin: 0 0 0.5rem 0;
    }
    .task-items__row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.35rem 0;
      font-size: 0.9rem;
    }
    .task-items__checkbox {
      width: 1rem;
      height: 1rem;
      cursor: pointer;
    }
    .task-items__title {
      flex: 1;
      color: #1f2937;
    }
    .task-items__title.completed {
      text-decoration: line-through;
      color: #9ca3af;
    }
    .task-items__btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 0.15rem 0.35rem;
      border-radius: 0.25rem;
      font-size: 0.85rem;
    }
    .task-items__btn:hover:not(:disabled) {
      background: #f3f4f6;
      color: #1f2937;
    }
    .task-items__btn:disabled { color: #d1d5db; cursor: not-allowed; }
    .task-items__btn--danger:hover:not(:disabled) { color: #dc2626; }
    .task-items__form {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .task-items__input {
      flex: 1;
      padding: 0.4rem 0.6rem;
      border: 1px solid #d1d5db;
      border-radius: 0.35rem;
      font-size: 0.9rem;
    }
    .btn-secondary {
      background: #e5e7eb;
      color: #1f2937;
      border: none;
      padding: 0.4rem 0.9rem;
      border-radius: 0.35rem;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .btn-secondary:disabled { color: #9ca3af; cursor: not-allowed; }
    .btn-secondary:hover:not(:disabled) { background: #d1d5db; }
  `]
})
export class Task implements OnInit {
  protected readonly state = inject(TaskStateService);
  protected readonly showCreateModal = signal(false);

  /** Single-card expansion — only one checklist open at a time. */
  protected readonly expandedTaskId = signal<string | null>(null);
  /** Bound to the inline add form via {@code [(ngModel)]}. */
  protected newItemTitle = '';

  ngOnInit() {
    this.state.loadMyTasks();
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
