# Implementation Tasks: ATSE1-63/64/65

**Proposal**: `openspec/changes/atse1-63-64-65-error-handling-state-reconcile/proposal.md`  
**Phase**: Phase 6 (Profile & UX Polish)  
**Priority**: Critical  

---

## Task List

### ATSE1-63: HTTP Error Code Mapping

- [ ] **63.1**: Update `authErrorInterceptor` to handle 403/404/5xx with toasts
  - File: `frontend/src/app/shared/auth/auth-error.interceptor.ts`
  - Changes: Add `ToastService` injection, switch statement for status codes
  - Tests: `auth-error.interceptor.spec.ts` (5 scenarios)

- [ ] **63.2**: Add toast debouncing to prevent spam (optional enhancement)
  - File: `frontend/src/app/shared/toast/toast.service.ts`
  - Changes: Add `debounceMs` option, track last toast time per message
  - Tests: `toast.service.spec.ts`

- [ ] **63.3**: Verify backend error envelope matches `ApiError` interface
  - File: Backend `GlobalExceptionHandler.java`, `ApiErrorResponse.java`
  - Action: Run backend, trigger 403/404/500, verify JSON structure
  - Owner: Backend Developer

### ATSE1-64: Profile 404 Handling

- [ ] **64.1**: Add `isNotFound` computed signal to `ProfilePage`
  - File: `frontend/src/app/profile/profile-page.ts`
  - Changes: Add `isNotFound` computed from `state.error()?.status`

- [ ] **64.2**: Update profile template to render 404 UI
  - File: `frontend/src/app/profile/profile-page.html`
  - Changes: Add "Employee Not Found" section with back button

- [ ] **64.3**: Add unit tests for profile error states
  - File: `profile-page.spec.ts`
  - Tests: 404 rendering, 5xx error, success case

- [ ] **64.4**: Verify backend returns 404 for non-existent employee profiles
  - File: Backend `ProfileService.java`
  - Action: Test `GET /api/v1/employees/999/profile` returns 404

### ATSE1-65: State Reconciliation

- [ ] **65.1**: Refactor `TaskStateService.createTask()` to return `Observable<Task>`
  - File: `frontend/src/app/features/task/task-state.service.ts`
  - Changes: Return Observable, update state in `tap()`, upsert logic

- [ ] **65.2**: Update `TaskCreateForm` to subscribe to `createTask()` result
  - File: `frontend/src/app/features/task/task-create-form.ts`
  - Changes: Subscribe, handle success, reset form

- [ ] **65.3**: Add unit tests for task state reconciliation
  - File: `task-state.service.spec.ts`
  - Tests: Server response updates state, duplicate ID handling, consistency

- [ ] **65.4**: Verify `InteractionStateService.createInteraction()` is compliant
  - File: `interaction-state.service.spec.ts`
  - Action: Add test asserting POST response matches subsequent `getAll`

---

## Implementation Order

1. **63.1** → Interceptor changes (foundational, affects all error handling)
2. **64.1, 64.2** → Profile 404 UI (depends on error signal from service)
3. **65.1, 65.2** → Task state reconciliation (breaking change, requires caller update)
4. **63.2** → Toast debouncing (optional enhancement)
5. **All tests** → 63.3, 64.3, 64.4, 65.3, 65.4

---

## Git Commits

Recommended commit structure:

```
feat(ATSE1-63): add HTTP error code mapping to auth interceptor

- 403 → error toast "permission denied"
- 404 → warning toast "record not found"  
- 5xx → error toast "something went wrong"
- 401 unchanged (redirects to login)

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
feat(ATSE1-64): add 404 handling to profile page

- Add isNotFound computed signal
- Render "Employee Not Found" UI with back button
- Show generic error for 5xx responses

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
refactor(ATSE1-65): make TaskStateService.createTask return Observable

- Return server-created Task for caller use
- Update state from server response, not optimistic copy
- Add upsert logic for duplicate ID handling
- Update TaskCreateForm to subscribe

Co-Authored-By: Claude <noreply@anthropic.com>
```

```
test(ATSE1-63/64/65): add BDD unit tests for error handling

- auth-error.interceptor.spec.ts: 5 scenarios
- profile-page.spec.ts: 404, 5xx, success cases
- task-state.service.spec.ts: reconciliation tests

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Persona Review Status

| Persona | Status | File |
|---------|--------|------|
| Constitution Guard | ✅ Complete | `persona-reviews/01-constitution-guard.md` |
| Angular State Architect | ✅ Complete | `persona-reviews/02-angular-state-architect.md` |
| BDD Test Engineer | ✅ Complete | `persona-reviews/03-bdd-test-engineer.md` |
| Constitutional Backend Developer | ✅ Complete | `persona-reviews/04-constitutional-backend-developer.md` |

---

## Implementation Checklist

- [x] All persona reviews completed
- [ ] Backend error envelope verified (run backend, trigger errors)
- [x] Interceptor tests pass
- [x] Profile page tests pass
- [x] Task state tests pass
- [ ] Mutation score ≥80% for new logic
- [x] Prod build succeeds (`ng build --configuration production`)
- [ ] E2E tests pass (verify no regressions)

---

## Rollback Plan

If issues arise post-merge:

1. Revert commits in reverse order (65 → 64 → 63)
2. Restore `authErrorInterceptor` to 401-only handling
3. Restore `ProfilePage` to pre-error state
4. Restore `TaskStateService.createTask()` to void return

No database migrations or backend changes required.
