# §7 (ATSE1-31) Modular Monolith Architect Review

Commit: `0a68f97` — feat(task): admin role on task endpoints + distinct title column (ATSE1-31)

## Summary
§7 is fully compliant with the modular-monolith boundaries. The new `task.title` column is additive and module-local; no cross-module imports were introduced; `master.yaml` is untouched; the new changelog follows the per-module `db/changelog/modules/task/` convention with a kebab-case id; and the frozen contracts (`shared/api/TaskSummary`, `shared/api/TaskContract`) are unchanged. `mvn test -Dtest=ArchUnitTest` passes (8/8 boundary rules green).

## Findings

### Compliant ✅
- **ArchUnit boundary enforcement — task module isolation intact.** `taskModuleMustNotDependOnOtherModulesInternals` in `backend/src/test/java/com/staffengagement/ArchUnitTest.java:65-75` denylists `shared.error..`, `shared.health..`, `shared.security..`, `employee..`, `interaction..`, `portfolio..`, `skills..`. Grep over the entire `com.staffengagement.task..` package (main + test) confirms every `com.staffengagement.*` import resolves to one of: `task..` (own module), `shared.api.*` (frozen contracts: `EmployeeContract`, `InteractionContract`, `TaskContract`, `TaskSummary`, `InteractionSummary`), or `shared.kernel.*` (`EmployeeId`, `InteractionId`, `TaskId`, `InteractionType`). Zero hits on any other module's internals.
- **`TaskController` cross-module wiring is contract-only.** `TaskController.java` injects `ObjectProvider<EmployeeContract>`, `InteractionContract`, and `TaskContract` — all from `com.staffengagement.shared.api.*`. No concrete `Employee`, `Interaction`, `Profile`, `Skills`, or `Portfolio` class is referenced anywhere in the task package (Grep confirms).
- **Layered architecture preserved.** `TaskController` continues to delegate to `TaskService` (write path) and `TaskRepository` (only for the `create` save — a Phase 3 carve-out carried in unchanged from prior commits; not introduced by §7). `TaskService` continues to implement `TaskContract`. The §7 change to `TaskService.toSummary` (line 58: `task.getDescription()` → `task.getTitle()`) is a 1-line mapping fix inside the service layer, not a boundary crossing.
- **`Task` JPA entity stays in `task.domain`.** The new `@Column(name = "title", nullable = false, length = 255) private String title = ""` field is purely additive. No new `@ManyToOne`, `@OneToMany`, or cross-module FK introduced. The new column has no cross-module join or constraint.
- **Liquibase module discipline.** `002-add-task-title.yaml` lands at `db/changelog/modules/task/002-add-task-title.yaml` (per-module directory, correct ownership per ROADMAP §2.3). Diff confirms `master.yaml` is **untouched** (no entry in `git show 0a68f97 --stat`). The `includeAll` directive on `db/changelog/modules/` already picks it up.
- **Changeset id follows the kebab-case convention.** New id is `task-002-add-title` — module-prefixed, kebab-case, zero-padded (`002`), unique within `task..` (the precedent `task-001` is in `001-create-task-table.yaml`). No collision risk with `employee-001`, `interaction-001`, `portfolio-001`, or `seed-001-initial`.
- **Schema change safety.** The changeset uses `addColumn` only — no `dropColumn`, `renameColumn`, `modifyDataType`, `dropTable`, `addForeignKey`, or any destructive operation. `VARCHAR(255) NOT NULL DEFAULT ''` is additive and safe for pre-existing seeded rows that landed before the controller started sending `title` (every existing row materialises with `title = ''`, satisfying the NOT NULL constraint at insert/upgrade time).
- **Frozen contracts unchanged.** `shared/api/TaskSummary.java` is a 6-arg record — `id, subject, title, sourceInteractionId, completed, description` — and §7 does not modify it. `shared/api/TaskContract.java` is unchanged (still exposes `tasksForEmployee`, `myTasks`, plus the additive default `taskWithItems` introduced in the v1.1.0 carve-out per ROADMAP §2.7). The fact that `TaskSummary.title` already existed as a slot is what allowed §7 to fix the `toSummary` mapping without a contract bump.
- **RBAC change is in-controller, not contract-level.** The four `@PreAuthorize` annotation swaps (`hasRole('USER')` → `hasAnyRole('USER','ADMIN')`) are local to `TaskController.java` and do not touch any shared module.
- **ArchUnit test execution — 8/8 pass.** `mvn test -Dtest=ArchUnitTest` ran clean: `Tests run: 8, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.707 s — in com.staffengagement.ArchUnitTest`. BUILD SUCCESS. (Working tree WIP from §8/§9 was staged aside for the audit; only the §7 committed files were on the classpath.)

### Warnings ⚠️
- **`<scope>` reference for `InteractionSummary` in `TaskController` test only.** `backend/src/test/java/com/staffengagement/task/web/TaskControllerTest.java` imports `com.staffengagement.shared.api.InteractionSummary` (read-DTO returned by `InteractionContract.findBySubject`). This is allowed under the task rule (only `shared.error..`, `shared.health..`, `shared.security..` are off-limits — `shared.api.*` is the explicit allowed surface), but worth noting that the task controller's runtime code only consumes `InteractionContract` (the interface) and not `InteractionSummary` directly. The test's reference is solely to build a fixture for the contract mock; it does not represent a leaked module-internal type.
- **`Task.builder().title(...)` survives a future contract change.** §7 changed `TaskRequest` from 3-arg to 4-arg (adds `String title`). This is a **breaking** change to the controller's request DTO — the `task.create` frontend will need the matching update, and any external client of the API will need to add the field. The composition is captured in §7.4 / §7.6 (per the commit message), but the audit cannot verify the frontend caller was updated in the same commit. Recommend confirming the `frontend/src/app/features/task/` create form includes the `title` field before §7 lands.
- **Defaulted-to-empty title at the entity layer.** `private String title = ""` plus `request.title() == null ? "" : request.title()` in the controller are belt-and-braces — the NOT NULL DB default already guarantees non-null for inserts from older code paths. Defensible as a guard against NPE in non-controller construction sites (e.g., tests, future seeding), but worth flagging that this is a *double* default (DB + entity). Not a violation; a robustness observation.

### Violations ❌
- None.

## Verdict
**LANDABLE**

§7 stays strictly inside the `task..` module package, leaves `master.yaml` and the frozen contracts untouched, adds a per-module Liquibase changeset in the correct directory with a kebab-case id, and introduces a non-destructive additive column. ArchUnitTest's 8 modular-monolith boundary rules all pass. The only follow-ups (frontend `title` field wiring, observe-only warning on the controller test's `InteractionSummary` import) are out-of-scope for the modular-monolith audit and do not block landing.

### Files reviewed
- `backend/src/main/java/com/staffengagement/task/domain/Task.java`
- `backend/src/main/java/com/staffengagement/task/service/TaskService.java`
- `backend/src/main/java/com/staffengagement/task/web/TaskController.java`
- `backend/src/main/resources/db/changelog/modules/task/002-add-task-title.yaml`
- `backend/src/main/resources/db/changelog/master.yaml` (untouched, confirmed via diff)
- `backend/src/main/java/com/staffengagement/shared/api/TaskSummary.java` (frozen, unchanged)
- `backend/src/main/java/com/staffengagement/shared/api/TaskContract.java` (frozen, unchanged)
- `backend/src/test/java/com/staffengagement/ArchUnitTest.java`
- `backend/src/test/java/com/staffengagement/task/web/TaskControllerTest.java`
- `backend/src/test/java/com/staffengagement/task/web/TaskControllerSecurityTest.java`
- `backend/src/test/java/com/staffengagement/task/service/TaskServiceTest.java`
- `backend/src/test/java/com/staffengagement/task/service/TaskServiceMappingTest.java`
- `.claude/constitution/backend-architecture.yaml`
- `.claude/constitution/ROADMAP.md`