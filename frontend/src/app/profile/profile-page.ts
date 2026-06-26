import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EmployeeDetail } from '../features/employee/employee-detail/employee-detail';
import { UpdateEmployeeRequest } from '../features/employee/employee.types';
import { isAdminToken } from '../features/employee/jwt-claims';
import { ProfileStateService } from './profile-state.service';

/**
 * Rounded employee profile page (Phase 6).
 *
 * <p>Reads the employee id from the route, asks {@link ProfileStateService} to load
 * the profile, and renders the header, interactions, tasks, and portfolio sections.
 * All data flows through computed signals from the state service; the component never
 * mutates state directly.
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmployeeDetail],
  providers: [ProfileStateService],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage implements OnInit {
  protected readonly state = inject(ProfileStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** The logged-in user's email, used for the owner check. */
  private readonly currentEmail = computed(() => this.state.currentUser());

  /** True when the caller is an ADMIN (best-effort JWT decode). */
  private readonly isAdmin = computed(() => isAdminToken(this.state.bearerToken()));

  /** Profile details are editable for the owner or an admin. */
  protected readonly canEdit = computed(() => {
    const profile = this.state.profile();
    if (!profile) {
      return false;
    }
    return this.isAdmin() || profile.employee.email === this.currentEmail();
  });

  /** Only admins may change a role. */
  protected readonly canEditRole = computed(() => this.isAdmin());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.state.loadProfile(id);
    }
  }

  /** Persist an edit to the profile's employee record and reload the rounded view. */
  protected onUpdate(request: UpdateEmployeeRequest): void {
    const profile = this.state.profile();
    if (!profile) {
      return;
    }
    this.state.updateEmployee(profile.employee.id, request).subscribe({
      next: () => this.state.loadProfile(String(profile.employee.id.value))
    });
  }

  /** Navigate back to the employee directory. */
  protected onBack(): void {
    void this.router.navigate(['/employees']);
  }
}
