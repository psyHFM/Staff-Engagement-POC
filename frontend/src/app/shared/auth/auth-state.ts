import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiClient } from '../api/api-client';

/**
 * Root-level state service for authentication (frontend-state.yaml:
 * global state lives in Root-level State Services, exposed via Signals,
 * side effects handled inside the service).
 *
 * Components never set the token directly — they call {@link login} /
 * {@link logout}. The JWT and username are persisted to `sessionStorage`
 * so that a page refresh or deep link keeps the session alive until the
 * token expires. Non-auth global state remains in-memory only.
 */
@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly api = inject(ApiClient);

  private readonly token = signal<string | null>(null);
  private readonly username = signal<string | null>(null);

  private readonly tokenKey = 'staff-engagement:token';
  private readonly usernameKey = 'staff-engagement:username';

  constructor() {
    this.rehydrate();
  }

  /** Derived state must use computed() — never set manually. */
  readonly isAuthenticated = computed(() => this.token() !== null);
  readonly currentUser = computed(() => this.username());
  readonly bearerToken = computed(() => this.token());

  /** POST /api/v1/auth/login → stores the issued JWT in memory and sessionStorage. */
  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', credentials).pipe(
      tap((response) => {
        this.token.set(response.token);
        this.username.set(credentials.username);
        this.saveToStorage(response.token, credentials.username);
      })
    );
  }

  logout(): void {
    this.token.set(null);
    this.username.set(null);
    this.clearStorage();
  }

  private rehydrate(): void {
    const storedToken = this.safeGetItem(this.tokenKey);
    const storedUsername = this.safeGetItem(this.usernameKey);
    if (storedToken && storedUsername) {
      this.token.set(storedToken);
      this.username.set(storedUsername);
    }
  }

  private saveToStorage(tokenValue: string, usernameValue: string): void {
    this.safeSetItem(this.tokenKey, tokenValue);
    this.safeSetItem(this.usernameKey, usernameValue);
  }

  private clearStorage(): void {
    this.safeRemoveItem(this.tokenKey);
    this.safeRemoveItem(this.usernameKey);
  }

  private safeGetItem(key: string): string | null {
    try {
      if (typeof sessionStorage !== 'undefined') {
        return sessionStorage.getItem(key);
      }
    } catch {
      // Storage disabled or unavailable — fall back to in-memory state.
    }
    return null;
  }

  private safeSetItem(key: string, value: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, value);
      }
    } catch {
      // Storage disabled or unavailable — signals remain the source of truth.
    }
  }

  private safeRemoveItem(key: string): void {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    } catch {
      // Storage disabled or unavailable — signals have already been cleared.
    }
  }
}

/** Mirrors the backend `LoginResponse` record (camelCase JSON). */
export interface LoginResponse {
  readonly token: string;
  readonly tokenType: string;
}
