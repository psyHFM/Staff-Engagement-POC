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
  `]
})
export class Task implements OnInit {
  protected readonly state = inject(TaskStateService);
  protected readonly showCreateModal = signal(false);

  ngOnInit() {
    this.state.loadMyTasks();
  }

  toggleTask(task: TaskModel) {
    this.state.toggleCompletion(task.id.value, !task.completed);
  }
}
