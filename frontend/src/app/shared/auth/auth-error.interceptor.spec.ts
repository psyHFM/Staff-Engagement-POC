import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';
import { Router } from '@angular/router';

import { AuthState } from './auth-state';
import { AUTH_STORAGE, AUTH_STORAGE_KEY, AUTH_USERNAME_KEY, AuthStorage } from './auth-storage';
import { authErrorInterceptor } from './auth-error.interceptor';

describe('authErrorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthState;
  let storage: AuthStorage;
  let navigateSpy: jest.SpyInstance;

  beforeEach(() => {
    storage = createInMemoryStorage();

    // Stub Router to prevent actual navigation in tests
    const routerStub = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        AuthState,
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_STORAGE, useValue: storage },
        { provide: Router, useValue: routerStub }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthState);
    navigateSpy = routerStub.navigate;
  });

  afterEach(() => httpMock.verify());

  /**
   * Helper: reconfigure the test bed with a pre-populated storage map so
   * AuthState hydrates an authenticated session at construction time
   * (simulates a page reload with a stored JWT).
   */
  function rehydrateWithToken(token: string, username = 'admin@staff.eng'): void {
    storage.write(AUTH_STORAGE_KEY, token);
    storage.write(AUTH_USERNAME_KEY, username);
    TestBed.resetTestingModule();
    // Stub Router to prevent actual navigation in tests
    const routerStub = {
      navigate: jest.fn().mockResolvedValue(true)
    };
    TestBed.configureTestingModule({
      providers: [
        AuthState,
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_STORAGE, useValue: storage },
        { provide: Router, useValue: routerStub }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthState);
    navigateSpy = routerStub.navigate;
  }

  it('clears the persisted token on a 401 response', () => {
    // Given — a session hydrated from storage (simulates a reload)
    rehydrateWithToken('real-jwt');
    expect(auth.isAuthenticated()).toBe(true);

    // When — a request returns 401
    let caught: HttpErrorResponse | undefined;
    http.get('/api/v1/employees').subscribe({
      next: () => fail('expected 401'),
      error: (err) => {
        caught = err;
      }
    });
    httpMock.expectOne('/api/v1/employees').flush('Unauthorized', {
      status: 401,
      statusText: 'Unauthorized'
    });

    // Then — the token is wiped from both signals and storage
    expect(caught?.status).toBe(401);
    expect(auth.isAuthenticated()).toBe(false);
    expect(storage.read(AUTH_STORAGE_KEY)).toBeNull();
    expect(storage.read(AUTH_USERNAME_KEY)).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith(['/login'], { queryParams: { reason: 'session_expired' } });
  });

  it('leaves the session intact on a 403 response', () => {
    // Given — an authenticated session
    auth.login({ username: 'admin@staff.eng', password: 'staffeng' }).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'real-jwt', tokenType: 'Bearer' });

    // When — a request returns 403
    let caught: HttpErrorResponse | undefined;
    http.get('/api/v1/admin/secret').subscribe({
      next: () => fail('expected 403'),
      error: (err) => {
        caught = err;
      }
    });
    httpMock.expectOne('/api/v1/admin/secret').flush('Forbidden', {
      status: 403,
      statusText: 'Forbidden'
    });

    // Then — session is intact (403 ≠ unauthenticated)
    expect(caught?.status).toBe(403);
    expect(auth.isAuthenticated()).toBe(true);
    expect(storage.read(AUTH_STORAGE_KEY)).toBe('real-jwt');
  });

  it('does not touch the session on a 500 response', () => {
    // Given — an authenticated session
    auth.login({ username: 'admin@staff.eng', password: 'staffeng' }).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'real-jwt', tokenType: 'Bearer' });

    // When — a request returns 500
    http.get('/api/v1/employees').subscribe({
      next: () => fail('expected 500'),
      error: () => {
        /* expected */
      }
    });
    httpMock.expectOne('/api/v1/employees').flush('boom', {
      status: 500,
      statusText: 'Server Error'
    });

    // Then
    expect(auth.isAuthenticated()).toBe(true);
    expect(storage.read(AUTH_STORAGE_KEY)).toBe('real-jwt');
  });
});

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
