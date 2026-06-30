## Context

The current `/employees` page combines a self-service profile editor at the top with a directory list below. Selecting a directory row opens an inline detail/edit panel. The shell header shows the logged-in username but offers no navigation to the user's profile. The UX walkthrough asked for three coordinated changes: a profile shortcut from the header, a directory that is directory-only, and moving the employee detail/edit view to the profile page.

## Goals / Non-Goals

**Goals:**
- Extend the login response with the current user's `employeeId` so the shell can link directly to `/employees/:id/profile`.
- Persist `employeeId` in `AuthState` and `sessionStorage` (alongside token/username) and rehydrate it on refresh.
- Add a clickable profile link from the shell's username chip.
- Remove the inline directory detail/edit panel from `/employees`; keep the directory as a directory-only list.
- Move the employee detail/edit view to the profile page (`/employees/:id/profile`) so it is the single place to view or edit a person's employee record.
- Remove the read-only message inside the directory detail view.
- Keep existing RBAC backend enforcement unchanged.
- Add/update Jest unit tests for auth state, shell, employee page, and profile page components.

**Non-Goals:**
- Moving the self-service section to a dedicated route (that is ticket #25, out of scope here).
- Changing backend permissions or API contracts beyond adding `employeeId` to the login response.
- Restyling the shell or directory beyond the user-chip interaction and read-only affordances.

## Decisions

- **Backend `LoginResponse` carries `employeeId`.** Rationale: `AuthController` already resolves the employee summary by email to mint the JWT role claim, so the id is available at zero extra cost. Returning it avoids a second round-trip and keeps the shell decoupled from the employee feature state.
- **`AuthState` persists `employeeId`.** Rationale: the profile link must survive refresh; following the ATSE1-41 pattern, `employeeId` is part of the auth session and belongs in `sessionStorage` with the token.
- **Shell user chip as `<a routerLink>`.** Rationale: gives keyboard focus, right-click/copy-link, and accessible navigation. The link target is computed as `/employees/:id/profile` when `employeeId` is present; if absent (pre-Employee-module or user without a record) the chip remains a non-clickable `<span>`.
- **Directory-only `/employees`.** Rationale: `/employees` should only be a list. Viewing and editing any employee record happens on the dedicated profile page, keeping the directory uncluttered and giving the rounded profile page a clear purpose.

## Risks / Trade-offs

- **[Coupling] `AuthController` in `shared/security` now returns an employee-module id.** → Mitigation: it already depends on `EmployeeContract` from `shared/api`; adding the resolved id to the response does not create a new dependency direction.
- **[Testability] `Shell` depends on `AuthState` and `RouterLink`.** → Mitigation: tests stub `AuthState` with writable signals and use the component fixture to assert the rendered link.
