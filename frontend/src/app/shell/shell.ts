import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthState } from '../shared/auth/auth-state';

/**
 * Application shell — the persistent chrome (nav bar + auth controls) wrapping
 * the routed feature views. Auth state is read via {@link AuthState}; the
 * router {@link authGuard} gates feature routes and redirects to `/login`.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss'
})
export class Shell {
  protected readonly auth = inject(AuthState);
  private readonly router = inject(Router);

  /** Link to the current user's profile page when their employee id is known. */
  protected readonly profileLink = computed(() => {
    const id = this.auth.currentEmployeeId();
    return id != null ? ['/employees', id, 'profile'] : null;
  });

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}