# Modular Monolith Architect — ATSE1-34 (Task Subtasks) Audit

**Commit:** `891c465` — feat(task): checklist sub-items with ordinal re-numbering (ATSE1-34)
**Auditor:** modular-monolith-architect persona
**Scope:** `com.staffengagement.task..` only (additive sibling-table feature)

---

## Verdict: **LANDABLE**

All checks green. ArchUnit 8/8, full suite 254/254. Module isolation
holds, schema is additive, FK is same-module, layered architecture is
preserved, frozen contracts untouched. Follow-ups below are optional
polish, not blockers.

---

## Compliant

- **Test gates:** `./mvnw test -Dtest='ArchUnitTest'` → **8/8 green**;
  `./mvnw test` → **254/254 green** (incl. 16 new
  `TaskItemServiceTest` specs).
- **Module isolation (ArchUnit denylist enforced):** every
  `com.staffengagement.*` import added in this commit resolves to one of
  the three allowed destinations:
  - `com.staffengagement.task.domain.{Task, TaskItem}` — own module
  - `com.staffengagement.task.repository.{TaskRepository, TaskItemRepository}` — own module
  - `com.staffengagement.shared.api.{TaskContract, TaskItemSummary, TaskSummaryWithItems}` — frozen contracts
  - `com.staffengagement.shared.kernel.TaskId` — kernel id

  Zero hits on `employee..`, `interaction..`, `portfolio..`, `skills..`,
  `profile..`, `shared.error..`, `shared.security..`, `shared.health..`.
- **Liquibase module discipline:**
  - New file: `backend/src/main/resources/db/changelog/modules/task/003-create-task-item-table.yaml`
  - Lives under the per-module `modules/task/` directory picked up by `master.yaml`'s `includeAll` on `db/changelog/modules/`.
  - `master.yaml` is **untouched** in this commit (verified via
    `git show --stat 891c465 -- .../master.yaml` → empty).
  - Changeset id is module-prefixed and kebab-case:
    `task-003-create-task-item-table` (matches the
    `portfolio-001-initial.yaml` / `task-001-...` convention).
- **Schema safety (additive only):** only `createTable` (with an inline
  column-level `references:` FK). No `dropColumn`, `dropTable`,
  `renameColumn`, `modifyDataType`, or post-creation `addForeignKey`.
- **FK convention:** `task_item.task_id → task(id)` is a **same-module
  FK** (both tables owned by `task..`). No cross-module FK. The FK is
  declared inline in `createTable` with `foreignKeyName: fk_task_item_task`,
  matching the `portfolio_skill / portfolio_id` convention referenced
  by the changeset comment.
- **Layered architecture:**
  - `TaskController` never imports or references `TaskItemRepository`
    (verified via Grep — no matches in
    `backend/src/main/java/com/staffengagement/task/web/TaskController.java`).
  - All subtask endpoints (`GET /tasks/{id}`, `POST /tasks/{id}/items`,
    `PATCH /tasks/{taskId}/items/{itemId}`,
    `DELETE /tasks/{taskId}/items/{itemId}`,
    `PUT /tasks/{taskId}/items/reorder`) delegate to `TaskService`
    methods (`taskWithItems`, `addItem`, `updateItem`, `deleteItem`,
    `reorderItems`).
  - `TaskItemRepository` is referenced from only **two** files:
    `TaskService.java` and `TaskItemServiceTest.java`. No controller,
    no other module.
- **Frozen contracts:** `shared/api/TaskSummary.java` and
  `shared/api/TaskContract.java` are **untouched** in this commit
  (`git show --stat 891c465 -- backend/src/main/java/com/staffengagement/shared/api/`
  → empty). The new cross-module read path `taskWithItems(TaskId)` is
  the additive `default` already declared on `TaskContract` (verified at
  `TaskContract.java:34`). `TaskSummaryWithItems` and `TaskItemSummary`
  are pre-existing frozen wrappers.
- **Cross-module access path:** the only public way for any other module
  to read subtasks is `TaskService.taskWithItems(TaskId)` returning
  `Optional<TaskSummaryWithItems>` (a `shared.api.*` type). The internal
  `TaskItemRepository` lives in `task.repository..` and is not part of
  the `shared.api` surface — ArchUnit's denylist would block any
  cross-module import of it.
- **URL casing / versioning:** every new endpoint uses kebab-case and
  the `/api/v1/` prefix
  (`/api/v1/tasks/{id}/items`, `/api/v1/tasks/{taskId}/items/{itemId}`,
  `/api/v1/tasks/{taskId}/items/reorder`).
- **Test fidelity:** 16 specs in `TaskItemServiceTest` cover
  addItem (empty + populated + unknown task), updateItem (both fields,
  partial, cross-task reject), deleteItem (re-numbering, cross-task
  reject), reorderItems (apply, foreign id reject, unknown task reject),
  taskWithItems (present, absent), isComplete (task-flag, strict,
  partial). Matches the commit message and the brief.

## Warnings

- (None of substance.) Two cosmetic notes, neither blocking:

## Violations

- None.

## Recommended follow-ups (optional, post-merge)

1. **TaskItemRepository accessibility vs. ArchUnit scope:** The
   interface is `public` (required by Spring Data), so the class is
   reachable from any other module in principle. ArchUnit's task
   denylist already covers `task.repository..` indirectly via the
   "dependOnClassesThat.resideInAnyPackage" guard on sibling modules,
   but a future cross-module consumer could in principle type
   `com.staffengagement.task.repository.TaskItemRepository` in a test
   helper. Consider a one-line Javadoc on the interface reiterating
   "package-private in spirit — cross-module callers must use
   `TaskService.taskWithItems(TaskId)`". No code change required.
2. **Re-numbering in `deleteItem` / `reorderItems` does N+1 writes:**
   `TaskService.deleteItem` iterates remaining items calling
   `taskItemRepository.save(it)` per row, and `reorderItems` does the
   same for every changed ordinal. Functional and tested, but if a task
   ever grows a large checklist this becomes chatty. A future
   optimization is a single bulk-update query. Not a modular-monolith
   concern — flagging for future scaling.
3. **Inline FK vs. explicit `addForeignKey`:** The new changeset declares
   the FK inline under `createTable → column → constraints → references`.
   The schema file for portfolio's `portfolio_skill` already follows
   the same inline convention, so this is consistent. If the team ever
   standardizes on `addForeignKey` for naming consistency, both modules
   would migrate together.
4. **`isComplete` lives on `TaskService` (state-aware) rather than on
   the entity:** this is the right call (it needs the repository for
   items), but it means a future `Task.isComplete()` entity helper
   would re-introduce a layer violation if it ever loaded items
   directly. The current Javadoc on `isComplete` already calls this
   out — keep it.

---

**Audit complete. Verdict: LANDABLE.**
