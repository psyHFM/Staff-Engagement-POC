# Angular State Architect Review: ATSE1-63/64/65

**Review Date**: 2026-06-30  
**Tickets**: ATSE1-63, ATSE1-64, ATSE1-65  
**Reviewer**: Angular State Architect (Signals Specialist)  

---

## State Pattern Audit

### Current State Architecture

| Service | State Signals | Derived Signals | Side Effects | Verdict |
|---------|---------------|-----------------|--------------|---------|
| `AuthState` (existing) | `bearerToken`, `currentUser`, `currentEmployeeId` | `isAuthenticated` | `clearOnUnauthorized()` | ✅ Compliant |
| `ProfileStateService` | `_profile`, `_error`, `loading` | `profile`, `error`, `isLoading` | `loadProfile()`, `updateEmployee()` | ✅ Compliant |
| `TaskStateService` | `_tasks`, `_itemsByTask`, `_sortField`, `_sortAsc`, `loading` | `tasks` (sorted), `itemsByTaskId`, `itemsFor()` | `loadMyTasks()`, `createTask()`, `toggleCompletion()` | ✅ Compliant |
| `InteractionStateService` | `selectedSubject`, `interactions`, `lastCreated`, `lastError`, `loading` | `subjects`, `subject`, `history`, `created`, `error`, `isLoading` | `loadHistory()`, `createInteraction()`, `updateInteraction()` | ✅ Compliant |

---

## ATSE1-63: Error Interceptor → Toast Integration

**Proposed Pattern**:
```typescript
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 403: toast.show('You don\'t have permission...', { type: 'error' }); break;
          case 404: toast.show('We couldn\'t find...', { type: 'warning' }); break;
          case 500: toast.show('Something went wrong...', { type: 'error' }); break;
        }
      }
      return throwError(() => error);
    })
  );
};
```

**Architect Review**:
- ✅ **Unidirectional flow**: Interceptor is a side effect handler, doesn't mutate state
- ✅ **Signal injection**: Uses `inject(ToastService)` correctly in functional interceptor
- ⚠️ **Toast as state**: `ToastService.toasts` is a signal—interceptor calls `.show()` which mutates via `.update()`. This is correct pattern.

**Recommendation**: Ensure `ToastService` is provided at root (it is—verified in `toast.service.ts`).

**Verdict**: ✅ **COMPLIANT**

---

## ATSE1-64: Profile 404 Handling

### Proposed State Changes

**`ProfileStateService`**: No changes needed—already exposes `error()` signal with full `ApiError` envelope.

**`ProfilePage` component**:
```typescript
protected readonly isNotFound = computed(() => {
  const err = this.state.error();
  return err?.status === 404;
});
```

**Architect Review**:
- ✅ **Derived state via `computed()`**: `isNotFound` is pure derivation from `error()` signal
- ✅ **No manual `.set()`**: Component doesn't mutate state directly
- ✅ **Read-only signal exposure**: `state.error()` returns computed value, not writable signal

**Template Pattern**:
```html
<div *ngIf="isNotFound()">
  <h2>Employee Not Found</h2>
  <button (click)="onBack()">Back to Directory</button>
</div>
```

- ✅ **OnPush compatibility**: `isNotFound()` is a computed signal, change detection will fire
- ✅ **No async pipe needed**: Signals are synchronous read model

**Verdict**: ✅ **COMPLIANT**

---

## ATSE1-65: State Reconciliation After POST

### `TaskStateService.createTask()` Refactor

**Current** (pre-refactor):
```typescript
createTask(request: CreateTaskRequest): void {
  this.api.post<Task>('tasks', request).subscribe({
    next: (newTask) => this._tasks.update(tasks => [...tasks, newTask])
  });
}
```

**Proposed**:
```typescript
createTask(request: CreateTaskRequest): Observable<Task> {
  return this.api.post<Task>('tasks', request).pipe(
    tap({
      next: (newTask) => {
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

**Architect Review**:
- ✅ **Returns Observable**: Caller can subscribe and use server response
- ✅ **State updated from server**: `_tasks.update()` happens inside `tap`, after server responds
- ✅ **Upsert logic**: Handles both new tasks and potential duplicates (defensive)
- ✅ **No optimistic mutation**: State only changes after `next` fires

**⚠️ Concern**: Caller MUST subscribe or the side effect (state update) won't run. This is a known RxJS gotcha.

**Mitigation**: 
1. Document that callers must subscribe (or use `| async` in template if bound to component signal)
2. Alternatively, use `finalize` for loading state, but keep state mutation in `tap`

**Verdict**: ✅ **COMPLIANT** (with documentation requirement)

### Caller Migration: `TaskCreateForm`

**Current** (assumed):
```typescript
onSubmit() {
  this.taskState.createTask(this.form.value);
}
```

**Required**:
```typescript
onSubmit() {
  this.taskState.createTask(this.form.value).subscribe({
    next: (task) => {
      this.toast.show('Task created!', { type: 'success' });
      this.form.reset();
    }
  });
}
```

**Note**: The interceptor already shows a toast for success/failure. Component-level toast may be duplicate. See Constitution Guard warning about toast spam.

---

## `InteractionStateService` Verification

**Current**:
```typescript
createInteraction(...): Observable<InteractionSummary> {
  return this.api.post<InteractionSummary>('interactions', request).pipe(
    tap({
      next: (created) => {
        this.lastCreated.set(created);
        if (this.selectedSubject()?.value === subject.value) {
          this.loadHistory();
        }
      }
    })
  );
}
```

**Architect Review**:
- ✅ **Returns Observable**: Already compliant
- ✅ **State reconciliation**: `lastCreated.set(created)` uses server response
- ✅ **History refresh**: `loadHistory()` re-fetches from server
- ✅ **Conditional refresh**: Only reloads if subject matches current view

**Verdict**: ✅ **ALREADY COMPLIANT** — No changes needed.

---

## Signal Flow Diagrams

### ATSE1-63: Error Interceptor Flow

```
HTTP Response (403/404/5xx)
    ↓
authErrorInterceptor (catchError)
    ↓
ToastService.show() → _toasts.update()
    ↓
ToastComponent.toasts() signal fires
    ↓
UI renders toast banner
    ↓
auto-dismiss timeout → _toasts.update() (remove)
```

### ATSE1-64: Profile 404 Flow

```
ProfilePage.ngOnInit()
    ↓
ProfileStateService.loadProfile(id)
    ↓
API GET /employees/{id}/profile
    ↓
404 Response → catchApiError()
    ↓
ProfileStateService._error.set(ApiError)
    ↓
ProfilePage.isNotFound() computed() re-runs
    ↓
Template renders "not found" UI
```

### ATSE1-65: Task Creation Reconciliation

```
TaskCreateForm.onSubmit()
    ↓
TaskStateService.createTask(request)
    ↓
API POST /tasks
    ↓
Server returns Task (with server-assigned ID, timestamps)
    ↓
tap(next) fires → _tasks.update()
    ↓
TaskStateService.tasks() computed() re-runs (sorting applies)
    ↓
TaskList UI updates with server data
```

---

## Constraints Checklist

| Constraint | Status |
|------------|--------|
| Components don't update global state directly | ✅ `ProfilePage` reads `state.error()`, doesn't call `.set()` |
| Avoid BehaviorSubjects | ✅ All signals, no RxJS subjects for state |
| Derived state never uses `.set()` | ✅ `isNotFound` uses `computed()`, not manual sync |
| Side effects confined to state services | ✅ Interceptor is HTTP boundary, not state mutation |

---

## Recommendations

1. **Toast Debouncing**: Add a `debounceMs` option to `ToastService.show()` to prevent spam from cascading errors.

2. **Loading State Coordination**: Ensure `ProfileStateService.loading()` is `false` before rendering 404 UI (already handled via `finalize()`).

3. **Subscription Discipline**: Document that `createTask()` callers must subscribe. Consider adding a code comment:
   ```typescript
   // NOTE: Caller must subscribe or the state update will not run.
   // This is intentional—side effects happen in the RxJS pipeline.
   ```

4. **Signal Exposure**: Consider exposing `isNotFound` as a public method on `ProfileStateService` for reusability:
   ```typescript
   readonly isNotFound = computed(() => this._error()?.status === 404);
   ```

---

## Final Verdict

**COMPLIANT ✅** with recommendations.

**State Architecture Score**: 95/100
- Deduction: Toast spam risk, subscription discipline requirement

**Signature**: Angular State Architect  
**Date**: 2026-06-30
