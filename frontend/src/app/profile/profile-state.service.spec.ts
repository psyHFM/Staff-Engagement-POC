import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiClient } from '../shared/api/api-client';
import { ApiError } from '../shared/api/error-envelope';
import { ProfileStateService } from './profile-state.service';
import { PersonProfile } from './profile.types';

describe('ProfileStateService', () => {
  let service: ProfileStateService;
  let apiClientSpy: { get: jest.Mock };

  const profile = (overrides: Partial<PersonProfile> = {}): PersonProfile => ({
    employee: {
      id: { value: 7 },
      fullName: 'Jane Doe',
      email: 'jane@staff.eng',
      role: 'employee',
      jobTitle: 'Engineer',
      department: 'Platform',
      level: 'senior'
    },
    interactions: [],
    tasks: [],
    portfolio: { employeeId: '7', skills: [], education: [], projects: [], links: [] },
    topSkills: [],
    ...overrides
  });

  const apiError = (status = 500): ApiError =>
    new ApiError(
      {
        timestamp: new Date().toISOString(),
        status,
        error: 'Not Found',
        message: 'Employee profile not found: 99',
        path: '/api/v1/employees/99/profile'
      },
      status
    );

  beforeEach(() => {
    apiClientSpy = { get: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        ProfileStateService,
        { provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient }
      ]
    });

    service = TestBed.inject(ProfileStateService);
  });

  it('starts with empty default state', () => {
    expect(service.profile()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('loadProfile fetches GET /api/v1/employees/{id}/profile and exposes the profile', () => {
    // Given
    const expected = profile();
    apiClientSpy.get.mockReturnValue(of(expected));

    // When
    service.loadProfile(7);

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('employees/7/profile');
    expect(service.profile()).toEqual(expected);
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('loadProfile accepts a string id', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(profile()));

    // When
    service.loadProfile('42');

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('employees/42/profile');
  });

  it('loadProfile surfaces an API error and clears loading', () => {
    // Given
    apiClientSpy.get.mockReturnValue(throwError(() => apiError(404)));

    // When
    service.loadProfile(99);

    // Then
    expect(service.profile()).toBeNull();
    expect(service.error()).toEqual(apiError(404));
    expect(service.isLoading()).toBe(false);
  });

  it('clear resets profile, error and loading state', () => {
    // Given
    apiClientSpy.get.mockReturnValue(throwError(() => apiError()));
    service.loadProfile(99);
    expect(service.error()).not.toBeNull();

    // When
    service.clear();

    // Then
    expect(service.profile()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });
});
