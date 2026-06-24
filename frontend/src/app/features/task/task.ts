import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskStateService } from './task-state.service';
import { TaskCreateForm } from './task-create-form';
import { Task as TaskModel } from './task.model';

@Component({
  selector: 'app-task',
  standalone: true,
  imports: [CommonModule, TaskCreateForm],
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

      <div class="task-list" *ngIf="!state.loading()">
        <div *ngIf="state.tasks().length === 0" class="empty-state">
          <i class="pi pi-list"></i>
          <p>No tasks assigned to you. Take a break!</p>
        </div>

        <div class="task-grid">
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
              <i *ngIf="task.sourceInteractionId"
                 class="pi pi-link"
                 title="Created from Interaction"></i>
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

    .task-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .task-card {
      border: 1px solid #e5e7eb;
      border-radius: 0.75rem;
      padding: 1.25rem;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .task-card-main { margin-bottom: 1rem; }
    .task-status {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
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
    }
  `]
})
export class Task implements OnInit {
  protected readonly state = inject(TaskStateService);
  protected readonly showCreateModal = signal(false);

  ngOnInit() {
    this.state.loadMyTasks();
  }

  toggleTask(task: TaskModel) {
    this.state.toggleCompletion(task.id, !task.completed);
  }
}
