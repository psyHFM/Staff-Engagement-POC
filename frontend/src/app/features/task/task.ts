import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStateService } from './task-state.service';
import { TaskCreateForm } from './task-create-form';
import { Task as TaskModel, TaskItem, UpdateTaskRequest } from './task.model';

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

      <div class="task-container">
        <div *ngIf="state.tasks().length === 0 && !state.loading()" class="empty-state">
          <i class="pi pi-list"></i>
          <p>No tasks assigned to you. Take a break!</p>
        </div>

        <div *ngIf="state.tasks().length > 0" class="task-table-shell">
          <table class="task-table">
            <thead>
              <tr>
                <th scope="col">
                  <button type="button" class="sort-button" (click)="state.setSort('title')">Title</button>
                </th>
                <th scope="col">
                  <button type="button" class="sort-button" (click)="state.setSort('description')">Description</button>
                </th>
                <th scope="col">
                  <button type="button" class="sort-button" (click)="state.setSort('createdAt')">Created</button>
                </th>
                <th scope="col">Done</th>
                <th scope="col" class="task-table__action-heading">Open</th>
              </tr>
            </thead>
            <tbody>
              <tr
                *ngFor="let task of state.tasks()"
                class="task-row"
                [class.task-row--completed]="task.completed"
                (click)="openTask(task)"
                tabindex="0"
                (keydown.enter)="openTask(task)"
                (keydown.space)="openTask(task); $event.preventDefault()">
                <td>
                  <span class="task-title" [class.completed]="task.completed">{{ task.title }}</span>
                  <i
                    *ngIf="task.sourceInteractionId"
                    class="pi pi-link task-source"
                    title="Created from Interaction"></i>
                </td>
                <td class="task-desc">{{ task.description }}</td>
                <td class="task-date">{{ task.createdAt | date:'shortDate' }}</td>
                <td>
                  <input
                    type="checkbox"
                    [checked]="task.completed"
                    (click)="$event.stopPropagation()"
                    (change)="toggleTask(task)"
                    class="task-checkbox"
                    [attr.aria-label]="'Mark ' + task.title + (task.completed ? ' incomplete' : ' complete')" />
                </td>
                <td class="task-table__action-cell">
                  <button
                    type="button"
                    class="icon-button task-open-btn"
                    (click)="openTask(task); $event.stopPropagation()"
                    [attr.aria-label]="'Open ' + task.title">
                    <i class="pi pi-pencil"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        *ngIf="selectedTask() as task"
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="'task-detail-title-' + task.id.value"
        (click)="closeTask()">
        <section class="task-detail-modal" (click)="$event.stopPropagation()" role="document">
          <header class="task-detail-modal__header">
            <div>
              <p class="task-detail-modal__eyebrow">Task details</p>
              <h2 [id]="'task-detail-title-' + task.id.value">{{ task.title }}</h2>
            </div>
            <button type="button" class="icon-button" (click)="closeTask()" aria-label="Close task details">
              <i class="pi pi-times"></i>
            </button>
          </header>

          <form (ngSubmit)="saveEdit(task, $event)" class="task-edit-form">
            <label>
              <span>Title</span>
              <input
                name="editTitle"
                [(ngModel)]="editTitle"
                required
                maxlength="120"
                class="task-edit-form__input"
                data-testid="task-edit-title"
                placeholder="Task title" />
            </label>

            <label>
              <span>Description</span>
              <textarea
                name="editDescription"
                [(ngModel)]="editDescription"
                maxlength="1000"
                rows="4"
                class="task-edit-form__textarea"
                data-testid="task-edit-description"
                placeholder="Description"></textarea>
            </label>

            <div class="task-edit-form__meta">
              <span>Created {{ task.createdAt | date:'mediumDate' }}</span>
              <label class="task-complete-toggle">
                <input
                  type="checkbox"
                  [checked]="task.completed"
                  (change)="toggleTask(task)"
                  class="task-checkbox"
                  [attr.aria-label]="'Mark ' + task.title + (task.completed ? ' incomplete' : ' complete')" />
                Done
              </label>
            </div>

            <div class="task-edit-form__actions">
              <button type="submit" class="btn-primary" [disabled]="editTitle.trim().length === 0">Save changes</button>
              <button type="button" class="btn-secondary" (click)="closeTask()">Done</button>
            </div>
          </form>

          <section
            class="task-items"
            [id]="itemsRegionId(task)"
            role="group"
            [attr.aria-label]="'Sub-tasks for ' + task.title">
            <div class="task-items__header">
              <h3>Sub-tasks</h3>
              <span>{{ itemsFor(task).length }} item{{ itemsFor(task).length === 1 ? '' : 's' }}</span>
            </div>

            <p *ngIf="itemsFor(task).length === 0" class="task-items__empty">
              No sub-tasks yet.
            </p>

            <ul *ngIf="itemsFor(task).length > 0" class="task-items__list" role="list">
              <li
                *ngFor="let item of itemsFor(task); let first = first; let last = last"
                class="task-items__row"
                [attr.data-item-id]="item.id">
                <input
                  type="checkbox"
                  class="task-items__checkbox"
                  [checked]="item.completed"
                  (change)="toggleItem(task, item, $any($event.target).checked)"
                  [attr.aria-label]="'Mark ' + item.title + (item.completed ? ' incomplete' : ' complete')" />

                <ng-container *ngIf="editingItemId() !== item.id; else itemEditForm">
                  <span class="task-items__title" [class.completed]="item.completed">
                    {{ item.title }}
                  </span>
                </ng-container>

                <ng-template #itemEditForm>
                  <form (ngSubmit)="saveItemEdit(task, item, $event)" class="task-items__edit-form">
                    <input
                      name="editItemTitle"
                      [(ngModel)]="editItemTitle"
                      required
                      maxlength="255"
                      class="task-items__edit-input"
                      data-testid="task-item-edit-input"
                      placeholder="Sub-task title" />
                    <button
                      type="submit"
                      class="task-items__btn"
                      [disabled]="editItemTitle.trim().length === 0"
                      aria-label="Save sub-task title">
                      <i class="pi pi-check"></i>
                    </button>
                    <button
                      type="button"
                      class="task-items__btn"
                      (click)="cancelItemEdit($event)"
                      aria-label="Cancel sub-task edit">
                      <i class="pi pi-times"></i>
                    </button>
                  </form>
                </ng-template>

                <div class="task-items__actions">
                  <button
                    type="button"
                    class="task-items__btn"
                    (click)="moveItem(task, item, -1)"
                    [disabled]="first"
                    [attr.aria-label]="'Move ' + item.title + ' up'">
                    <i class="pi pi-arrow-up"></i>
                  </button>
                  <button
                    type="button"
                    class="task-items__btn"
                    (click)="moveItem(task, item, +1)"
                    [disabled]="last"
                    [attr.aria-label]="'Move ' + item.title + ' down'">
                    <i class="pi pi-arrow-down"></i>
                  </button>
                  <button
                    type="button"
                    class="task-items__btn"
                    (click)="startItemEdit(item)"
                    [attr.aria-label]="'Edit ' + item.title">
                    <i class="pi pi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="task-items__btn task-items__btn--danger"
                    (click)="removeItem(task, item)"
                    [attr.aria-label]="'Remove ' + item.title">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>
              </li>
            </ul>

            <form
              (ngSubmit)="addItem(task)"
              #itemForm="ngForm"
              class="task-items__form"
              data-testid="task-items-form">
              <input
                name="title"
                [(ngModel)]="newItemTitle"
                required
                maxlength="255"
                placeholder="Add a sub-task..."
                class="task-items__input"
                data-testid="task-items-input" />
              <button
                type="submit"
                class="btn-secondary"
                [disabled]="!itemForm.form.valid || newItemTitle.trim().length === 0"
                data-testid="task-items-add">
                Add
              </button>
            </form>
          </section>
        </section>
      </div>

      <app-task-create-form
        *ngIf="showCreateModal()"
        (formClosed)="showCreateModal.set(false)">
      </app-task-create-form>
    </div>
  `,
  styles: [`
    .task-page { padding: 5rem 2rem 2rem; max-width: 1180px; margin: 0 auto; }
    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }
    .task-header h1 { margin: 0; color: #020617; }
    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-weight: 600;
    }
    .btn-primary:hover { background: #2563eb; }
    .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }

    .loading-overlay {
      text-align: center;
      padding: 1rem;
      color: #6b7280;
      font-size: 1rem;
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

    .task-table-shell {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }
    .task-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .task-table th,
    .task-table td {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
      text-align: left;
      vertical-align: middle;
    }
    .task-table th {
      background: #f9fafb;
      color: #334155;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .task-table th:nth-child(1) { width: 24%; }
    .task-table th:nth-child(2) { width: 38%; }
    .task-table th:nth-child(3) { width: 18%; }
    .task-table th:nth-child(4),
    .task-table th:nth-child(5) { width: 10%; }
    .task-table tbody tr:last-child td { border-bottom: 0; }
    .task-row {
      cursor: pointer;
      transition: background-color 120ms ease;
    }
    .task-row:hover,
    .task-row:focus {
      background: #f8fafc;
      outline: none;
    }
    .task-row--completed { color: #94a3b8; }
    .sort-button {
      background: none;
      border: 0;
      color: inherit;
      cursor: pointer;
      font: inherit;
      padding: 0;
      text-transform: inherit;
    }
    .sort-button::after {
      content: ' \\2195';
      color: #2563eb;
      font-weight: 700;
    }
    .task-checkbox {
      width: 1.2rem;
      height: 1.2rem;
      cursor: pointer;
      margin: 0;
    }
    .task-title {
      font-weight: 600;
      font-size: 1rem;
      color: #020617;
    }
    .task-title.completed,
    .task-items__title.completed {
      text-decoration: line-through;
      color: #9ca3af;
    }
    .task-desc {
      color: #4b5563;
      font-size: 0.95rem;
      line-height: 1.5;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .task-date {
      color: #64748b;
      font-size: 0.95rem;
    }
    .task-source {
      color: #64748b;
      font-size: 0.8rem;
      margin-left: 0.5rem;
    }
    .task-table__action-heading,
    .task-table__action-cell {
      text-align: center;
    }
    .icon-button {
      width: 2rem;
      height: 2rem;
      border: 1px solid #d1d5db;
      border-radius: 0.35rem;
      background: #ffffff;
      color: #334155;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex: 0 0 auto;
    }
    .icon-button:hover {
      background: #f8fafc;
      color: #2563eb;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 20;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: rgba(15, 23, 42, 0.42);
    }
    .task-detail-modal {
      width: min(720px, 100%);
      max-height: min(86vh, 860px);
      overflow: auto;
      background: #ffffff;
      border-radius: 0.5rem;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.24);
      padding: 1.5rem;
    }
    .task-detail-modal__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .task-detail-modal__header h2 {
      margin: 0.15rem 0 0;
      color: #0f172a;
      font-size: 1.35rem;
    }
    .task-detail-modal__eyebrow {
      margin: 0;
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }
    .task-edit-form {
      display: grid;
      gap: 1rem;
    }
    .task-edit-form label {
      display: grid;
      gap: 0.4rem;
      color: #334155;
      font-size: 0.85rem;
      font-weight: 700;
    }
    .task-edit-form__input,
    .task-edit-form__textarea {
      width: 100%;
      box-sizing: border-box;
      border: 1px solid #cbd5e1;
      border-radius: 0.4rem;
      color: #0f172a;
      font: inherit;
      font-weight: 400;
      padding: 0.65rem 0.75rem;
      resize: vertical;
    }
    .task-edit-form__meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      color: #64748b;
      font-size: 0.9rem;
    }
    .task-complete-toggle {
      display: inline-flex !important;
      grid-template-columns: none !important;
      align-items: center;
      gap: 0.5rem !important;
      cursor: pointer;
    }
    .task-edit-form__actions {
      display: flex;
      gap: 0.75rem;
      justify-content: flex-end;
      margin-bottom: 0.5rem;
    }
    .task-items {
      margin-top: 1.25rem;
      border-top: 1px solid #e5e7eb;
      padding-top: 1.25rem;
    }
    .task-items__header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }
    .task-items__header h3 {
      margin: 0;
      color: #0f172a;
      font-size: 1rem;
    }
    .task-items__header span {
      color: #64748b;
      font-size: 0.85rem;
    }
    .task-items__empty {
      color: #9ca3af;
      font-style: italic;
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
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
      padding: 0.55rem 0;
      font-size: 0.9rem;
      border-bottom: 1px solid #f1f5f9;
    }
    .task-items__checkbox {
      width: 1rem;
      height: 1rem;
      cursor: pointer;
      flex: 0 0 auto;
    }
    .task-items__title {
      flex: 1;
      min-width: 0;
      color: #1f2937;
      overflow-wrap: anywhere;
    }
    .task-items__actions {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-left: auto;
    }
    .task-items__btn {
      width: 1.75rem;
      height: 1.75rem;
      background: #ffffff;
      border: 1px solid transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 0.25rem;
      font-size: 0.85rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }
    .task-items__btn:hover:not(:disabled) {
      background: #f3f4f6;
      color: #1f2937;
    }
    .task-items__btn:disabled { color: #d1d5db; cursor: not-allowed; }
    .task-items__btn--danger:hover:not(:disabled) { color: #dc2626; }
    .task-items__edit-form {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex: 1;
      min-width: 0;
    }
    .task-items__edit-input {
      flex: 1;
      min-width: 0;
      padding: 0.35rem 0.45rem;
      border: 1px solid #d1d5db;
      border-radius: 0.25rem;
      font-size: 0.9rem;
      font-family: inherit;
    }
    .task-items__form {
      display: flex;
      gap: 0.5rem;
      margin-top: 1rem;
    }
    .task-items__input {
      flex: 1;
      min-width: 0;
      padding: 0.5rem 0.65rem;
      border: 1px solid #d1d5db;
      border-radius: 0.35rem;
      font-size: 0.9rem;
    }
    .btn-secondary {
      background: #e5e7eb;
      color: #1f2937;
      border: none;
      padding: 0.55rem 0.95rem;
      border-radius: 0.35rem;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .btn-secondary:disabled { color: #9ca3af; cursor: not-allowed; }
    .btn-secondary:hover:not(:disabled) { background: #d1d5db; }

    @media (max-width: 720px) {
      .task-page { padding: 2rem 1rem; }
      .task-header { align-items: flex-start; gap: 1rem; }
      .task-table-shell { overflow-x: auto; }
      .task-table { min-width: 680px; }
      .modal-overlay { align-items: stretch; padding: 0.75rem; }
      .task-detail-modal { max-height: 100%; }
      .task-edit-form__actions { justify-content: stretch; }
      .task-edit-form__actions button { flex: 1; }
    }
  `]
})
export class Task implements OnInit {
  protected readonly state = inject(TaskStateService);
  protected readonly showCreateModal = signal(false);

  /** Task opened in the detail modal. */
  protected readonly selectedTaskId = signal<string | null>(null);
  /** Bound to the add sub-task form via [(ngModel)]. */
  protected newItemTitle = '';
  /** Retained for tests and to represent the modal edit lifecycle. */
  protected editingTaskId = signal<string | null>(null);
  /** Bound to the task edit form. */
  protected editTitle = '';
  protected editDescription = '';
  /** Sub-task currently in edit mode. */
  protected editingItemId = signal<string | null>(null);
  /** Bound to the sub-task edit form. */
  protected editItemTitle = '';

  ngOnInit() {
    this.state.loadMyTasks();
  }

  toggleTask(task: TaskModel) {
    this.state.toggleCompletion(task.id.value, !task.completed);
  }

  protected selectedTask(): TaskModel | null {
    const selectedId = this.selectedTaskId();
    return this.state.tasks().find(task => task.id.value.toString() === selectedId) ?? null;
  }

  protected openTask(task: TaskModel): void {
    this.selectedTaskId.set(task.id.value.toString());
    this.editingTaskId.set(task.id.value.toString());
    this.editTitle = task.title;
    this.editDescription = task.description;
    this.editingItemId.set(null);
    this.newItemTitle = '';

    if (!this.state.itemsByTaskId().has(task.id.value.toString())) {
      this.state.loadTaskItems(task.id.value.toString());
    }
  }

  protected closeTask(): void {
    this.selectedTaskId.set(null);
    this.editingTaskId.set(null);
    this.editingItemId.set(null);
    this.newItemTitle = '';
  }

  protected startEdit(task: TaskModel, event: MouseEvent): void {
    event.stopPropagation();
    this.openTask(task);
  }

  protected cancelEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.closeTask();
  }

  protected saveEdit(task: TaskModel, event: Event): void {
    event.stopPropagation();
    const title = this.editTitle.trim();
    if (title.length === 0) {
      return;
    }
    const patch: UpdateTaskRequest = { title };
    if (this.editDescription.trim() !== task.description) {
      patch.description = this.editDescription.trim();
    }
    this.state.updateTask(task.id.value, patch);
  }

  protected isExpanded(task: TaskModel): boolean {
    return this.selectedTaskId() === task.id.value.toString();
  }

  protected itemsRegionId(task: TaskModel): string {
    return `task-items-${task.id.value}`;
  }

  protected itemsFor(task: TaskModel): readonly TaskItem[] {
    return this.state.itemsFor(task.id.value.toString())();
  }

  protected toggleExpand(task: TaskModel): void {
    if (this.isExpanded(task)) {
      this.closeTask();
      return;
    }
    this.openTask(task);
  }

  protected toggleItem(task: TaskModel, item: TaskItem, completed: boolean): void {
    this.state.patchTaskItem(task.id.value.toString(), item.id, { completed });
  }

  protected startItemEdit(item: TaskItem): void {
    this.editingItemId.set(item.id);
    this.editItemTitle = item.title;
  }

  protected saveItemEdit(task: TaskModel, item: TaskItem, event: Event): void {
    event.stopPropagation();
    const title = this.editItemTitle.trim();
    if (title.length === 0 || title === item.title) {
      this.editingItemId.set(null);
      return;
    }
    this.state.patchTaskItem(task.id.value.toString(), item.id, { title });
    this.editingItemId.set(null);
  }

  protected cancelItemEdit(event: Event): void {
    event.stopPropagation();
    this.editingItemId.set(null);
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
