import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiClient } from '../api/api-client';
import {
  AUTH_EMPLOYEE_ID_KEY,
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
 * <p>The JWT, username, and current user's employee id are persisted to
 * {@code sessionStorage} on successful login and cleared on logout or on any
 * HTTP 401 response. On construction the service re-hydrates them from storage
 * so a page reload / direct navigation does not bounce the user back to
 * {@code /login}. This is the explicit auth carve-out recorded in
 * {@code frontend-state.yaml -> persistence.carve_outs}; all other state
 * remains in-memory.
 *
 * <p>Storage access goes through the injected {@link AuthStorage} abstraction
 * so tests can swap in an in-memory implementation without stubbing
 * {@code window.sessionStorage} directly. The default {@code browserAuthStorage}
 * uses {@code window.sessionStorage} with try/catch swallow (SSR / disabled
 * storage).
 *
 * <p>Beyond the token, this service exposes the JWT subject claim (the
 * {@code sub} field) as {@link currentUserSubject}. The auth controller sets
 * the subject to the email-shaped principal, so today this equals the email —
 * but the signal is read off the token itself, which is the authoritative
 * source. New callers should prefer {@link currentUserSubject} over
 * {@link currentUser} when they need to identify the logged-in user.
 */
@Injectable({ providedIn: 'root' })
export class AuthState {
  private readonly api = inject(ApiClient);
  private readonly storage: AuthStorage = inject(AUTH_STORAGE);

  private readonly token = signal<string | null>(null);
  private readonly username = signal<string | null>(null);
  private readonly employeeId = signal<number | null>(null);

  constructor() {
    this.rehydrate();
  }

  /** Derived state must use computed() — never set manually. */
  readonly isAuthenticated = computed(() => this.token() !== null);
  readonly currentUser = computed(() => this.username());
  /** Read by the Bearer interceptor — signal so Angular tracks changes. */
  readonly bearerToken = computed(() => this.token());
  /**
   * The JWT {@code sub} claim (authoritative identity). Null when no token is
   * present or the token is malformed; the latter collapses silently so a bad
   * token doesn't break the UI.
   */
  readonly currentUserSubject = computed(() => decodeSubject(this.token()));
  /** Resolved employee id for the current user (null when no record yet). */
  readonly currentEmployeeId = computed(() => this.employeeId());

  /** POST /api/v1/auth/login → stores the issued JWT in memory and in sessionStorage. */
  login(credentials: { username: string; password: string }): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', credentials).pipe(
      tap((response) => {
        this.token.set(response.token);
        this.username.set(credentials.username);
        this.employeeId.set(response.employeeId ?? null);
        this.safeWrite(AUTH_STORAGE_KEY, response.token);
        this.safeWrite(AUTH_USERNAME_KEY, credentials.username);
        if (response.employeeId != null) {
          this.safeWrite(AUTH_EMPLOYEE_ID_KEY, String(response.employeeId));
        } else {
          this.safeRemove(AUTH_EMPLOYEE_ID_KEY);
        }
      })
    );
  }

  logout(): void {
    this.token.set(null);
    this.username.set(null);
    this.employeeId.set(null);
    this.safeRemove(AUTH_STORAGE_KEY);
    this.safeRemove(AUTH_USERNAME_KEY);
    this.safeRemove(AUTH_EMPLOYEE_ID_KEY);
  }

  /**
   * Clear the persisted token in response to a 401 (called by
   * {@code authErrorInterceptor} so a stale token can't outlive its
   * server-side rejection). Equivalent to {@link logout}; kept as a named
   * method so the interceptor's intent is readable at the call site and so
   * the spec scenario reads cleanly.
   */
  clearOnUnauthorized(): void {
    this.logout();
  }

  private rehydrate(): void {
    const storedToken = this.safeRead(AUTH_STORAGE_KEY);
    const storedUsername = this.safeRead(AUTH_USERNAME_KEY);
    if (storedToken && storedUsername) {
      this.token.set(storedToken);
      this.username.set(storedUsername);
      this.employeeId.set(safeReadNumber(this.safeRead(AUTH_EMPLOYEE_ID_KEY)));
    }
  }

  private safeRead(key: string): string | null {
    try {
      return this.storage.read(key);
    } catch {
      return null;
    }
  }

  private safeWrite(key: string, value: string): void {
    try {
      this.storage.write(key, value);
    } catch {
      /* no-op: storage unavailable */
    }
  }

  private safeRemove(key: string): void {
    try {
      this.storage.remove(key);
    } catch {
      /* no-op: storage unavailable */
    }
  }
}

/** Mirrors the backend `LoginResponse` record (camelCase JSON). */
export interface LoginResponse {
  readonly token: string;
  readonly tokenType: string;
  readonly expiresInSeconds: number;
  readonly employeeId?: number;
}

/**
 * Decode the {@code sub} claim of a JWT without verifying the signature.
 * The token is opaque to the UI — only the backend trusts it. This is a
 * best-effort identity read for routing/UX; the server re-verifies on every
 * request. Returns {@code null} on any parse failure.
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

function safeReadNumber(raw: string | null): number | null {
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
