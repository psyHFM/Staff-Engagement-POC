import { Component, inject } from '@angular/core';
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

  protected logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}