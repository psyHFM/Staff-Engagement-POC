import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthState } from '../shared/auth/auth-state';
import { ApiError } from '../shared/api/error-envelope';

/**
 * Login stub — calls the backend JWT stub (`POST /api/v1/auth/login`) via
 * {@link AuthState}. On success it navigates to the `redirectUrl` saved by the
 * auth guard (or `/dashboard`). Stub credentials are pre-filled for the POC.
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

  protected username = 'employee';
  protected password = 'staffeng';
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

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