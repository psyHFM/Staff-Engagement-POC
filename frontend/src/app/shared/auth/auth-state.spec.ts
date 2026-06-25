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

  const tokenKey = 'staff-engagement:token';
  const usernameKey = 'staff-engagement:username';

  function configureAndInject(): void {
    TestBed.configureTestingModule({
      providers: [AuthState, provideHttpClient(), provideHttpClientTesting()]
    });
    auth = TestBed.inject(AuthState);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    sessionStorage.clear();
    configureAndInject();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

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
    expect(sessionStorage.getItem(tokenKey)).toBe('jwt-stub');
    expect(sessionStorage.getItem(usernameKey)).toBe('employee');
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
    expect(sessionStorage.getItem(tokenKey)).toBeNull();
    expect(sessionStorage.getItem(usernameKey)).toBeNull();
  });

  describe('when sessionStorage already contains credentials', () => {
    beforeEach(() => {
      sessionStorage.setItem(tokenKey, 'stored-token');
      sessionStorage.setItem(usernameKey, 'stored-user');
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

  describe('when sessionStorage is empty', () => {
    beforeEach(() => {
      sessionStorage.clear();
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

  describe('when sessionStorage is unavailable', () => {
    let setItemSpy: jest.SpyInstance<void, [string, string]>;
    let removeItemSpy: jest.SpyInstance<void, [string]>;
    let getItemSpy: jest.SpyInstance<string | null, [string]>;

    afterEach(() => {
      setItemSpy?.mockRestore();
      removeItemSpy?.mockRestore();
      getItemSpy?.mockRestore();
    });

    it('falls back to in-memory signals on login when setItem throws', () => {
      // Given
      setItemSpy = jest
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('Storage disabled');
        });
      const credentials = { username: 'employee', password: 'staffeng' };

      // When
      auth.login(credentials).subscribe();
      httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' });

      // Then
      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.currentUser()).toBe('employee');
      expect(auth.bearerToken()).toBe('jwt-stub');
    });

    it('remains unauthenticated when getItem throws during rehydration', () => {
      // Given
      sessionStorage.setItem(tokenKey, 'stored-token');
      sessionStorage.setItem(usernameKey, 'stored-user');
      getItemSpy = jest
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('Storage disabled');
        });

      // When
      TestBed.resetTestingModule();
      configureAndInject();

      // Then
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.bearerToken()).toBeNull();
      expect(auth.currentUser()).toBeNull();
    });

    it('clears in-memory state even when removeItem throws during logout', () => {
      // Given
      removeItemSpy = jest
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new Error('Storage disabled');
        });
      auth.login({ username: 'manager', password: 'staffeng' }).subscribe();
      httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' });
      expect(auth.isAuthenticated()).toBe(true);

      // When
      auth.logout();

      // Then
      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.bearerToken()).toBeNull();
      expect(auth.currentUser()).toBeNull();
    });
  });

  describe('when sessionStorage contains partial credentials', () => {
    beforeEach(() => {
      sessionStorage.setItem(tokenKey, 'stored-token');
      // usernameKey intentionally absent
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
    auth.login(credentials).subscribe((response) => { emitted = response; });
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' });

    // Then
    expect(emitted).toEqual({ token: 'jwt-stub', tokenType: 'Bearer' });
  });
});
