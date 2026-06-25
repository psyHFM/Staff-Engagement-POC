import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';

import { ApiClient, catchApiError } from '../shared/api/api-client';
import { ApiError } from '../shared/api/error-envelope';
import { AuthState } from '../shared/auth/auth-state';
import { StateService } from '../shared/state/state.service';
import { isAdminToken } from '../features/employee/jwt-claims';
import {
  CreateEmployeeRequest,
  EmployeeResponse,
  UpdateEmployeeRequest
} from '../features/employee/employee.types';

/**
 * State service for the "Your details" page (ATSE1-32).
 *
 * <p>Resolves the current user's Employee record by email, then exposes it
 * via {@link profile} for the {@code <app-employee-detail>} form. When the
 * current user has no record yet, {@link profile} is null and the page
 * shows the {@code <app-employee-create-form>} instead. Both branches
 * stay here in the service; the page only reads computed signals.
 */
@Injectable()
export class YourDetailsStateService extends StateService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthState);

  private readonly _profile = signal<EmployeeResponse | null>(null);
  private readonly _notFound = signal(false);
  private readonly _lastError = signal<ApiError | null>(null);

  /** The current user's Employee record, or null when no record exists yet. */
  readonly profile = computed(() => this._profile());

  /** True when the directory returned no match for the current subject (i.e. first-time user). */
  readonly notFound = computed(() => this._notFound());

  /** The most recent API error, or null. */
  readonly error = computed(() => this._lastError());

  /** Loading flag — inherited from the base {@link StateService}. */
  readonly isLoading = computed(() => this.loading());

  /** Best-effort admin flag from the JWT (UI affordance only — backend enforces RBAC). */
  readonly isAdmin = computed(() => isAdminToken(this.auth.bearerToken()));

  /**
   * Resolve the current user's Employee record by JWT subject (email).
   * Sets {@link profile} on success, {@link notFound} when the directory
   * has no match, and {@link error} on transport/server failure.
   */
  loadCurrent(): void {
    const subject = this.auth.currentUserSubject();
    if (!subject) {
      this._notFound.set(true);
      return;
    }
    this.beginLoad();
    this._lastError.set(null);
    this._notFound.set(false);
    // Page through the directory until we find the current subject, or
    // run out of pages. The seed data is small (<50 employees) so one
    // request is the common case; we use a guard-rail of 200 to be safe.
    this.api
      .get<{ content: EmployeeResponse[]; total: number }>('employees', { offset: 0, limit: 200 })
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad()),
        // The api-client returns Paged<T> in the real type; we accept
        // the loose shape here because the directory endpoint is the
        // only path that resolves by email today and adding a
        // `?email=` server-side filter is out of scope for this change.
        tap((page) => {
          const match = (page.content ?? []).find((e) => e.email === subject) ?? null;
          if (match) {
            this._profile.set(match);
          } else {
            this._notFound.set(true);
          }
        }),
        catchError((err: unknown) => {
          this._lastError.set(err as ApiError);
          return of(null);
        })
      )
      .subscribe();
  }

  /**
   * Self-service create — POST {@code /api/v1/employees}. The backend
   * binds the email to the principal, so the request does not carry one.
   */
  create(request: CreateEmployeeRequest): Observable<EmployeeResponse | null> {
    this.beginLoad();
    this._lastError.set(null);
    return this.api.post<EmployeeResponse>('employees', request).pipe(
      catchApiError(),
      finalize(() => this.endLoad()),
      tap({
        next: (created) => {
          this._profile.set(created);
          this._notFound.set(false);
        },
        error: (err: ApiError) => this._lastError.set(err)
      })
    );
  }

  /**
   * Save edits to the current user's own profile. Non-admins can update
   * their own record but cannot change their role — the backend enforces
   * that; the UI hides the role field for non-admins.
   */
  update(id: number, request: UpdateEmployeeRequest): Observable<EmployeeResponse | null> {
    this.beginLoad();
    this._lastError.set(null);
    return this.api.put<EmployeeResponse>(`employees/${id}`, request).pipe(
      catchApiError(),
      finalize(() => this.endLoad()),
      tap({
        next: (updated) => this._profile.set(updated),
        error: (err: ApiError) => this._lastError.set(err)
      })
    );
  }
}
