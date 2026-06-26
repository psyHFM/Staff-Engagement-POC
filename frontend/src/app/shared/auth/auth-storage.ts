import { InjectionToken } from '@angular/core';

/**
 * Tiny abstraction over `sessionStorage` so the auth persistence layer is
 * testable without stubbing `window.sessionStorage` directly.
 *
 * <p>The default {@link browserAuthStorage} implementation uses
 * {@code window.sessionStorage} and silently swallows access errors
 * (e.g. SSR, disabled storage). Tests inject their own implementation.
 */
export interface AuthStorage {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

export const AUTH_STORAGE = new InjectionToken<AuthStorage>('AUTH_STORAGE');

export const AUTH_STORAGE_KEY = 'staff-engagement:token';
export const AUTH_USERNAME_KEY = 'staff-engagement:username';
export const AUTH_EMPLOYEE_ID_KEY = 'staff-engagement:employee-id';

/**
 * Default {@link AuthStorage} backed by {@code window.sessionStorage}.
 * Reads return {@code null} when the storage is unavailable (SSR,
 * disabled storage); writes and removes are no-ops in that case.
 */
export const browserAuthStorage: AuthStorage = {
  read(key: string): string | null {
    try {
      return globalThis.sessionStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  write(key: string, value: string): void {
    try {
      globalThis.sessionStorage?.setItem(key, value);
    } catch {
      /* no-op: storage unavailable */
    }
  },
  remove(key: string): void {
    try {
      globalThis.sessionStorage?.removeItem(key);
    } catch {
      /* no-op: storage unavailable */
    }
  }
};
