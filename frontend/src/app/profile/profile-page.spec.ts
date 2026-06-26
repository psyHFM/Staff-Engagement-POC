import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { ProfilePage } from './profile-page';
import { ProfileStateService } from './profile-state.service';
import { PersonProfile } from './profile.types';

@Component({ template: '', standalone: true })
class StubPage {}

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let router: Router;
  let fakeState: {
    profile: ReturnType<typeof signal<PersonProfile | null>>;
    error: ReturnType<typeof signal<{ message: string } | null>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<string | null>>;
    bearerToken: ReturnType<typeof signal<string | null>>;
    loadProfile: jest.Mock;
    updateEmployee: jest.Mock;
  };

  const id = (value: number): { value: number } => ({ value });

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
      {
        id: id(1),
        type: 'check-in',
        subject: id(7),
        facilitator: id(2),
        note: 'Great chat',
        createdAt: '2026-06-25T10:00:00Z'
      }
    ],
    tasks: [
      {
        id: '10',
        subjectId: '7',
        title: 'Read docs',
        description: 'Read design doc',
        completed: false,
        sourceInteractionId: '42',
        createdAt: '2026-06-25T10:00:00Z'
      }
    ],
    portfolio: {
      employeeId: '7',
      skills: [{ id: '1', skill: 'Angular', years: 4, projectCount: 3 }],
      education: [{ id: '1', institution: 'MIT', qualification: 'BSc', startYear: 2015, endYear: 2019 }],
      projects: [{ id: '1', name: 'Portal', description: 'Staff portal', startYear: 2024 }],
      links: [{ id: '1', label: 'GitHub', url: 'https://github.com/jane' }]
    },
    topSkills: [{ skill: 'Angular', years: 4, projectCount: 3 }],
    ...overrides
  });

  const jwt = (roles: string[]): string => {
    const payload = btoa(JSON.stringify({ roles }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `header.${payload}.signature`;
  };

  beforeEach(async () => {
    fakeState = {
      profile: signal<PersonProfile | null>(null),
      error: signal<{ message: string } | null>(null),
      isLoading: signal(false),
      currentUser: signal<string | null>(null),
      bearerToken: signal<string | null>(null),
      loadProfile: jest.fn(),
      updateEmployee: jest.fn().mockReturnValue(of({}))
    };

    await TestBed
      .configureTestingModule({
        imports: [ProfilePage],
        providers: [
          provideRouter([
            { path: 'employees', component: StubPage },
            { path: 'employees/:id/profile', component: StubPage }
          ]),
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { paramMap: { get: () => '7' } } }
          }
        ]
      })
      .overrideComponent(ProfilePage, {
        set: { providers: [{ provide: ProfileStateService, useValue: fakeState }] }
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProfilePage);
    router = TestBed.inject(Router);
  });

  it('loads the profile for the route id on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fakeState.loadProfile).toHaveBeenCalledWith('7');
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

  it('renders interactions, tasks and portfolio sections', () => {
    // Given
    fakeState.profile.set(personProfile());

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.textContent).toContain('Great chat');
    expect(fixture.nativeElement.textContent).toContain('Read docs');
    expect(fixture.nativeElement.textContent).toContain('Portal');
    expect(fixture.nativeElement.textContent).toContain('MIT');
  });

  it('shows an error banner when the profile cannot be loaded', () => {
    // Given
    fakeState.error.set({ message: 'Employee profile not found: 99' });

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.profile-page__error')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Employee profile not found: 99');
  });

  it('allows the owner to edit their profile', () => {
    // Given
    fakeState.profile.set(personProfile());
    fakeState.currentUser.set('jane@staff.eng');

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.componentInstance.canEdit()).toBe(true);
    expect(fixture.componentInstance.canEditRole()).toBe(false);
  });

  it('allows an admin to edit any profile and change role', () => {
    // Given
    fakeState.profile.set(personProfile({ employee: { ...personProfile().employee, email: 'bob@staff.eng' } }));
    fakeState.currentUser.set('admin@staff.eng');
    fakeState.bearerToken.set(jwt(['ADMIN']));

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.componentInstance.canEdit()).toBe(true);
    expect(fixture.componentInstance.canEditRole()).toBe(true);
  });

  it('forbids a non-admin from editing another profile', () => {
    // Given
    fakeState.profile.set(personProfile({ employee: { ...personProfile().employee, email: 'bob@staff.eng' } }));
    fakeState.currentUser.set('jane@staff.eng');
    fakeState.bearerToken.set(jwt(['EMPLOYEE']));

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.componentInstance.canEdit()).toBe(false);
    expect(fixture.componentInstance.canEditRole()).toBe(false);
  });

  it('updates the employee record and reloads the profile', () => {
    // Given
    fakeState.profile.set(personProfile());
    fakeState.updateEmployee.mockReturnValue(of({}));

    // When
    fixture.componentInstance.onUpdate({ fullName: 'Jane Smith', email: null });

    // Then
    expect(fakeState.updateEmployee).toHaveBeenCalledWith(id(7), { fullName: 'Jane Smith', email: null });
    expect(fakeState.loadProfile).toHaveBeenCalledWith('7');
  });

  it('navigates back to the directory when closed', () => {
    // Given
    const navigateSpy = jest.spyOn(router, 'navigate');

    // When
    fixture.componentInstance.onBack();

    // Then
    expect(navigateSpy).toHaveBeenCalledWith(['/employees']);
  });
});
