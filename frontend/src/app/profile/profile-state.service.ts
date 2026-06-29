import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize, Observable, tap } from 'rxjs';

import { ApiClient, catchApiError } from '../shared/api/api-client';
import { ApiError } from '../shared/api/error-envelope';
import { AuthState } from '../shared/auth/auth-state';
import { StateService } from '../shared/state/state.service';
import { EmployeeId, EmployeeResponse, UpdateEmployeeRequest } from '../features/employee/employee.types';
import { PersonProfile } from './profile.types';

/**
 * Profile page state (frontend-state.yaml).
 *
 * <p>Holds the rounded profile, any load error, and the loading flag. All side
 * effects (the GET to {@code /api/v1/employees/{id}/profile}) live here; the page
 * calls {@link loadProfile} and reads the computed read models.
 */
@Injectable()
export class ProfileStateService extends StateService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthState);

  private readonly _profile = signal<PersonProfile | null>(null);
  private readonly _error = signal<ApiError | null>(null);

  /** The loaded profile, or null before the first successful load. */
  readonly profile = computed(() => this._profile());

  /** The last API error, or null when no error is present. */
  readonly error = computed(() => this._error());

  /** True while the profile is loading. */
  readonly isLoading = computed(() => this.loading());

  /** The logged-in user's email — used by the profile page for the owner check. */
  readonly currentUser = computed(() => this.auth.currentUser());

  /** The current JWT — used by the profile page to decode the admin flag. */
  readonly bearerToken = computed(() => this.auth.bearerToken());

  /**
   * Load the rounded profile for the given employee id.
   *
   * <p>The id is forwarded as the path variable; the backend returns 404 when the
   * employee does not exist, which is surfaced as {@link error}.
   */
  loadProfile(employeeId: string | number): void {
    this.beginLoad();
    this._error.set(null);
    this.api
      .get<PersonProfile>(`employees/${employeeId}/profile`)
      .pipe(catchApiError(), finalize(() => this.endLoad()))
      .subscribe({
        next: (profile) => this._profile.set(profile),
        error: (err) => {
          this._profile.set(null);
          this._error.set(err as ApiError);
        }
      });
  }

  /** Reset profile and error state (e.g. when leaving the page). */
  clear(): void {
    this._profile.set(null);
    this._error.set(null);
    this.endLoad();
  }

  /**
   * PUT an employee update and refresh the rounded profile on success.
   *
   * <p>RBAC is enforced server-side; this method is called only when the profile page
   * has already determined (best-effort) that the caller may edit.
   */
  updateEmployee(id: EmployeeId, request: UpdateEmployeeRequest): Observable<EmployeeResponse> {
    this.beginLoad();
    this._error.set(null);
    return this.api.put<EmployeeResponse>(`employees/${id.value}`, request).pipe(
      catchApiError(),
      finalize(() => this.endLoad()),
      tap({
        error: (err: ApiError) => this._error.set(err)
      })
    );
  }
}
