import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { ProfilePage } from './profile-page';
import { ProfileStateService } from './profile-state.service';
import { PortfolioStateService } from '../features/portfolio/portfolio-state.service';
import { AuthState } from '../shared/auth/auth-state';
import { PersonProfile } from './profile.types';
import { Portfolio } from '../features/portfolio/portfolio.model';
import { ApiError, ErrorEnvelope } from '../shared/api/error-envelope';

@Component({ template: '', standalone: true })
class StubPage {}

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let router: Router;
  let routeId: string | null;

  let fakeState: {
    profile: ReturnType<typeof signal<PersonProfile | null>>;
    error: ReturnType<typeof signal<{ message: string } | null>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<string | null>>;
    bearerToken: ReturnType<typeof signal<string | null>>;
    loadProfile: jest.Mock;
    updateEmployee: jest.Mock;
  };

  let fakePortfolio: {
    portfolio: ReturnType<typeof signal<Portfolio | null>>;
    loading: ReturnType<typeof signal<boolean>>;
    loadPortfolio: jest.Mock;
    addSkill: jest.Mock;
    removeSkill: jest.Mock;
  };

  let fakeAuth: {
    currentUser: ReturnType<typeof signal<string | null>>;
    bearerToken: ReturnType<typeof signal<string | null>>;
    currentEmployeeId: ReturnType<typeof signal<number | null>>;
  };

  const id = (value: number): { value: number } => ({ value });

  const portfolioModel = (): Portfolio => ({
    employeeId: '7',
    ownerEmail: 'jane@staff.eng',
    skills: [{ id: '1', skill: 'Angular', years: 4, projectCount: 3 }],
    education: [{ id: '1', institution: 'MIT', qualification: 'BSc', startYear: 2015, endYear: 2019 }],
    projects: [{ id: '1', name: 'Portal', description: 'Staff portal', startYear: 2024 }],
    links: [{ id: '1', label: 'GitHub', url: 'https://github.com/jane' }]
  });

  const personProfile = (overrides: Partial<PersonProfile> = {}): PersonProfile => ({
    employee: {
      id: id(7),
      fullName: 'Jane Doe',
      email: 'jane@staff.eng',
      role: 'employee',
      jobTitle: 'Engineer',
      department: 'Platform',
      level: 'senior'
    },
    interactions: [
      { id: id(1), type: 'check-in', subject: id(7), facilitator: id(2), facilitatorName: 'Bob', note: 'Great chat', createdAt: '2026-06-25T10:00:00Z' }
    ],
    tasks: [
      { id: id(10), subject: id(7), title: 'Read docs', description: 'Read design doc', completed: false, createdAt: '2026-06-25T10:00:00Z' }
    ],
    portfolio: portfolioModel(),
    topSkills: [{ skill: 'Angular', years: 4, projectCount: 3 }],
    ...overrides
  });

  const jwt = (roles: string[]): string => {
    const payload = btoa(JSON.stringify({ roles })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `header.${payload}.signature`;
  };

  beforeEach(async () => {
    routeId = '7';

    fakeState = {
      profile: signal<PersonProfile | null>(null),
      error: signal<{ message: string } | null>(null),
      isLoading: signal(false),
      currentUser: signal<string | null>(null),
      bearerToken: signal<string | null>(null),
      loadProfile: jest.fn(),
      updateEmployee: jest.fn().mockReturnValue(of({}))
    };

    fakePortfolio = {
      portfolio: signal<Portfolio | null>(null),
      loading: signal(false),
      loadPortfolio: jest.fn(),
      addSkill: jest.fn(),
      removeSkill: jest.fn()
    };

    fakeAuth = {
      currentUser: signal<string | null>(null),
      bearerToken: signal<string | null>(null),
      currentEmployeeId: signal<number | null>(null)
    };

    await TestBed
      .configureTestingModule({
        imports: [ProfilePage],
        providers: [
          provideRouter([
            { path: 'employees', component: StubPage },
            { path: 'employees/:id/profile', component: StubPage }
          ]),
          { provide: PortfolioStateService, useValue: fakePortfolio },
          { provide: AuthState, useValue: fakeAuth },
          { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => routeId } } } }
        ]
      })
      .overrideComponent(ProfilePage, {
        set: { providers: [{ provide: ProfileStateService, useValue: fakeState }] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    router = TestBed.inject(Router);
  });

  it('loads the rounded profile and the portfolio for the route id on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fakeState.loadProfile).toHaveBeenCalledWith('7');
    expect(fakePortfolio.loadPortfolio).toHaveBeenCalledWith('7');
  });

  it('resolves the current user id on the self-service /profile route (no route id)', () => {
    // Given — no :id in the route, current user is employee 5
    routeId = null;
    fakeAuth.currentEmployeeId.set(5);

    // When
    fixture.detectChanges();

    // Then
    expect(fakeState.loadProfile).toHaveBeenCalledWith('5');
    expect(fakePortfolio.loadPortfolio).toHaveBeenCalledWith('5');
  });

  it('renders the employee detail section', () => {
    // Given
    fakeState.profile.set(personProfile());

    // When
    fixture.detectChanges();

    // Then
    const detail = fixture.nativeElement.querySelector('.employee-detail');
    expect(detail).toBeTruthy();
    expect(detail.textContent).toContain('Jane Doe');
    expect(detail.textContent).toContain('jane@staff.eng');
  });

  it('renders interactions, tasks and the portfolio editor sections', () => {
    // Given
    fakeState.profile.set(personProfile());
    fakePortfolio.portfolio.set(portfolioModel());

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.textContent).toContain('Great chat');
    expect(fixture.nativeElement.textContent).toContain('Read docs');
    expect(fixture.nativeElement.querySelector('app-portfolio-editor')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Portal');
    expect(fixture.nativeElement.textContent).toContain('MIT');
  });

  it('defaults to view mode: the identity edit form is hidden even for the owner', () => {
    // Given — owner viewing their own profile
    fakeState.profile.set(personProfile());
    fakeState.currentUser.set('jane@staff.eng');

    // When
    fixture.detectChanges();

    // Then — Edit button present, but no form yet
    expect(fixture.componentInstance.canEdit()).toBe(true);
    expect(fixture.nativeElement.querySelector('.employee-detail__form')).toBeFalsy();
  });

  it('reveals the identity form and editable portfolio when Edit profile is clicked', () => {
    // Given — owner viewing their own profile (auth drives the editor RBAC backstop)
    fakeState.profile.set(personProfile());
    fakeState.currentUser.set('jane@staff.eng');
    fakeAuth.currentUser.set('jane@staff.eng');
    fakePortfolio.portfolio.set(portfolioModel());
    fixture.detectChanges();

    // When
    const editBtn = Array.from(fixture.nativeElement.querySelectorAll('.profile-page__actions button'))
      .find((b) => (b as HTMLElement).textContent?.includes('Edit profile')) as HTMLButtonElement;
    editBtn.click();
    fixture.detectChanges();

    // Then — form appears and the portfolio editor shows an add-skill affordance
    expect(fixture.nativeElement.querySelector('.employee-detail__form')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.pe__form')).toBeTruthy();
  });

  it('does not show the Edit button to a non-owner, non-admin viewer', () => {
    // Given
    fakeState.profile.set(personProfile({ employee: { ...personProfile().employee, email: 'bob@staff.eng' } }));
    fakeState.currentUser.set('jane@staff.eng');
    fakeState.bearerToken.set(jwt(['EMPLOYEE']));

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.componentInstance.canEdit()).toBe(false);
    expect(fixture.nativeElement.querySelector('.profile-page__actions')).toBeFalsy();
  });

  it('shows an error banner when the profile cannot be loaded', () => {
    // Given
    const errorEnvelope: ErrorEnvelope = {
      timestamp: '2026-06-30T10:00:00Z',
      status: 404,
      error: 'Not Found',
      message: 'Employee profile not found: 99',
      path: '/api/v1/employees/99/profile'
    };
    fakeState.error.set(new ApiError(errorEnvelope, 404));

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.profile-page__not-found')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Employee Not Found');
  });

  it('allows the owner to edit their profile', () => {
    fakeState.profile.set(personProfile());
    fakeState.currentUser.set('jane@staff.eng');
    fixture.detectChanges();
    expect(fixture.componentInstance.canEdit()).toBe(true);
    expect(fixture.componentInstance.canEditRole()).toBe(false);
  });

  it('allows an admin to edit any profile and change role', () => {
    fakeState.profile.set(personProfile({ employee: { ...personProfile().employee, email: 'bob@staff.eng' } }));
    fakeState.currentUser.set('admin@staff.eng');
    fakeState.bearerToken.set(jwt(['ADMIN']));
    fixture.detectChanges();
    expect(fixture.componentInstance.canEdit()).toBe(true);
    expect(fixture.componentInstance.canEditRole()).toBe(true);
  });

  it('updates the employee record, reloads the profile and returns to view mode', () => {
    // Given
    fakeState.profile.set(personProfile());
    fakeState.updateEmployee.mockReturnValue(of({}));
    fixture.detectChanges();

    // When
    fixture.componentInstance['onUpdate']({ fullName: 'Jane Smith', email: null });

    // Then
    expect(fakeState.updateEmployee).toHaveBeenCalledWith(id(7), { fullName: 'Jane Smith', email: null });
    expect(fakeState.loadProfile).toHaveBeenCalledWith('7');
  });

  it('navigates back to the directory when closed', () => {
    const navigateSpy = jest.spyOn(router, 'navigate');
    fixture.componentInstance['onBack']();
    expect(navigateSpy).toHaveBeenCalledWith(['/employees']);
  });
});
