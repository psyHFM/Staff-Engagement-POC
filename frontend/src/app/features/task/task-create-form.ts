import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EmployeePicker } from '../../shared/forms/employee-picker/employee-picker';
import { TaskStateService } from './task-state.service';
import { CreateTaskRequest } from './task.model';

/**
 * Task-create modal (Phase 3 + ATSE1-29/ATSE1-30).
 *
 * <p>Used in two modes:
 * <ul>
 *   <li>Standalone from the task list — the user picks the subject.</li>
 *   <li>Embedded from an interaction row (ATSE1-29) — the parent passes
 *       {@link interactionId} so {@link sourceInteractionId} is seeded on
 *       the request, and the parent owns re-opening the interaction list
 *       after submit.</li>
 * </ul>
 *
 * <p>The subject is now picked from the real employee directory via the
 * shared {@link EmployeePicker} (ATSE1-30) — no more free-text id input.
 */
@Component({
  selector: 'app-task-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule, EmployeePicker],
  templateUrl: './task-create-form.html',
  styleUrls: ['./task-create-form.scss']
})
export class TaskCreateForm implements OnInit {
  protected readonly state = inject(TaskStateService);

  /** Source interaction id when this form is opened from an interaction row. */
  @Input() interactionId?: string;

  /** Renamed from `close` — `close` is a native DOM event name and trips
   *  @angular-eslint/no-output-native. */
  @Output() formClosed = new EventEmitter<void>();

  /** The in-progress create request bound to the form. */
  request: CreateTaskRequest = {
    title: '',
    description: '',
    subjectId: 0
  };

  ngOnInit(): void {
    if (this.interactionId) {
      this.request.sourceInteractionId = Number(this.interactionId);
    }
  }

  /** Dropdown change bridge — receives the numeric id from the picker. */
  protected onSubjectChange(id: number | null): void {
    this.request.subjectId = id ?? 0;
  }

  closeForm(): void {
    this.formClosed.emit();
  }

  submit(): void {
    this.state.createTask(this.request);
    this.closeForm();
  }
}