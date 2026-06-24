import { Component, inject, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskStateService } from './task-state.service';
import { CreateTaskRequest } from './task.model';

@Component({
  selector: 'app-task-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="closeForm()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h2>{{ interactionId ? 'Create Task from Interaction' : 'Create New Task' }}</h2>
          <button (click)="closeForm()" class="close-btn">&times;</button>
        </header>

        <form (ngSubmit)="submit()" #taskForm="ngForm" class="task-form">
          <div class="form-group">
            <label for="title">Title</label>
            <input id="title" name="title" [(ngModel)]="request.title" required placeholder="Enter task title..." />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" name="description" [(ngModel)]="request.description" required placeholder="Enter task details..."></textarea>
          </div>

          <div class="form-group">
            <label for="subjectId">Subject (Employee ID)</label>
            <input id="subjectId" name="subjectId" [(ngModel)]="request.subjectId" required placeholder="e.g. EMP-123" />
          </div>

          <div class="form-actions">
            <button type="button" (click)="closeForm()" class="btn-secondary">Cancel</button>
            <button type="submit" [disabled]="!taskForm.form.valid || state.loading()" class="btn-primary">
              <i *ngIf="state.loading()" class="pi pi-spin pi-spinner"></i>
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-content {
      background: white;
      padding: 2rem;
      border-radius: 1rem;
      width: 100%;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .modal-header h2 { margin: 0; font-size: 1.5rem; color: #111827; }
    .close-btn {
      background: none; border: none; font-size: 2rem; cursor: pointer; color: #9ca3af;
    }
    .close-btn:hover { color: #111827; }

    .task-form { display: flex; flex-direction: column; gap: 1.25rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
    .form-group label { font-weight: 600; font-size: 0.9rem; color: #374151; }
    .form-group input, .form-group textarea {
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 0.4rem;
      font-size: 1rem;
    }
    .form-group textarea { min-height: 100px; resize: vertical; }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1rem;
    }
    .btn-secondary {
      background: white;
      border: 1px solid #d1d5db;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
    }
    .btn-primary {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-weight: 600;
    }
    .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }
  `]
})
export class TaskCreateForm {
  protected readonly state = inject(TaskStateService);

  // Input for interaction context
  @Input() interactionId?: string;

  request: CreateTaskRequest = {
    title: '',
    description: '',
    subjectId: ''
  };

  @Output() close = new EventEmitter<void>();

  ngOnInit() {
    if (this.interactionId) {
      this.request.sourceInteractionId = this.interactionId;
    }
  }

  closeForm() {
    this.close.emit();
  }

  submit() {
    this.state.createTask(this.request);
    this.closeForm();
  }
}
