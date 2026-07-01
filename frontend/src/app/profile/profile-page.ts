import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { EmployeeDetail } from '../features/employee/employee-detail/employee-detail';
import { UpdateEmployeeRequest } from '../features/employee/employee.types';
import { isAdminToken } from '../features/employee/jwt-claims';
import { PortfolioStateService } from '../features/portfolio/portfolio-state.service';
import { PortfolioEditor } from '../features/portfolio/portfolio-editor/portfolio-editor';
import { AuthState } from '../shared/auth/auth-state';
import { Badge } from '../shared/ui/badge/badge';
import { ProfileStateService } from './profile-state.service';

/**
 * Rounded employee profile page (Phase 6; frontend-redesign Phase B).
 *
 * <p>The single view/edit destination for a person. Reads the employee id from
 * the route — or, on the self-service `/profile` route, resolves the current
 * user's id from the JWT — asks {@link ProfileStateService} for the rounded
 * profile and {@link PortfolioStateService} for the editable portfolio, and
 * renders the header, interactions, tasks, and portfolio.
 *
 * <p>View mode is the default; the {@link editMode} signal (toggled by the
 * owner-or-admin "Edit profile" button) reveals the identity edit form and the
 * editable portfolio editor. Handles 404 gracefully (ATSE1-64).
 */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterLink, EmployeeDetail, PortfolioEditor, Badge],
  providers: [ProfileStateService],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage implements OnInit {
  protected readonly state = inject(ProfileStateService);
  protected readonly portfolioState = inject(PortfolioStateService);
  private readonly auth = inject(AuthState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** Whether the identity form + editable portfolio are shown. */
  protected readonly editMode = signal(false);

  /** The employee id being viewed (string form for the portfolio editor). */
  protected readonly employeeIdStr = signal<string | null>(null);

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

  /** True when the profile failed to load due to 404 (ATSE1-64). */
  protected readonly isNotFound = computed(() => this.state.error()?.envelope.status === 404);

  /** True when the profile failed to load due to a non-404 error. */
  protected readonly hasOtherError = computed(() => {
    const err = this.state.error();
    return err != null && err.envelope.status !== 404;
  });

  ngOnInit(): void {
    // `/employees/:id/profile` supplies the id; the self-service `/profile`
    // route has none, so resolve the current user from the JWT (task 4.6).
    const routeId = this.route.snapshot.paramMap.get('id');
    const selfId = this.auth.currentEmployeeId();
    const id = routeId ?? (selfId != null ? String(selfId) : null);
    if (id) {
      this.employeeIdStr.set(id);
      this.state.loadProfile(id);
      this.portfolioState.loadPortfolio(id);
    }
  }

  protected enterEdit(): void {
    this.editMode.set(true);
  }

  protected exitEdit(): void {
    this.editMode.set(false);
  }

  /** Persist an edit to the profile's employee record and reload the rounded view. */
  protected onUpdate(request: UpdateEmployeeRequest): void {
    const profile = this.state.profile();
    if (!profile) {
      return;
    }
    this.state.updateEmployee(profile.employee.id, request).subscribe({
      next: () => {
        this.state.loadProfile(String(profile.employee.id.value));
        this.exitEdit();
      }
    });
  }

  /** Navigate back to the employee directory. */
  protected onBack(): void {
    void this.router.navigate(['/employees']);
  }
}
