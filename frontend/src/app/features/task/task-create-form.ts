import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EmployeePicker } from '../../shared/forms/employee-picker/employee-picker';
import { InteractionPicker } from '../../shared/forms/interaction-picker/interaction-picker';
import { TaskStateService } from './task-state.service';
import { CreateTaskRequest } from './task.model';

/**
 * Task-create modal (Phase 3 + ATSE1-29/ATSE1-30/ATSE1-37/ATSE1-38).
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
 *
 * <p>ATSE1-37/ATSE1-38: Interaction dropdown with cascading filters:
 * - Selecting an Employee filters the Interaction dropdown to that employee's interactions
 * - Selecting an Interaction pins the Employee to that interaction's subject (read-only)
 * - Clear button resets both selections
 */
@Component({
  selector: 'app-task-create-form',
  standalone: true,
  imports: [CommonModule, FormsModule, EmployeePicker, InteractionPicker],
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

  /** Current subject id (for cascading - when set, filters interactions). */
  protected _currentSubjectId: number | null = null;

  ngOnInit(): void {
    if (this.interactionId) {
      this.request.sourceInteractionId = Number(this.interactionId);
    }
  }

  /** Dropdown change bridge — receives the numeric id from the picker. */
  protected onSubjectChange(id: number | null): void {
    this.request.subjectId = id ?? 0;
    this._currentSubjectId = id;
    // Clear interaction when employee changes (cascading reset)
    this.request.sourceInteractionId = undefined;
  }

  /** Dropdown change bridge for interaction — receives the numeric id from the picker. */
  protected onInteractionChange(id: number | null): void {
    if (id !== null) {
      this.request.sourceInteractionId = id;
    }
  }

  /** When interaction selection changes, also receive the subject id for cascading. */
  protected onInteractionSubjectChange(subjectId: number | null): void {
    if (subjectId !== null) {
      // Pin the employee to the interaction's subject (read-only behavior)
      this.request.subjectId = subjectId;
      this._currentSubjectId = subjectId;
    }
  }

  /** Clear both employee and interaction selections. */
  protected onClear(): void {
    this.request.subjectId = 0;
    this.request.sourceInteractionId = undefined;
    this._currentSubjectId = null;
  }

  closeForm(): void {
    this.formClosed.emit();
  }

  submit(): void {
    this.state.createTask(this.request);
    this.closeForm();
  }
}