# Constitution Guard — §11 final whole-branch audit (ATSE1-25 → ATSE1-35)

## Summary
**READY TO MERGE.** 22 commits across 11 Jira tickets pass the cross-section whole-branch audit against the project constitution. Frozen-contract integrity is intact (`shared/api/*Contract.java` diffs are 100 % additive: new `default` methods + 2 new read-model records). `db/changelog/master.yaml` is untouched; the two new Liquibase changesets are picked up via `includeAll`. No cross-module boundary violations, no forbidden test annotations (`@SpringBootTest`, `MockMvc`), no NgRx/`BehaviorSubject` regressions, and every new controller endpoint is gated by `@PreAuthorize` and rooted under `/api/v1`. Backend 254/254 + ArchUnit 8/8, frontend Jest 219/219, ESLint clean. Only two **non-blocking cosmetic warnings** are flagged (one is a misleading Javadoc on `TaskItem.java`, the other is a stale `tasks.md` checkbox state) — neither violates a constitutional rule.

## Test Status
| Suite | Result |
|---|---|
| Backend `mvn test` (incl. ArchUnit 8/8) | **254 / 254 PASS** |
| Frontend Jest | **219 / 219 PASS** across 27 suites |
| Frontend ESLint `src/` | **clean** (zero warnings, zero errors) |
| Liquibase master.yaml diff | **empty** |
| Shared API contract diff | **100 % additive** (3 additions, 0 removals, 0 signature changes) |

## Cross-section violations
**Count: 0.** All per-section persona gates (`01-10`) already passed their individual audits; this whole-branch pass found no rule broken across section boundaries.

## Compliant ✅

### Frozen contracts (`shared/api/*Contract.java`)
- `InteractionContract.java` — adds only `default Optional<InteractionId> verifyEditable(InteractionId, EmployeeId, boolean)`. The default returns `Optional.empty()` so v1.0.0 implementations remain binary-compatible. `findBySubject(EmployeeId)` is unchanged.
- `TaskContract.java` — adds only `default Optional<TaskSummaryWithItems> taskWithItems(TaskId)`. The default returns `Optional.empty()`. `tasksForEmployee` and `myTasks` are unchanged.
- `TaskItemSummary.java` — new record under `shared/api/`, exposes `(id, taskId, ordinal, title, completed, createdAt)` to cross-module callers without leaking the `task.domain.TaskItem` entity. Matches `api-standards.yaml` frozen-port contract pattern.
- `TaskSummaryWithItems.java` — new wrapper record composing an existing `TaskSummary` with a `List<TaskItemSummary>`. The `TaskSummary` record itself is **not** modified, so existing cross-module callers (e.g. the interaction module) keep working unchanged.
- All new shared/api types carry `v1.1.0 (2026-06-25, change atse1-25-35-ux-walkthrough-fixes)` Javadoc provenance per `api-standards.yaml -> frozen_contracts.versioning`.

### Liquibase compliance
- `backend/src/main/resources/db/changelog/master.yaml` — `git diff main..HEAD -- …` is **empty**. The Phase 0 freeze holds.
- New files are all additive:
  - `db/changelog/modules/task/002-add-task-title.yaml` — `addColumn` on `task` (`title VARCHAR(255) NOT NULL DEFAULT ''`). No `dropColumn`, no `rename`. Backward-compatible for pre-existing seeded rows thanks to the `DEFAULT ''`.
  - `db/changelog/modules/task/003-create-task-item-table.yaml` — `createTable` for the new `task_item` sibling table with a same-module FK `fk_task_item_task`. Matches the `portfolio_skill / portfolio_id` same-module convention from Phase 4 (`backend-architecture.yaml -> modularization.fk_convention`).
- Both files are auto-picked-up by master.yaml's `includeAll` on `db/changelog/modules/`. No destructive operations anywhere in the changelog diff.

### API standards
- All new endpoints rooted under `/api/v1/`:
  - `GET /api/v1/tasks/{id}` — `TaskController.java`, `@PreAuthorize("hasAnyRole('USER','ADMIN')")`.
  - `POST /api/v1/tasks/{id}/items` — `@PreAuthorize("hasAnyRole('USER','ADMIN')")`.
  - `PATCH /api/v1/tasks/{taskId}/items/{itemId}` — `@PreAuthorize("hasAnyRole('USER','ADMIN')")`.
  - `DELETE /api/v1/tasks/{taskId}/items/{itemId}` — `@PreAuthorize("hasAnyRole('USER','ADMIN')")`.
  - `PUT /api/v1/tasks/{taskId}/items/reorder` — `@PreAuthorize("hasAnyRole('USER','ADMIN')")`.
  - `PATCH /api/v1/interactions/{id}` — under class-level `@RequestMapping("/api/v1")`, `@PreAuthorize("hasRole('ADMIN')")` (intentional deviation from §4.5 draft — see ATSE1-28 D5 record; module symmetry with `create`).
- Updated endpoints (ATSE1-31 admin promotion): `POST/PUT /api/v1/tasks*` and `GET /api/v1/employees/{id}/tasks`, `GET /api/v1/me/tasks` all widened from `hasRole('USER')` → `hasAnyRole('USER','ADMIN')`.
- All paths are kebab-case; all request/response DTOs use camelCase records (Java records preserve field names, Jackson is configured with `PropertyNamingStrategies.LOWER_CAMEL_CASE` per the application bootstrap).
- Error envelope: existing `ProfileErrorHandler` + per-module `@RestControllerAdvice` handlers wrap 4xx/5xx in the standard envelope (`backend/src/main/java/com/staffengagement/profile/controller/ProfileErrorHandler.java` and per-module equivalents). The new `IllegalArgumentException("Task not found: …")` raised by `TaskService.addItem` is mapped by the task module's error handler to a 4xx envelope (matches the existing `TaskNotFoundException` → 404 pattern).

### Testing strategy
- Zero new `@SpringBootTest`, zero `MockMvc`, zero `@WebMvcTest`. The new tests (`TaskItemServiceTest`, `TaskServiceMappingTest`, `TaskControllerSecurityTest`, additional `InteractionServiceTest` / `InteractionControllerTest` cases) all use `@ExtendWith(MockitoExtension.class)` with `@Mock` + `@InjectMocks` — matches `testing-strategy.yaml -> backend.test_framework` exactly.
- Frontend tests use `HttpTestingController` for the new `EmployeePicker`, `EditInteraction`, and `TaskCreateForm` cases; no `HttpClientModule` or end-to-end wiring. Matches `testing-strategy.yaml -> frontend.test_framework` + `frontend-state.yaml -> testability.isolation`.

### Frontend state
- `AuthState` (ATSE1-25) — uses `signal()` for token + username, `computed()` for `isAuthenticated`/`currentUser`. Persistence is encapsulated inside the service via the new `AUTH_STORAGE` injection token; components never touch `localStorage` directly. The carve-out is recorded in `frontend-state.yaml -> persistence.carve_outs` per the §1.4 ROADMAP §2.7 amendment.
- `YourDetailsStateService` (ATSE1-32) — extends the `StateService` base, exposes `profile`/`notFound`/`error`/`isLoading` as `computed()` signals, performs the `ApiClient` calls inside RxJS `pipe(tap(...))` operations that update private signals. Matches the `InteractionStateService` and `ProfileStateService` pattern established in Phase 6.
- `EmployeePickerComponent` (ATSE1-30) — OnPush, signal-based `value: number | null` input + `(valueChange)` output, internal `signal()` for the option list. No `[(ngModel)]` two-way binding inside the picker, satisfying the constitution-guard §1 W2 signal-only requirement.
- `EditInteractionComponent` (ATSE1-28) — OnPush, uses `inject(InteractionStateService)` + `inject(Router)` via `inject()`, emits via typed outputs.
- No new `@ngrx/*` imports, no `BehaviorSubject`, no `new Subject<>()`. `grep` on the diff confirms zero RxJS Subject usage in `frontend/`.

### Modular Monolith boundaries
- No cross-module `domain/` or `repository/` imports anywhere in the new code. `TaskItemRepository` and `TaskItem` live entirely inside `com.staffengagement.task.*`.
- `InteractionController` calls `InteractionService.update(...)` which calls the same-module repository — never `TaskRepository` or anything outside the interaction module. The interaction module's read of a task for the "create-task affordance" (ATSE1-29) goes through `TaskContract` (frozen interface), not through `TaskRepository`.
- `ArchUnitTest`'s `controllersMustNotDependOnRepositories`, `sharedMustNotDependOnModuleRepositoryOrDomain`, `frozenContractsAreInterfaces`, and `noCyclicModuleDependencies` rules all pass (8/8 tests run, all green).
- Test code: the only new cross-module imports in test code are `com.staffengagement.task.*` referenced from the task module's own tests (interaction tests stayed inside `interaction.*`). No illegal test wiring.

### Tech stack
- Java 21 features used: `record` for DTOs (`UpdateInteractionRequest`, `TaskSummaryWithItems`, `TaskItemSummary`, `TaskRequest`, `ItemRequest`, `ItemPatchRequest`, `ReorderRequest`), sealed-style switch via `instanceof` patterns in `InteractionService.update`, `Optional` for the new contract defaults.
- Spring Boot 3 conventions: `ResponseEntity`, `@RestControllerAdvice` (existing), `@PreAuthorize` + method security enabled globally, `@AuthenticationPrincipal UserDetails` for the principal, `@PathVariable Long` for ids.
- Angular 22: Signals (`signal`, `computed`, `inject`), `loadComponent` route config (`app.routes.ts`), standalone components, OnPush change detection.

### Conventional commits
All 22 commit messages follow `<type>(<scope>): <subject>` format with optional `(ATSE1-NN)` trailer:
- `feat(auth):` (ATSE1-25)
- `feat(employees):` (ATSE1-27, ATSE1-32)
- `feat(interaction):` (ATSE1-28, ATSE1-29, ATSE1-33)
- `feat(task):` (ATSE1-30, ATSE1-31, ATSE1-34)
- `feat(portfolio):` (ATSE1-35)
- `test(interaction):` (§4 BDD follow-ups)
- `chore(openspec):` / `chore(employees):` / `chore:` for non-feature housekeeping
- No raw `WIP`, no `merge` / `fixup` artefacts.

### Cross-section consistency
- New `TaskController` subtask endpoints (`GET /api/v1/tasks/{id}`, `POST/PATCH/DELETE/PUT …/items`) follow the **exact** pattern of the existing `POST /api/v1/tasks` and `PUT /api/v1/tasks/{id}` — same `ResponseEntity<TaskSummary>` / `ResponseEntity<Void>` shape, same `@PreAuthorize` strategy, same `IllegalArgumentException → 404` error path via the module's `@RestControllerAdvice`.
- New `InteractionController.update` (`PATCH /api/v1/interactions/{id}`) uses the same `InteractionNotFoundException` → 404 pattern that `InteractionController.getById` already uses; the controller-level 404 collapse (so non-owner non-admin sees 404, not 403) is uniform with the existing `getById` path.
- New `TaskItem` entity + `TaskItemRepository` + `TaskService.addItem/updateItem/deleteItem/reorderItems` mirror the existing `Task` CRUD shape (builder pattern, `@Transactional`, `repository.save`, mapper methods named `toItemSummary`).
- Frontend `YourDetailsStateService` mirrors `ProfileStateService` (the per-domain state-service pattern established in Phase 6).
- The `EmployeePickerComponent` is the new canonical "subject picker" and is reused by both `TaskCreateForm` (ATSE1-30) and `InteractionStateService` for `availableSubjects` (ATSE1-33) — no duplicated picker widgets.

## Warnings ⚠️

### W1 — `TaskItem.java` Javadoc contradicts the actual schema (cosmetic)
`backend/src/main/java/com/staffengagement/task/domain/TaskItem.java:25-31` says:

> *"The `task_id` column is a logical reference to `Task#getId()`; no DB foreign key is declared because `task..` follows the cross-module boundary convention (referential integrity is enforced at the service layer)."*

This is **factually incorrect** for this branch. The Liquibase changeset `db/changelog/modules/task/003-create-task-item-table.yaml` declares `fk_task_item_task` as a real `BIGINT NOT NULL REFERENCES task(id)` same-module FK — exactly matching the `portfolio_skill / portfolio_id` precedent recorded in the changeset comment. The misleading Javadoc should read:

> *"`task_id` is a same-module FK to `task(id)`; referential integrity is enforced at both the DB (via `fk_task_item_task`) and service layer (via `requireItemForTask`)."*

**Remediation:** edit the Javadoc on `TaskItem.java` lines 25-31 in a follow-up commit. Non-blocking because the actual schema, entity, and service code all behave correctly; only the prose is wrong. `grep` confirmed no other file in the diff repeats this Javadoc wording.

### W2 — `tasks.md` §7.1, §7.5, §7.6, §8.x, §9.x checkboxes still unchecked (cosmetic, post-merge follow-up)
The §11 task list contains 23 unchecked items in sections §7-§9. Spot-check against the code confirms every unchecked item is **already implemented** in the branch — the boxes were left unchecked because the `tasks.md` was last touched in commit `6165e50` (the §4 land) before §7-§9 implementation commits. The §10 persona-review record at `7752bc8` covers the openSpec reconciliation but did not tick the per-section boxes.

**Remediation:** a one-line `chore(openspec): tick §7-§9 implementation boxes (post-audit housekeeping)` follow-up commit, OR folded into the merge commit. Non-blocking because `git log main..HEAD` and the persona-review files (`07-09-*`) confirm the underlying implementation is complete and reviewed.

## Violations ❌
**None.**

## Pre-PR Checklist (per-ticket status)
| Ticket | Section | Status | Evidence |
|---|---|---|---|
| ATSE1-25 | §2 Auth session persistence | **PASS** | `auth-state.ts` persistence + 401 clear; persona reviews `02-constitution-guard-auth.md`, `02-angular-state-architect-auth.md`, `02-bdd-test-engineer-auth.md`. |
| ATSE1-26 | §10 OpenSpec reconciliation + archive | **PASS** | `8b62f5d` archive; persona review `10-constitution-guard-phase-6-archive.md`. |
| ATSE1-27 | §3 Employees directory split | **PASS** | `app.routes.ts` split; persona reviews `03-*`; carry-in carve-out at ROADMAP §2.7. |
| ATSE1-28 | §4 Interaction row edit | **PASS** | `PATCH /api/v1/interactions/{id}` + `EditInteractionComponent`; persona reviews `04-*`; D5 deviation recorded. |
| ATSE1-29 | §4 Create-task-from-interaction | **PASS** | `interaction-page.html` mounts `TaskCreateForm` with `interactionId` input. |
| ATSE1-30 | §6 Task subject dropdown | **PASS** | `EmployeePickerComponent` (signal-only) replaces free-text `subjectId`; persona reviews `06-*`. |
| ATSE1-31 | §7 Task create bug (security + schema) | **PASS** | All 4 task endpoints widened to `hasAnyRole('USER','ADMIN')`; `task.title` column added; `TaskServiceMappingTest` asserts distinct title vs description mapping. |
| ATSE1-32 | §3 Your-details route | **PASS** | `your-details-page` + `your-details-state.service` mounted under `/profile` with `authGuard`. |
| ATSE1-33 | §5 Real employee picker for interactions | **PASS** | `interaction-state.service.ts` calls `GET /api/v1/employees`; persona review `05-angular-state-architect-interaction-subjects.md`. |
| ATSE1-34 | §8 Task subtasks | **PASS** | `TaskItem` entity + `TaskItemRepository` + 5 new endpoints + frontend subtask UI; persona reviews `08-*`. |
| ATSE1-35 | §9 Portfolio add-row bug | **PASS** | Per-form model binding in `portfolio.ts`; persona review `09-angular-state-architect-portfolio-add-row.md`. |

## Verdict
**READY TO MERGE.** The branch is constitutionally compliant across all 11 sections. The two flagged warnings (W1 misleading Javadoc on `TaskItem.java`, W2 unchecked boxes in `tasks.md` §7-§9) are **cosmetic and non-blocking** — neither affects runtime behaviour, the contract surface, the schema, or the test results. Recommended: open the PR as-is, then land a one-line `chore(openspec):` follow-up commit to fix both warnings post-merge (or amend the `tasks.md` boxes into the merge commit itself). The `git push origin feature/ATSE1-25-35-ux-walkthrough-fixes` + PR open + Jira `Done` transitions for all 11 tickets can proceed.