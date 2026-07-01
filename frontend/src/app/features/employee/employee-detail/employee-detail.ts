import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { UpdateEmployeeRequest } from '../employee.types';
import { EmployeeLevel, EmployeeResponse, EMPLOYEE_LEVELS, EMPLOYEE_ROLES, EmployeeRole } from '../employee.types';
import { Avatar } from '../../../shared/ui/avatar/avatar';
import { Badge } from '../../../shared/ui/badge/badge';

/**
 * Employee detail with an RBAC-gated edit form.
 *
 * <p>Renders the selected employee's fields. When {@link canEdit} is true (the
 * caller is an ADMIN or the owner) an edit form is shown, pre-filled with the
 * current values. The role control is shown only when {@link canEditRole} is true
 * (ADMIN); a non-admin never sees it and the form submits {@code role: null} so
 * the backend leaves the role untouched (a non-admin role change is rejected with
 * 403 server-side). {@code email} is the immutable identity key and is never
 * edited here.
 *
 * <p>The {@code canEdit}/{@code canEditRole} flags are derived in the parent from
 * the {@link EmployeeStateService} {@code isAdmin}/{@code currentEmail} signals;
 * this component stays pure presentation (frontend-state.yaml).
 */
@Component({
  selector: 'app-employee-detail',
  imports: [FormsModule, Avatar, Badge],
  templateUrl: './employee-detail.html',
  styleUrl: './employee-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeDetail implements OnChanges {
  @Input({ required: true }) employee: EmployeeResponse | null = null;
  @Input({ required: true }) canEdit = false;
  @Input({ required: true }) canEditRole = false;
  /**
   * Whether the edit form is shown. Gated together with {@link canEdit}
   * (frontend-redesign task 4.3). Defaults to true so existing callers keep the
   * previous "form visible whenever editable" behaviour; the Profile page passes
   * its own edit-mode signal.
   */
  @Input() editing = true;
  @Input() showBack = true;
  @Output() updated = new EventEmitter<UpdateEmployeeRequest>();
  @Output() closed = new EventEmitter<void>();

  protected readonly levels = EMPLOYEE_LEVELS;
  protected readonly roles = EMPLOYEE_ROLES;

  protected fullName = '';
  protected jobTitle = '';
  protected department = '';
  protected level: EmployeeLevel | null = null;
  protected role: EmployeeRole | null = null;

  ngOnChanges(): void {
    this.resetForm();
  }

  protected submit(): void {
    if (!this.employee || !this.fullName.trim()) {
      return;
    }
    this.updated.emit({
      fullName: this.fullName.trim(),
      jobTitle: this.jobTitle.trim() || null,
      department: this.department.trim() || null,
      level: this.level ?? null,
      // role is sent only when the caller may change it; otherwise null leaves it untouched.
      role: this.canEditRole ? this.role : null,
      email: null
    });
  }

  private resetForm(): void {
    this.fullName = this.employee?.fullName ?? '';
    this.jobTitle = this.employee?.jobTitle ?? '';
    this.department = this.employee?.department ?? '';
    this.level = this.employee?.level ?? null;
    this.role = this.employee?.role ?? null;
  }
}