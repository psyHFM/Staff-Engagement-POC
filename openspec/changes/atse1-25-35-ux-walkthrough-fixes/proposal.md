## Why

A full Playwright walkthrough on 2026-06-25 across every tab and CRUD flow
of the Staff-Engagement-POC app surfaced 11 UX and correctness defects
(Jira ATSE1-25 → ATSE1-35). Highlights: auth state is lost on every page
reload; `/employees` mixes a directory with a confusing "Your profile"
inline section; the interaction history rows are read-only and cannot
spawn follow-up tasks; the task subject field is a free-text id input;
task creation returns 500 for the seeded admin and the DB has no `title`
column; tasks have no subtasks; the portfolio "add skill" form silently
re-submits the previous entry. The Phase 6 `phase-6-rounded-profile`
openSpec change is also still active with unchecked boxes even though
PRs #33 and #34 already merged it.

## What Changes

- **Persist the JWT to `sessionStorage`** on login, re-hydrate the
  `AuthState` signal on app bootstrap, and clear storage on logout /
  401. (ATSE1-25 — implementation aligned with the upstream ATSE1-41
  PR #37 which chose `sessionStorage` over `localStorage` so the
  persistence is scoped to the tab)
- **Replace the `/employees` inline "Your profile" section with the
  pure directory** (already built in PR #28) and **introduce a new
  top-level `/profile` route** wired to the same `ProfilePage` and
  reachable from the shell user-name link. (ATSE1-27, ATSE1-32)
- **Make every interaction history row editable** via a new
  `PATCH /api/v1/interactions/{id}` endpoint (type + note, immutable
  createdAt, admin-any / non-admin-own RBAC) and add an inline
  **"Create task from this interaction"** action that mounts the
  existing `TaskCreateForm` with the interaction id pre-filled.
  (ATSE1-28, ATSE1-29)
- **Replace the hardcoded 3-entry `availableSubjects` stub in
  `InteractionStateService` with a real employee list** loaded from
  `GET /api/v1/employees`; the dropdown shows names and the id is
  wired internally. (ATSE1-33)
- **Replace the free-text `<input name="subjectId">` on the task
  create form with a shared `EmployeePicker` dropdown** (name shown,
  id wired, searchable). (ATSE1-30)
- **Fix task creation 500 for the seeded admin**: change every
  `@PreAuthorize("hasRole('USER')")` to `hasAnyRole('USER','ADMIN')`
  on the task controller; **add the missing `title` column** to the
  `task` table (additive Liquibase); **map `title` and `description`
  separately** in `TaskService.toSummary` (today both are populated
  from `task.description`); backfill seeded rows. (ATSE1-31)
- **Add subtasks / checklist items to tasks**: new `task_item` table,
  new JPA entity, new REST endpoints, new `TaskSummary.items` field,
  new frontend `task-item-list` and `task-item-form` components. Task
  is "complete" only when all items are complete (or admin override).
  (ATSE1-34)
- **Fix the portfolio "add skill / add education / add project / add
  link" form-state bug**: read form values from `#form.value` at
  submit, call `resetForm()` on success, fix all four add-* methods
  in the same way. (ATSE1-35)
- **Reconcile the stale `phase-6-rounded-profile` openSpec change**:
  tick off the items that landed in PRs #33 and #34, add a
  "Verified by merged PRs" note, and **archive the change** to
  `openspec/changes/archive/2026-06-25-phase-6-rounded-profile/`.
  (ATSE1-26)

## Capabilities

### New Capabilities

- `auth-session`: AuthState JWT persistence to sessionStorage + cold-start
  hydration; cover reload-keeps-session smoke in Playwright.
- `employee-directory`: pure directory on `/employees` after removing
  the inline "Your profile" section.
- `your-details-route`: top-level `/profile` route for the current
  user, linked from the shell user-name.
- `interaction-row-edit`: edit affordance on each row + backend
  PATCH endpoint + RBAC.
- `interaction-create-task`: inline "Create task" action that mounts
  the task create form with the interaction id pre-filled.
- `task-subject-dropdown`: shared `EmployeePicker` component used by
  the task create form.
- `task-subtasks`: `task_item` table, CRUD endpoints, frontend
  sub-task UI.
- `portfolio-add-row-fix`: form-state reset for all four
  add-skill/education/project/link handlers.
- `phase-6-archive`: capture of the openSpec reconciliation +
  archive-move for `phase-6-rounded-profile`.

### Modified Capabilities

- `task-management`: existing `POST /api/v1/tasks` accepts
  `ROLE_ADMIN`; new `title` field is required and persisted;
  `TaskSummary.title` is now distinct from `description`; new
  subtask endpoints and `TaskSummary.items`.

(No other existing spec requires a behavior-level change. The
interaction and portfolio capabilities currently have no top-level
spec; their requirement changes are captured in the new
capabilities listed above.)

## Impact

- **Jira tickets closed by this change**: ATSE1-25, ATSE1-26,
  ATSE1-27, ATSE1-28, ATSE1-29, ATSE1-30, ATSE1-31, ATSE1-32,
  ATSE1-33, ATSE1-34, ATSE1-35. All ticket keys verified against
  `git log main` and the 2026-06-25 walkthrough notes at
  `notes/frontend-ux-test-2026-06-25.md`.
- **Frontend code touched** (Angular 22, Signals, unidirectional):
  `frontend/src/app/shared/auth/auth-state.{ts,spec.ts}`,
  `frontend/src/app/features/employee/employee.{ts,html}`,
  `frontend/src/app/app.routes.ts`,
  `frontend/src/app/shell/shell.html`,
  `frontend/src/app/features/interaction/interaction-state.service.ts`,
  `frontend/src/app/features/interaction/interaction-list/*`,
  `frontend/src/app/features/interaction/interaction-page/*`,
  `frontend/src/app/features/interaction/log-interaction/*`,
  `frontend/src/app/features/task/task-create-form.{ts,html}`,
  `frontend/src/app/features/task/task.{ts,html}`,
  `frontend/src/app/features/portfolio/portfolio.ts`.
  New files: `frontend/src/app/shared/forms/employee-picker/`,
  `frontend/src/app/features/task/task-item-list/`,
  `frontend/src/app/features/task/task-item-form/`.
  New e2e spec: `e2e/tests/auth-persistence.spec.ts`.
- **Backend code touched** (Java 21, Spring Boot, modular monolith,
  ArchUnit, additive Liquibase):
  `backend/.../interaction/controller/InteractionController.java`,
  `backend/.../interaction/service/InteractionService.java`,
  `backend/.../task/web/TaskController.java`,
  `backend/.../task/service/TaskService.java`,
  `backend/.../task/domain/Task.java`,
  `backend/.../task/domain/TaskItem.java` (new),
  `backend/.../task/repository/TaskItemRepository.java` (new),
  `backend/.../shared/api/TaskSummary.java` (additive `items`).
  New Liquibase: `db/changelog/modules/task/002-add-task-title.yaml`,
  `db/changelog/modules/task/003-create-task-item-table.yaml`.
- **Frozen contract changes**: none. All new inter-module reads use
  the existing `EmployeeContract` and `TaskContract` interfaces.
  `master.yaml` is not edited.
- **Architecture rules** verified: `task` and `interaction` modules
  already follow the Controller → Service → Repository layered
  pattern with anemic domain and additive Liquibase under
  `db/changelog/modules/<module>/`; the existing per-module
  ArchUnit denylist continues to cover the new `task_item` JPA
  entity.
- **Out of scope**: the comprehensive seed (PR #35), any change to
  the frozen `shared/api/*Contract.java` interfaces, Playwright
  snapshot retention (the `.playwright-mcp/` carry-in can be
  `.gitignore`d in a follow-up).
