import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';

import { Shell } from './shell';
import { AuthState } from '../shared/auth/auth-state';

@Component({ template: '', standalone: true })
class StubPage {}

const testRoutes: Routes = [
  { path: 'login', component: StubPage },
  { path: 'employees/:id/profile', component: StubPage }
];

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;
  let authMock: AuthState;

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

    await TestBed
      .configureTestingModule({
        imports: [Shell],
        providers: [provideRouter(testRoutes), { provide: AuthState, useValue: authMock }]
      })
      .compileComponents();

    fixture = TestBed.createComponent(Shell);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('renders the global navigation links', () => {
    // When
    fixture.detectChanges();

    // Then
    const links = Array.from(fixture.nativeElement.querySelectorAll('.shell__nav a'))
      .map((a: unknown) => (a as HTMLAnchorElement).textContent?.trim());
    expect(links).toEqual(['Dashboard', 'Employees', 'Interactions', 'Tasks', 'Portfolio', 'Skills']);
  });

  it('shows a sign-in link when the user is not authenticated', () => {
    // Given
    isAuthenticated.set(false);

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.shell__login')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.shell__logout')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.shell__user')).toBeFalsy();
  });

  it('shows the username chip and sign-out button when authenticated', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.shell__user')?.textContent?.trim()).toBe('jane@staff.eng');
    expect(fixture.nativeElement.querySelector('.shell__logout')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.shell__login')).toBeFalsy();
  });

  it('makes the username chip a link to the current user profile when an employee id is available', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');
    currentEmployeeId.set(42);

    // When
    fixture.detectChanges();

    // Then
    const chip = fixture.nativeElement.querySelector('.shell__user');
    expect(chip).toBeTruthy();
    expect(chip.tagName.toLowerCase()).toBe('a');
    expect(chip.getAttribute('href')).toBe('/employees/42/profile');
    expect(chip.getAttribute('aria-label')).toBe('View your profile');
  });

  it('renders the username as a static span when no employee id is available', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');
    currentEmployeeId.set(null);

    // When
    fixture.detectChanges();

    // Then
    const chip = fixture.nativeElement.querySelector('.shell__user');
    expect(chip).toBeTruthy();
    expect(chip.tagName.toLowerCase()).toBe('span');
  });

  it('calls logout when sign out is clicked', () => {
    // Given
    isAuthenticated.set(true);
    currentUser.set('jane@staff.eng');

    fixture.detectChanges();
    const logoutSpy = jest.spyOn(authMock, 'logout');

    // When
    fixture.nativeElement.querySelector('.shell__logout').click();

    // Then
    expect(logoutSpy).toHaveBeenCalled();
  });
});
