import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiClient } from '../api/api-client';
import {
  AUTH_STORAGE,
  AUTH_STORAGE_KEY,
  AUTH_USERNAME_KEY,
  AuthStorage
} from './auth-storage';

/**
 * Root-level state service for authentication (frontend-state.yaml:
 * global state lives in Root-level State Services, exposed via Signals,
 * side effects handled inside the service).
 *
 * <p>The JWT is persisted to {@code sessionStorage} on successful login
 * and cleared on logout or on any HTTP 401 response. On construction the
 * service re-hydrates the token from storage so a page reload / direct
 * navigation does not bounce the user back to {@code /login}. This is
 * the explicit auth-token carve-out recorded in
 * {@code frontend-state.yaml -> persistence.carve_outs}; all other
 * state remains in-memory.
 *
 * <p>Storage access goes through the injected {@link AuthStorage}
 * abstraction so tests can swap in an in-memory implementation without
 * stubbing {@code window.sessionStorage} directly. The default
 * {@code browserAuthStorage} uses {@code window.sessionStorage} with
 * try/catch swallow (SSR / disabled storage).
 *
 * <p>Beyond the token, this service exposes the JWT subject claim
 * (the {@code sub} field) as {@link currentUserSubject}. The auth
 * controller sets the subject to the email-shaped principal
 * (see {@code shared.security.AuthController#login}), so today this
 * equals the email too — but the signal is read off the token itself,
 * which is the authoritative source. New callers should prefer
 * {@link currentUserSubject} over {@link currentUser} when they need
 * to identify the logged-in user; the latter is a storage-only echo
 * kept for display in the shell.
 */
@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly api = inject(ApiClient);
  private readonly storage: AuthStorage = inject(AUTH_STORAGE);

  private readonly token = signal<string | null>(null);
  private readonly username = signal<string | null>(null);

  constructor() {
    this.rehydrate();
  }

  /** Derived state must use computed() — never set manually. */
  readonly isAuthenticated = computed(() => this.token() !== null);
  readonly currentUser = computed(() => this.username());
  /** Read by the Bearer interceptor — signal so Angular tracks changes. */
  readonly bearerToken = computed(() => this.token());
  /**
   * The JWT {@code sub} claim (authoritative identity). Null when no
   * token is present or the token is malformed; the latter collapses
   * silently so a bad token doesn't break the UI.
   */
  readonly currentUserSubject = computed(() => decodeSubject(this.token()));

  /** POST /api/v1/auth/login → stores the issued JWT in memory and in sessionStorage. */
  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', credentials).pipe(
      tap((response) => {
        this.token.set(response.token);
        this.username.set(credentials.username);
        this.storage.write(AUTH_STORAGE_KEY, response.token);
        this.storage.write(AUTH_USERNAME_KEY, credentials.username);
      })
    );
  }

  logout(): void {
    this.token.set(null);
    this.username.set(null);
    this.storage.remove(AUTH_STORAGE_KEY);
    this.storage.remove(AUTH_USERNAME_KEY);
  }

  /**
   * Clear the persisted token in response to a 401 (called by
   * {@code authErrorInterceptor} so a stale token can't outlive its
   * server-side rejection). Equivalent to {@link logout}; kept as a
   * named method so the interceptor's intent is readable at the call
   * site and so the spec scenario reads cleanly.
   */
  clearOnUnauthorized(): void {
    this.logout();
  }

  private rehydrate(): void {
    const storedToken = this.storage.read(AUTH_STORAGE_KEY);
    const storedUsername = this.storage.read(AUTH_USERNAME_KEY);
    if (storedToken && storedUsername) {
      this.token.set(storedToken);
      this.username.set(storedUsername);
    }
  }
}

/** Mirrors the backend `LoginResponse` record (camelCase JSON). */
export interface LoginResponse {
  readonly token: string;
  readonly tokenType: string;
}

/**
 * Decode the {@code sub} claim of a JWT without verifying the signature.
 * The token is opaque to the UI — only the backend trusts it. This is a
 * best-effort identity read for routing/UX; the server re-verifies on
 * every request. Returns {@code null} on any parse failure.
 */
function decodeSubject(token: string | null): string | null {
  if (!token) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    // base64url → base64, padded to a multiple of 4
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(globalThis.atob(padded)) as { sub?: unknown };
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
