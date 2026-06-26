## 1. Backend login response includes employee id

- [x] 1.1 Update `AuthController.LoginResponse` to include `employeeId`.
- [x] 1.2 Populate `employeeId` in `AuthController.login()` from the resolved `EmployeeSummary` (null when no record).
- [x] 1.3 Update `AuthControllerTest` to assert the returned `employeeId`.

## 2. AuthState persists and exposes employee id

- [x] 2.1 Update frontend `LoginResponse` interface to include `employeeId`.
- [x] 2.2 Add `employeeId` signal, storage key, persistence in `login()`, rehydration in constructor, and clearing in `logout()`.
- [x] 2.3 Update `auth-state.spec.ts` to cover `employeeId` persistence/rehydration/logout.

## 3. Shell user profile link (ATSE1-42)

- [x] 3.1 Add `RouterLink` import and a `profileLink()` computed to `Shell` that builds `/employees/:id/profile` from `auth.employeeId()`.
- [x] 3.2 Replace the `<span class="shell__user">` with a focusable `<a>` carrying `routerLink`, `aria-label`, and preserving the existing styling hook when `employeeId` is present.
- [x] 3.3 Create/update `shell.spec.ts` to assert the profile link target and aria-label.

## 4. Employee directory links to profile page (ATSE1-44)

- [x] 4.1 Remove the inline directory detail/edit panel from `employee.html`; only the employee list remains on `/employees`.
- [x] 4.2 Update `employee.ts` to remove `canEditSelected`, `canEditRoleSelected`, `onUpdateSelected`, and `onClose`; add `onSelect()` that navigates to `/employees/:id/profile`.
- [x] 4.3 Keep the `employee-list` row selection event and add a per-row Profile link to `/employees/:id/profile`.
- [x] 4.4 Update `employee-detail.html` to remove the read-only fallback message when `canEdit` is false.
- [x] 4.5 Update `employee-state.service.ts` to remove selected-employee state (`selected`, `selectedEmployee`, `selectEmployee`, `clearSelection`).
- [x] 4.6 Update `employee.spec.ts`, `employee-list.spec.ts`, and `employee-state.service.spec.ts` to match the new UX.

## 5. Move employee detail/edit to the profile page (ATSE1-69)

- [x] 5.1 Render `<app-employee-detail>` in `profile-page.html` with owner-or-admin edit affordances and back navigation.
- [x] 5.2 Wire `ProfilePage.onUpdate()` to `ProfileStateService.updateEmployee()` and reload the profile.
- [x] 5.3 Update `profile-page.spec.ts` to cover edit affordances, update handling, and back navigation.

## 6. Update specs and verify

- [x] 6.1 Update `openspec/specs/employee-management/spec.md`, `openspec/changes/atse1-42-44-69-shell-directory-ux/specs/employee-management/spec.md`, and `openspec/changes/atse1-42-44-69-shell-directory-ux/proposal.md` with the new directory behavior.
- [x] 6.2 Run backend `./mvnw test` for affected module.
- [x] 6.3 Run `npm test -- --no-watch --no-progress` in `frontend/` and fix failures.
- [x] 6.4 Run `npm run lint` in `frontend/` and fix issues.
- [x] 6.5 Run Constitution Guard, Modular Monolith Architect, and Angular State Architect subagent reviews.
