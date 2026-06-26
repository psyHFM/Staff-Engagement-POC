import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

import { ApiClient, catchApiError } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { AuthState } from '../../shared/auth/auth-state';
import { StateService } from '../../shared/state/state.service';
import { isAdminToken } from './jwt-claims';
import {
  CreateEmployeeRequest,
  EmployeeId,
  EmployeeResponse,
  Paged,
  UpdateEmployeeRequest
} from './employee.types';

/**
 * Component-scoped state service for the Employee feature (frontend-state.yaml).
 *
 * <p>Holds the paginated directory and the last created/updated records as
 * Signals. All side effects (API calls) live here; components call handler
 * methods and read computed Signals.
 *
 * <p>The three backend endpoints exercised by the frontend are POST/GET/PUT
 * {@code /api/v1/employees}. Profile details are viewed on the dedicated
 * profile page, so the directory list is read-only here. RBAC is enforced by
 * the backend; this service exposes a best-effort {@link isAdmin} computed
 * (decoded from the JWT) and {@link currentEmail} (the logged-in user's identity
 * key) so the "Your details" section can gate its edit affordances.
 */
@Injectable()
export class EmployeeStateService extends StateService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthState);

  private readonly directory = signal<Paged<EmployeeResponse> | null>(null);
  private readonly lastCreated = signal<EmployeeResponse | null>(null);
  private readonly lastUpdated = signal<EmployeeResponse | null>(null);
  private readonly lastError = signal<ApiError | null>(null);

  readonly employees = computed(() => this.directory());
  readonly created = computed(() => this.lastCreated());
  readonly updated = computed(() => this.lastUpdated());
  readonly error = computed(() => this.lastError());
  readonly isLoading = computed(() => this.loading());

  /** The logged-in user's email — the identity key used for the owner check. */
  readonly currentEmail = computed(() => this.auth.currentUser());

  /** Best-effort admin flag from the JWT {@code roles} claim (UX gating only). */
  readonly isAdmin = computed(() => isAdminToken(this.auth.bearerToken()));

  /** Load the paginated directory. {@code sort=null} sends no sort param (backend defaults to {@code createdAt,desc}). */
  loadDirectory(offset = 0, limit = 20, sort: string | null = 'createdAt,desc'): void {
    this.beginLoad();
    this.lastError.set(null);
    const params: Record<string, string | number> = { offset, limit };
    if (sort) {
      params['sort'] = sort;
    }
    this.api
      .get<Paged<EmployeeResponse>>('employees', params)
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad()),
        tap({
          next: (page) => this.directory.set(page),
          error: (err: ApiError) => this.lastError.set(err)
        })
      )
      .subscribe();
  }

  /** POST a new employee (self-service; email/role are not part of the request). */
  createEmployee(request: CreateEmployeeRequest): Observable<EmployeeResponse> {
    this.beginLoad();
    this.lastError.set(null);
    return this.api.post<EmployeeResponse>('employees', request).pipe(
      catchApiError(),
      finalize(() => this.endLoad()),
      tap({
        next: (created) => this.lastCreated.set(created),
        error: (err: ApiError) => this.lastError.set(err)
      })
    );
  }

  /** PUT an employee update (owner-or-admin; role change admin-only — enforced by the backend). */
  updateEmployee(id: EmployeeId, request: UpdateEmployeeRequest): Observable<EmployeeResponse> {
    this.beginLoad();
    this.lastError.set(null);
    return this.api.put<EmployeeResponse>(`employees/${id.value}`, request).pipe(
      catchApiError(),
      finalize(() => this.endLoad()),
      tap({
        next: (updated) => {
          this.lastUpdated.set(updated);
        },
        error: (err: ApiError) => this.lastError.set(err)
      })
    );
  }

  /** Clear transient error/created/updated state (e.g. when the user dismisses a banner). */
  clearTransient(): void {
    this.lastError.set(null);
    this.lastCreated.set(null);
    this.lastUpdated.set(null);
  }
}