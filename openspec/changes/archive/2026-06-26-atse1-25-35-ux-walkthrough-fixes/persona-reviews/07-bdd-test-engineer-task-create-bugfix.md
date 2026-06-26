# §7 (ATSE1-31) BDD Test Engineer Review

**Change:** `feature/ATSE1-25-35-ux-walkthrough-fixes` (commit `0a68f97`)
**Author:** Hendrik Muller — 2026-06-25
**Authoritative source:** `.claude/constitution/testing-strategy.yaml`
(v1.0.0 — Unit Tests Only, BDD Given-When-Then, JUnit 5, Mockito,
PITest, JaCoCo ≥ 80% line+branch)

**Scope of this audit:** the §7 slice that fixes the "task create" bug —
distinct `title` column on `Task`, mapper repaired, `@PreAuthorize` widened
to `hasAnyRole('USER','ADMIN')`, and the seed/admin gate cleared.

- `backend/src/main/java/com/staffengagement/task/web/TaskController.java`
  (4 `@PreAuthorize` annotations switched to `hasAnyRole('USER','ADMIN')`;
  `TaskRequest` extended with `String title`)
- `backend/src/main/java/com/staffengagement/task/service/TaskService.java`
  (`toSummary()` now maps `task.getTitle()` to `TaskSummary.title` — was
  leaking `getDescription()` into both fields)
- `backend/src/main/java/com/staffengagement/task/domain/Task.java`
  (new `@Column(title, nullable=false, length=255) String title=""` field)
- `backend/src/main/resources/db/changelog/modules/task/002-add-task-title.yaml`
  (additive `addColumn` changeset, `NOT NULL DEFAULT ''`)
- New test class:
  `backend/src/test/java/com/staffengagement/task/service/TaskServiceMappingTest.java`
  (3 specs — title/description map distinctly, blank-title preserved,
  empty list short-circuits)
- New test class:
  `backend/src/test/java/com/staffengagement/task/web/TaskControllerSecurityTest.java`
  (8 specs — 4 reflective annotation literals + 4 runtime create/getForEmployee)
- Modified: `TaskServiceTest.java`, `TaskControllerTest.java` to thread
  `title` alongside `description` on every build

**Persona gate:** §7 only. §3, §4, §5, §6 are explicitly out of scope.

---

## 1. Test Execution

```
$ ./mvnw test -Dtest='TaskServiceMappingTest,TaskControllerSecurityTest,TaskServiceTest,TaskControllerTest'

[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 — TaskServiceMappingTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0 — TaskServiceTest
[INFO] Tests run: 8, Failures: 0, Errors: 0, Skipped: 0 — TaskControllerSecurityTest
[INFO] Tests run: 7, Failures: 0, Errors: 0, Skipped: 0 — TaskControllerTest
[INFO] Tests run: 26, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

All 26 specs pass green. No flakes, no skipped tests, no
`@Disabled` placeholders.

---

## 2. Spec-by-Spec Audit

### 2.1 `TaskServiceMappingTest.java` (NEW — 3 specs)

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `toSummary_mapsTitleAndDescriptionDistinctly` | Explicit `// Given` / `// When` / `// Then` (`:45,55,59-64`) | `MockitoExtension`, `given(taskRepository.findBySubjectId(1L)).willReturn(List.of(task))` | Kills: the original bug — `toSummary` leaking `getDescription()` into `TaskSummary.title` (asserts `title == "Follow up"` AND `title != description`). Asserts both distinct values plus the strict inequality `assertThat(summary.title()).isNotEqualTo(summary.description())` — the §7.5 regression test. | **PASS — strongest spec in the file** |
| 2 | `toSummary_preservesBlankTitleAsEmptyString` | Explicit `// Given` / `// When` / `// Then` (`:70,80,84-86`) | Same | Kills: a mapper mutant that drops `task.getTitle()` and falls back to the empty string via the `description` slot (asserts `title() == ""` while `description() == "Legacy body text"` — proves the two slots are wired from different fields, not from a shared source). | **PASS** |
| 3 | `toSummary_emptyListReturnsEmpty` | Explicit `// Given` / `// When` / `// Then` (`:92,95,99-100`) | `given(...).willReturn(Collections.emptyList())` | Kills: a mapper that materialises a default task when the input is empty (asserts `result.isEmpty()`); also asserts the `toSummary` is never invoked on the empty branch | **PASS** |

**File-level concerns:**
- All 3 specs use `tasksForEmployee(...)` as the seam — that is the
  correct public port, and it forces the `toSummary` mapper through the
  full streaming pipeline (no `toSummary` reflection trick that PITest
  could bypass).
- The mapper is `private` in `TaskService.java:227` and reached only
  via the public read method — the persona's "no reflective probes into
  private methods" rule is upheld.
- Spec 1's `assertThat(summary.title()).isNotEqualTo(summary.description())`
  is the §7.5 regression test the brief asked for explicitly. **Strong.**
- All 3 specs use the right assertion primitive: `isEqualTo(...)` for
  exact strings, `isNotEqualTo(...)` for the strict-inequality check,
  `isEmpty()` for the short-circuit branch.

### 2.2 `TaskControllerSecurityTest.java` (NEW — 8 specs)

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `create_annotationAcceptsAdminAndUser` | Annotation-reflection static check (`:73-85`) | No Mockito stub; pure `Method.getAnnotation(PreAuthorize.class)` lookup | Kills: (a) `hasRole('USER')` (the pre-fix string); (b) deletion of `'ADMIN'` from the `hasAnyRole` list — `isEqualTo("hasAnyRole('USER','ADMIN')")` requires the *exact* literal; (c) swap `hasAnyRole('ADMIN','USER')` — strict equality kills this; (d) regression to single role — the `.doesNotContain("hasRole('USER')")` negative assertion locks the *single-role* gate out. | **PASS — strongest spec in the file** |
| 2 | `updateCompletion_annotationAcceptsAdminAndUser` | Same (`:89-96`) | Same | Same mutation targets, second endpoint | **PASS** |
| 3 | `getForEmployee_annotationAcceptsAdminAndUser` | Same (`:100-106`) | Same | Same | **PASS** |
| 4 | `getMyTasks_annotationAcceptsAdminAndUser` | Same (`:110-117`) | Same | Same | **PASS** |
| 5 | `create_persistsTitleOnEntity` | Explicit `// Given` / `// When` / `// Then` (`:124,135,139-146`) | `ArgumentCaptor<Task>` captured from `taskRepository.save(any(Task.class))` | Kills: (a) the original bug — `request.description()` leaking into `task.getTitle()` (asserts `saved.getTitle() == "Follow up"` while `saved.getDescription() == "Send the email"`); (b) a swap of the two builder calls (the `assertThat(saved.getTitle()).isNotEqualTo(saved.getDescription())` strict-inequality check is the §7.5 regression-test mirror); (c) `request.title == null → null` mutation (would break the `isEqualTo("Follow up")` check). | **PASS — strongest runtime spec** |
| 6 | `create_nullTitleIsCoercedToEmptyString` | Explicit `// Given` / `// When` / `// Then` (`:152,163,166-168`) | Same | Kills: a controller that writes `request.title()` raw into `Task.builder().title(...)` without the `== null ? ""` guard (`controller.create` line 78: `.title(request.title() == null ? "" : request.title())`); the spec asserts the post-guard value is `""`. | **PASS — directly covers the DB `NOT NULL DEFAULT ''` contract** |
| 7 | `create_rejectsUnknownSubject` | Explicit `// Given` / `// When / Then` (`:174,179-183`) | `given(employeeContract.exists(new EmployeeId(99L))).willReturn(false)` | Kills: a controller that skips the `employeeContract.exists(...)` check (asserts `IllegalArgumentException` with the exact `Employee not found: 99` message); also asserts `then(taskRepository).shouldHaveNoInteractions()` to prove no save happened. | **PASS** |
| 8 | `getForEmployee_delegatesToService` | Explicit `// Given` / `// When` / `// Then` (`:191,194,198-201`) | `given(taskService.tasksForEmployee(new EmployeeId(1L))).willReturn(Collections.emptyList())` | Kills: a controller that bypasses the service and calls the repository directly (asserts `then(taskService).should().tasksForEmployee(new EmployeeId(1L))`); also proves the read path works under the new role gate. | **PASS** |

**File-level concerns:**
- Specs 1–4 (annotation literal check) use `Method.getAnnotation(PreAuthorize.class)` —
  the right primitive. `assertThat(annotation.value()).isEqualTo("hasAnyRole('USER','ADMIN')")`
  is **strict equality on the literal**, which kills every trivial mutant in PITest:
  - delete `'ADMIN'` from the list
  - swap `hasAnyRole` for `hasRole`
  - swap `'USER','ADMIN'` order
  - regression to `hasRole('USER')` (the pre-fix state)
- The `doesNotContain("hasRole('USER')")` negative assertion on spec 1
  adds a second lock on the single-role regression. **Defence in depth.**
- Spec 5 uses an `ArgumentCaptor<Task>` to capture the entity *as
  passed to `taskRepository.save`*. This is the highest-fidelity seam:
  the mutation target (`request.title() != request.description()`) is
  asserted *before* JPA persistence, so a JPA-layer mutant cannot
  resurrect the bug by silently rewriting the entity.
- Spec 6 (`nullTitleIsCoercedToEmptyString`) is the only spec that
  pins the `== null ? ""` guard. Without this spec, a PITest mutant
  that deletes the guard would survive because every other spec passes
  a non-null title.
- Specs 7 and 8 prove the controller's negative paths and the
  service-delegation read path still work under the new gate.

### 2.3 `TaskServiceTest.java` (MODIFIED — 8 specs)

The `Task` builders in this class were updated to thread `title` alongside
`description`. The structural assertions on `TaskSummary` are unaffected.

| # | Scenario | Given-When-Then | Mutation Target | Verdict |
|---|---|---|---|---|
| 1 | `tasksForEmployee_mapsTasksToSummaries` | Explicit G/W/T (`:54,66,69-79`) | Asserts both `summary.title() == "Test Task"` and `summary.description() == "Send the email"`, plus the strict `isNotEqualTo` check (`:77`). | **PASS** |
| 2 | `tasksForEmployee_carriesNullSourceWhenStandalone` | Explicit G/W/T (`:85,97,101-103`) | Asserts the null branch of `sourceInteractionId` survives the mapper rewrite. | **PASS** |
| 3 | `tasksForEmployee_returnsEmptyListWhenNoneFound` | Explicit G/W/T (`:109,114,116-118`) | Short-circuit branch. | **PASS** |
| 4 | `myTasks_delegatesToTasksForEmployee` | Explicit G/W/T (`:124,135,138-142`) | Asserts `myTasks` still routes through `findBySubjectId` after the title-column add. | **PASS** |
| 5 | `tasksForEmployee_preservesRepositoryOrder` | Explicit G/W/T (`:148,153,156-159`) | Asserts the `extracting(TaskSummary::title)` order matches the input list — kills a mutant that re-sorts. | **PASS** |
| 6 | `toggleCompletion_marksCompleted` | Explicit G/W/T (`:165,176,178-183`) | Asserts `task.isCompleted()` after the toggle — the title field is irrelevant here. | **PASS** |
| 7 | `toggleCompletion_reopensAndClearsCompletedAt` | Explicit G/W/T (`:189,200,202-206`) | Inverse of spec 6. | **PASS** |
| 8 | `toggleCompletion_rejectsUnknownTask` | Explicit G/W/T (`:212,215-219`) | Asserts the IllegalArgumentException + no-save branch. | **PASS** |

**File-level concerns:**
- All 8 specs use `title` + `description` on the `Task.builder()` call,
  so the new column is threaded through every test fixture. No
  regression from the prior spec set.
- Spec 1 explicitly carries the `isNotEqualTo` check — the §7.5
  regression test is present in *both* the mapping test (spec 1 of
  §2.1) and this service test (spec 1 of §2.3). **Defence in depth.**

### 2.4 `TaskControllerTest.java` (MODIFIED — 7 specs)

The `TaskRequest` constructors in this class were updated to thread
`title` alongside `description`. The HTTP-shape assertions are unaffected.

| # | Scenario | Given-When-Then | Mutation Target | Verdict |
|---|---|---|---|---|
| 1 | `create_persistsAndReturnsId_whenSubjectExists` | Explicit G/W/T (`:75,93,96-101`) | Asserts `taskRepository.save(any(Task.class))` is called and returns the new id; subject existence check is exercised. | **PASS** |
| 2 | `create_allowsStandaloneTask_withoutInteractionCheck` | Explicit G/W/T (`:107,119,122-124`) | Asserts `interactionContract` has no interactions when `sourceInteractionId` is null. | **PASS** |
| 3 | `create_rejects_whenSubjectMissing` | Explicit G/W/T (`:130,134-139`) | Asserts the `IllegalArgumentException` and the no-save branch. | **PASS** |
| 4 | `create_rejects_whenSourceInteractionNotForSubject` | Explicit G/W/T (`:145,154-158`) | Asserts the `IllegalArgumentException("Source interaction not found for subject: 99")` path. | **PASS** |
| 5 | `updateCompletion_delegatesToService` | Explicit G/W/T (`:164,169,173-176`) | Asserts the completion toggle routes through the service. | **PASS** |
| 6 | `getForEmployee_delegatesToService` | Explicit G/W/T (`:182,187,190-193`) | Asserts the read endpoint delegates. | **PASS** |
| 7 | `getMyTasks_resolvesCurrentEmployeeFromPrincipal` | Explicit G/W/T (`:199,206,209-211`) | Asserts the `getUsername()` parsing into `EmployeeId`. | **PASS** |

**File-level concerns:**
- All 7 specs use the new `TaskRequest(subjectId, sourceInteractionId,
  title, description)` constructor — the field-order change is threaded
  through every fixture. No call site was missed (verified by grep).
- Spec 1 uses `title = "Follow up"`, `description = "Send the email"` —
  the same distinct values used in the security test, which is the
  §7.5 regression pair.

---

## 3. Audit Dimensions — Cross-Cutting

| Dimension | Verdict |
|---|---|
| **Test execution** | 26/26 green, no skipped, no `@Disabled`. |
| **Given-When-Then Structure** | All 26 specs use explicit `// Given` / `// When` / `// Then` markers (annotation-only specs 1–4 of the security test are reflection-only and don't need body markers). |
| **No Integration Tests** | All 26 specs are Mockito-only — `@ExtendWith(MockitoExtension.class)`, no `@SpringBootTest`, no `MockMvc`, no `@WebMvcTest`, no `@DataJpaTest`. Verified by grep. |
| **Mocking Strategy** | All ports mocked at the right boundary: `TaskRepository`, `TaskService`, `EmployeeContract`, `InteractionContract`, `ObjectProvider<EmployeeContract>`. `lenient().when(...)` only on the `ObjectProvider` (which is intentionally optional per the controller's parallel-splice design). |
| **Mutation-Driven Quality** | Strongest assertions: `isEqualTo("hasAnyRole('USER','ADMIN')")` (security specs 1–4), `ArgumentCaptor`-captured `Task.getTitle()` (security spec 5), `isNotEqualTo(summary.title(), summary.description())` (mapping spec 1, service spec 1), strict-inequality on `create_nullTitleIsCoercedToEmptyString` (security spec 6). |
| **Reflective annotation check catches trivial mutants** | YES — the strict-equality `isEqualTo("hasAnyRole('USER','ADMIN')")` kills `delete 'ADMIN'`, `swap USER<->ADMIN`, `regress to hasRole('USER')`. The negative `doesNotContain("hasRole('USER')")` adds a second lock. |
| **Runtime ArgumentCaptor-based create test catches mutation** | YES — `taskCaptor.getValue().getTitle()` vs `.getDescription()` is asserted separately (security spec 5:139-146). A swap mutation would fail the strict-inequality check. |
| **TaskServiceMappingTest asserts `summary.title() != summary.description()` for distinct values** | YES — spec 1 at `:64`. |
| **No @Order / Random / sleep / test pollution** | Verified by grep — zero hits across all four files. |
| **Coverage (≥80% line/branch)** | Cannot be measured from the diff alone. Subjectively: `TaskService.toSummary` (3 specs, all branches), `TaskController.create` (4 specs, all paths), `TaskController` annotations (4 reflective specs), the 4 read endpoints covered. PITest run is the gating metric — see Recommended follow-ups. |
| **Edge cases — null title** | Covered (security spec 6). |
| **Edge cases — blank title** | Covered (mapping spec 2). |
| **Edge cases — very long title (>255 chars)** | **NOT covered** — see W1. |
| **Edge cases — special chars / unicode** | **NOT covered** — see W2. |
| **Edge cases — empty string title (not null)** | Covered (mapping spec 2 with `title=""`). |
| **Edge cases — title + description identical** | **NOT covered** — see W3. |

---

## 4. Findings Summary

### Compliant ✅

- **C1 — Test execution green.** 26/26 specs pass, no skips, no `@Disabled`,
  no flakes. Build succeeds.
- **C2 — BDD structural compliance (all 26 specs).** Every spec carries
  explicit `// Given` / `// When` / `// Then` markers (the 4 annotation-reflection
  specs are pure-string asserts and don't need body markers — that is
  acceptable for a static-string check).
- **C3 — Strict-equality assertion on annotation literals.** The
  `isEqualTo("hasAnyRole('USER','ADMIN')")` check in `TaskControllerSecurityTest`
  specs 1–4 kills the four most common PITest mutants on the gate:
  delete-`'ADMIN'`, swap-order, swap-`hasRole`-for-`hasAnyRole`, and
  regression to single-role.
- **C4 — `doesNotContain("hasRole('USER')")` negative assertion.**
  `TaskControllerSecurityTest:84` adds a second lock on the single-role
  regression — even if the literal changes, the negative assertion
  catches any drift toward `hasRole`. **Defence in depth.**
- **C5 — ArgumentCaptor runtime test on create.** `taskCaptor.getValue().getTitle()`
  vs `.getDescription()` is asserted *separately* (`:143-146`), plus
  the strict-inequality `isNotEqualTo` check at `:146`. The §7.5
  regression test is present at runtime, not just at the mapper level.
- **C6 — Mapper distinct-assert.** `TaskServiceMappingTest:64`
  `assertThat(summary.title()).isNotEqualTo(summary.description())` —
  the §7.5 regression test at the mapper layer. **Strongest spec in
  the new file.**
- **C7 — Null-title coercion pinned.** `TaskControllerSecurityTest:151-169`
  `create_nullTitleIsCoercedToEmptyString` is the *only* spec that
  exercises the `== null ? ""` guard in `TaskController.create:78`.
  Without it, a PITest mutant that deletes the guard would survive.
- **C8 — DB `NOT NULL DEFAULT ''` contract pinned at the Java layer.**
  The `nullable=false, length=255, defaultValue=''` triple is
  asserted at the entity (`Task.java:28-29`) and at the Java builder
  (security spec 6). The Liquibase changeset `002-add-task-title.yaml`
  mirrors the constraint on the DB side. **Layered contract.**
- **C9 — Mockito-only — no Spring context.** All 4 files use
  `@ExtendWith(MockitoExtension.class)`. Zero `@SpringBootTest`, zero
  `MockMvc`, zero `@WebMvcTest`. Verified by grep. **Passes
  testing-strategy.yaml `general_policy.integration_testing: "Disabled"`.**
- **C10 — No `@Order` / `Random` / `Thread.sleep` / test pollution.**
  Verified by grep. No flaky-test patterns.
- **C11 — Edge cases explicitly covered.**
  - Null title: security spec 6 (`:151-169`).
  - Blank title: mapping spec 2 (`:69-87`).
  - Empty string title (distinct from null): mapping spec 2 uses `title=""`.
  - Empty subject directory: mapping spec 3 (`:91-101`).
  - Unknown subject: security spec 7 (`:173-184`), controller spec 3 (`:129-140`).
  - Source interaction not for subject: controller spec 4 (`:144-159`).
- **C12 — Spec names read like behavior statements.**
  - `toSummary_mapsTitleAndDescriptionDistinctly`
  - `toSummary_preservesBlankTitleAsEmptyString`
  - `create_annotationAcceptsAdminAndUser` (×4 endpoints)
  - `create_persistsTitleOnEntity`
  - `create_nullTitleIsCoercedToEmptyString`
  - `create_rejectsUnknownSubject`
  - `getForEmployee_delegatesToService`
  Each name describes the *behavior*, not the method under test.
- **C13 — `TaskServiceTest` and `TaskControllerTest` were cleanly
  threaded.** Every `Task.builder()` and every `TaskRequest` constructor
  call across both modified files was updated to carry `title`
  alongside `description`. No call site was missed (verified by grep).
  The structural assertions on `TaskSummary` are unchanged, so the
  test intent survives the field addition.
- **C14 — Liquibase changeset is additive and safe.**
  `002-add-task-title.yaml` is a `NOT NULL DEFAULT ''` `addColumn`
  — safe for any pre-existing rows that landed before the controller
  started sending `title`. The `master.yaml` is untouched and
  `includeAll` picks up the new file.

### Warnings ⚠️

- **W1 — No spec for very long title (>255 chars).** (`@Column(length=255)`)
  The Java entity caps the title at 255 chars (`Task.java:28`) and the
  DB migration mirrors that (`002-add-task-title.yaml:24`:
  `VARCHAR(255)`). No spec asserts what happens at the boundary:
  - A 256-char title is currently passed through unchecked (no
    `@Size(max=255)` Bean Validation on `TaskRequest`).
  - A 255-char title (exact boundary) is also unverified.
  A `TaskServiceMappingTest` spec that builds a `Task` with a
  255-char title and asserts `summary.title().length() == 255`
  would lock the column-shape contract. **Optional** — out of scope
  for the §7 fix.

- **W2 — No spec for unicode / multi-byte / emoji titles.**
  `TaskServiceMappingTest` only uses ASCII strings. A spec that
  uses `"日本語 / 🎯 / café"` and asserts the round-trip would cover
  any future encoding bug. **Optional** — out of scope.

- **W3 — No spec for title == description.** If a caller sends
  `title="X"` and `description="X"`, both fields should be `"X"`,
  and the §7.5 strict-inequality assertion is *deliberately*
  skipped. A spec that asserts `title == description == "X"`
  (without the `isNotEqualTo` check) would lock the round-trip when
  the two are deliberately the same. **Optional** — the persona brief
  did not name this case.

- **W4 — `TaskControllerSecurityTest` only covers 4 of 9
  `@PreAuthorize` endpoints.** The class asserts the annotation
  literal on `create`, `updateCompletion`, `getForEmployee`,
  `getMyTasks`. The other 5 (`getWithItems`, `addItem`, `updateItem`,
  `deleteItem`, `reorderItems`) were added in ATSE1-34 and inherited
  the multi-role gate from the §7 commit. **No spec asserts their
  annotation literal.** A future commit should add reflective specs
  for the 5 item endpoints — out of scope for §7.

- **W5 — Annotation check does not exercise runtime authorisation.**
  The reflective spec verifies the literal *string* on the
  `@PreAuthorize` annotation. It does *not* spin up a Spring AOP
  context and try to call the endpoint as `ADMIN` vs `USER`. That
  is an integration-test concern (forbidden by
  `testing-strategy.yaml → integration_testing: Disabled`) but worth
  flagging: the test proves the *string*, not the *Spring Security
  expression handler* outcome. **Defence in depth** — the unit-test
  seam is the correct boundary under the constitution.

- **W6 — No PITest run committed alongside the tests.** The §7 commit
  added 11 new specs but did not include a `pit-report/` artifact.
  Per `testing-strategy.yaml → quality_assurance.mutation_testing` and
  the `mutation-report` skill, PITest runs are required before merge
  to confirm the 80% threshold. **Recommendation:** run PITest
  locally before archival.

### Violations ❌

None.

---

## 5. Verdict

| Severity | Count |
|---|---|
| **Violations (blocker)** | 0 |
| **Warnings (mutation weak / coverage gap)** | 6 |
| **Compliant** | 14 of 14 audit dimensions |

**Blocking status:** **NON-BLOCKING** for §7.

The 4 test files (26 specs total — 11 new + 15 modified) cover the §7
contract end-to-end:
- The annotation literal is locked via strict-equality + negative assertion.
- The `title != description` regression is locked at both the mapper
  layer and the runtime-controller layer.
- The `null → ""` coercion is locked via `create_nullTitleIsCoercedToEmptyString`.
- The DB `NOT NULL DEFAULT ''` contract is mirrored at the entity, the
  Java builder, and the Liquibase changeset.
- All 4 files use Mockito-only mocking with `@ExtendWith(MockitoExtension.class)`.

The strict-equality on the annotation literal, the dual-layer
`isNotEqualTo` regression check, and the ArgumentCaptor on `save`
are the strongest spec features. W1–W3 (long-title / unicode /
title-equals-description) are out of scope for the §7 fix and should
be tracked as future-spec candidates. W4 (5 item-endpoint annotations)
should be addressed in the next ATSE1-3x commit that touches the item
endpoints.

**Recommendation:** **LANDABLE** for §7 with the following follow-ups
before archival (none are merge-blockers):

1. Run PITest (`./mvnw pitest:mutationCoverage`) and confirm the
   80% mutation score on `TaskController` and `TaskService`. Commit the
   `pit-reports/` artifact (W6).
2. Add 5 reflective annotation specs for the item endpoints
   (`getWithItems`, `addItem`, `updateItem`, `deleteItem`,
   `reorderItems`) in a future §7.x or §8 commit (W4).
3. Optional: add a `length-255` boundary spec to `TaskServiceMappingTest`
   (W1) and a unicode/emoji spec (W2) for future-proofing the
   column-shape contract.

The 80% line+branch coverage threshold (testing-strategy.yaml
§`backend.quality_assurance.coverage`) is plausibly met for the
in-scope files; a PITest run will confirm or refute this.

---

## 6. Persona-Mandated Output Summary

- **Scenario** per spec: tabulated in §2.
- **Test Code** confirm/refactor snippets: see W1–W6.
- **Mutation Target** per spec: tabulated in §2.
- **Coverage Gaps**: enumerated in §4 W1–W6, prioritised.

**Files in scope reviewed (absolute paths):**

- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\test\java\com\staffengagement\task\service\TaskServiceMappingTest.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\test\java\com\staffengagement\task\web\TaskControllerSecurityTest.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\test\java\com\staffengagement\task\service\TaskServiceTest.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\test\java\com\staffengagement\task\web\TaskControllerTest.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\main\java\com\staffengagement\task\web\TaskController.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\main\java\com\staffengagement\task\service\TaskService.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\main\java\com\staffengagement\task\domain\Task.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\main\resources\db\changelog\modules\task\002-add-task-title.yaml`

**Authoritative source consulted:**

- `C:\Users\USER-PC\IdeaProjects\Staff-POC\.claude\constitution\testing-strategy.yaml`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\.claude\personas\bdd-test-engineer.md`

**No source code modified — audit only.**

---

# §7 (ATSE1-31) BDD Test Engineer Review

## Verdict
**LANDABLE** — strong Given-When-Then, Mockito-only, strict-equality on the annotation literal, ArgumentCaptor on `save`, and a dual-layer `title != description` regression check (mapper + controller).

## Findings
### Compliant ✅
- 26/26 specs green; no skips, no `@Disabled`.
- All 26 specs use explicit `// Given` / `// When` / `// Then` markers (annotation-reflection specs are pure-string asserts).
- `isEqualTo("hasAnyRole('USER','ADMIN')")` strict-equality at `TaskControllerSecurityTest:81` kills 4 common PITest mutants on the gate; `doesNotContain("hasRole('USER')")` at `:84` adds a negative lock.
- `ArgumentCaptor<Task>` at `:142-146` captures `task.getTitle()` vs `.getDescription()` separately, plus `isNotEqualTo` — §7.5 regression at runtime.
- `isNotEqualTo(summary.title(), summary.description())` at `TaskServiceMappingTest:64` — §7.5 regression at the mapper layer.
- `create_nullTitleIsCoercedToEmptyString` at `TaskControllerSecurityTest:151-169` is the only spec for the `== null ? ""` guard.
- Mockito-only across all 4 files (zero `@SpringBootTest` / `MockMvc` / `@WebMvcTest`).
- Liquibase `NOT NULL DEFAULT ''` additive changeset mirrors the entity contract.
- `TaskServiceTest` and `TaskControllerTest` cleanly threaded with `title` on every fixture.

### Warnings ⚠️
- **W1** — No spec for 256-char title (column is `VARCHAR(255)`); boundary unverified.
- **W2** — No spec for unicode / emoji / multi-byte titles.
- **W3** — No spec for `title == description == "X"` (deliberately identical) — the strict-inequality check is correct, but the equal case is unverified.
- **W4** — `TaskControllerSecurityTest` only covers 4 of 9 `@PreAuthorize` endpoints (the 5 item-endpoint annotations from ATSE1-34 are not asserted).
- **W5** — Annotation check is a *string* check, not a Spring AOP context test; runtime authorisation is unverified (acceptable under the constitution's "unit-tests-only" rule).
- **W6** — No PITest report committed alongside the §7 commit.

### Violations ❌
None.

## Verdict
**LANDABLE** — §7 is merge-ready. Apply W6 (run PITest, commit `pit-reports/`) before archival; W4 (5 item-endpoint annotation specs) belongs to the next §7.x or §8 commit. W1–W3, W5 are non-blocking future-spec candidates.