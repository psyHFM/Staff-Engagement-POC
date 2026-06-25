## 1. OpenSpec proposal + carry-in

- [x] 1.1 Create feature branch `feature/ATSE1-25-35-ux-walkthrough-fixes` from `origin/main`
- [x] 1.2 Commit the carry-in (prompts/hendrik-muller.md, .claude/plans/atse1-skills-persona-reviews, .playwright-mcp, failure_logs.txt, notes)
- [x] 1.3 Run `/openspec-propose atse1-25-35-ux-walkthrough-fixes`; write proposal.md, design.md, tasks.md, and 10 specs/*/spec.md files
- [x] 1.4 Append a coordination-points entry to `.claude/constitution/ROADMAP.md` for this UX-walkthrough-fixes cluster (also covers the auth-persistence carve-out and the additive `InteractionContract.verifyEditable` / `TaskContract.taskWithItems` extensions) — landed in `1cd6cff`-style follow-up commit (ROADMAP §2.1 frontend block + new §2.7 "Post-Phase-6 carve-outs" register; 0 violations across all 3 §3 personas)
- [x] 1.5 Spawn `constitution-guard` persona to audit the proposal/design/tasks/specs; record findings in `persona-reviews/01-constitution-guard-proposal.md` (5 blocking violations + 8 warnings + 18 compliant items; all 5 blocking fixes committed in `a1917b7`: constitution YAML/MD carve-outs, signal-only EmployeePicker, additive `TaskSummaryWithItems` wrapper, additive `InteractionContract.verifyEditable`)

## 2. Auth session persistence (ATSE1-25)

- [x] 2.1 Modify `frontend/src/app/shared/auth/auth-state.ts` — write the JWT to `localStorage` under `staff-engagement.auth.jwt` in `login()`; clear it in `logout()`; re-hydrate the token signal in the constructor
- [x] 2.2 Update the doc comment on `auth-state.ts:11-13` (no longer "no persistence") and on `state.service.ts:14`
- [x] 2.3 Add a 401-clears-storage handler in the `bearerAuthInterceptor` (or a sibling interceptor) that removes the storage entry and routes to `/login`
- [x] 2.4 Update `frontend/src/app/shared/auth/auth-state.spec.ts` with BDD specs: token round-trips on login, logout clears storage, cold-start hydrates from storage, 401 clears storage
- [x] 2.5 Add `e2e/tests/auth-persistence.spec.ts` Playwright smoke (login → reload → still on /dashboard)
- [x] 2.6 Persona gate: spawn `constitution-guard`, `angular-state-architect`, `bdd-test-engineer`; record findings in `persona-reviews/02-*` (0 violations across all three — see 02-constitution-guard-auth.md, 02-angular-state-architect-auth.md, 02-bdd-test-engineer-auth.md)

## 3. Employees directory + Your-details split (ATSE1-27, ATSE1-32)

- [x] 3.1 Delete the "Your profile" section from `frontend/src/app/features/employee/employee.html:28-49`
- [x] 3.2 Strip `ownProfile`, `onCreated`, `onUpdateOwn`, and the `EmployeeCreateForm` + `EmployeeDetail` imports from `frontend/src/app/features/employee/employee.ts:5-6, 40-47, 72-84`
- [x] 3.3 Slim `frontend/src/app/features/employee/employee.spec.ts` (drop the deleted-component specs)
- [x] 3.4 Add a `currentUserId()` derived signal on `AuthState` (parses the JWT subject claim) — implemented as `currentUserSubject` (the JWT `sub` is the email, not the numeric id; the directory filter is done client-side in `YourDetailsStateService.loadCurrent`)
- [x] 3.5 Add `{ path: 'profile', loadComponent: …, canActivate: [authGuard] }` to `app.routes.ts` that resolves the current user id and mounts the existing `ProfilePage` — routes to a new lazy-loaded `YourDetailsPage` component
- [x] 3.6 Turn `<span class="shell__user">` in `frontend/src/app/shell/shell.html:18` into an `<a routerLink="/profile">`
- [x] 3.7 Update `frontend/src/app/shell/shell.spec.ts` to assert the new link
- [x] 3.8 Persona gate: spawn `constitution-guard`, `angular-state-architect`, `bdd-test-engineer` (0 violations / 9 warnings / 23 compliant across all three — see 03-constitution-guard-employees.md, 03-angular-state-architect-employees.md, 03-bdd-test-engineer-employees.md; the one blocking W1 from the architect — `onCreated()` no-op — is fixed in the follow-up commit along with W2-W4 from the BDD engineer and the ROADMAP §2.1 / §2.7 amendment)

## 4. Interaction row edit + create-task-from-interaction (ATSE1-28, ATSE1-29)

- [x] 4.1 Add `@Output() rowEdit` and `@Output() createTask` to `frontend/src/app/features/interaction/interaction-list/interaction-list.ts:26`
- [x] 4.2 Add Edit and "Create task" buttons inside the `@for` block at `interaction-list.html:20-34`
- [x] 4.3 Wire the new outputs in `frontend/src/app/features/interaction/interaction-page/interaction-page.{ts,html}`; mount the existing `TaskCreateForm` with `interactionId` input
- [x] 4.4 Refactor `frontend/src/app/features/task/task-create-form.ts` to accept an optional `interactionId` input — the form already had this (line 116) and is wired to `sourceInteractionId`; no change needed
- [x] 4.5 Add `PATCH /api/v1/interactions/{id}` to `backend/src/main/java/com/staffengagement/interaction/controller/InteractionController.java` — annotated `hasRole('ADMIN')` at the controller boundary (matching the rest of the module); the service `update()` checks the actor's facilitator ownership for non-admins so the controller RBAC stays simple. **Spec deviation:** this differs from §4.5's draft `hasAnyRole('ADMIN','USER')` — see the design decision recorded in the controller javadoc; preserves module symmetry with `create`.
- [x] 4.6 Add `update(id, type, note, actor, isAdmin)` to `backend/.../interaction/service/InteractionService.java` with admin-any / non-admin-own RBAC (404 on non-own for non-admin) and 404 on absent
- [x] 4.7 No JPA / Liquibase change for interaction; the existing `type` and `note` columns are reused
- [x] 4.8 BDD specs: `InteractionServiceTest` (8 new cases), `InteractionControllerTest` (4 new cases); `interaction-list.spec.ts` (5 new cases); `interaction-page.spec.ts` (5 new cases); `interaction-state.service.spec.ts` (7 new cases); `edit-interaction.spec.ts` (6 new cases). All 32 backend interaction tests + 50 frontend interaction tests pass.
- [x] 4.9 Persona gate: spawn `constitution-guard`, `constitutional-backend-developer`, `angular-state-architect`, `bdd-test-engineer` — see `persona-reviews/04-*.md`
- [x] 4.10 Address BDD engineer §4 non-blocking warnings: W1/W2/W3 (backend `InteractionServiceTest`: backdated-fixture `isAfter`, `note=null/""`, partial-update), W4 (frontend `interaction-page.spec.ts` loadHistory NOT-called on cancel/save), W6 (frontend `interaction-state.service.spec.ts` `isLoading()` flip-false on update success), W7 (frontend `edit-interaction.spec.ts` submit happy-path), W8 (frontend `edit-interaction.spec.ts` Escape close), F1 (frontend `interaction-list.spec.ts` `not.toBeNull()` empty-state assertion). Backend 34/34 + frontend 53/53 + ng lint clean.

## 5. Real employee picker for interactions (ATSE1-33)

- [x] 5.1 Replace the hardcoded `availableSubjects` stub in `interaction-state.service.ts:38-43` with a real call to `GET /api/v1/employees` via the injected `ApiClient` — projection from `EmployeeResponse` to the lightweight `EmployeeOption` shape
- [x] 5.2 Update `defaultFacilitator()` doc comment in `interaction-state.service.ts` — keep the seeded admin/employee email→id fallback; the directory list is now the source of truth once `loadSubjects()` runs
- [x] 5.3 `log-interaction.html:14-21` and `interaction-page.html:9-16` already render `fullName` in the `<option>` label; no markup change needed
- [x] 5.4 Replaced the "exposes the stub employee list" spec with three new specs: empty-by-default, `loadSubjects` GET shape + projection, `loadSubjects` surfaces API error
- [x] 5.5 Persona gate: spawn `angular-state-architect` — see `persona-reviews/05-angular-state-architect-interaction-subjects.md` (PASS / LANDABLE, 0 violations, 5 low-severity warnings noted for future work: magic page-size, JSDoc-coupled invariant, empty-state pre-select UX, missing overlapping-call spec, no `takeUntilDestroyed`)

## 6. Task subject dropdown (ATSE1-30)

- [x] 6.1 Create `frontend/src/app/shared/forms/employee-picker/` with selector `app-employee-picker`, signal input `value: number | null`, output `valueChange: EventEmitter<number | null>`; signal-only (no `[(ngModel)]` two-way binding inside the picker)
- [x] 6.2 The picker loads `GET /api/v1/employees` directly via the existing `ApiClient`; OnPush; placeholder "Loading employees…" while loading, inline error message on GET failure
- [x] 6.3 Replace the free-text `<input id="subjectId">` in `task-create-form.ts` with `<app-employee-picker [value]="..." (valueChange)="onSubjectChange($event)">`; `Task.subjectId` / `CreateTaskRequest.subjectId` widened from `string` to `number`
- [x] 6.4 Added `employee-picker.spec.ts` (5 BDD specs: first-paint fetch, rendered option count, pre-select after load, valueChange emit, API error surfacing)
- [x] 6.5 Updated `task-create-form.spec.ts` to assert the picker mounts, request.subjectId becomes numeric, POST body has a *number* subjectId
- [ ] 6.6 Persona gate: spawn `angular-state-architect`, `bdd-test-engineer`

## 7. Task create bug — security + schema (ATSE1-31)

- [ ] 7.1 Change every `@PreAuthorize("hasRole('USER')")` in `backend/src/main/java/com/staffengagement/task/web/TaskController.java:47,85,92,98` to `hasAnyRole('USER','ADMIN')`
- [ ] 7.2 Add a `title` column (VARCHAR(255) NOT NULL DEFAULT '') to `backend/src/main/java/com/staffengagement/task/domain/Task.java`
- [ ] 7.3 Add `db/changelog/modules/task/002-add-task-title.yaml` (id `task-002-add-task-title`, additive, master.yaml untouched)
- [ ] 7.4 Add `String title` to the `TaskRequest` record in `TaskController.java:106`; require it via Bean Validation
- [ ] 7.5 Fix `TaskService.toSummary` at lines 54-63 to map `title` and `description` separately (no more duplicate mapping)
- [ ] 7.6 Add a backfill Liquibase step (or seed update) that sets a default `title` for existing seeded rows (truncate `description` to 64 chars)
- [ ] 7.7 New `TaskControllerSecurityTest` (BDD) — `ROLE_ADMIN → 200` on `POST /api/v1/tasks`; `ROLE_USER → 200`; missing role → 401/403
- [ ] 7.8 New `TaskServiceMappingTest` (BDD) — title and description are mapped to distinct fields
- [ ] 7.9 Persona gate: spawn `constitution-guard`, `constitutional-backend-developer`, `modular-monolith-architect`, `bdd-test-engineer`

## 8. Task subtasks (ATSE1-34)

- [ ] 8.1 Create `backend/src/main/java/com/staffengagement/task/domain/TaskItem.java` (id, taskId, ordinal, title, completed, createdAt)
- [ ] 8.2 Add `db/changelog/modules/task/003-create-task-item-table.yaml` (sibling-table + same-module FK; master.yaml untouched)
- [ ] 8.3 Create `backend/src/main/java/com/staffengagement/task/repository/TaskItemRepository.java`
- [ ] 8.4 Add `addItem`, `updateItem`, `deleteItem`, `reorderItem` methods to `TaskService`; expose `items` on `TaskSummary` (additive field on `shared/api/TaskSummary.java`)
- [ ] 8.5 Add endpoints to `TaskController`:
  `POST /api/v1/tasks/{id}/items`,
  `PATCH /api/v1/tasks/{taskId}/items/{itemId}`,
  `DELETE /api/v1/tasks/{taskId}/items/{itemId}`,
  `PUT /api/v1/tasks/{taskId}/items/reorder`
  All annotated `hasAnyRole('USER','ADMIN')` (same RBAC as parent task)
- [ ] 8.6 Implement `isComplete(task)` rule (all items completed OR `allowPartialComplete`)
- [ ] 8.7 Add BDD specs for the new endpoints (controller + service)
- [ ] 8.8 Frontend: add `TaskItem` to `task.model.ts`; render subtasks under each task in `task.ts`; new `task-item-list` and `task-item-form` components with BDD specs
- [ ] 8.9 Persona gate: spawn `constitutional-backend-developer`, `modular-monolith-architect`, `bdd-test-engineer`

## 9. Portfolio add-row bug (ATSE1-35)

- [ ] 9.1 Refactor `frontend/src/app/features/portfolio/portfolio.ts:41-46, 148-160, 195` to read form values from the template reference (`#skillForm.value`, etc.) and call `resetForm()` after success
- [ ] 9.2 Apply the same fix to `addEducation`, `addProject`, `addLink`
- [ ] 9.3 Disable the submit button while the request is in-flight (prevents rapid double-click duplicates)
- [ ] 9.4 Update `portfolio.spec.ts` and `portfolio-state.service.spec.ts` to cover "second add appends a new row" and "double-click does not duplicate"
- [ ] 9.5 Persona gate: spawn `angular-state-architect`, `bdd-test-engineer`

## 10. OpenSpec reconciliation (ATSE1-26)

- [ ] 10.1 Tick off the items in `openspec/changes/phase-6-rounded-profile/tasks.md` that landed in PR #33 / #34 (§1-§6, §10.1-10.2, plus §7-§9 for the frontend)
- [ ] 10.2 Add a "Verified by merged PRs #33 + #34" header note to `phase-6-rounded-profile/tasks.md`
- [ ] 10.3 Copy `openspec/changes/phase-6-rounded-profile/` to `openspec/changes/archive/2026-06-25-phase-6-rounded-profile/`
- [ ] 10.4 Delete the active `phase-6-rounded-profile/` directory
- [ ] 10.5 Persona gate: spawn `constitution-guard` to confirm the archive matches the codebase truth

## 11. Final verification + PR

- [ ] 11.1 Run `mvn clean test` in `backend/` (all BDD specs green)
- [ ] 11.2 Run `mvn jacoco:report` (coverage >= 80%) and PITest (mutation >= 80%) where available
- [ ] 11.3 Run `npm test` in `frontend/` (Jest specs green) and `npm run coverage` (Istanbul >= 80%)
- [ ] 11.4 Run `npx stryker run` (Stryker >= 80%)
- [ ] 11.5 Run `npm run lint`
- [ ] 11.6 Run `npx playwright test e2e/tests/` against `docker compose up -d`; new `auth-persistence.spec.ts` must pass
- [ ] 11.7 Spawn the final `constitution-guard` + `bdd-test-engineer` audits on the full branch diff
- [ ] 11.8 Push the branch; open the PR with per-ticket checklist + "closes #ATSE1-25" … "closes #ATSE1-35" footers
- [ ] 11.9 Transition all 11 Jira tickets to Done via `mcp__plugin_atlassian_atlassian__transitionJiraIssue`
