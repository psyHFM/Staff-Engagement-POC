## Context

On 2026-06-25 Hendrik ran a full Playwright walkthrough of the POC across
every tab, every CRUD affordance, and a full reload. The findings were
captured in `notes/frontend-ux-test-2026-06-25.md` and promoted to 11
Jira tickets (ATSE1-25..35). They cluster into:

- **Auth state is in-memory only.** A reload (or any external
  navigation to a deep link) drops the user back to
  `/login?redirectUrl=…`. The doc comment on
  `frontend/src/app/shared/auth/auth-state.ts:11-13` literally says
  "State is reset on page load (no persistence)".
- **The `/employees` page is half-directory, half-`Your profile` inline
  editor** (it duplicates IDs in the DOM and is confusing). The
  real directory was already built in PR #28; it just isn't pointed
  at by the route. The user wants the "Your profile" block removed
  from `/employees` and moved to a top-level `/profile` route,
  reachable from the `span.shell__user` in the shell.
- **Interaction history rows are read-only** even though the form
  for create already exists, and there is no way to create a
  follow-up task from a logged interaction. The backend only has
  POST / GET / GET-by-id on the interaction module — no PATCH.
- **The interaction subject dropdown is a hardcoded 3-entry stub**
  (`Admin User`, `Employee User`, `Alice Smith` → ids 1/2/3). The
  seeded DB has ids 1, 47..50. Picking "Employee User" 404s the
  backend. There is a real `GET /api/v1/employees` already wired.
- **The task subject field is a free-text `<input name="subjectId"
  placeholder="e.g. EMP-123">`**, which violates the names-vs-ids
  UX rule. There is no shared `EmployeePicker` component.
- **Task create returns 500 for the seeded admin.** The cause is
  `@PreAuthorize("hasRole('USER')")` on every task endpoint
  (TaskController.java:47, 85, 92, 98) while the JWT carries
  `roles: [ADMIN]` (Spring's `hasRole('USER')` checks the exact
  `ROLE_USER` authority). The DB `task` table has no `title`
  column; the `TaskSummary.title` field is silently populated
  from `task.description` in `TaskService.toSummary` (line 58, 62).
- **Tasks have no subtasks / checklist items.** Real work has
  sub-steps; the current model is a single boolean `completed`.
- **The portfolio add-skill form silently re-submits the previous
  entry** on successive presses. Root cause: the local
  `skillFormModel` field is declared but never assigned; the
  handler reads `#skillForm.value` (or an empty model), the inputs
  retain their last value, and the next press re-sends the same
  body. The same bug exists in addEducation / addProject / addLink.
- **The `phase-6-rounded-profile` openSpec change is still active
  and unarchived** even though PRs #33 and #34 already merged
  the implementation.

The repo state on `main` supports all of this cleanly: phases 0-5
are done and archived, the frozen `shared/api/*Contract.java`
interfaces are stable, ArchUnit already enforces the
Controller→Service→Repository layering, the existing
`EmployeeApi` already wraps `GET /api/v1/employees`, and the
`/api/v1/employees/{id}/profile` route and `ProfilePage` component
already exist for ATSE1-32 to reuse.

## Goals / Non-Goals

**Goals:**

- Restore a reload / deep-link navigable session without changing
  the JWT shape, the interceptor, or the auth-guard flow.
- Make `/employees` a pure directory and expose the current-user
  profile at a single, predictable URL.
- Make interaction history a first-class editable surface and let
  a logged interaction spawn a task in one click.
- Replace every place that shows an employee id with a name-bearing
  picker backed by the real `GET /api/v1/employees` data.
- Make task creation succeed for the seeded admin and persist the
  `title` field that the frontend already sends.
- Add a checklist to tasks.
- Make the portfolio add-* forms append a fresh row per submission.
- Reconcile the stale `phase-6-rounded-profile` openSpec change and
  archive it.

**Non-Goals:**

- Touching the frozen `shared/api/*Contract.java` interfaces.
- Editing `backend/src/main/resources/db/changelog/master.yaml`.
- Replacing the JWT scheme (no refresh tokens, no cookies, no
  server-side sessions).
- Building a per-user preferences layer (theme, locale, etc.) —
  the persistence layer in §2 is explicitly scoped to the auth
  token.
- Migrating the seeded portfolio data; subtasks are additive.
- Adding an admin override UI for "complete when not all items
  are complete" — the override is a backend boolean
  `Task.allowPartialComplete` (default false), settable via
  `PUT /api/v1/tasks/{id}`; the UI exposes a checkbox in a
  follow-up.
- The Playwright snapshot retention (`.playwright-mcp/`) — it is
  committed as carry-in per user instruction, and a follow-up
  can `.gitignore` it.

## Decisions

- **D1: Persist the JWT in `localStorage` (not `sessionStorage`).**
  Cross-tab session continuity is the user-visible win (open a
  link in a new tab, still logged in). For a POC, a 24h
  expiration check on read-back is enough; a real refresh-token
  flow is out of scope. `localStorage` keeps the change small
  (no token encryption; the JWT is already a bearer token).
  Considered: `sessionStorage` (rejected: doesn't help deep
  links in new tabs); httpOnly cookie (rejected: requires
  backend changes outside the scope of this PR cluster).

- **D2: Reuse the existing `AuthState` signal and the existing
  `bearerAuthInterceptor`.** The interceptor already reads
  `AuthState.bearerToken()`; persistence just keeps the signal
  hydrated. No new abstractions (no `AuthPersistence` helper
  class) — the storage write/read is two lines in `login()` /
  `logout()` and a `try { storage.getItem('jwt') }` in the
  constructor. Considered: a `TokenStore` interface (rejected:
  over-engineered for two call sites and one test).

- **D3: Reuse the existing `ProfilePage` for the new `/profile`
  route** rather than building a new `YourDetailsPage`. The
  `ProfilePage` already supports the same fields the
  `EmployeeDetail` form supports (fullName, jobTitle, department,
  level, role). The route resolver looks up the current user's
  employee id from the JWT (via a new `AuthState.currentUserId()`
  derived signal) and passes it as a route param. The existing
  `authGuard` covers the route.

- **D4: New shared `EmployeePicker` component
  (`frontend/src/app/shared/forms/employee-picker/`).** Reused by
  the task create form (ATSE1-30) and indirectly by the
  interaction subject dropdown (ATSE1-33, which uses the
  underlying `EmployeeApi` rather than the picker). The picker
  uses `[(ngModel)]` (numeric id), renders the full name, loads
  via the existing `EmployeeApi` (no new service).

- **D5: `PATCH /api/v1/interactions/{id}` for ATSE1-28 with the
  same RBAC as the create endpoint.** Spring's
  `@PreAuthorize("hasAnyRole('ADMIN','USER')")` matches the
  rest of the controller and the seeded `admin@staff.eng` JWT.
  Non-admins are additionally restricted to rows where
  `facilitator_id == currentUserId` (enforced in the service
  layer, not in the predicate, so the 403 stays a 404 — no
  existence leak).

- **D6: Add `title` as a new column** (additive Liquibase
  `002-add-task-title.yaml`) rather than repurposing `description`.
  The frontend already sends `title`; the contract becomes
  consistent. Backfill seeded rows with `description` truncated
  to 64 chars in a follow-up changeset.

- **D7: New `task_item` table for subtasks** instead of a JSON
  array on `task` (the JPA / relational integrity is worth the
  one extra table). The entity lives in
  `com.staffengagement.task.domain` and follows the
  `portfolio-002-skills` sibling-table pattern. The
  `TaskSummary.items` field is an additive list. The "task is
  complete" rule is computed in the service
  (`TaskService.isComplete(task)`): true when all items are
  complete OR `task.allowPartialComplete == true`.

- **D8: Portfolio form-state fix by reading from the form
  template reference and calling `resetForm()`.** Each of the
  four add-* handlers becomes:
  ```
  const f = this.formRef.value;
  this.state.addX(employeeId, f).subscribe(() => this.formRef.resetForm());
  ```
  This is the smallest diff and matches the existing
  `addEducation` / `addProject` / `addLink` pattern (which
  were never broken because their `*FormModel` fields happen
  to be reassigned by a different code path). Considered:
  switching to `[(ngModel)]` two-way binding (rejected: bigger
  diff, no functional gain).

- **D9: Archive the `phase-6-rounded-profile` openSpec change
  to `openspec/changes/archive/2026-06-25-phase-6-rounded-profile/`.**
  Tick the items that PRs #33 and #34 satisfy, add a
  "Verified by merged PRs" header note, copy the directory to
  the date-prefixed archive path, then delete the active
  directory. Same pattern as the 2026-06-25
  `atse1-20-skills-backend` archive (commit `1cd6cff`).

## Risks / Trade-offs

- **[R1: `localStorage` is XSS-readable]** → Mitigation: the JWT
  is already a bearer token, so XSS exposure of the token is no
  worse than it is today. A real fix (httpOnly cookie) is out
  of scope.
- **[R2: Stale token on 401 (admin demoted, user deleted)]** →
  Mitigation: the interceptor on 401 clears the storage and
  redirects to `/login`. (The current `bearerAuthInterceptor`
  doesn't yet; this change adds it.)
- **[R3: `task_item` is a new cross-table JPA relationship]**
  → Mitigation: ArchUnit already enforces
  `task` cannot import another module's `repository/` or
  `domain/`; `task_item` stays in the same module so no rule
  change is required. The `TaskService` does the join in
  service code (anemic domain pattern).
- **[R4: `PATCH /api/v1/interactions/{id}` may mask earlier
  errors]** → Mitigation: the service re-fetches the row,
  enforces the RBAC, and emits 404 (not 403) on
  unauthorized edits to non-admins' rows.
- **[R5: Archive of `phase-6-rounded-profile` loses the open
  task boxes visually]** → Mitigation: the archive copy
  preserves the ticked boxes (the archive commit is the
  evidence), and the date-prefixed folder name keeps the
  traceability intact.
- **[R6: Adding `title` to the task table breaks the seed if
  the column is NOT NULL]** → Mitigation: the changeset adds
  the column with a default of `''` (empty string) and a
  follow-up backfill sets real titles for seeded rows.

## Migration Plan

- **Deploy** is the standard PR-merge into `main`. The
  Liquibase changesets run on backend startup; the openSpec
  archive is a directory rename (atomic on the same branch).
- **Rollback** is a `git revert` of the merge commit. The
  additive Liquibase changesets are forward-compatible (no
  destructive drops); the only risk is a partial revert of
  the `task_item` changeset, which is fine because the JPA
  entity lives in the same commit.
- **Data migration**: none. The `title` backfill is a
  best-effort derived from `description` and is safe to
  re-run.

## Open Questions

- Should the `/profile` route live at `/profile` or
  `/employees/:myId/profile`? The plan picks `/profile` with
  a resolver; both are valid. Settled by D3.
- Should the `task_item` endpoints require `ROLE_ADMIN` or
  inherit `hasAnyRole('USER','ADMIN')` from the parent task
  endpoint? Plan picks the latter (same RBAC as the parent
  task) for symmetry. Revisit if product wants a stricter
  per-item audit trail.
- Should the seeded admin's existing tasks get a default
  `title` backfilled from the first 64 chars of `description`?
  Plan says yes (low-risk, makes the bug visually disappear
  in the running app). Re-confirm in the §7 persona gate.
