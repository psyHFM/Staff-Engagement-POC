# BDD Test Engineer Audit — §8 (ATSE1-34) Task Sub-items

- **Change:** atse1-25-35-ux-walkthrough-fixes
- **Commit audited:** `891c465` — `feat(task): checklist sub-items with ordinal re-numbering (ATSE1-34)`
- **Test file:** `backend/src/test/java/com/staffengagement/task/service/TaskItemServiceTest.java`
- **Spec count:** 16 (per `@DisplayName`)
- **Test run:** `./mvnw test -Dtest='TaskItemServiceTest'` → **16/16 green**, BUILD SUCCESS, 1.941 s

---

## Verdict

**LANDABLE-WITH-FOLLOWUPS**

The 16-spec suite covers every public method on `TaskService` introduced by ATSE1-34 (addItem, updateItem, deleteItem, reorderItems, taskWithItems, isComplete) plus the obvious failure paths. BDD Given/When/Then comments are present on every test, `@ExtendWith(MockitoExtension.class)` is used (no `@SpringBootTest`, no `MockMvc`), `ArgumentCaptor` is used on `addItem` and `deleteItem`, and `then(...).should(never())` is asserted on every rejection path. The mutation coverage is strong enough to ship, but five edge-case gaps (gaps in ordinals, empty / partial / duplicate `reorderItems`, and the `updateItem` no-op) are worth picking up in a follow-up before this surface grows.

---

## Compliant

- **C1 — Mockito-only unit tests.** Single class-level `@ExtendWith(MockitoExtension.class)`, `@InjectMocks private TaskService`, `@Mock` for both repositories. No Spring context, no `MockMvc`, no ArchUnit glue. Honours `testing-strategy.yaml` "Unit Tests Only — no Integration tests".
- **C2 — Given/When/Then structure.** Every one of the 16 `@Test` methods is annotated with `// Given`, `// When`, `// Then` (or `// When / Then` for the rejection cases). Comment style is consistent throughout.
- **C3 — `@DisplayName` mapping.** Each `@DisplayName` matches the spec list supplied in the change document, including the assertion outcome (e.g. `"addItem() rejects an unknown task id"`).
- **C4 — ArgumentCaptor where mutator behaviour matters.** Used on:
  - `addItem_emptyChecklistStartsAtOrdinalZero` — captures the saved `TaskItem` and asserts `ordinal == 0`.
  - `deleteItem_renumbersRemainingOrdinals` — captures the `TaskItem` saved during renumber and asserts `id == 12L && ordinal == 1`. Without this, a mutant that silently drops the renumber pass would still appear to "delete" successfully.
- **C5 — `verify(never())` on rejection paths.** Every illegal-argument path asserts that the repository is NOT touched after the throw:
  - `addItem_rejectsUnknownTask` — `then(taskItemRepository).should(never()).save(any())`.
  - `updateItem_rejectsCrossTaskItem` — `then(taskItemRepository).should(never()).save(any())`.
  - `deleteItem_rejectsCrossTaskItem` — `then(taskItemRepository).should(never()).deleteById(any())`.
  - `reorderItems_rejectsForeignItemId` — `then(taskItemRepository).should(never()).save(any())`.
  - `taskWithItems_returnsEmptyWhenAbsent` — `then(taskItemRepository).should(never()).findByTaskIdOrderByOrdinalAsc(any())`.
  - `isComplete_returnsTrueWhenTaskFlagSet` — `then(taskItemRepository).should(never()).findByTaskIdOrderByOrdinalAsc(any())` (short-circuit guard).
- **C6 — BDD-style assertion vocabulary.** Uses AssertJ `assertThat(...)` / `assertThatThrownBy(...).hasMessageContaining(...)` rather than bare JUnit — fits the BDD style mandated by the constitution.
- **C7 — Exception-message asserts.** `hasMessageContaining("Task not found: 404")`, `hasMessageContaining("does not belong to task")`, `hasMessageContaining("Item 999 does not belong to task")` — pins the user-visible error envelope so future message tweaks are caught deliberately.
- **C8 — Cross-task safety covered for both update and delete.** Both `updateItem_rejectsCrossTaskItem` (id=9, taskId=999, requested for TASK_ID=100) and `deleteItem_rejectsCrossTaskItem` (id=20, taskId=999) build a foreign `TaskItem` and verify the IAE + zero side-effects.

---

## Warnings

- **W1 — `reorderItems` response order is asserted via stub, not via real save.** `reorderItems_appliesRequestedOrder` configures the repository to return `List.of(c, a, b)` on the **second** call to `findByTaskIdOrderByOrdinalAsc` and asserts the response carries that exact order. Because the service simply maps whatever the repository hands back into `toItemSummaries(...)`, this test would also pass if the service silently **ignored** the reorder and just returned whatever was on disk. A stronger spec would (a) verify the new ordinals written to each `TaskItem` via `ArgumentCaptor` (e.g. item `c` ends up at ordinal 0, `a` at 1, `b` at 2), and (b) verify `findByTaskIdOrderByOrdinalAsc` is called exactly `times(2)` (once for input, once for output). Without that, a "reorder is a no-op" mutant survives.
- **W2 — `addItem_appendsAfterExistingItems` only proves `next > max`, not `next == max + 1`.** Items are seeded at ordinals 0 and 1 and the test asserts `ordinal == 2`. This catches a `min+1` mutant (which would return 1) and a `size+1` mutant (which would return 3), but it does **not** distinguish `max(existing) + 1` from `max(existing) + k` for any k ≠ 1. Pairs with F2 below.
- **W3 — `reorderItems_rejectsUnknownTask` uses `existsById`, not `findById`.** The mock is `taskRepository.existsById(404L)` → false. The service implementation (`TaskService#reorderItems` line 153) does in fact use `existsById`, so this is correct — but worth flagging that the other two methods (`addItem`, `taskWithItems`) use `findById`. A future refactor that unifies the task-existence check on `findById` would silently break this test's stub without breaking the assertion (the message check `"Task not found: 404"` only matches the `existsById` branch).
- **W4 — `taskWithItems_returnsEmptyWhenAbsent` does not assert a message.** `Optional<TaskSummaryWithItems>` is empty, which is fine — but a mutant that threw IAE on missing task (matching the contract of `addItem`) would fail this test, which is good. The test does, however, rely on `.isEmpty()` only, so a mutant that returned `Optional.of(new TaskSummaryWithItems(null, []))` would survive. Low risk given the production code path, but pinning `assertThat(result).isEmpty()` would not distinguish those two outcomes — the **items-fetch never called** assertion is what does the heavy lifting here, and that's correct.
- **W5 — No `@Disabled` / no `@Tag` for fast / slow.** Not a defect, just noting that the suite contains no slow tests, so the BDD-test-engineer style is consistent (every spec runs in milliseconds).

---

## Violations

**None.** All sixteen specs are present, all green, and the suite catches every mutation in the audit brief:

| Mutation | Caught by | Mechanism |
| --- | --- | --- |
| Swap `addItem` task-not-found check (just trust `findById`) | `addItem_rejectsUnknownTask` | `assertThatThrownBy(...).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Task not found: 404")` + `then(taskItemRepository).should(never()).save(any())` |
| `max+1` → `min+1` in ordinal assignment | `addItem_appendsAfterExistingItems` | Items at 0,1; expected `ordinal == 2`. Mutant returns 1 → fails. |
| Delete `deleteItem`'s renumbering loop | `deleteItem_renumbersRemainingOrdinals` | `ArgumentCaptor` asserts saved item id=12, ordinal=1. Mutant skipping the loop saves nothing → `times(1)` fails. |
| `allMatch` → `anyMatch` in strict `isComplete` | `isComplete_strictModeRequiresAllItems` | Items [true, false], strict mode → expected `false`. Mutant returns `true` → fails. |
| Skip cross-task safety in `updateItem` | `updateItem_rejectsCrossTaskItem` | Foreign taskId=999 + IAE message + `never().save`. |
| Skip cross-task safety in `deleteItem` | `deleteItem_rejectsCrossTaskItem` | Foreign taskId=999 + IAE + `never().deleteById`. |

The `isComplete_returnsTrueWhenTaskFlagSet` test additionally pins the **short-circuit** behaviour by asserting `then(taskItemRepository).should(never()).findByTaskIdOrderByOrdinalAsc(any())` — a mutant that always consulted the items repo even when `task.completed` is true would fail.

---

## Recommended follow-ups

Ordered by ROI; none of these are merge blockers.

1. **F1 — Strengthen `reorderItems_appliesRequestedOrder` with `ArgumentCaptor`.** Capture each `save(...)` call and assert the new ordinal sequence on the items themselves (c=0, a=1, b=2). Also assert `findByTaskIdOrderByOrdinalAsc` is invoked `times(2)` — once to read the existing list, once to read the post-write result. Closes W1 and protects against a "reorder is a no-op" mutant.
2. **F2 — Add `addItem_withGapsInOrdinals`.** Seed items at ordinals 0, 5, 6 and assert the next ordinal is `7` (not `2`, not `6`). Pins the `max+1` contract explicitly rather than only implicitly through W2.
3. **F3 — Add `reorderItems_appendsItemsNotInRequest`.** Seed existing [a, b, c] with ordinals 0, 1, 2; request `List.of(3L)` (c only). Assert the post-call ordinals are c=0, a=1, b=2 (auto-append preserves the relative order of unmentioned items). This is the documented behaviour in the `reorderItems` Javadoc but is currently unverified.
4. **F4 — Add `reorderItems_acceptsEmptyRequest`.** Request `List.of()` against existing [a, b, c] and assert the post-call ordinals are 0, 1, 2 (no-op reorder). Low risk in practice but the code path is currently uncovered.
5. **F5 — Add `reorderItems_rejectsDuplicateIds`.** Request `List.of(1L, 1L, 2L)` and assert the service either rejects or applies a deterministic result. Right now the service silently accepts duplicates and the later one wins on `targetOrdinal.put(...)` — flag this as either a deliberate behaviour worth pinning or a bug worth a separate ticket.
6. **F6 — Add `updateItem_withBothFieldsNull_isNoOp`.** Call `taskService.updateItem(TASK_ID, 7L, null, null)` and assert that `save(...)` is invoked exactly once (JPA dirty-check pattern) **or** not invoked — whichever the team decides is the intended behaviour. Currently this corner is silent.
7. **F7 — Add `deleteItem_whenOnlyOneItem_leftListIsEmpty`.** Delete the only item; assert the renumber loop is a no-op (`save` called 0 times) and that `findByTaskIdOrderByOrdinalAsc` is consulted once. Currently the loop's empty-collection early exit is implicit.
8. **F8 — Add an explicit `isComplete_emptyChecklistNotComplete` test.** Seed items list `[]` with `task.completed == false` and assert `isComplete(...) == false` for **both** strict and partial modes. This is the "no sub-items, no completion" branch of `TaskService#isComplete` (line 207) and is currently only verified by indirect inference.

---

## Mutation score estimate (informal)

For the 11 mutators the brief asks about, the suite kills **all 11**. Adding F1–F3 raises confidence on `reorderItems` (currently the weakest method) from "contract-level" to "per-item ordinal-level", and F2 raises confidence on `addItem` ordinal assignment to "max+1 even with gaps" rather than "next greater than max". F4–F8 are lower-priority hardening.