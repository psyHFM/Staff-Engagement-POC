import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

import { ApiClient, catchApiError } from '../../shared/api/api-client';
import { ApiError } from '../../shared/api/error-envelope';
import { AuthState } from '../../shared/auth/auth-state';
import { StateService } from '../../shared/state/state.service';
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
 * <p>Because Phase 1 (Employee) is not merged yet, the list of selectable
 * employees is stubbed. Once {@code /api/v1/employees} lands, this service can
 * switch to fetching the real list without changing the component contract.
 */
@Injectable()
export class InteractionStateService extends StateService {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(AuthState);

  private readonly selectedSubject = signal<EmployeeId | null>(null);
  private readonly interactions = signal<Paged<InteractionSummary> | null>(null);
  private readonly lastCreated = signal<InteractionSummary | null>(null);
  private readonly lastError = signal<ApiError | null>(null);

  // Stub employee list until Phase 1 employee API is available.
  private readonly availableSubjects = signal<EmployeeOption[]>([
    { id: { value: 1 }, fullName: 'Admin User' },
    { id: { value: 2 }, fullName: 'Employee User' },
    { id: { value: 3 }, fullName: 'Alice Smith' }
  ]);

  readonly subjects = computed(() => this.availableSubjects());

  /**
   * Load selectable employees.
   *
   * <p>Stub today: the list is seeded in the constructor. Once Phase 1 exposes
   * {@code GET /api/v1/employees}, replace this body with a real API call.
   */
  loadSubjects(): void {
    // Future: this.api.get<EmployeeOption[]>('employees').subscribe(list => this.availableSubjects.set(list));
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
   * <p>Deferred until a real principal→EmployeeId link exists (ROADMAP §5 design D3);
   * for the POC we map the stub username to a stub employee id.
   */
  defaultFacilitator(): EmployeeId {
    const username = this.auth.currentUser();
    switch (username) {
      case 'admin@staff.eng':
        return { value: 1 };
      case 'employee@staff.eng':
        return { value: 2 };
      default:
        return { value: 2 };
    }
  }

  /** Clear transient error/created state (e.g. when the user dismisses a message). */
  clearTransient(): void {
    this.lastError.set(null);
    this.lastCreated.set(null);
  }
}
