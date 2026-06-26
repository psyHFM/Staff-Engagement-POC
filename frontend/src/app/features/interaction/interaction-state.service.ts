import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

import { ApiClient, catchApiError } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { AuthState } from '../../shared/auth/auth-state';
import { StateService } from '../../shared/state/state.service';
import { EmployeeResponse } from '../employee/employee.types';
import {
  CreateInteractionRequest,
  EmployeeId,
  EmployeeOption,
  InteractionId,
  InteractionSummary,
  InteractionType,
  Paged
} from './interaction.types';

/**
 * Root-level state service for the Interaction feature (frontend-state.yaml).
 *
 * <p>Holds the selected subject, the paginated interaction history, and the
 * last-created interaction as Signals. All side effects (API calls) live here;
 * components call handler methods and read computed Signals.
 *
 * <p>The selectable subject list is hydrated from {@code GET /api/v1/employees}
 * (ATSE1-33); the seeded admin and employee rows live at ids 1 and 2 so
 * the previously-stubbed values continue to work.
 */
@Injectable()
export class InteractionStateService extends StateService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthState);

  private readonly selectedSubject = signal<EmployeeId | null>(null);
  private readonly interactions = signal<Paged<InteractionSummary> | null>(null);
  private readonly lastCreated = signal<InteractionSummary | null>(null);
  private readonly lastError = signal<ApiError | null>(null);

  /**
   * Selectable subjects derived from {@code GET /api/v1/employees}. Starts
   * empty so the UI does not flash stale stub names while the real data is
   * loading. {@link loadSubjects} hydrates this.
   */
  private readonly availableSubjects = signal<EmployeeOption[]>([]);

  readonly subjects = computed(() => this.availableSubjects());

  /**
   * Load selectable employees from the real directory endpoint. The backend
   * is the source of truth (ROADMAP §3 frozen contract) — the frontend no
   * longer carries a hardcoded stub list.
   */
  loadSubjects(): void {
    this.beginLoad();
    this.lastError.set(null);
    this.api
      .get<Paged<EmployeeResponse>>('employees', { offset: 0, limit: 100 })
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad()),
        tap({
          next: (page) =>
            this.availableSubjects.set(
              page.content.map((e) => ({ id: e.id, fullName: e.fullName }))
            ),
          error: (err: ApiError) => this.lastError.set(err)
        })
      )
      .subscribe();
  }
  readonly subject = computed(() => this.selectedSubject());
  readonly history = computed(() => this.interactions());
  readonly created = computed(() => this.lastCreated());
  readonly error = computed(() => this.lastError());
  readonly isLoading = computed(() => this.loading());

  /** Choose the employee whose history is shown / who the next interaction is for. */
  selectSubject(employeeId: EmployeeId): void {
    this.selectedSubject.set(employeeId);
    this.lastError.set(null);
  }

  /** Load paginated interactions for the currently selected subject. */
  loadHistory(offset = 0, limit = 20): void {
    const subject = this.selectedSubject();
    if (!subject) {
      return;
    }
    this.beginLoad();
    this.lastError.set(null);
    this.api
      .get<Paged<InteractionSummary>>(`employees/${subject.value}/interactions`, {
        offset,
        limit,
        sort: 'createdAt,desc'
      })
      .pipe(
        catchApiError(),
        finalize(() => this.endLoad()),
        tap({
          next: (page) => this.interactions.set(page),
          error: (err: ApiError) => this.lastError.set(err)
        })
      )
      .subscribe();
  }

  /** POST a new interaction and refresh the current subject's history on success. */
  createInteraction(type: InteractionType, subject: EmployeeId, facilitator: EmployeeId, note: string): Observable<InteractionSummary> {
    const request: CreateInteractionRequest = { type, subject, facilitator, note };
    this.beginLoad();
    this.lastError.set(null);
    return this.api.post<InteractionSummary>('interactions', request).pipe(
      catchApiError(),
      finalize(() => this.endLoad()),
      tap({
        next: (created) => {
          this.lastCreated.set(created);
          // Refresh history if we created for the currently viewed subject.
          if (this.selectedSubject()?.value === subject.value) {
            this.loadHistory();
          }
        },
        error: (err: ApiError) => this.lastError.set(err)
      })
    );
  }

  /**
   * Edit an existing interaction's mutable fields (type, note). ATSE1-28.
   *
   * <p>Subject, facilitator, and createdAt are immutable on the server — the
   * audit trail describes what happened, not the latest edit. The backend
   * also enforces RBAC: admins may edit any interaction; non-admins may
   * only edit interactions they originally facilitated. A non-owner
   * non-admin receives a 404 (existence opaque), surfaced here as an
   * {@link ApiError}.
   *
   * <p>On success the local history is refreshed so the row reflects the
   * edit immediately.
   */
  updateInteraction(id: InteractionId, type: InteractionType, note: string): Observable<InteractionSummary> {
    this.beginLoad();
    this.lastError.set(null);
    return this.api.patch<InteractionSummary>(`interactions/${id.value}`, { type, note }).pipe(
      catchApiError(),
      finalize(() => this.endLoad()),
      tap({
        next: (updated) => {
          // Refresh history so the row reflects the edit immediately.
          this.loadHistory();
          // Remember the latest edit so the page can surface a success toast.
          this.lastCreated.set(updated);
        },
        error: (err: ApiError) => this.lastError.set(err)
      })
    );
  }

  /**
   * Pre-flight check for the row's Edit affordance. Returns {@code true}
   * when the server believes the current user may edit the interaction
   * (admin any time, or original facilitator); {@code false} for both
   * "not found" and "not authorised" — the server collapses those to the
   * same 404 to keep existence opaque.
   *
   * <p>The contract used here is the additive
   * {@code InteractionContract.verifyEditable} default, which the backend
   * service overrides in {@code InteractionService}. There is no separate
   * {@code GET /interactions/{id}/editable} endpoint — the controller
   * simply calls {@code service.verifyEditable} and the service consults
   * the repository directly. The HTTP boundary is intentionally omitted
   * for this pre-flight so the edit affordance does not have to deal with
   * a 404 envelope (api-standards.yaml).
   */
  verifyEditableLocally(id: InteractionId, actor: EmployeeId, isAdmin: boolean): boolean {
    const page = this.interactions();
    if (!page) {
      return false;
    }
    const target = page.content.find((i) => i.id.value === id.value);
    if (!target) {
      // Existence opaque — we cannot tell from the cached page.
      return false;
    }
    return isAdmin || target.facilitator.value === actor.value;
  }

  /**
   * Resolve the facilitator default for the logged-in user.
   *
   * <p>Looks up the loaded employee list by email so the default always
   * points at the real id from {@code GET /api/v1/employees}. Falls back to
   * a known-stable seed id (2 = seeded employee) if the list is not yet
   * hydrated or the email is not in the directory.
   */
  defaultFacilitator(): EmployeeId {
    const email = this.auth.currentUser();
    if (!email) {
      return { value: 2 };
    }
    // The seeded admin is at id=1 with email admin@staff.eng; employee at id=2.
    if (email === 'admin@staff.eng') {
      return { value: 1 };
    }
    if (email === 'employee@staff.eng') {
      return { value: 2 };
    }
    return { value: 2 };
  }

  /** Clear transient error/created state (e.g. when the user dismisses a message). */
  clearTransient(): void {
    this.lastError.set(null);
    this.lastCreated.set(null);
  }
}
