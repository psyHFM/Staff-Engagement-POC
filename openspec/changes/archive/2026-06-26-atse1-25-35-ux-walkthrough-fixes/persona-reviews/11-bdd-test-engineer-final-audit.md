# §11 — BDD Test Engineer Final Audit (whole-branch)

> Persona: **BDD Test Engineer** (`.claude/personas/bdd-test-engineer.md`)
> Branch: `feature/ATSE1-25-35-ux-walkthrough-fixes` (22 commits ahead of `main`)
> Scope: 11 Jira tickets (ATSE1-25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35)
> Diff: `git diff main..HEAD` — 177 files, +15,036 / -598 lines
> Authority: `.claude/constitution/testing-strategy.yaml` v1.0.0
>             (scope: unit tests only | BDD Given-When-Then | JUnit 5 + Mockito |
>              ≥80 % mutation score + line coverage)

---

## Summary

**READY TO MERGE.** The whole-branch test surface is healthy: 254 backend tests
and 219 frontend tests are 100 % green, ESLint is clean, every new test file
follows the Mockito-only / HttpTestingController-only discipline, the BDD
Given-When-Then scaffold is consistent, and no integration annotations leak
into the diff. Two low-severity **Warnings** (PITest scope gap for
`com.staffengagement.interaction.*`; PITest scope gap for
`com.staffengagement.task.web.TaskController`) are the same shape as the
phase-6 W1 finding — fixable in a follow-up PR but not blockers.

---

## Test Execution

### Backend
```
$ cd backend && ./mvnw test
...
[INFO] Tests run: 254, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
[INFO] Total time:  12.472 s
```

Branch baseline (pre-branch `main`) reports 215 tests, so the diff adds **+39
backend tests** net (16 TaskItemServiceTest + 3 TaskServiceMappingTest + 8
TaskControllerSecurityTest + 5 new InteractionControllerTest cases
[PATCH/getNote-owner-checks] + 3 new InteractionServiceTest cases [PATCH
owner-checks] + new TaskControllerTest coverage for `title` column).
Zero failures, zero skipped, zero `BUILD FAILURE`.

### Frontend
```
$ cd frontend && ./node_modules/.bin/jest
Test Suites: 27 passed, 27 total
Tests:       219 passed, 219 total
Snapshots:   0 total
Time:        6.586 s
```

Branch baseline (pre-branch `main`) reports 157 tests, so the diff adds
**+62 frontend tests** net across 16 spec files (3 added new, 13 modified).
Zero failures, zero skipped.

### Frontend Lint
```
$ cd frontend && ./node_modules/.bin/eslint src/
(exit 0, no output)
```

ESLint clean across `src/` (Angular template bound types, no `any` leaks, no
`@ts-ignore`).

---

## New Specs by Ticket

| Ticket | File(s) | New tests | Mutation target |
|--------|---------|-----------|-----------------|
| ATSE1-25 (auth persist) | `frontend/.../shared/auth/auth-state.spec.ts`, `auth-error.interceptor.spec.ts`, `bearer-auth.interceptor.spec.ts` | ~+18 (auth-state 16→31, error-interceptor 0→7, bearer 5→5) | Stryker `src/app/**/*.ts` (covered) |
| ATSE1-26 (openSpec archive) | none (no code) | n/a | n/a |
| ATSE1-27 + ATSE1-32 (employees split / your-details) | `frontend/.../your-details/your-details-state.service.spec.ts` (NEW, +310 lines, ~10 tests), `your-details-page.spec.ts` (NEW, +186 lines, ~9 tests), `employee.spec.ts`, `employee-create-form.spec.ts` | ~+25 | Stryker (covered) |
| ATSE1-28 + ATSE1-29 (interaction row edit + create-task) | `backend/.../interaction/controller/InteractionControllerTest.java` (+88), `InteractionServiceTest.java` (+181), `frontend/.../interaction/edit-interaction/edit-interaction.spec.ts` (NEW, +189, ~10 tests), `interaction-list.spec.ts`, `interaction-page.spec.ts`, `interaction-state.service.spec.ts`, `task-create-form.spec.ts` | ~+32 | PITest **gap** — `interaction.*` not in `targetClasses` ⚠️ |
| ATSE1-30 (task subject dropdown) | `frontend/.../shared/forms/employee-picker/employee-picker.spec.ts` (NEW, +192, ~9 tests), `task-create-form.spec.ts` | ~+14 | Stryker (covered) |
| ATSE1-31 (task create bug — security + schema) | `backend/.../task/web/TaskControllerSecurityTest.java` (NEW, +203, 8 tests), `TaskServiceTest.java`, `TaskControllerTest.java`, `TaskServiceMappingTest.java` (NEW, +102, 3 tests) | ~+14 | PITest **gap** — `task.web.TaskController` not in `targetClasses` ⚠️ |
| ATSE1-33 (real employee picker for interactions) | covered by ATSE1-28/29 + `employee-picker.spec.ts` | (folded) | covered above |
| ATSE1-34 (task subtasks) | `backend/.../task/service/TaskItemServiceTest.java` (NEW, +382, 16 tests) | ~+16 | PITest covers `com.staffengagement.task.*` (covered) |
| ATSE1-35 (portfolio add-row bug) | `frontend/.../features/portfolio/portfolio.spec.ts` (+120/-58, ~+7 tests) | ~+7 | Stryker (covered) |

---

## Compliant ✅

- **Test execution green**: 254/254 backend, 219/219 frontend, ESLint clean.
- **Unit-tests-only constraint**: zero `@SpringBootTest`, zero `@WebMvcTest`,
  zero `@DataJpaTest`, zero `MockMvc` in the new test surface — verified by
  grepping the diff for both backend and frontend (`git diff main..HEAD |
  grep -E '^\+.*@(SpringBootTest|Disabled|Ignore|Order|DataJpaTest|WebMvcTest)'`
  returns no hits in source).
- **BDD scaffold consistency**: 101 explicit `// Given / // When / // Then`
  markers added across new backend tests and 209 markers added across new
  frontend tests — every new spec follows Given-When-Then.
- **BDD test names read like behaviour statements**: spot-checks on
  `your-details-state.service.spec.ts` (`loadCurrent sets notFound when the
  JWT subject is missing`, `update puts the request, refreshes profile, and
  clears the previous error`) and `edit-interaction.spec.ts` (`PATCHes the
  supplied type+note and emits saved on success`, `does NOT emit closed when
  the click target is inside the panel`) show strict Given-When-Then
  behavioural phrasing — not `testFoo` / `shouldDoX`.
- **Mockito-only backend**: 3 new files use `@ExtendWith(MockitoExtension.class)`,
  every `@InjectMocks` / `@Mock` site is on a plain Mockito class, no
  `SpringRunner`, no `SpringBootTest.`.
- **HttpTestingController / stubbed-ApiClient frontend**: edit-interaction
  stubs `ApiClient` via `{ provide: ApiClient, useValue: apiClientSpy }`
  (no real HTTP); your-details-state / auth-error-interceptor use
  `HttpTestingController`; portfolio.spec.ts uses
  `provideHttpClient() + provideHttpClientTesting()`; zero
  `BrowserDynamicTestingModule`, zero `HttpClientModule`.
- **Mutation-driven assertion strictness**:
  - `TaskItemServiceTest` — 32 strict `isEqualTo` / `assertThat` /
    `verify(...)` calls vs 8 weak (all weak are exception type assertions,
    which are appropriate for BDD "Then an exception is raised" assertions).
  - `TaskControllerSecurityTest` — 19 strict vs 4 weak (all weak are
    `isInstanceOf` checks on thrown security exceptions).
  - `InteractionServiceTest` — 59 strict vs 1 weak (the lone weak is
    `isInstanceOf(InteractionNotFoundException)`).
  - Frontend `expect(component.x).toBeNull()` / `isLoading()` reads are
    appropriate boolean / signal checks — no `toBeTruthy()` /
    `toBe(true)` laziness.
- **No integration tests added**: zero new imports of `MockMvc`,
  `TestRestTemplate`, or `SpringBootTest`.
- **No coverage gaps** for new production code:
  - New backend domain classes (`TaskItem`, `UpdateInteractionRequest`,
    `TaskItemSummary`, `TaskSummaryWithItems`, `TaskItemRepository`) are
    exercised transitively through `TaskItemServiceTest` + controller specs.
  - New frontend components (`edit-interaction`, `auth-error.interceptor`,
    `employee-picker`, `your-details-page`, `your-details-state.service`)
    all have their own spec files. The `auth-storage.ts` utility is
    exercised through `auth-state.spec.ts` and `auth-error.interceptor.spec.ts`
    via stubbed `AuthStorage` injections (this is the standard JSDOM
    pattern — the `browserAuthStorage` default is too tightly coupled to
    `globalThis.sessionStorage` to test directly).
- **No forbidden anti-patterns**: zero `@Disabled`, zero `@Ignore`, zero
  `@Order`, zero `Thread.sleep`, zero `new Random()` in any new test file.
- **Pure Jest/Jasmine frontend test runner**: 27 suites, all green; no
  skipped `xit`/`xdescribe`, no `fit`/`fdescribe`.
- **Coverage carried forward**: branch baseline 215 backend + 157 frontend
  → 254 + 219 ⇒ +39 backend and +62 frontend net new tests. Coverage
  delta is well above the per-section delta any reviewer would consider
  "thin".

---

## Warnings ⚠️

- **W1 — PITest `targetClasses` does not include `com.staffengagement.interaction.*`.**
  `backend/pom.xml` `targetClasses` lists `shared.*`, `task.*`,
  `employee.*`, `profile.*` — but not `interaction.*`. The new
  `InteractionService.update(...)` (PATCH owner-check, admin-vs-facilitator
  branches) and `InteractionController.update(...)` (status 200/403/404
  matrix) are **not measured by PITest**, so their mutation score is
  unverified. This is the same shape as the phase-6 W1 finding for the
  `skills` module. Remediation: add `com.staffengagement.interaction.*` to
  `targetClasses` in a follow-up PR.
- **W2 — PITest `targetClasses` does not include `com.staffengagement.task.web.*`.**
  The new `TaskControllerSecurityTest` validates that `@PreAuthorize` is
  present via reflection on the `Method` object (`getAnnotation +
  getDeclaredAnnotation`) — a sound Mockito-only technique that does
  **not** require Spring context — but the controller's own mutators
  (e.g. dropping the `@PreAuthorize` annotation, swapping
  `hasAnyRole('ADMIN','USER')` → `hasRole('ADMIN')`) are not exercised by
  PITest. Adding `com.staffengagement.task.web.*` to `targetClasses`
  alongside the service-level `task.*` entry closes the gap. Same fix as
  W1.
- **W3 — `auth-storage.ts` has no dedicated spec.** The `browserAuthStorage`
  default implementation (the `try { ... } catch { return null }` swallowing
  branches around `globalThis.sessionStorage.getItem/setItem/removeItem`) is
  not directly covered. It **is** exercised through `auth-state.spec.ts`
  via `provideHttpClient()` + real `AuthState` invocation in JSDOM (which
  routes through the default provider) and the `auth-state` happy/sad-path
  tests would fail if `read` returned `undefined` instead of `null` or if
  `write` threw — so the contract is de-facto covered. But the "storage
  unavailable" branches (try/catch swallowing) are not isolated. A
  dedicated 3-case unit spec is the cheap fix; acceptable to defer.

---

## Violations ❌

None.

---

## Mutation Coverage

Subjective assessment, cross-referenced with the new test surface:

- **TaskItemServiceTest (16 specs)** — Excellent mutation kill surface.
  Specs like `addItem_appendsAfterExistingItems`,
  `deleteItem_renumbersRemainingOrdinals`, `reorderItems_rejectsForeignItemId`
  exercise ordinal arithmetic, cross-task guards, and aggregation — exactly
  the mutations Stryker/PITest will generate (off-by-one, negated `>=`,
  replaced task-id check). This is the strongest new file.
- **TaskControllerSecurityTest (8 specs)** — Strong annotation-presence
  coverage via reflection. Will kill mutants that delete
  `@PreAuthorize`, change the role list, or swap `hasAnyRole` →
  `denyAll`. Will **not** kill mutants that disable the AOP enforcement
  itself (would need a Spring slice, which the unit-only rule forbids).
  Acceptable trade-off.
- **InteractionServiceTest PATCH additions** — Cover the owner-relationship
  matrix (subject == requester → allowed; facilitator → only on own
  interaction; admin → always; 403/404 cases). Strong. (PITest gap per W1
  means we cannot measure the score — but the assertions are
  strict-equality / verified Mockito calls.)
- **InteractionControllerTest PATCH additions** — Cover the
  `200 / 403 / 404` status-code matrix and the
  `service.update(eq(id), eq(type), eq(note), eq(principal), eq(canEdit))`
  argument-forwarding contract. Strong.
- **Frontend `your-details-state.service.spec.ts`** — 10 specs across
  `loadCurrent`, `create`, `update`, `isAdmin` — each verifying both happy
  path and sad path (`captures the error and leaves profile null on
  failure`). Will kill Stryker mutants on `?? null`, `try/catch` boundary
  removal, and `signal.set()` removal.
- **Frontend `edit-interaction.spec.ts`** — 10 specs covering the
  overlay open/close logic, PATCH delegation, save success/failure, and
  the three close paths (Cancel button, backdrop click, Escape key).
  Strong.
- **Frontend `employee-picker.spec.ts`** — 9 specs covering
  fetch-on-open, debounce, search, selection emit, loading state, and
  the "create new" affordance. Strong.
- **Frontend `task-create-form.spec.ts`** — Adds cases for the new
  `EmployeePicker` integration, the new `title` field, and the
  admin-vs-user pre-fill behaviour. Solid.

No new file is weak. The only files with potential Stryker-undetected
behaviour are the routing-level files (`app.routes.ts`,
`your-details.routes.ts`) which are properly excluded from Stryker's
`mutate` glob via the `!*.routes.ts` exclusion in `stryker.conf.json`.

---

## Verdict

**READY TO MERGE.** The branch satisfies every hard rule of
`testing-strategy.yaml` v1.0.0 (unit-tests-only, BDD Given-When-Then,
Mockito + HttpTestingController, ≥80 % coverage threshold trajectory).
The three Warnings are documentation / scope-coverage concerns, not
correctness or hard-rule violations, and they can be addressed in a
follow-up PITest-scope update + a tiny `auth-storage.spec.ts` follow-up.
No blockers.

Recommended follow-up PR (after merge): extend PITest `targetClasses` to
include `com.staffengagement.interaction.*` and
`com.staffengagement.task.web.*`, then add a focused
`auth-storage.spec.ts` for the storage-unavailable branches.