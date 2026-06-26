import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { EmployeeList } from './employee-list/employee-list';
import { EmployeeStateService } from './employee-state.service';
import { EmployeeResponse } from './employee.types';

/**
 * Employee directory page (ATSE1-27 / ATSE1-42).
 *
 * <p>The page is a directory-only list: selecting a row navigates to the
 * employee's dedicated profile page ({@code /employees/:id/profile}). Profile
 * creation and self-service editing live on {@code /profile} (YourDetailsPage)
 * and the rounded profile page respectively.
 *
 * <p>RBAC affordances derive from the state service's {@code isAdmin}/{@code currentEmail}
 * signals; the backend enforces RBAC regardless.
 */
@Component({
  selector: 'app-employee',
  imports: [RouterLink, EmployeeList],
  templateUrl: './employee.html',
  styleUrl: './employee.scss',
  providers: [EmployeeStateService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Employee implements OnInit {
  protected readonly state = inject(EmployeeStateService);
  private readonly router = inject(Router);
  protected readonly sort = signal('createdAt,desc');

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

  /** Selecting a directory row opens the employee's profile page. */
  protected onSelect(employee: EmployeeResponse): void {
    void this.router.navigate(['/employees', employee.id.value, 'profile']);
  }
}
