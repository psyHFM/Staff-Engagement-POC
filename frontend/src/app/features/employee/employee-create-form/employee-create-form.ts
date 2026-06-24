import { ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EmployeeStateService } from '../employee-state.service';
import { EmployeeLevel, EMPLOYEE_LEVELS } from '../employee.types';

/**
 * Self-service employee create form.
 *
 * <p>Carries only {@code fullName}, {@code jobTitle}, {@code department}, and
 * {@code level} — NO {@code email} (bound to the authenticated principal
 * server-side) and NO {@code role} (forced to {@code EMPLOYEE}; no
 * self-promotion). On submit the form delegates creation to the state service
 * and emits {@link created} so the parent can refresh the directory.
 */
@Component({
  selector: 'app-employee-create-form',
  imports: [FormsModule],
  templateUrl: './employee-create-form.html',
  styleUrl: './employee-create-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeCreateForm implements OnInit {
  @Output() created = new EventEmitter<void>();

  private readonly state = inject(EmployeeStateService);

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
    this.state
      .createEmployee({
        fullName: this.fullName.trim(),
        jobTitle: this.jobTitle.trim() || null,
        department: this.department.trim() || null,
        level: this.level ?? null
      })
      .subscribe({
        next: () => {
          this.resetForm();
          this.created.emit();
        }
      });
  }

  private resetForm(): void {
    this.fullName = '';
    this.jobTitle = '';
    this.department = '';
    this.level = null;
  }
}