import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiClient } from '../api/api-client';

/**
 * Root-level state service for authentication (frontend-state.yaml:
 * global state lives in Root-level State Services, exposed via Signals,
 * side effects handled inside the service, in-memory only).
 *
 * Components never set the token directly — they call {@link login} /
 * {@link logout}. State is reset on page load (no persistence).
 */
@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly api = inject(ApiClient);

  private readonly token = signal<string | null>(null);
  private readonly username = signal<string | null>(null);

  /** Derived state must use computed() — never set manually. */
  readonly isAuthenticated = computed(() => this.token() !== null);
  readonly currentUser = computed(() => this.username());

  /** Read by the (Phase 1) Bearer interceptor. */
  bearerToken(): string | null {
    return this.token();
  }

  /** POST /api/v1/auth/login → stores the issued JWT in memory. */
  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', credentials).pipe(
      tap((response) => {
        this.token.set(response.token);
        this.username.set(credentials.username);
      })
    );
  }

  logout(): void {
    this.token.set(null);
    this.username.set(null);
  }
}

/** Mirrors the backend `LoginResponse` record (camelCase JSON). */
export interface LoginResponse {
  readonly token: string;
  readonly tokenType: string;
}