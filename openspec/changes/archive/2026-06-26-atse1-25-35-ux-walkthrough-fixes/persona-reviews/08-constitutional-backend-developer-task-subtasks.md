# Constitutional Backend Developer — ATSE1-34 Task Sub-Items Audit

**Commit**: `891c465 feat(task): checklist sub-items with ordinal re-numbering (ATSE1-34)`
**Verdict**: **LANDABLE-WITH-FOLLOWUPS**
**Date**: 2026-06-25

## Test Suite Status
- `./mvnw test` → **254/254 green**, **ArchUnit 8/8 green**, **BUILD SUCCESS**.
- New suite `TaskItemServiceTest`: **16/16** specs pass (matches the 16-spec claim).
- No regressions in adjacent modules (task/controller, task/security, employee, portfolio, profile, shared, etc.).

## Compliant ✅

### Tech Stack / Idioms
- **Java 21 + Spring Boot 3.5 / Spring Security 6** conventions honored. All 9 endpoints on `TaskController` carry `@PreAuthorize("hasAnyRole('USER','ADMIN')")` with single-quoted, comma-separated roles — the canonical SpEL idiom that survives the seeded admin@staff.eng regression (ATSE1-31). Matches the existing pattern on `create`, `updateCompletion`, `getForEmployee`, `getMyTasks`.
- **Lombok** (`@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder`) on `TaskItem`, matching the existing `Task` entity convention.
- **Java time** via `Instant` for `created_at` with `updatable = false`, mirroring the `Task.createdAt` and `Interaction` convention (no DB default; entity stamps at construction).

### Liquibase Additive Change
- `task/003-create-task-item-table.yaml` is purely additive: only `createTable`. No `dropColumn`, `dropTable`, `renameColumn`, or `modifyDataType`. Module-local. Picked up by `master.yaml`'s `includeAll` so `master.yaml` itself is untouched (frozen per backend-architecture.yaml).
- `changeSet id: task-003-create-task-item-table` is unique (no collision with `task-001` / `task-002-add-task-title`).
- FK `fk_task_item_task` references `task(id)` **inside the same module** — same-module FK is allowed per the precedent set by `portfolio_skill` / `portfolio_education` / `portfolio_project` / `portfolio_link` in `portfolio-001-initial.yaml`. The cross-module "logical reference only" rule (task.subject_id → employee, task.source_interaction_id → interaction, portfolio.employee_id → employee) is NOT violated because `task_item.task_id → task.id` is intra-module.
- Column types, nullability, defaults (`completed boolean default false`), and length=255 on `title` all align with the JPA entity.

### JPA Entity
- `@Entity @Table(name = "task_item")` with auto-generated identity PK.
- `nullable = false` on `task_id`, `ordinal`, `title`, `completed`, `created_at` — matches the changeset constraints exactly.
- `length = 255` on `title` matches the `VARCHAR(255)` Liquibase declaration (idempotent).
- `getTaskId()` returns the typed `TaskId` wrapper while the field stays `Long` — preserves the existing `Task.getId()` / `Task.getSubjectId()` pattern.

### Service-Layer Purity
- **Cross-task safety**: `requireItemForTask(taskId, itemId)` is the single chokepoint — both `updateItem` and `deleteItem` route through it. Returns `IllegalArgumentException("Item " + itemId + " does not belong to task " + taskId)` when the item's `taskId` doesn't match the path variable.
- **No controller-side business logic**: the controller only delegates — verified by `grep -n "taskItemRepository" TaskController.java` returning zero hits. All sub-item logic lives in `TaskService` (the only place that imports `TaskItemRepository`).
- **Controller is a thin façade**: `addItem` / `updateItem` / `deleteItem` / `reorderItems` / `getWithItems` are 1-3 line passthroughs.
- **Frozen-contract safety**: `shared/api/TaskContract.java` retains the additive `default Optional<TaskSummaryWithItems> taskWithItems(TaskId)` declaration — no breaking signature change. `TaskSummary.java` untouched. `TaskItemSummary.java` and `TaskSummaryWithItems.java` are pre-existing records (v1.1.0 wrappers), not changed by this commit.
- **isComplete short-circuit**: when `task.isCompleted()` is true, the items repository is never consulted — verified by `TaskItemServiceTest.isComplete_returnsTrueWhenTaskFlagSet` which uses `verify(never()).findByTaskIdOrderByOrdinalAsc(any())`.
- **isComplete semantics**:
  - Empty items → `false` (task flag off, no items to complete — correct).
  - Strict mode (`allowPartialComplete=false`) → `items.stream().allMatch(TaskItem::isCompleted)`.
  - Partial mode (`allowPartialComplete=true`) → `items.stream().anyMatch(TaskItem::isCompleted)`.
- **reorderItems idempotency**: the `if (item.getOrdinal() != newOrdinal)` guard prevents a redundant `save()` when the ordinal already matches — verified by reading the implementation; the `findByTaskIdOrderByOrdinalAsc(taskId)` at line 185 is the post-state read so the controller's response is consistent.
- **reorderItems foreign-id rejection**: throws `IllegalArgumentException("Item " + id + " does not belong to task " + taskId)` before any `save()` — verified by `reorderItems_rejectsForeignItemId` test using `then(taskItemRepository).should(never()).save(any())`.
- **reorderItems append-untouched**: items not present in `itemIds` are appended in their existing order via the `if (!targetOrdinal.containsKey(...))` branch on lines 172-176. Preserves order from the initial `findByTaskIdOrderByOrdinalAsc` call.
- **deleteItem renumbering**: after `deleteById`, the remaining items are re-numbered contiguously starting at 0 via `for (int i = 0; i < remaining.size(); i++)`. Only items whose ordinal actually differs are re-saved (idempotent save guard).
- **addItem ordinal**: `max(existing) + 1` defaulting to 0 for an empty checklist — verified by `addItem_emptyChecklistStartsAtOrdinalZero` (ordinal = 0) and `addItem_appendsAfterExistingItems` (ordinal = 2 after [0,1]).

### Test Fidelity (BDD + Mockito)
- All 16 specs follow the Given-When-Then layout.
- `@MockitoExtension` (default strict stubs) + `@InjectMocks` + `@Mock` — Mockito-only as required (no Spring context).
- `ArgumentCaptor<TaskItem>` is used appropriately in `addItem_emptyChecklistStartsAtOrdinalZero` and `deleteItem_renumbersRemainingOrdinals`.
- `verify(never())` used in `addItem_rejectsUnknownTask`, `updateItem_rejectsCrossTaskItem`, `deleteItem_rejectsCrossTaskItem`, `reorderItems_rejectsForeignItemId`, `isComplete_returnsTrueWhenTaskFlagSet`, `taskWithItems_returnsEmptyWhenAbsent`.
- `verify(times(1)).save(...)` in `deleteItem_renumbersRemainingOrdinals` — proves only the re-numbered item gets saved (not item0 which kept its ordinal).
- Chained `willReturn(...).willReturn(...)` in `reorderItems_appliesRequestedOrder` is legitimate BDDMockito syntax — both returns are consumed (line 156 then line 185).

### ArchUnit
- 8/8 architectural rules still pass — the new `TaskItem` entity, `TaskItemRepository`, and `TaskService` methods stay inside `com.staffengagement.task.*` (no illegal cross-module imports). `TaskItemRepository` is not exported via any contract.

## Warnings ⚠️

### W-1 — `TaskItem` Javadoc contradicts the changeset (informational, not load-bearing)
- `TaskItem.java` Javadoc (lines 26-30) says: *"no DB foreign key is declared because `task..` follows the cross-module boundary convention (referential integrity is enforced at the service layer)."*
- But the changeset **does** declare `fk_task_item_task` on `task_id → task(id)`.
- The Javadoc is technically correct that there's no cross-module FK — `task` is the same module — but the wording is misleading because a reader might infer that *no FK at all* is declared. Recommend updating to: "Same-module FK to `task(id)` (see Liquibase 003); cross-module FKs are still avoided."

### W-2 — No controller-level test coverage for the 5 new sub-item endpoints
- `TaskControllerSecurityTest` verifies `@PreAuthorize("hasAnyRole('USER','ADMIN')")` only on the original 4 endpoints (`create`, `updateCompletion`, `getForEmployee`, `getMyTasks`). The new `getWithItems`, `addItem`, `updateItem`, `deleteItem`, `reorderItems` annotations are NOT asserted at the controller level.
- A static-code grep confirms all 5 carry the annotation, but a future regression that drops one annotation would slip past CI.
- **Suggested follow-up**: add 5 more static-check specs in `TaskControllerSecurityTest` mirroring the existing pattern. Low priority because the annotation is visible in the source and the ArchUnit rules don't catch security annotations.

### W-3 — No `TaskErrorHandler` for `IllegalArgumentException → 400`
- `IllegalArgumentException` is thrown by `addItem`, `updateItem`, `deleteItem`, `reorderItems` (and the existing `create` validation paths).
- The project does NOT have a task-scoped `@ControllerAdvice` (`TaskErrorHandler` does not exist on disk). Compare with `EmployeeErrorHandler`, `InteractionErrorHandler`, `PortfolioErrorHandler`, `ProfileErrorHandler` — those modules each translate `IllegalArgumentException` to HTTP 400 with the uniform error envelope from `api-standards.yaml`.
- Without a task error handler, `IllegalArgumentException` likely bubbles to Spring's default `DefaultHandlerExceptionResolver`, which returns **500** rather than the spec'd 400. This pre-existed for `create` (a hidden bug from earlier phases) but is now compounded by 5 new endpoints.
- **Suggested follow-up**: add `TaskErrorHandler` with `@ExceptionHandler(IllegalArgumentException.class)` returning the standard error envelope with status 400. This is a broader concern that should be filed as a follow-up ATSE ticket; not a blocker for §8 since the suite still passes.

### W-4 — `reorderItems` silent duplicate-id handling
- If the client sends a `ReorderRequest` with duplicate ids (e.g. `[2, 2, 1]`), the `HashMap.put` deduplicates silently — id 2 gets position 1 (overwritten), id 1 gets position 2. No error is raised.
- Behavior is deterministic but surprising: a buggy client wouldn't get an early warning.
- **Suggested follow-up**: validate `itemIds.size() == itemIds.stream().distinct().count()` early and throw `IllegalArgumentException("Duplicate item ids in reorder request")`. Low priority — defensive coding.

### W-5 — `reorderItems` null `itemIds` not handled
- If `ReorderRequest.itemIds()` is null, line 159's `for (Long id : itemIds)` throws `NullPointerException` (not `IllegalArgumentException`). Spring would surface this as 500.
- **Suggested follow-up**: add `if (itemIds == null) throw new IllegalArgumentException("itemIds must not be null")` at the top of `reorderItems`. Trivial fix.

### W-6 — `addItem` null/blank title not handled
- `ItemRequest.title()` is a `String` with no `@NotBlank` validation. If a client sends `{"title": null}` or `{"title": ""}`, the entity saves with `nullable=false` enforced only at the DB level. The DB-layer failure would manifest as a `DataIntegrityViolationException` → 500, not a clean 400.
- **Suggested follow-up**: add `@NotBlank` to `ItemRequest.title()` (Bean Validation triggers automatically on Spring `@RequestBody` records per Boot 3.x) and an explicit null check in `addItem`.

### W-7 — Controller uses `taskRepository.save(task)` directly for `create`
- Pre-existing pattern (not introduced by §8) but worth noting: the `create` endpoint in `TaskController` calls `taskRepository.save(task)` directly instead of routing through `TaskService`. The sub-item endpoints correctly route through the service. This asymmetry was already noted in earlier reviews.

## Violations ❌

**None.** All hard constitutional rules pass:
- ✅ Java 21 / Spring Boot 3.5 / Spring Security 6 idiom
- ✅ Liquibase additive-only changeset, no destructive ops
- ✅ JPA entity conventions with proper nullability and length
- ✅ Service-layer purity — no business logic in controller; cross-task safety centralized in `requireItemForTask`
- ✅ Frozen contracts (`shared/api/TaskSummary.java`, `TaskContract.java`) untouched — only additive methods
- ✅ kebab-case URLs under `/api/v1`
- ✅ BDD unit tests, Mockito-only (no Spring context)
- ✅ ArchUnit 8/8 — no illegal cross-module imports
- ✅ All 254 unit tests green

## Recommended Follow-ups (ordered)

1. **(P2, ATSE1-N)** Add `TaskErrorHandler` with `IllegalArgumentException → 400` mapping using the api-standards error envelope. Fixes the 500-vs-400 issue inherited from earlier phases and now amplified by 5 new endpoints.
2. **(P3)** Update `TaskItem` Javadoc on lines 26-30 to acknowledge the same-module `fk_task_item_task`.
3. **(P3)** Extend `TaskControllerSecurityTest` with 5 static-check specs covering the new sub-item annotations.
4. **(P3)** Add `@NotBlank` on `ItemRequest.title` and reject null `itemIds` / duplicate ids in `reorderItems` with explicit `IllegalArgumentException`s.
5. **(P4)** Consider a `List<Long>` → `Set<Long>` early in `reorderItems` to make duplicate detection a one-liner.
6. **(P4)** Migrate the pre-existing `create` endpoint to route through `TaskService.createTask(...)` to remove the asymmetry with the sub-item endpoints.

## Files Audited
- `backend/src/main/java/com/staffengagement/task/domain/TaskItem.java`
- `backend/src/main/java/com/staffengagement/task/repository/TaskItemRepository.java`
- `backend/src/main/java/com/staffengagement/task/service/TaskService.java`
- `backend/src/main/java/com/staffengagement/task/web/TaskController.java`
- `backend/src/main/resources/db/changelog/modules/task/003-create-task-item-table.yaml`
- `backend/src/test/java/com/staffengagement/task/service/TaskItemServiceTest.java`
- (frozen contracts, unchanged): `shared/api/TaskSummary.java`, `shared/api/TaskContract.java`, `shared/api/TaskItemSummary.java`, `shared/api/TaskSummaryWithItems.java`
