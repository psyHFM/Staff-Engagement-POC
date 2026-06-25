import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { AuthState } from './auth-state';
import { AUTH_STORAGE, AUTH_STORAGE_KEY, AUTH_USERNAME_KEY, AuthStorage } from './auth-storage';

describe('AuthState', () => {
  let auth: AuthState;
  let httpMock: HttpTestingController;
  let storage: AuthStorage;

  /**
   * Tiny Map-backed AuthStorage for unit tests. Production wires
   * `browserAuthStorage` (sessionStorage) in app.config.ts.
   */
  function createInMemoryStorage(): AuthStorage {
    const map = new Map<string, string>();
    return {
      read: (key) => (map.has(key) ? (map.get(key) as string) : null),
      write: (key, value) => {
        map.set(key, value);
      },
      remove: (key) => {
        map.delete(key);
      }
    };
  }

  function configureAndInject(): void {
    TestBed.configureTestingModule({
      providers: [
        AuthState,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_STORAGE, useValue: storage }
      ]
    });
    auth = TestBed.inject(AuthState);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    storage = createInMemoryStorage();
    configureAndInject();
  });

  afterEach(() => httpMock.verify());

  // ---- §2.4 — JWT persistence carve-out (ATSE1-25 / ATSE1-41) -------------

  it('stores the issued JWT and marks the session authenticated after login', () => {
    // Given
    const credentials = { username: 'employee', password: 'staffeng' };
    expect(auth.isAuthenticated()).toBe(false);

    // When
    auth.login(credentials).subscribe();
    const request = httpMock.expectOne('/api/v1/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(credentials);
    request.flush({ token: 'jwt-stub', tokenType: 'Bearer' });

    // Then
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.currentUser()).toBe('employee');
    expect(auth.bearerToken()).toBe('jwt-stub');
    expect(storage.read(AUTH_STORAGE_KEY)).toBe('jwt-stub');
    expect(storage.read(AUTH_USERNAME_KEY)).toBe('employee');
  });

  it('clears the session and storage on logout', () => {
    // Given — an authenticated session
    auth.login({ username: 'manager', password: 'staffeng' }).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' });
    expect(auth.isAuthenticated()).toBe(true);

    // When
    auth.logout();

    // Then
    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.currentUser()).toBeNull();
    expect(auth.bearerToken()).toBeNull();
    expect(storage.read(AUTH_STORAGE_KEY)).toBeNull();
    expect(storage.read(AUTH_USERNAME_KEY)).toBeNull();
  });

  describe('when storage already contains credentials', () => {
    beforeEach(() => {
      storage.write(AUTH_STORAGE_KEY, 'stored-token');
      storage.write(AUTH_USERNAME_KEY, 'stored-user');
      TestBed.resetTestingModule();
      configureAndInject();
    });

    it('rehydrates the session on construction', () => {
      // Then
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.currentUser()).toBe('stored-user');
      expect(auth.bearerToken()).toBe('stored-token');
    });
  });

  describe('when storage is empty', () => {
    beforeEach(() => {
      storage = createInMemoryStorage();
      TestBed.resetTestingModule();
      configureAndInject();
    });

    it('remains unauthenticated on construction', () => {
      // Then
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.currentUser()).toBeNull();
      expect(auth.bearerToken()).toBeNull();
    });
  });

  describe('when storage contains partial credentials', () => {
    beforeEach(() => {
      storage.write(AUTH_STORAGE_KEY, 'stored-token');
      // username intentionally absent
      TestBed.resetTestingModule();
      configureAndInject();
    });

    it('does not rehydrate when only the token is present', () => {
      // Then
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.bearerToken()).toBeNull();
      expect(auth.currentUser()).toBeNull();
    });
  });

  it('emits the login response on the returned observable', () => {
    // Given
    const credentials = { username: 'employee', password: 'staffeng' };
    let emitted: { token: string; tokenType: string } | undefined;

    // When
    auth.login(credentials).subscribe((response) => {
      emitted = response;
    });
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' });

    // Then
    expect(emitted).toEqual({ token: 'jwt-stub', tokenType: 'Bearer' });
  });

  // ---- §2 extras — clearOnUnauthorized + currentUserSubject --------------

it('decodes the JWT subject claim after login (authoritative identity)', () => {
    // Given — no subject yet
    expect(auth.currentUserSubject()).toBeNull();

    // When — login posts username "admin" but the issued JWT carries sub=jane@staff.eng.
    // Using different values for username and sub kills the "sub-vs-storage swap" mutant
    // where currentUserSubject() reads the persisted username instead of the JWT claim.
    auth.login({ username: 'admin', password: 'staffeng' }).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({
      token: tokenWithSub('jane@staff.eng'),
      tokenType: 'Bearer'
    });

    // Then — currentUserSubject reads the `sub` claim, NOT the persisted username
    expect(auth.currentUserSubject()).toBe('jane@staff.eng');
    expect(auth.currentUser()).toBe('admin');
  });

  describe('currentUserSubject (JWT sub-claim decoder)', () => {
    it('returns null when no token is present', () => {
      // Given — fresh, unauthenticated
      // When / Then
      expect(auth.currentUserSubject()).toBeNull();
    });

    it('decodes the JWT subject claim after login (authoritative identity)', () => {
      // Given — no subject yet
      expect(auth.currentUserSubject()).toBeNull();

      // When — login issues a JWT with sub=admin@staff.eng
      auth.login({ username: 'admin@staff.eng', password: 'staffeng' }).subscribe();
      httpMock.expectOne('/api/v1/auth/login').flush({
        token: tokenWithSub('admin@staff.eng'),
        tokenType: 'Bearer'
      });

      // Then — currentUserSubject reads the `sub` claim, not the storage username
      expect(auth.currentUserSubject()).toBe('admin@staff.eng');
    });

    it('returns the decoded sub claim from a persisted JWT (post-rehydration)', () => {
      // Given — header.payload.signature with payload {"sub":"admin@staff.eng"}
      const payload = btoa(JSON.stringify({ sub: 'admin@staff.eng' }))
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      const token = `header.${payload}.signature`;
      storage.write(AUTH_STORAGE_KEY, token);
      storage.write(AUTH_USERNAME_KEY, 'admin@staff.eng');
      TestBed.resetTestingModule();
      configureAndInject();

      // When / Then
      expect(auth.currentUserSubject()).toBe('admin@staff.eng');
    });

    it('returns null when the token is malformed', () => {
      // Given — only one segment, cannot decode
      storage.write(AUTH_STORAGE_KEY, 'not-a-jwt');
      storage.write(AUTH_USERNAME_KEY, 'admin@staff.eng');
      TestBed.resetTestingModule();
      configureAndInject();

      // When / Then
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.currentUserSubject()).toBeNull();
    });
  });
});

/**
 * Mint a fake JWT with the given subject claim. The signature is junk —
 * we only need the payload to be a base64url-encoded JSON with `sub`.
 * Mirrors what `JwtTokenProvider.generate(sub, roles)` produces for the
 * middle segment.
 */
function tokenWithSub(sub: string): string {
  const payload = JSON.stringify({ sub, roles: ['EMPLOYEE'] });
  const base64 = globalThis.btoa(payload).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${base64}.signature`;
}
