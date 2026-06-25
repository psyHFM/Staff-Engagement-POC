import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';

import { ProfilePage } from './profile-page';
import { ProfileStateService } from './profile-state.service';
import { PersonProfile } from './profile.types';

describe('ProfilePage', () => {
  let fixture: ComponentFixture<ProfilePage>;
  let fakeState: {
    profile: ReturnType<typeof signal<PersonProfile | null>>;
    error: ReturnType<typeof signal<{ message: string } | null>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    loadProfile: jest.Mock;
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

  beforeEach(async () => {
    fakeState = {
      profile: signal<PersonProfile | null>(null),
      error: signal<{ message: string } | null>(null),
      isLoading: signal(false),
      loadProfile: jest.fn()
    };

    await TestBed
      .configureTestingModule({
        imports: [ProfilePage],
        providers: [
          provideRouter([]),
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
  });

  it('loads the profile for the route id on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fakeState.loadProfile).toHaveBeenCalledWith('7');
  });

  it('renders the employee header', () => {
    // Given
    fakeState.profile.set(personProfile());

    // When
    fixture.detectChanges();

    // Then
    const header = fixture.nativeElement.querySelector('.profile-header');
    expect(header.textContent).toContain('Jane Doe');
    expect(header.textContent).toContain('jane@staff.eng');
    expect(header.textContent).toContain('Engineer');
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
});
