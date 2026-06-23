import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { AuthState } from './auth-state';

describe('AuthState', () => {
  let auth: AuthState;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthState, provideHttpClient(), provideHttpClientTesting()]
    });
    auth = TestBed.inject(AuthState);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

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
  });

  it('clears the session on logout', () => {
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
  });
});