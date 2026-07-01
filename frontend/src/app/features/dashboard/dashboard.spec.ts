import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { provideRouter, Routes } from '@angular/router';

import { Dashboard } from './dashboard';
import { ProfileStateService } from '../../profile/profile-state.service';
import { SkillsStateService } from '../skills/skills-state.service';
import { AuthState } from '../../shared/auth/auth-state';
import { PersonProfile } from '../../profile/profile.types';

@Component({ template: '', standalone: true })
class StubPage {}

const routes: Routes = [
  { path: 'tasks', component: StubPage },
  { path: 'interactions', component: StubPage },
  { path: 'skills', component: StubPage },
  { path: 'skills/:name', component: StubPage },
  { path: 'employees/:id/profile', component: StubPage },
  { path: 'profile', component: StubPage }
];

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;

  let fakeProfile: {
    profile: ReturnType<typeof signal<PersonProfile | null>>;
    error: ReturnType<typeof signal<unknown | null>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    loadProfile: jest.Mock;
  };
  let fakeSkills: {
    popular: ReturnType<typeof signal<unknown[] | null>>;
    error: ReturnType<typeof signal<unknown | null>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    loadPopular: jest.Mock;
  };
  let fakeAuth: {
    currentUser: ReturnType<typeof signal<string | null>>;
    currentEmployeeId: ReturnType<typeof signal<number | null>>;
  };

  const profileWith = (overrides: Partial<PersonProfile> = {}): PersonProfile => ({
    employee: { id: { value: 7 }, fullName: 'Jane Doe', email: 'jane@staff.eng', role: 'employee' },
    interactions: [],
    tasks: [],
    portfolio: { employeeId: '7', skills: [], education: [], projects: [], links: [] },
    topSkills: [],
    ...overrides
  });

  const task = (id: number, completed: boolean) => ({
    id: { value: id }, subject: { value: 7 }, title: `Task ${id}`, description: '', completed, createdAt: '2026-06-25T10:00:00Z'
  });

  beforeEach(async () => {
    fakeProfile = {
      profile: signal<PersonProfile | null>(null),
      error: signal<unknown | null>(null),
      isLoading: signal(false),
      loadProfile: jest.fn()
    };
    fakeSkills = {
      popular: signal<unknown[] | null>([]),
      error: signal<unknown | null>(null),
      isLoading: signal(false),
      loadPopular: jest.fn()
    };
    fakeAuth = {
      currentUser: signal<string | null>('jane@staff.eng'),
      currentEmployeeId: signal<number | null>(7)
    };

    await TestBed
      .configureTestingModule({
        imports: [Dashboard],
        providers: [provideRouter(routes), { provide: AuthState, useValue: fakeAuth }]
      })
      .overrideComponent(Dashboard, {
        set: {
          providers: [
            { provide: ProfileStateService, useValue: fakeProfile },
            { provide: SkillsStateService, useValue: fakeSkills }
          ]
        }
      })
      .compileComponents();

    fixture = TestBed.createComponent(Dashboard);
  });

  it('loads the profile and popular skills on init', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fakeProfile.loadProfile).toHaveBeenCalledWith('7');
    expect(fakeSkills.loadPopular).toHaveBeenCalled();
  });

  it('greets the user by first name derived from the JWT username', () => {
    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.page-title').textContent).toContain('Good morning, Jane');
  });

  it('shows the open-task count and list, excluding completed tasks', () => {
    // Given
    fakeProfile.profile.set(profileWith({ tasks: [task(1, false), task(2, true), task(3, false)] }));

    // When
    fixture.detectChanges();

    // Then
    const card = fixture.nativeElement.querySelector('.dash-card');
    expect(card.querySelector('.dash-card__count').textContent).toContain('2 open');
    expect(fixture.nativeElement.textContent).toContain('Task 1');
    expect(fixture.nativeElement.textContent).not.toContain('Task 2');
  });

  it('shows the loading state on the tasks card while the profile loads', () => {
    // Given
    fakeProfile.isLoading.set(true);

    // When
    fixture.detectChanges();

    // Then
    expect(fixture.nativeElement.querySelector('.ds--loading')).toBeTruthy();
  });

  it('shows an error+retry state and reloads the profile on retry', () => {
    // Given
    fakeProfile.error.set({ message: 'boom' });

    // When
    fixture.detectChanges();

    // Then
    const retry = fixture.nativeElement.querySelector('.ds--error .ds__retry') as HTMLButtonElement;
    expect(retry).toBeTruthy();

    // When — clicking retry (loadProfile already called once on init)
    fakeProfile.loadProfile.mockClear();
    retry.click();

    // Then
    expect(fakeProfile.loadProfile).toHaveBeenCalledWith('7');
  });

  it('deep-links "Edit my portfolio" to the user own profile', () => {
    // When
    fixture.detectChanges();

    // Then
    const link = Array.from(fixture.nativeElement.querySelectorAll('.dash-actions a'))
      .find((a) => (a as HTMLElement).textContent?.includes('Edit my portfolio')) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/employees/7/profile');
  });
});
