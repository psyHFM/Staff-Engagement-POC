import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CreateEmployeeRequest, EmployeeLevel, EMPLOYEE_LEVELS } from '../employee.types';

/**
 * Self-service employee create form (parent-driven).
 *
 * <p>Carries only {@code fullName}, {@code jobTitle}, {@code department}, and
 * {@code level} — NO {@code email} (bound to the authenticated principal
 * server-side) and NO {@code role} (forced to {@code EMPLOYEE}; no
 * self-promotion). On submit the form emits a {@link CreateEmployeeRequest}
 * via {@link create} and the parent decides which state service performs
 * the API call (the directory page calls
 * {@link EmployeeStateService#createEmployee}; the {@code /profile}
 * page calls {@link YourDetailsStateService#create}).
 *
 * <p>{@link submitting} is a presentational input — the parent toggles it
 * while the API call is in-flight so the form can disable its submit button
 * (prevents accidental double-submit, mirrors the pattern used by
 * {@code TaskCreateForm}).
 */
@Component({
  selector: 'app-employee-create-form',
  imports: [FormsModule],
  templateUrl: './employee-create-form.html',
  styleUrl: './employee-create-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeCreateForm implements OnInit {
  /** When true, disables the submit button (parent toggles while the API call is in-flight). */
  @Input() submitting = false;

  /** Emitted on submit with the form's {@link CreateEmployeeRequest} payload. */
  @Output() create = new EventEmitter<CreateEmployeeRequest>();

  protected readonly levels = EMPLOYEE_LEVELS;

  protected fullName = '';
  protected jobTitle = '';
  protected department = '';
  protected level: EmployeeLevel | null = null;

  ngOnInit(): void {
    this.resetForm();
  }

  protected submit(): void {
    if (!this.fullName.trim()) {
      return;
    }
    this.create.emit({
      fullName: this.fullName.trim(),
      jobTitle: this.jobTitle.trim() || null,
      department: this.department.trim() || null,
      level: this.level ?? null
    });
  }

  protected resetForm(): void {
    this.fullName = '';
    this.jobTitle = '';
    this.department = '';
    this.level = null;
  }
}