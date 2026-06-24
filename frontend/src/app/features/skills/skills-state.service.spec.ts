import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiClient } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { SkillsStateService } from './skills-state.service';
import { Paged, SkillStrength } from './skills.types';

describe('SkillsStateService', () => {
  let service: SkillsStateService;
  let apiClientSpy: { get: jest.Mock };

  const strength = (overrides: Partial<SkillStrength> = {}): SkillStrength => ({
    employeeId: { value: 1 },
    employeeName: 'Admin User',
    skill: 'Angular',
    years: 5,
    projectCount: 3,
    ...overrides
  });

  const page = (overrides: Partial<Paged<SkillStrength>> = {}): Paged<SkillStrength> => ({
    content: [strength()],
    offset: 0,
    limit: 20,
    total: 1,
    ...overrides
  });

  const apiError = (status = 500): ApiError =>
    new ApiError(
      {
        timestamp: new Date().toISOString(),
        status,
        error: 'Internal Server Error',
        message: 'boom',
        path: '/api/v1/skills'
      },
      status
    );

  beforeEach(() => {
    apiClientSpy = { get: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        SkillsStateService,
        { provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient }
      ]
    });

    service = TestBed.inject(SkillsStateService);
  });

  it('starts with empty default state', () => {
    // Then
    expect(service.query()).toBe('');
    expect(service.results()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('search fetches GET /api/v1/skills with the skill name and exposes the page', () => {
    // Given
    const expected = page();
    apiClientSpy.get.mockReturnValue(of(expected));

    // When
    service.search('Angular');

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', { name: 'Angular' });
    expect(service.query()).toBe('Angular');
    expect(service.results()).toEqual(expected);
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('search sets loading true while the request is in flight', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));

    // When
    service.search('Angular');

    // Then
    expect(service.isLoading()).toBe(false);
  });

  it('search with blank name clears results and does not call the API', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));
    service.search('Angular');
    expect(service.results()).not.toBeNull();

    // When
    service.search('');

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledTimes(1);
    expect(service.query()).toBe('');
    expect(service.results()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('search with whitespace-only name is treated as blank', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));

    // When
    service.search('   ');

    // Then
    expect(apiClientSpy.get).not.toHaveBeenCalled();
    expect(service.results()).toBeNull();
    expect(service.error()).toBeNull();
  });

  it('search passes options through to the API', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));

    // When
    service.search('Java', { minYears: 3, sort: 'projectCount,asc', offset: 10, limit: 5 });

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', {
      name: 'Java',
      minYears: 3,
      sort: 'projectCount,asc',
      offset: 10,
      limit: 5
    });
  });

  it('search ignores blank sort option', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));

    // When
    service.search('Java', { sort: '   ' });

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', { name: 'Java' });
  });

  it('search surfaces an API error and clears results and loading', () => {
    // Given
    apiClientSpy.get.mockReturnValue(throwError(() => apiError()));

    // When
    service.search('Angular');

    // Then
    expect(service.results()).toBeNull();
    expect(service.error()).toEqual(apiError());
    expect(service.isLoading()).toBe(false);
  });

  it('search clears a previous error before a new search', () => {
    // Given
    apiClientSpy.get
      .mockReturnValueOnce(throwError(() => apiError(500)))
      .mockReturnValueOnce(of(page()));

    service.search('Angular');
    expect(service.error()).not.toBeNull();

    // When
    service.search('React');

    // Then
    expect(service.error()).toBeNull();
    expect(service.results()).toEqual(page());
  });

  it('clear resets all feature state', () => {
    // Given
    apiClientSpy.get.mockReturnValue(throwError(() => apiError()));
    service.search('Angular');
    expect(service.error()).not.toBeNull();

    // When
    service.clear();

    // Then
    expect(service.query()).toBe('');
    expect(service.results()).toBeNull();
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });
});
