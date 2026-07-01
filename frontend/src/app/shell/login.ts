import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthState } from '../shared/auth/auth-state';
import { ApiError } from '../shared/api/error-envelope';

/**
 * Login stub — calls the backend JWT stub (`POST /api/v1/auth/login`) via
 * {@link AuthState}. On success it navigates to the `redirectUrl` saved by the
 * auth guard (or `/dashboard`). Stub credentials are pre-filled for the POC.
 *
 * <p>Reads a `reason` query parameter to display contextual banners:
 * - `?reason=session_expired` → shows "Your session has ended — please sign in again."
 * - `?reason=unauthorised` → shows an unauthorised access message.
 */
@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  protected readonly auth = inject(AuthState);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // No prefill (frontend-redesign §5.1): the user types their own credentials.
  // Seeded POC accounts are shown as a hint below the form.
  protected username = '';
  protected password = '';
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  // Read reason from query params on init (snapshot is sufficient for login page)
  private readonly reasonValue = this.route.snapshot.queryParamMap.get('reason');

  // Computed signals for banner visibility
  protected readonly showSessionExpiredBanner = computed(() => this.reasonValue === 'session_expired');
  protected readonly showUnauthorisedBanner = computed(() => this.reasonValue === 'unauthorised');

  protected submit(): void {
    this.error.set(null);
    this.submitting.set(true);
    this.auth.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        this.submitting.set(false);
        const redirect = this.route.snapshot.queryParamMap.get('redirectUrl') ?? '/dashboard';
        void this.router.navigateByUrl(redirect);
      },
      error: (err: ApiError) => {
        this.submitting.set(false);
        this.error.set(err.message);
      }
    });
  }
}