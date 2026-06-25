import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { Shell } from './shell';
import { AuthState, LoginResponse } from '../shared/auth/auth-state';
import { AUTH_STORAGE, AuthStorage } from '../shared/auth/auth-storage';

@Component({ selector: 'router-test-outlet', template: '', standalone: true })
class TestOutletComponent {}

/**
 * The shell spec exists primarily to lock in the ATSE1-32 wiring: when
 * authenticated, the username in the top bar is a link to /profile (the
 * self-service "Your details" page). Sign-out still routes to /login.
 */
describe('Shell (ATSE1-32)', () => {
  let fixture: ComponentFixture<Shell>;
  let auth: AuthState;
  let httpMock: HttpTestingController;
  let location: Location;
  let storage: AuthStorage;

  beforeEach(async () => {
    storage = createInMemoryStorage();
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([
          { path: 'profile', component: TestOutletComponent },
          { path: 'login', component: TestOutletComponent }
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AUTH_STORAGE, useValue: storage }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Shell);
    auth = TestBed.inject(AuthState);
    httpMock = TestBed.inject(HttpTestingController);
    location = TestBed.inject(Location);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('renders a /profile link with the current user when authenticated', () => {
    // Given — login issues a token
    auth.login({ username: 'admin@staff.eng', password: 'staffeng' }).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' } as LoginResponse);

    // When
    fixture.detectChanges();

    // Then
    const link = fixture.nativeElement.querySelector('a.shell__user') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/profile');
    expect(link.textContent).toContain('admin@staff.eng');
  });

  it('renders a Sign in link to /login when not authenticated', () => {
    // Given — no session
    expect(auth.isAuthenticated()).toBe(false);

    // When
    fixture.detectChanges();

    // Then
    const signIn = fixture.nativeElement.querySelector('a.shell__login') as HTMLAnchorElement;
    expect(signIn).toBeTruthy();
    expect(signIn.getAttribute('href')).toBe('/login');
    expect(fixture.nativeElement.querySelector('a.shell__user')).toBeNull();
  });

  it('sign out clears the session and navigates to /login', () => {
    // Given — authenticated
    auth.login({ username: 'admin@staff.eng', password: 'staffeng' }).subscribe();
    httpMock.expectOne('/api/v1/auth/login').flush({ token: 'jwt-stub', tokenType: 'Bearer' } as LoginResponse);
    fixture.detectChanges();

    // When
    (fixture.nativeElement.querySelector('button.shell__logout') as HTMLButtonElement).click();

    // Then — session cleared and routed to /login
    expect(auth.isAuthenticated()).toBe(false);
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(location.path()).toBe('/login');
        resolve();
      }, 0);
    });
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