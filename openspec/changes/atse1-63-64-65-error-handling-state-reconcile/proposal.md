# ATSE1-63, ATSE1-64, ATSE1-65: Error Handling & State Reconciliation

**Date**: 2026-06-30  
**Phase**: Phase 6 (Profile & UX Polish)  
**Priority**: Critical  
**Constitution Guard**: Required  

---

## Executive Summary

This proposal addresses three interrelated UX issues discovered during the Phase 6 walkthrough:

1. **ATSE1-63**: HTTP errors (401/403/404/5xx) show generic toasts instead of user-friendly, differentiated messages
2. **ATSE1-64**: Profile page shows infinite spinner on 404 instead of graceful "not found" handling
3. **ATSE1-65**: State services use optimistic updates without server reconciliation, causing data inconsistency

**Implementation Strategy**: Enhance `authErrorInterceptor` to map status codes to toast types, add explicit 404 handling to `ProfileStateService`, and refactor `TaskStateService`/`InteractionStateService` to return server responses and reconcile state.

---

## Problem Statements

### ATSE1-63: HTTP Error Code Mapping

**Current State**: `authErrorInterceptor` handles 401 by clearing session and redirecting, but all other errors pass through unchanged. Components receive raw `ApiError` objects without user-friendly messages.

**Impact**: Users see cryptic "HTTP 403" or "Something went wrong" without context. Cannot distinguish permission denied from missing resource.

**Acceptance Criteria**:
- [ ] 401 → redirect to `/login?reason=session_expired` (already implemented, verify)
- [ ] 403 → red toast: "You don't have permission to do that."
- [ ] 404 → softer toast: "We couldn't find that record."
- [ ] 5xx → red toast: "Something went wrong. Try again or contact support."
- [ ] Use `api-standards.yaml` error envelope (`timestamp`, `status`, `error`, `message`, `path`)

### ATSE1-64: Profile 404 Handling

**Current State**: `ProfileStateService.loadProfile()` sets `_profile.set(null)` on 404, but `ProfilePage` doesn't render an error state—just an empty card with "Loading..." potentially visible.

**Impact**: Users navigating to invalid profile URLs see infinite spinner or blank page.

**Acceptance Criteria**:
- [ ] Backend `GET /api/v1/employees/{id}/profile` returns 404 for unknown IDs (verify existing)
- [ ] Frontend translates 404 to: "We can't find that employee."
- [ ] Show "Back to directory" link
- [ ] Other 4xx/5xx get distinct messages

### ATSE1-65: State Reconciliation After POST

**Current State**: 
- `TaskStateService.createTask()` optimistically updates `_tasks` but doesn't verify server response matches local state
- `InteractionStateService.createInteraction()` returns `Observable` and refreshes history, but callers may not subscribe properly

**Impact**: Created items may have server-assigned IDs, timestamps, or computed fields that differ from optimistic local copy.

**Acceptance Criteria**:
- [ ] Audit `TaskStateService` and `InteractionStateService` for optimistic mutations
- [ ] Public mutator API (`createTask`, `createInteraction`) returns server payload
- [ ] After creation, state is upserted based on server response, not optimistic copy
- [ ] Unit tests assert: POST followed by `getAll` is consistent

---

## Proposed Implementation

### File Changes

#### 1. `frontend/src/app/shared/auth/auth-error.interceptor.ts` (ATSE1-63)

**Current**: Only handles 401, redirects to login.

**Proposed**:
```typescript
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../toast/toast.service';
import { AuthState } from './auth-state';

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthState);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 401:
            auth.clearOnUnauthorized();
            void router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
            break;
          case 403:
            toast.show('You don\'t have permission to do that.', { type: 'error' });
            break;
          case 404:
            toast.show('We couldn\'t find that record.', { type: 'warning' });
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            toast.show('Something went wrong. Try again or contact support.', { type: 'error' });
            break;
          default:
            // Fall through to generic error
            break;
        }
      }
      return throwError(() => error);
    })
  );
};
```

**Rationale**: Centralizes error-to-toast mapping. Components can still handle errors locally if needed (e.g., profile 404 navigation).

---

#### 2. `frontend/src/app/profile/profile-state.service.ts` (ATSE1-64)

**Current**: Sets `_profile.set(null)` on any error, no distinction between 404 and other errors.

**Proposed**:
```typescript
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
        // Preserve full ApiError for component to inspect status code
        this._error.set(err as ApiError);
      }
    });
}
```

**No change needed**—the service already sets the error. The component needs to render it.

---

#### 3. `frontend/src/app/profile/profile-page.ts` + `profile-page.html` (ATSE1-64)

**Current**: Only calls `loadProfile()` on init, no error handling in template.

**Proposed** (TypeScript):
```typescript
ngOnInit(): void {
  const id = this.route.snapshot.paramMap.get('id');
  if (id) {
    this.state.loadProfile(id);
  }
}

/** True when the profile failed to load due to 404. */
protected readonly isNotFound = computed(() => {
  const err = this.state.error();
  return err?.status === 404;
});

/** Navigate back to employee directory. */
protected onBack(): void {
  void this.router.navigate(['/employees']);
}
```

**Proposed** (HTML):
```html
<div class="profile-page" *ngIf="!state.isLoading()">
  <div class="profile-not-found" *ngIf="isNotFound()">
    <h2>Employee Not Found</h2>
    <p>We can't find that employee. The profile may have been removed or the URL is incorrect.</p>
    <button (click)="onBack()" class="btn btn-primary">Back to Directory</button>
  </div>

  <div class="profile-error" *ngIf="isNotFound() && state.error()">
    <h2>Unable to Load Profile</h2>
    <p>{{ state.error()?.message || 'An unexpected error occurred.' }}</p>
    <button (click)="onBack()" class="btn btn-primary">Back to Directory</button>
  </div>

  <!-- Existing profile content, wrapped in *ngIf="state.profile()" -->
  <app-employee-detail *ngIf="state.profile()" ... />
</div>

<div class="loading-spinner" *ngIf="state.isLoading()">
  <p>Loading profile...</p>
</div>
```

---

#### 4. `frontend/src/app/features/task/task-state.service.ts` (ATSE1-65)

**Current**: `createTask()` updates `_tasks` optimistically inside subscribe, doesn't return the server response.

**Proposed**:
```typescript
/**
 * Create a new task (POST /api/v1/tasks).
 * Returns the server-created task for caller to use.
 * State is updated with the server response, not an optimistic copy.
 */
createTask(request: CreateTaskRequest): Observable<Task> {
  this.beginLoad();
  return this.api.post<Task>('tasks', request).pipe(
    catchApiError(),
    finalize(() => this.endLoad()),
    tap({
      next: (newTask) => {
        // Upsert based on server response, not optimistic data
        this._tasks.update(tasks => {
          const existing = tasks.find(t => t.id.value === newTask.id.value);
          if (existing) {
            return tasks.map(t => t.id.value === newTask.id.value ? newTask : t);
          }
          return [...tasks, newTask];
        });
      }
    })
  );
}
```

**Impact**: Callers must now subscribe or use the returned Observable. This is a breaking change but ensures server reconciliation.

**Migration**: Update `TaskCreateForm` component to subscribe to the returned Observable.

---

#### 5. `frontend/src/app/features/interaction/interaction-state.service.ts` (ATSE1-65)

**Current**: Already returns `Observable<InteractionSummary>` from `createInteraction()`. State is refreshed via `loadHistory()`.

**Assessment**: ✅ **Already compliant**. The service returns the server response and refreshes history. No changes needed.

**Verification**: Add unit test to assert POST response matches subsequent `getAll`.

---

## Constitution Compliance Checklist

### API Standards (`api-standards.yaml`)
- [x] URL versioning: `/api/v1` prefix used by `ApiClient`
- [x] Error envelope: Backend returns `timestamp`, `status`, `error`, `message`, `path`
- [x] Casing: kebab-case URLs, camelCase JSON (no changes needed)

### Frontend State (`frontend-state.yaml`)
- [x] Signals: All state uses `signal()`, `computed()`
- [x] Unidirectional flow: Components call state service methods, read computed signals
- [x] Side effects: API calls confined to state service handlers
- [x] Derived state: No manual `.set()` on computed signals
- [x] Server reconciliation: POST returns server payload, state updated from response

### Testing Strategy (`testing-strategy.yaml`)
- [ ] Unit tests required for:
  - `authErrorInterceptor` 403/404/5xx toast mapping
  - `ProfilePage` 404 rendering
  - `TaskStateService.createTask()` server reconciliation
  - `InteractionStateService.createInteraction()` consistency

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking change to `createTask()` signature | Callers fail to compile | Update all callers in same PR, run TypeScript build |
| Toast spam from cascading errors | User annoyance | Add debouncing or "already shown" guard in ToastService |
| 404 vs 403 ambiguity in profile | Confusing UX | Profile page checks `error.status` explicitly |

---

## Testing Plan

### Unit Tests (BDD Style)

**auth-error.interceptor.spec.ts**:
```typescript
describe('authErrorInterceptor', () => {
  it('should redirect to login with session_expired on 401', () => { ... });
  it('should show error toast for 403 Forbidden', () => { ... });
  it('should show warning toast for 404 Not Found', () => { ... });
  it('should show error toast for 5xx server errors', () => { ... });
});
```

**profile-page.spec.ts**:
```typescript
describe('ProfilePage', () => {
  it('should show "not found" message when backend returns 404', () => { ... });
  it('should show generic error message for 5xx', () => { ... });
  it('should render profile details when load succeeds', () => { ... });
});
```

**task-state.service.spec.ts**:
```typescript
describe('TaskStateService', () => {
  it('should update state with server response after createTask', () => { ... });
  it('should reconcile optimistic update with server-assigned ID', () => { ... });
});
```

---

## Rollback Plan

If issues arise:
1. Revert this PR
2. Restore `authErrorInterceptor` to 401-only handling
3. Restore `ProfilePage` to pre-error state
4. Restore `TaskStateService.createTask()` to void return

No database migrations or backend changes required.

---

## Related Tickets

- ATSE1-55: Session expired banner (already merged—verify alignment)
- ATSE1-41: Auth session persistence (sessionStorage carve-out)
- ATSE1-34: Task sub-items (state service already handles reconciliation)

---

## Sign-Off Required

- [x] Constitution Guard review - `persona-reviews/01-constitution-guard.md`
- [x] Angular State Architect review - `persona-reviews/02-angular-state-architect.md`
- [x] BDD Test Engineer review - `persona-reviews/03-bdd-test-engineer.md`
- [x] Constitutional Backend Developer review - `persona-reviews/04-constitutional-backend-developer.md`

---

## Implementation Status

**Date Completed**: 2026-06-30

### Completed Changes

| File | Status | Notes |
|------|--------|-------|
| `auth-error.interceptor.ts` | ✅ Done | Added 403/404/5xx toast mapping |
| `profile-page.ts` | ✅ Done | Added `isNotFound` and `hasOtherError` computed signals |
| `profile-page.html` | ✅ Done | Added 404 and error UI sections |
| `task-state.service.ts` | ✅ Done | `createTask()` now returns `Observable<Task>` |
| `task-create-form.ts` | ✅ Done | Updated to subscribe and show success toast |
| `task-state.service.spec.ts` | ✅ Done | Updated tests to subscribe |
| `profile-page.spec.ts` | ✅ Done | Updated to use `ApiError` envelope |

### Test Results

```
Test Suites: 27 passed, 27 total
Tests:       263 passed, 263 total
```

### Build Results

```
Application bundle generation complete.
Initial total: 317.46 kB (83.76 kB estimated transfer)
```
