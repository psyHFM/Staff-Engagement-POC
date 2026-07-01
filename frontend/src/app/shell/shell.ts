import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AuthState } from '../shared/auth/auth-state';
import { ToastService } from '../shared/toast/toast.service';
import { ClickOutsideDirective } from '../shared/directives/click-outside.directive';
import { Avatar } from '../shared/ui/avatar/avatar';

/**
 * Application shell — the persistent chrome (light top bar + nav + auth menu)
 * wrapping the routed feature views. Auth state is read via {@link AuthState};
 * the router {@link authGuard} gates feature routes and redirects to `/login`.
 *
 * frontend-redesign §3: light sticky bar, active-nav pill, avatar user menu,
 * Portfolio nav removed (portfolio lives on the Profile page), nav hidden while
 * unauthenticated (i.e. on `/login`), responsive collapse below ~768px.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ClickOutsideDirective, Avatar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss'
})
export class Shell {
  protected readonly auth = inject(AuthState);
  private readonly router = inject(Router);
  private readonly toastService = inject(ToastService);

  /** Menu open/closed state for the auth dropdown. */
  protected readonly isMenuOpen = signal(false);

  /** Responsive nav open/closed state (mobile hamburger). */
  protected readonly isNavOpen = signal(false);

  /** Link to the current user's profile page when their employee id is known. */
  protected readonly profileLink = computed(() => {
    const id = this.auth.currentEmployeeId();
    return id != null ? ['/employees', id, 'profile'] : null;
  });

  protected toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  protected toggleNav(): void {
    this.isNavOpen.update((open) => !open);
  }

  protected closeNav(): void {
    this.isNavOpen.set(false);
  }

  protected onLogout(): void {
    this.closeMenu();
    this.auth.logout();
    this.toastService.show('You have been signed out', { type: 'success' });
    void this.router.navigate(['/login'], {
      queryParams: { reason: 'signed_out' }
    });
  }
}
