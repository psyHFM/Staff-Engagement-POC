import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EmployeeDetail } from './employee-detail/employee-detail';
import { EmployeeList } from './employee-list/employee-list';
import { EmployeeStateService } from './employee-state.service';
import { UpdateEmployeeRequest } from './employee.types';

/**
 * Employee directory page (ATSE1-27).
 *
 * <p>Single section (frontend-state.yaml): the paginated, sortable employee
 * directory. Selecting a row opens a detail/edit view (an admin may edit any
 * record and change role; a non-admin sees others read-only).
 *
 * <p>Self-service "Your details" was split out to {@code /profile} in
 * ATSE1-32 — see {@code YourDetailsPage} for the self-service create/update flow.
 *
 * <p>RBAC affordances derive from the state service's {@code isAdmin}/{@code currentEmail}
 * signals; the backend enforces RBAC regardless.
 */
@Component({
  selector: 'app-employee',
  imports: [FormsModule, RouterLink, EmployeeList, EmployeeDetail],
  templateUrl: './employee.html',
  styleUrl: './employee.scss',
  providers: [EmployeeStateService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Employee implements OnInit {
  protected readonly state = inject(EmployeeStateService);
  protected readonly sort = signal('createdAt,desc');

  /** An ADMIN may edit any record; a non-admin may edit only their own (owner check by email). */
  protected readonly canEditSelected = computed(() => {
    const selected = this.state.selectedEmployee();
    return !!selected && (this.state.isAdmin() || selected.email === this.state.currentEmail());
  });

  /** Only an ADMIN may change a role. */
  protected readonly canEditRoleSelected = computed(() => this.state.isAdmin());

  ngOnInit(): void {
    this.state.loadDirectory(0, 20, this.sort());
  }

  protected onPageRequested(req: { offset: number; limit: number }): void {
    this.state.loadDirectory(req.offset, req.limit, this.sort());
  }

  protected onSortRequested(sort: string): void {
    this.sort.set(sort || 'createdAt,desc');
    this.state.loadDirectory(0, 20, this.sort());
  }

  /** Save edits to a directory row (admin editing another employee). */
  protected onUpdateSelected(request: UpdateEmployeeRequest): void {
    const selected = this.state.selectedEmployee();
    if (selected) {
      this.state.updateEmployee(selected.id, request).subscribe({
        next: () => this.state.loadDirectory(0, 20, this.sort())
      });
    }
  }

  /** Collapse the directory detail back to the list. */
  protected onClose(): void {
    this.state.clearSelection();
  }
}