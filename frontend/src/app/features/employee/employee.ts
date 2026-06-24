import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { EmployeeCreateForm } from './employee-create-form/employee-create-form';
import { EmployeeDetail } from './employee-detail/employee-detail';
import { EmployeeList } from './employee-list/employee-list';
import { EmployeeStateService } from './employee-state.service';
import { UpdateEmployeeRequest } from './employee.types';

/**
 * Employee feature landing page.
 *
 * <p>Two sections (frontend-state.yaml): the current user's self-service profile
 * on top, and the employee directory below.
 *
 * <p>Section 1 — Your profile: resolved from the directory by the logged-in user's
 * email. When no profile exists yet the create form is shown (first-time add); once
 * it exists an edit form is shown (owner edits own; an admin also gets the role
 * control). Section 2 — directory: a paginated, sortable list; selecting a row opens
 * a detail/edit view (an admin may edit any record and change role; a non-admin sees
 * others read-only).
 *
 * <p>RBAC affordances derive from the state service's {@code isAdmin}/{@code currentEmail}
 * signals; the backend enforces RBAC regardless.
 */
@Component({
  selector: 'app-employee',
  imports: [FormsModule, RouterLink, EmployeeList, EmployeeCreateForm, EmployeeDetail],
  templateUrl: './employee.html',
  styleUrl: './employee.scss',
  providers: [EmployeeStateService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Employee implements OnInit {
  protected readonly state = inject(EmployeeStateService);
  protected readonly sort = signal('createdAt,desc');

  /** The current user's own record, resolved from the directory by email (null until the directory loads / no profile). */
  protected readonly ownProfile = computed(() => {
    const email = this.state.currentEmail();
    const directory = this.state.employees();
    if (!email || !directory) {
      return null;
    }
    return directory.content.find((e) => e.email === email) ?? null;
  });

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

  /** After a first-time create, reload so the new profile becomes {@link ownProfile}. */
  protected onCreated(): void {
    this.state.loadDirectory(0, 20, this.sort());
  }

  /** Save edits to the current user's own profile. */
  protected onUpdateOwn(request: UpdateEmployeeRequest): void {
    const own = this.ownProfile();
    if (own) {
      this.state.updateEmployee(own.id, request).subscribe({
        next: () => this.state.loadDirectory(0, 20, this.sort())
      });
    }
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