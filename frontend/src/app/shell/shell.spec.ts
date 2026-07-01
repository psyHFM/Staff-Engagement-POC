import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';

import { Shell } from './shell';
import { AuthState } from '../shared/auth/auth-state';
import { ToastService } from '../shared/toast/toast.service';

@Component({ template: '', standalone: true })
class StubPage {}

const testRoutes: Routes = [
  { path: 'login', component: StubPage },
  { path: 'profile', component: StubPage },
  { path: 'employees/:id/profile', component: StubPage }
];

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;
  let authMock: AuthState;
  let toastServiceMock: ToastService;

  const isAuthenticated = signal(false);
  const currentUser = signal<string | null>(null);
  const currentEmployeeId = signal<number | null>(null);

  beforeEach(async () => {
    isAuthenticated.set(false);
    currentUser.set(null);
    currentEmployeeId.set(null);

    authMock = {
      isAuthenticated,
      currentUser,
      currentEmployeeId,
      bearerToken: signal(null),
      login: jest.fn(),
      logout: jest.fn()
    } as unknown as AuthState;

    toastServiceMock = {
      show: jest.fn(),
      dismiss: jest.fn(),
      clear: jest.fn(),
      toasts: signal([])
    } as unknown as ToastService;

    await TestBed
      .configureTestingModule({
        imports: [Shell],
        providers: [
          provideRouter(testRoutes),
          { provide: AuthState, useValue: authMock },
          { provide: ToastService, useValue: toastServiceMock }
        ]
      })
      .compileComponents();

    fixture = TestBed.createComponent(Shell);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders the global navigation links including Portfolio when authenticated', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');

    // When
    fixture.detectChanges();

    // Then
    const links = Array.from(fixture.nativeElement.querySelectorAll('.shell__nav a'))
      .map((a: unknown) => (a as HTMLAnchorElement).textContent?.trim());
    expect(links).toEqual(['Dashboard', 'Employees', 'Interactions', 'Tasks', 'Skills', 'Portfolio']);
  });

  it('hides the nav links while unauthenticated (e.g. on /login)', () => {
    // Given
    isAuthenticated.set(false);

    // When
    fixture.detectChanges();

    // Then — no nav, just the sign-in affordance
    expect(fixture.nativeElement.querySelector('.shell__nav')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.shell__login')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.auth-menu')).toBeFalsy();
  });

  it('shows the avatar user menu when authenticated', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.auth-menu')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.auth-menu-trigger')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-avatar')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.shell__login')).toBeFalsy();
  });

  it('displays the username in the menu trigger', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');

    // When
    fixture.detectChanges();

    // Then
    const trigger = fixture.nativeElement.querySelector('.auth-menu-trigger');
    expect(trigger?.textContent?.trim()).toContain('jane@staff.eng');
  });

  it('opens the dropdown with Your details, Profile and Sign out', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');
    currentEmployeeId.set(42);
    fixture.detectChanges();

    // When
    const trigger = fixture.nativeElement.querySelector('.auth-menu-trigger');
    trigger.click();
    fixture.detectChanges();

    // Then
    const items = Array.from(fixture.nativeElement.querySelectorAll('.auth-menu-items li'))
      .map((li: unknown) => (li as HTMLElement).textContent?.trim());
    expect(items).toEqual(['Your details', 'Profile', 'Sign out']);
  });

  it('points Your details at /profile and Profile at the user own profile', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');
    currentEmployeeId.set(42);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.auth-menu-trigger').click();
    fixture.detectChanges();

    // When
    const links = fixture.nativeElement.querySelectorAll('.auth-menu-items a');

    // Then
    expect((links[0] as HTMLAnchorElement).getAttribute('href')).toBe('/profile');
    expect((links[1] as HTMLAnchorElement).getAttribute('href')).toBe('/employees/42/profile');
  });

  it('calls logout when sign out button is clicked', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.auth-menu-trigger').click();
    fixture.detectChanges();

    const logoutSpy = jest.spyOn(authMock, 'logout');

    // When
    const signOutBtn = fixture.nativeElement.querySelector('.auth-menu-items button');
    signOutBtn.click();
    fixture.detectChanges();

    // Then
    expect(logoutSpy).toHaveBeenCalled();
    expect(toastServiceMock.show).toHaveBeenCalledWith('You have been signed out', { type: 'success' });
  });
});
