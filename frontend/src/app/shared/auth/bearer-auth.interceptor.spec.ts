import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { AuthState } from './auth-state';
import { AUTH_STORAGE, AuthStorage } from './auth-storage';
import { bearerAuthInterceptor } from './bearer-auth.interceptor';

describe('bearerAuthInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: AuthState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthState,
        provideHttpClient(withInterceptors([bearerAuthInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_STORAGE, useValue: createInMemoryStorage() }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthState);
  });

  afterEach(() => httpMock.verify());

  it('adds Authorization header when a token is present', () => {
    // Given — an authenticated session
    auth.login({ username: 'admin@staff.eng', password: 'staffeng' }).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' });

    // When
    http.get('/api/v1/employees/1/interactions').subscribe();

    // Then
    const req = httpMock.expectOne('/api/v1/employees/1/interactions');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-stub');
    req.flush([]);
  });

  it('leaves the request unmodified when no token exists', () => {
    // Given — no session
    expect(auth.bearerToken()).toBeNull();

    // When
    http.get('/api/v1/health').subscribe();

    // Then
    const req = httpMock.expectOne('/api/v1/health');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ status: 'UP' });
  });

  it('does not overwrite an existing Authorization header', () => {
    // Given — a token and a request that already carries Authorization
    auth.login({ username: 'admin@staff.eng', password: 'staffeng' }).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' });

    // When
    http
      .get('/api/v1/employees/1/interactions', {
        headers: { Authorization: 'Bearer existing' }
      })
      .subscribe();

    // Then
    const req = httpMock.expectOne('/api/v1/employees/1/interactions');
    expect(req.request.headers.get('Authorization')).toBe('Bearer existing');
    req.flush([]);
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
