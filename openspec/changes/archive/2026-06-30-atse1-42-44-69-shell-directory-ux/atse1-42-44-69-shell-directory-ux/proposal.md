## Why

The shell header currently shows the logged-in username as a static chip with no path to the user's profile, and the `/employees` directory page mixes a self-service edit panel into a directory list. The UX walkthrough (tickets #3, #25, #26, #27) identified three small but high-impact fixes that together clarify the IA: open the profile from the header, make the directory read-only for non-admins, and relabel the self-service section.

## What Changes

- Extend the login response with the current user's `employeeId` (resolved from the Employee record) and persist it in `AuthState`/`sessionStorage` so the shell can build a profile link without fetching extra state.
- Make the `.shell__user` chip in the header a clickable `routerLink` to the current user's profile page (`/employees/:id/profile`), with an `aria-label` describing the action.
- Remove the inline directory detail/edit panel from `/employees`; the directory is now a directory-only list where each row links to the dedicated profile page (`/employees/:id/profile`) (ATSE1-44).
- Move the employee detail/edit view to the profile page (`/employees/:id/profile`) so the profile page becomes the single place to view and edit a person's employee record (owner editable, admin role editable) (ATSE1-69).
- Add/update unit tests for the auth state, shell, and employee components.

## Capabilities

### New Capabilities

- `shell-user-profile-link`: the header username chip links to the logged-in user's profile page.
- `auth-employee-id`: the login response and `AuthState` carry the current user's `employeeId` for client-side navigation.

### Modified Capabilities

- `employee-management`: update the frontend directory UX — the directory becomes a directory-only list linking to the profile page, the employee detail/edit view moves to the profile page, and the shell provides a profile shortcut.
- `frontend-foundation`: amend auth-state persistence to also cover `employeeId`.

## Impact

- `backend/src/main/java/com/staffengagement/shared/security/AuthController.java` and tests — `LoginResponse` includes `employeeId`.
- `frontend/src/app/shared/auth/auth-state.ts` and `auth-state.spec.ts` — persist/rehydrate `employeeId`.
- `frontend/src/app/shell/shell.html` and `shell.ts` — clickable user chip with accessible label.
- `frontend/src/app/features/employee/employee.html` and `employee.ts` — remove directory detail panel and self-service edit section; keep directory list and create-form fallback.
- `frontend/src/app/features/employee/employee-list/employee-list.html` and `employee-list.ts` — keep row selection and add a profile link to each row.
- `frontend/src/app/features/employee/employee-detail/employee-detail.html` — remove read-only message.
- `frontend/src/app/features/employee/employee-state.service.ts` — remove selected-employee state.
- `frontend/src/app/profile/profile-page.html`, `profile-page.ts`, and `profile-page.spec.ts` — render the employee detail component and wire editing/back navigation.
- `frontend/src/app/shell/shell.spec.ts`, `employee.spec.ts`, `employee-list.spec.ts`, and `employee-state.service.spec.ts` — add/update unit tests.
- `openspec/specs/employee-management/spec.md` and `openspec/specs/frontend-foundation/spec.md` — reflect the updated behavior.
