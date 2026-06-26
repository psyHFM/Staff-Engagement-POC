import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EmployeeCreateForm } from '../features/employee/employee-create-form/employee-create-form';
import { EmployeeDetail } from '../features/employee/employee-detail/employee-detail';
import { CreateEmployeeRequest, UpdateEmployeeRequest } from '../features/employee/employee.types';
import { YourDetailsStateService } from './your-details-state.service';

/**
 * "Your details" page (ATSE1-32).
 *
 * <p>Self-service view of the current user's Employee record — split out of
 * the {@code /employees} directory page so the directory can stay focused on
 * browsing/searching and the "who am I" affordance gets its own route
 * ({@code /profile}). The page resolves the current user by JWT subject on
 * load and shows either:
 *
 * <ul>
 *   <li>The {@code <app-employee-detail>} edit form, when a record exists.</li>
 *   <li>The {@code <app-employee-create-form>}, when no record exists yet
 *       (first-time setup; email is bound by the backend to the principal).</li>
 * </ul>
 *
 * <p>RBAC: the backend enforces owner-or-admin updates; the role control
 * is only rendered for admins via the {@code canEditRole} input on the
 * detail component.
 */
@Component({
  selector: 'app-your-details-page',
  imports: [RouterLink, EmployeeCreateForm, EmployeeDetail],
  templateUrl: './your-details-page.html',
  providers: [YourDetailsStateService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class YourDetailsPage implements OnInit {
  protected readonly state = inject(YourDetailsStateService);

  /** True while we have a profile AND the current user is not the subject of "create me first". */
  protected readonly showProfile = computed(() => this.state.profile() !== null && !this.state.notFound());

  ngOnInit(): void {
    this.state.loadCurrent();
  }

  protected onCreated(request: CreateEmployeeRequest): void {
    // Forward the form payload to the state service. On success the
    // service populates `profile`, which flips the template from the
    // create form to the detail form on the next CD cycle.
    this.state.create(request).subscribe();
  }

  protected onUpdated(request: UpdateEmployeeRequest): void {
    const current = this.state.profile();
    if (current) {
      this.state.update(current.id.value, request).subscribe();
    }
  }
}
