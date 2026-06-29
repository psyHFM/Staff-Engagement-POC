import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiClient } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { SkillsStateService } from './skills-state.service';
import { Paged, SkillStrength, SkillSummary } from './skills.types';

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
    sessionStorage.clear();
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
    expect(service.popular()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  // ---- ATSE1-40 popular skills ----

  const summary = (overrides: Partial<SkillSummary> = {}): SkillSummary => ({
    skill: 'Angular',
    employeeCount: 3,
    topHolder: strength({ employeeName: 'Alice', years: 5 }),
    ...overrides
  });

  it('loadPopular fetches GET /api/v1/skills/popular with limit=20 by default and exposes the list', () => {
    // Given
    const summaries = [summary(), summary({ skill: 'React', employeeCount: 2 })];
    apiClientSpy.get.mockReturnValue(of(summaries));

    // When
    service.loadPopular();

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills/popular', { limit: 20 });
    expect(service.popular()).toEqual(summaries);
    expect(service.error()).toBeNull();
    expect(service.isLoading()).toBe(false);
  });

  it('loadPopular forwards an explicit limit to the API', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of([]));

    // When
    service.loadPopular(50);

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills/popular', { limit: 50 });
  });

  it('loadPopular surfaces API errors and clears previous popular data', () => {
    // Given
    apiClientSpy.get
      .mockReturnValueOnce(of([summary()]))
      .mockReturnValueOnce(throwError(() => apiError(503)));
    service.loadPopular();
    expect(service.popular()).not.toBeNull();

    // When
    service.loadPopular();

    // Then
    expect(service.popular()).toBeNull();
    expect(service.error()).toEqual(apiError(503));
    expect(service.isLoading()).toBe(false);
  });

  // ---- ATSE1-43 sort option persistence ----

  it('defaults sortOption to "default" and omits sort from the API call', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));

    // When
    service.search('Angular');

    // Then
    expect(service.sortOption()).toBe('default');
    expect(service.sortParam()).toBeUndefined();
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', { name: 'Angular' });
  });

  it('setSortOption persists to sessionStorage and updates sortParam', () => {
    // When
    service.setSortOption('name-asc');

    // Then
    expect(service.sortOption()).toBe('name-asc');
    expect(service.sortParam()).toBe('name,asc');
    expect(sessionStorage.getItem('skills.sortOption')).toBe('name-asc');
  });

  it('search forwards the current sortParam when no explicit sort is provided', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));
    service.setSortOption('years-desc');

    // When
    service.search('Angular');

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', {
      name: 'Angular',
      sort: 'years,desc'
    });
  });

  it('an explicit sort option on search() takes precedence over the persisted sortOption', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));
    service.setSortOption('name-desc');

    // When
    service.search('Java', { sort: 'projectCount,asc' });

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('skills', {
      name: 'Java',
      sort: 'projectCount,asc'
    });
  });

  it('restores the sort option from sessionStorage on construction', () => {
    // Given
    sessionStorage.setItem('skills.sortOption', 'projects-desc');

    // When — re-inject the service in a fresh TestBed so it reads the persisted value
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SkillsStateService,
        { provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient }
      ]
    });
    const restored = TestBed.inject(SkillsStateService);

    // Then
    expect(restored.sortOption()).toBe('projects-desc');
    expect(restored.sortParam()).toBe('projectCount,desc');
  });

  it('setSortOption ignores unknown values without persisting', () => {
    // When
    service.setSortOption('bogus' as never);

    // Then
    expect(service.sortOption()).toBe('default');
    expect(sessionStorage.getItem('skills.sortOption')).toBeNull();
  });
});
