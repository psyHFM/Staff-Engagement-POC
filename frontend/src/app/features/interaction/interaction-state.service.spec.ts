import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ApiClient } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { AuthState } from '../../shared/auth/auth-state';
import { InteractionStateService } from './interaction-state.service';
import {
  CreateInteractionRequest,
  EmployeeId,
  InteractionSummary,
  Paged
} from './interaction.types';

describe('InteractionStateService', () => {
  let service: InteractionStateService;
  let apiClientSpy: { get: jest.Mock; post: jest.Mock };
  let authStateMock: { currentUser: ReturnType<typeof signal<string | null>> };

  const employee = (value: number): EmployeeId => ({ value });

  const interaction = (overrides: Partial<InteractionSummary> = {}): InteractionSummary => ({
    id: { value: 1 },
    type: 'check-in',
    subject: employee(1),
    facilitator: employee(2),
    note: 'Note',
    ...overrides
  });

  const page = (overrides: Partial<Paged<InteractionSummary>> = {}): Paged<InteractionSummary> => ({
    content: [interaction()],
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
        path: '/api/v1/interactions'
      },
      status
    );

  beforeEach(() => {
    apiClientSpy = { get: jest.fn(), post: jest.fn() };
    authStateMock = { currentUser: signal(null) };

    TestBed.configureTestingModule({
      providers: [
        InteractionStateService,
        { provide: ApiClient, useValue: apiClientSpy as unknown as ApiClient },
        { provide: AuthState, useValue: authStateMock }
      ]
    });

    service = TestBed.inject(InteractionStateService);
  });

  it('exposes the stub employee list as subjects', () => {
    // Then
    expect(service.subjects()).toHaveLength(3);
    expect(service.subjects()[0].fullName).toBe('Admin User');
  });

  it('selectSubject updates the selected subject and clears errors', () => {
    // Given
    service.selectSubject(employee(1));

    // When
    service.selectSubject(employee(2));

    // Then
    expect(service.subject()).toEqual(employee(2));
    expect(service.error()).toBeNull();
  });

  it('loadHistory fetches GET /api/v1/employees/{id}/interactions and exposes the page', () => {
    // Given
    const expected = page();
    apiClientSpy.get.mockReturnValue(of(expected));
    service.selectSubject(employee(1));

    // When
    service.loadHistory();

    // Then
    expect(apiClientSpy.get).toHaveBeenCalledWith(
      'employees/1/interactions',
      { offset: 0, limit: 20, sort: 'createdAt,desc' }
    );
    expect(service.history()).toEqual(expected);
    expect(service.isLoading()).toBe(false);
  });

  it('loadHistory does nothing when no subject is selected', () => {
    // When
    service.loadHistory();

    // Then
    expect(apiClientSpy.get).not.toHaveBeenCalled();
  });

  it('loadHistory surfaces an API error and clears loading', () => {
    // Given
    apiClientSpy.get.mockReturnValue(throwError(() => apiError()));
    service.selectSubject(employee(1));

    // When
    service.loadHistory();

    // Then
    expect(service.history()).toBeNull();
    expect(service.error()).toEqual(apiError());
    expect(service.isLoading()).toBe(false);
  });

  it('createInteraction POSTs to /api/v1/interactions and updates created', () => {
    // Given
    const created = interaction({ id: { value: 99 } });
    apiClientSpy.post.mockReturnValue(of(created));
    service.selectSubject(employee(1));

    // When
    service.createInteraction('mentoring', employee(1), employee(2), 'Mentoring note').subscribe();

    // Then
    const expectedRequest: CreateInteractionRequest = {
      type: 'mentoring',
      subject: employee(1),
      facilitator: employee(2),
      note: 'Mentoring note'
    };
    expect(apiClientSpy.post).toHaveBeenCalledWith('interactions', expectedRequest);
    expect(service.created()).toEqual(created);
  });

  it('createInteraction refreshes history when the created subject matches the selected subject', () => {
    // Given
    const created = interaction({ id: { value: 99 } });
    apiClientSpy.post.mockReturnValue(of(created));
    apiClientSpy.get.mockReturnValue(of(page()));
    service.selectSubject(employee(1));

    // When
    service.createInteraction('check-in', employee(1), employee(2), 'Note').subscribe();

    // Then
    expect(apiClientSpy.get).toHaveBeenCalled();
  });

  it('createInteraction does not refresh history when the created subject differs from the selected subject', () => {
    // Given
    const created = interaction({ id: { value: 99 }, subject: employee(2) });
    apiClientSpy.post.mockReturnValue(of(created));
    service.selectSubject(employee(1));

    // When
    service.createInteraction('check-in', employee(2), employee(2), 'Note').subscribe();

    // Then
    expect(apiClientSpy.get).not.toHaveBeenCalled();
  });

  it('createInteraction surfaces an API error and clears loading', () => {
    // Given
    apiClientSpy.post.mockReturnValue(throwError(() => apiError(400)));

    // When
    service.createInteraction('check-in', employee(1), employee(2), 'Note').subscribe({ error: () => {} });

    // Then
    expect(service.created()).toBeNull();
    expect(service.error()).toEqual(apiError(400));
    expect(service.isLoading()).toBe(false);
  });

  it('defaultFacilitator maps admin@staff.eng to employee id 1', () => {
    // Given
    authStateMock.currentUser.set('admin@staff.eng');

    // Then
    expect(service.defaultFacilitator()).toEqual(employee(1));
  });

  it('defaultFacilitator maps employee@staff.eng to employee id 2', () => {
    // Given
    authStateMock.currentUser.set('employee@staff.eng');

    // Then
    expect(service.defaultFacilitator()).toEqual(employee(2));
  });

  it('defaultFacilitator falls back to employee id 2 for unknown users', () => {
    // Given
    authStateMock.currentUser.set('unknown@staff.eng');

    // Then
    expect(service.defaultFacilitator()).toEqual(employee(2));
  });

  it('clearTransient resets created and error signals', () => {
    // Given
    apiClientSpy.post.mockReturnValue(of(interaction()));
    service.createInteraction('check-in', employee(1), employee(2), 'Note').subscribe();
    expect(service.created()).not.toBeNull();

    // When
    service.clearTransient();

    // Then
    expect(service.created()).toBeNull();
    expect(service.error()).toBeNull();
  });
});
