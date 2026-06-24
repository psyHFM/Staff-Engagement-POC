import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ApiClient } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { AuthState } from '../../shared/auth/auth-state';
import { EmployeeStateService } from './employee-state.service';
import {
  CreateEmployeeRequest,
  EmployeeId,
  EmployeeResponse,
  Paged,
  UpdateEmployeeRequest
} from './employee.types';

describe('EmployeeStateService', () => {
  let service: EmployeeStateService;
  let apiClientSpy: { get: jest.Mock; post: jest.Mock; put: jest.Mock };
  let currentUser: ReturnType<typeof signal<string | null>>;
  let token: ReturnType<typeof signal<string | null>>;

  const id = (value: number): EmployeeId => ({ value });

  const employee = (overrides: Partial<EmployeeResponse> = {}): EmployeeResponse => ({
    id: id(1),
    fullName: 'Jane Doe',
    email: 'jane@staff.eng',
    role: 'employee',
    jobTitle: 'Eng',
    department: 'Platform',
    level: 'senior',
    createdAt: '2026-06-24T10:00:00Z',
    updatedAt: '2026-06-24T10:00:00Z',
    ...overrides
  });

  const page = (overrides: Partial<Paged<EmployeeResponse>> = {}): Paged<EmployeeResponse> => ({
    content: [employee()],
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
        path: '/api/v1/employees'
      },
      status
    );

  /** Build a fake JWT whose payload carries the given role names (NAME form, as the backend does). */
  const jwt = (roles: string[]): string => {
    const payload = btoa(JSON.stringify({ roles }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return `header.${payload}.signature`;
  };

  beforeEach(() => {
    apiClientSpy = { get: jest.fn(), post: jest.fn(), put: jest.fn() };
    currentUser = signal(null);
    token = signal(null);

    TestBed.configureTestingModule({
      providers: [
        EmployeeStateService,
        { provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient },
        {
          provide: AuthState,
          useValue: { currentUser, bearerToken: () => token() } as unknown as AuthState
        }
      ]
    });

    service = TestBed.inject(EmployeeStateService);
  });

  it('loadDirectory fetches GET /api/v1/employees with offset/limit/sort and exposes the page', () => {
    // Given
    const expected = page();
    apiClientSpy.get.mockReturnValue(of(expected));

    // When
    service.loadDirectory(0, 20, 'fullName,asc');

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('employees', { offset: 0, limit: 20, sort: 'fullName,asc' });
    expect(service.employees()).toEqual(expected);
    expect(service.isLoading()).toBe(false);
  });

  it('loadDirectory omits the sort param when sort is null', () => {
    // Given
    apiClientSpy.get.mockReturnValue(of(page()));

    // When
    service.loadDirectory(0, 20, null);

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith('employees', { offset: 0, limit: 20 });
  });

  it('loadDirectory surfaces an API error and clears loading', () => {
    // Given
    apiClientSpy.get.mockReturnValue(throwError(() => apiError()));

    // When
    service.loadDirectory();

    // Then
    expect(service.employees()).toBeNull();
    expect(service.error()).toEqual(apiError());
    expect(service.isLoading()).toBe(false);
  });

  it('selectEmployee updates the selected employee and clears errors', () => {
    // Given
    service.selectEmployee(employee({ id: id(1) }));

    // When
    service.selectEmployee(employee({ id: id(2) }));

    // Then
    expect(service.selectedEmployee()?.id).toEqual(id(2));
    expect(service.error()).toBeNull();
  });

  it('createEmployee POSTs to /api/v1/employees with the create body and exposes created', () => {
    // Given
    const created = employee({ id: id(42) });
    apiClientSpy.post.mockReturnValue(of(created));

    // When
    service.createEmployee({ fullName: 'Jane Doe', jobTitle: 'Eng', department: 'Platform', level: 'senior' }).subscribe();

    // Then
    const expectedRequest: CreateEmployeeRequest = {
      fullName: 'Jane Doe',
      jobTitle: 'Eng',
      department: 'Platform',
      level: 'senior'
    };
    expect(apiClientSpy.post).toHaveBeenCalledWith('employees', expectedRequest);
    expect(service.created()).toEqual(created);
    expect(service.isLoading()).toBe(false);
  });

  it('createEmployee surfaces an API error and clears loading', () => {
    // Given
    apiClientSpy.post.mockReturnValue(throwError(() => apiError(409)));

    // When
    service.createEmployee({ fullName: 'Jane Doe' }).subscribe({ error: () => {} });

    // Then
    expect(service.created()).toBeNull();
    expect(service.error()).toEqual(apiError(409));
    expect(service.isLoading()).toBe(false);
  });

  it('updateEmployee PUTs to /api/v1/employees/{id} and selects the updated record', () => {
    // Given
    const updated = employee({ id: id(7), fullName: 'Jane Smith', role: 'admin' });
    apiClientSpy.put.mockReturnValue(of(updated));

    // When
    service.updateEmployee(id(7), { fullName: 'Jane Smith', role: 'admin', email: null }).subscribe();

    // Then
    const expectedRequest: UpdateEmployeeRequest = { fullName: 'Jane Smith', role: 'admin', email: null };
    expect(apiClientSpy.put).toHaveBeenCalledWith('employees/7', expectedRequest);
    expect(service.updated()).toEqual(updated);
    expect(service.selectedEmployee()).toEqual(updated);
  });

  it('updateEmployee surfaces an API error and clears loading', () => {
    // Given
    apiClientSpy.put.mockReturnValue(throwError(() => apiError(403)));

    // When
    service.updateEmployee(id(7), { fullName: 'X' }).subscribe({ error: () => {} });

    // Then
    expect(service.updated()).toBeNull();
    expect(service.error()).toEqual(apiError(403));
    expect(service.isLoading()).toBe(false);
  });

  it('isAdmin is true when the JWT roles claim includes ADMIN', () => {
    // Given
    token.set(jwt(['ADMIN']));

    // Then
    expect(service.isAdmin()).toBe(true);
  });

  it('isAdmin is false when the JWT roles claim is EMPLOYEE only', () => {
    // Given
    token.set(jwt(['EMPLOYEE']));

    // Then
    expect(service.isAdmin()).toBe(false);
  });

  it('isAdmin is false when there is no token', () => {
    // Then
    expect(service.isAdmin()).toBe(false);
  });

  it('currentEmail reflects the logged-in user from AuthState', () => {
    // Given
    currentUser.set('jane@staff.eng');

    // Then
    expect(service.currentEmail()).toBe('jane@staff.eng');
  });

  it('clearTransient resets created, updated and error signals', () => {
    // Given
    apiClientSpy.post.mockReturnValue(of(employee({ id: id(42) })));
    service.createEmployee({ fullName: 'Jane Doe' }).subscribe();
    expect(service.created()).not.toBeNull();

    // When
    service.clearTransient();

    // Then
    expect(service.created()).toBeNull();
    expect(service.updated()).toBeNull();
    expect(service.error()).toBeNull();
  });
});