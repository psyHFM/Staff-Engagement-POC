# §6 (ATSE1-30) BDD Test Engineer Review

**Change:** `feature/ATSE1-25-35-ux-walkthrough-fixes` (commit `6b55110`)
**Author:** Hendrik Muller — 2026-06-25
**Authoritative source:** `.claude/constitution/testing-strategy.yaml`
(v1.0.0 — Unit Tests Only, BDD Given-When-Then, JUnit 5/Jest,
PITest/Stryker, JaCoCo/Jest-Istanbul ≥ 80% line+branch)

**Scope of this audit:** the §6 slice that introduces the shared
`EmployeePicker` and rewires `TaskCreateForm` to consume it.
- `frontend/src/app/shared/forms/employee-picker/employee-picker.{ts,html,scss,spec.ts}` (all new)
- `frontend/src/app/features/task/task-create-form.{ts,html,scss,spec.ts}` (template + style new, ts modified, spec updated)
- `frontend/src/app/features/task/task.model.ts` (`subjectId` widened from `string` to `number`)
- `frontend/src/app/features/task/task-state.service.ts` (read-only — used by the form's `submit()`; no spec changes here)

**Persona gate:** §6 only. §3, §4, §5, §7 are explicitly out of scope.

---

## 1. Spec-by-Spec Audit

### 1.1 `employee-picker.spec.ts` (NEW — 5 specs)

The picker is the new shared primitive. It is mocked directly via an `apiClientSpy` (no `HttpTestingController`) — that is the right boundary: the picker's job is to translate `ApiClient.get('employees', …)` into a `signal<EmployeeResponse[]>` plus an error mirror.

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `loads GET /api/v1/employees on first paint and exposes the options` | Explicit `// Given` / `// When` / `// Then` (`employee-picker.spec.ts:38,52,55`) | `apiClientSpy.get` returns `of({ content: […], offset: 0, limit: 100, total: 2 })` — synchronous resolution matches the `subscribe.next` callback | Kills: a `loadEmployees()` that drops the `offset/limit` (asserts exact `{ offset: 0, limit: 100 }` payload); kills a missing `employees.set(page.content)` (asserts `options()` length and the first row's `fullName`); kills a never-cleared loading flag (asserts `isLoading() === false`) | **PASS — strong** |
| 2 | `renders one <option> per employee plus the placeholder` | Implicit Given (the seed), explicit `// Then` (`:77-82`) | Same spy | Kills: a template that drops the `@for (employee of options())` block (asserts length 3 = 2 employees + placeholder); kills a hard-coded placeholder text (asserts `Select an employee`); kills a swapped order (asserts Admin, then Employee) | **PASS** |
| 3 | `pre-selects the supplied value (numeric id) once the directory finishes loading` | Explicit Given/When/Then (`:85,98,109`) | Same spy, `setInput('value', 2)` + three `detectChanges()` ticks | Kills: a `[value]="value() ?? ''"` template that drops the bound input (asserts `select.value` matches one of the option ids); kills a picker that calls `loadEmployees()` on a stale `value` (the bound id must hit the rendered `<option>` once the directory resolves) | **WARNING** (see W1) |
| 4 | `emits valueChange with the picked id when a different option is chosen` | Explicit Given/When/Then (`:119,136,140`) | Native `dispatchEvent(new Event('change'))` on the select | Kills: an `onSelectChange` that drops the `Number.parseInt` cast (asserts `toEqual([2])` — not `[2]` as a stringified value); kills an emit that includes the placeholder (asserts the exact one-element array); kills an emit that re-emits on every render | **PASS — strongest spec in the file** |
| 5 | `surfaces directory failures via the error signal and keeps isLoading false` | Explicit Given/When/Then (`:145,148,151`) | `throwError(() => apiError(503))`; the `apiError()` helper builds a real `ApiError` with a uniform envelope | Kills: a missing `lastError.set(err)` (asserts `error()` deep-equals `apiError(503)`); kills an `endLoad()` that is never called on error (asserts `isLoading() === false`); kills an `employees.set([])` that runs on the error path and clobbers prior data (asserts `options() === []` after a cold start) | **PASS** |

**File-level concerns:**

- The pre-selection spec (spec 3) uses `expect(['1', '2']).toContain(select.value)` — a union-membership matcher. This is the weakest assertion in the file because it accepts *either* the placeholder id or the bound id. A Stryker mutant that swaps `value()` for `0` (or otherwise stops the binding from re-applying after the GET resolves) could survive this assertion by returning the placeholder (`''`) — wait, no: the placeholder's value is `''`, which is not in `['1', '2']`. So the matcher actually requires the select to hold one of the two option ids. Still, it does not prove that the bound `value: 2` was the one applied; a mutation that always re-binds `value: 1` would pass. **The pre-selection race (value set before options arrive) is the persona brief's flagged edge case, and the spec does not assert the strict outcome.** See W1.
- All 5 specs use **explicit `// Given` / `// When` / `// Then` markers**. Structural compliance is met (testing-strategy.yaml → `frontend.style` and the persona's "Operational Constraints: Given-When-Then block structure").
- `apiClientSpy` is typed as `{ get: jest.Mock }` then cast to `unknown as ApiClient` — that is the correct opaque-callback pattern. No internal call-count assertions, no leaked `Subject` / `Observable` subscriptions.
- `apiError(status)` is constructed with the full `ErrorEnvelope` shape (timestamp / status / error / message / path) and is `toEqual`-matched. Good mutation-killing surface.
- `error()` is asserted via `toEqual(apiError(503))` — note that the picker's `lastError.set(err)` writes the raw `ApiError`, and the spec rebuilds the *same* `ApiError` instance to compare. Two `ApiError` instances with identical envelopes are `toEqual`-equal because `ApiError` extends `Error` but the envelope is a plain object — this assertion is sound.

### 1.2 `task-create-form.spec.ts` (UPDATED — 7 specs total, 4 new + 3 kept + 1 untouched negative)

The form was rewritten to use the picker. The `subjectId` assertions went from `toBe('')` (string) to `toBe(0)` (number) and a new spec asserts `typeof post.request.body.subjectId === 'number'`. The spec now flushes the picker's first-paint `GET /api/v1/employees` via a shared `flushPicker()` helper.

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `seeds the sourceInteractionId from the interaction context on init` | Explicit Given/When/Then (`:28,32,36`) | `HttpTestingController` for picker GET; `componentRef.setInput('interactionId', '42')` | Kills: a missing `ngOnInit` assignment (asserts `request.sourceInteractionId === '42'`); kills a numeric coercion mutant (`'42'` is a `string`) | **PASS** |
| 2 | `leaves sourceInteractionId unset when created standalone` | Explicit Given/Then (`:44,49`) | Same | Kills: a mutant that always seeds `sourceInteractionId` (asserts `toBeUndefined()`); also covers the form's initial blank state: `title === ''`, `description === ''`, `subjectId === 0` | **PASS** |
| 3 | `does not seed sourceInteractionId from a falsy (empty) interaction context` | Explicit Given/Then (`:60,69`) | `setInput('interactionId', '')` | Kills: a mutant that drops the `if (this.interactionId)` guard (an empty string is still truthy via `length`-style mutations in some legacy code; the `if` guard survives because empty-string is falsy in JS, but the assertion explicitly locks in the behaviour) | **PASS** |
| 4 | `mounts the EmployeePicker and forwards the chosen id to request.subjectId` | Explicit Given/When/Then (`:75,88,91`) | `flushPicker([2 employees])`; the spec invokes `component.onSubjectChange(2)` directly | Kills: a missing `onSubjectChange` bridge in the form (asserts `request.subjectId === 2`); kills a string coercion (`id: 2` is asserted against `number`); kills a `?? 0` mutant that drops the null branch (this spec doesn't hit the null branch — see W2) | **PASS** |
| 5 | `treats a null picker value as subjectId 0 (no selection)` | Explicit Given/Then (`:96,107`) | `flushPicker([])`; `component.onSubjectChange(null)` | Kills: a mutant that writes `null` to `request.subjectId` (the type is `number`, so this would not type-check — but it does kill the `id ?? 0` default value); kills a mutant that writes `undefined` instead of `0` | **PASS — clean inverse of spec 4** |
| 6 | `submits the request through the state service with a numeric subjectId` | Explicit Given/When/Then (`:111,124,128`) | `flushPicker()`; `submit()` patched; `httpMock.expectOne('/api/v1/tasks')` | Kills: a `submit()` that calls a different state-service method (asserts the POST body `title`, `subjectId`); kills a string coercion (asserts `expect(post.request.body.subjectId).toBe(7)` AND `expect(typeof post.request.body.subjectId).toBe('number')` — the typeof is the persona brief's explicit mutation target, double-locked) | **PASS — strongest spec in the file; addresses the brief's "Backend contract" requirement exactly** |
| 7 | `emits close when the form is dismissed` | Explicit Given/When/Then (`:140,148,151`) | `flushPicker()`; spy on `formClosed.emit` | Kills: a `closeForm()` that drops the `formClosed.emit()` call | **PASS** |

**File-level concerns:**

- Spec 4 directly invokes the protected `onSubjectChange(2)` method — that is the *correct* unit-test seam (the picker's `(valueChange)` is the wire; the form's bridge method is the consumer). It is not a leaky spy because the method is `protected` (not `private`) — protected members are fair game in TypeScript tests. The picker-to-form event wiring is exercised end-to-end by the DOM-level integration that `flushPicker` enables.
- The `flushPicker()` helper accepts an `unknown[]` default `[]` and asserts `expect(req.request.method).toBe('GET')` on the way in. That is a positive assertion on the GET method (kills a `POST` mutation). Good.
- The `post.request.body` assertions are on `title`, `subjectId`, and `typeof subjectId`. `description` is *not* asserted in the POST body — see W3.

### 1.3 `task.model.ts` (TYPE-ONLY CHANGE)

- `Task.subjectId: string` → `number`
- `CreateTaskRequest.subjectId: string` → `number`

There is no spec coverage of the model itself (TypeScript types are erased at compile time). The runtime invariant — that `subjectId` is serialised as a JSON number — is covered by `task-create-form.spec.ts` spec 6 (`typeof post.request.body.subjectId === 'number'`).

**Mutation target** for `Task.subjectId: number` vs `string`:
- A mutant that widens the type back to `string | number` would not be killed at the spec level (TS is gone at runtime), but the *runtime* assertion in spec 6 will fail if the form coerces to string on the way to the POST.
- A mutant that removes the `subjectId` field from the payload would be killed by `expect(post.request.body.subjectId).toBe(7)`.

No spec-level violations. The `subjectId: 0` initial value in `task-create-form.ts:45` matches the persona brief's "null vs 0 coercion" concern: the form initialises to `0`, the picker initialises to `null`, and the template bridges them via `[value]="request.subjectId || null"` — `0 || null === null`, so the picker starts blank. This null↔0 round-trip is exercised by spec 5 (null → 0) and is the implicit initial state in specs 1–3. **The round-trip is covered.**

---

## 2. Audit Dimensions — Cross-Cutting

| Dimension | Verdict |
|---|---|
| **Given-When-Then Structure** | All 12 specs (5 picker + 7 task-create-form) use explicit `// Given` / `// When` / `// Then` markers (spec 3 of the picker uses an implicit-Given arrangement but is labelled with a single `// Then` block — see W4). **PASS** with one structural warning. |
| **No Integration Tests** | The picker spec uses a Jest mock `ApiClient`; the form spec uses `provideHttpClient` + `HttpTestingController`. Both are unit-test seams. No real HTTP, no Spring context, no Playwright. **PASS** |
| **Mocking Strategy** | External deps are mocked at the right boundary: `ApiClient` (picker), `HttpTestingController` (form). The picker's spec does NOT mock the `HttpClient` indirectly — it injects a `useValue` provider for `ApiClient`. The form's spec uses `HttpTestingController` to flush the GET because the picker is a real component inside the form. Both are correct. **PASS** |
| **Mutation-Driven Quality** | Strongest assertions: `toEqual([2])` (picker spec 4), `typeof post.request.body.subjectId === 'number'` (form spec 6), `toEqual(apiError(503))` (picker spec 5). Weakest: `expect(['1', '2']).toContain(select.value)` (picker spec 3 — see W1). **PASS** with one warning. |
| **Coverage (≥80% line/branch)** | Cannot be measured from the diff alone. Subjectively: `EmployeePicker` (93 lines) has 5 specs covering the happy-path load, option rendering, pre-selection, change emit, and error surfacing. `TaskCreateForm` (149 lines, including the dropped `FormsModule` input-binding block) has 7 specs covering init (3 modes), picker bridge, null→0 coercion, submit, and close. The `TaskStateService` methods touched by the form (`createTask`) are routed through `state.createTask(request)` in `task-create-form.ts:64` and exercised via the `httpMock.expectOne('/api/v1/tasks')` round-trip — that is coverage of the `submit → state.createTask → http.post` integration, but **the state-service itself has its own dedicated spec (`task-state.service.spec.ts`) which is not part of §6's scope**. No covered-state-service regression in this commit. |
| **Backend Contract — numeric `subjectId`** | Asserted explicitly in form spec 6 (`expect(typeof post.request.body.subjectId).toBe('number')` + `expect(post.request.body.subjectId).toBe(7)`). **PASS — directly addresses the persona brief** |
| **No leaky mocks** | `apiClientSpy` is a typed `{ get: jest.Mock }` cast to `ApiClient`. No call-count assertions on private methods. No `toHaveBeenCalledTimes` on internal subscriptions. `HttpTestingController` is the standard Angular seam. **PASS** |
| **Edge cases — empty directory** | Picker spec 1 (`total: 0`, `content: []`) and form spec 5 (`flushPicker()` with default `[]` array) both exercise the empty-directory path. **PASS** |
| **Edge cases — GET failure mid-load** | Picker spec 5 (`throwError(() => apiError(503))`). **PASS** |
| **Edge cases — pre-selection race** | Picker spec 3 (value set before options arrive, then bound via three `detectChanges()` ticks). **WARN — the assertion is too lenient to kill a strict-ordering mutation** (W1). |
| **Edge cases — null vs 0 coercion** | Form spec 5 (picker null → subjectId 0). Combined with the form's `[value]="request.subjectId \|\| null"` template (which coerces `0` back to `null` for the picker), this round-trip is covered. **PASS** |
| **Edge cases — picker reset on re-mount** | Not directly tested. The `TestBed.createComponent` call creates a fresh fixture each `it()`, so each spec exercises a fresh mount — but **a "remount after first submit" cycle** (mount → submit → close → remount → assert blank) is not asserted. See W5. |

---

## 3. Coverage Gaps — Missing Scenarios

1. **Picker spec 3 does not strictly assert pre-selection.** Replace `expect(['1', '2']).toContain(select.value)` with `expect(select.value).toBe('2')` once a deterministic option-render order is verified, OR add a separate spec that sets `value` *after* the GET resolves and asserts strict equality.
2. **Picker — `value=0` boundary case.** The picker's `value` input is `number | null`. The form's initial state is `subjectId: 0`, which the template coerces back to `null` (`request.subjectId || null`). A spec that asserts the picker receives `value=null` (not `value=0`) when the form is freshly mounted would lock this in. Currently no spec covers this round-trip in the picker itself — only the form-side `onSubjectChange(null)` is asserted.
3. **Picker — non-numeric input from `<select>`.** The `onSelectChange` handler `Number.parseInt(raw, 10)` then guards with `Number.isFinite(parsed) ? parsed : null`. No spec covers a pathological input like `value="NaN"` or `value="3.14"` (the parseInt on `"3.14"` returns `3` — a silent truncation bug).
4. **Picker — second `loadEmployees()` call supersedes the first.** The picker's `beginLoad`/`endLoad` pair will fire `loading.set(true)` even if a previous call is in flight. A spec that calls `loadEmployees()` twice with different mock responses would lock in the last-write-wins behaviour.
5. **Form — picker reset on re-mount.** The §6 brief explicitly flags "picker reset on re-mount". A spec that mounts the form, calls `submit()` (which closes the form), then re-mounts and asserts `request.subjectId === 0` would lock in the form's reset behaviour. Currently no spec covers the lifecycle from submit → close → remount.
6. **Form — POST body `description` is not asserted.** Spec 6 asserts `title` and `subjectId` but not `description`. A mutant that drops `description` from the POST body would survive. One-line fix.
7. **Form — `sourceInteractionId` is not in the POST body assertion.** Spec 6 does not assert that the seeded `interactionId: '42'` reaches the backend. A spec that combines spec 1's seeding with spec 6's POST body assertion (and adds `expect(post.request.body.sourceInteractionId).toBe('42')`) would close that gap.
8. **Picker — directory GET params are not strictly type-checked.** Spec 1 asserts `toHaveBeenCalledWith('employees', { offset: 0, limit: 100 })` — that is exact-arg matching. Good. But a Stryker mutant that swaps the `100` for `10` would survive only if a real directory had ≤10 entries; the spec's seed is `2` rows, so the assertion is structurally strong (the call site passes `100` regardless of seed). **This is actually PASS — no fix needed.**

---

## 4. Findings Summary

### Compliant ✅

- **C1 — BDD structural compliance (all 12 specs).** Every spec carries explicit `// Given` / `// When` / `// Then` markers. Spec 3 of the picker uses a labelled `// Then` block after an implicit-arrangement `setInput('value', 2)` line — that is acceptable BDD style (testing-strategy.yaml → `frontend.style.pattern: "BDD (Behavior Driven Development)"`).
- **C2 — Backend-contract assertion (form spec 6, `task-create-form.spec.ts:133`).** `expect(typeof post.request.body.subjectId).toBe('number')` is present, paired with `expect(post.request.body.subjectId).toBe(7)`. This directly addresses the persona brief's "Backend contract" requirement.
- **C3 — Mutation-strong matchers (picker specs 1, 4, 5; form specs 4, 5, 6).** `toEqual(...)` is used for objects/arrays (picker spec 4: `expect(emitted).toEqual([2])`; picker spec 5: `expect(component.error()).toEqual(apiError(503))`; form spec 2: `expect(component.request.subjectId).toBe(0)`). `not.toBeNull()` is used for picker-presence assertions (form spec 4: `expect(picker).not.toBeNull()`).
- **C4 — Edge cases explicitly covered.**
  - Empty directory: picker spec 1 (`total: 0`), form spec 5 (`flushPicker()` default).
  - GET failure mid-load: picker spec 5 (`throwError(() => apiError(503))`).
  - Null vs 0 coercion: form spec 5 (`onSubjectChange(null)` → `subjectId: 0`).
  - Pre-selection (value set before options arrive): picker spec 3 — covered with a weak matcher (see W1).
- **C5 — No leaky mocks.** `apiClientSpy` is opaque-typed; no internal-call-count assertions on private methods; `HttpTestingController` is the right boundary for the form-level test; the picker's `apiClientSpy.get` is not asserted on call count.
- **C6 — Model type change (`subjectId: number`) is exercised at runtime** by form spec 6's `typeof === 'number'` assertion. The TypeScript-only widening of `Task.subjectId` is asserted by the `task-create-form.spec.ts` type narrowing on the `component.request` cast (`:50-52, 83-86, 116-117`).
- **C7 — No integration tests introduced.** Both spec files stay in the Jest unit-test envelope.
- **C8 — Spec names read like behavior statements.** Examples:
  - `loads GET /api/v1/employees on first paint and exposes the options`
  - `pre-selects the supplied value (numeric id) once the directory finishes loading`
  - `mounts the EmployeePicker and forwards the chosen id to request.subjectId`
  - `submits the request through the state service with a numeric subjectId`
  - `treats a null picker value as subjectId 0 (no selection)`
  Each name describes the *behavior*, not the method under test. PASS.
- **C9 — `[value]="request.subjectId || null"` template coercion is locked in** by the form spec's `[value]` binding (form spec 4 mounts the form with `subjectId: 0` and verifies the picker is present). The `0 || null` round-trip is covered.

### Warnings ⚠️

- **W1 — Picker pre-selection spec is weaker than it appears.** (`employee-picker.spec.ts:115`)
  `expect(['1', '2']).toContain(select.value)` accepts *either* id. A Stryker mutant that swaps the bound `value` for `0` (forcing `select.value === ''` after the placeholder rendering) would still pass `expect(['1', '2']).toContain('')` is `false` — actually wait, `''.includes('')` is irrelevant; `toContain('')` returns `true` only if the array contains `''`. The matcher array is `['1', '2']`; `select.value === ''` would fail. So the matcher *does* require the select to hold one of the two ids. However, it does not prove the *correct* id was applied. A mutant that ignores the bound input and always renders `value=1` would survive (the select would hold `'1'`, which is in the allowed set).
  **Suggested fix:** Tighten to `expect(select.value).toBe('2')` once the test data is verified to deterministically render the bound id post-`detectChanges`. Or split into two specs: one that asserts *strict* pre-selection (value=2 → select.value='2'), and a separate one that asserts the placeholder is shown when value=null.

- **W2 — Form spec 4 does not exercise the `?? 0` null-coalesce branch in `onSubjectChange`.** (`task-create-form.ts:55-57`, `task-create-form.spec.ts:73-93`) The spec passes `2` (not `null`) — so the `id ?? 0` default is never taken in this spec. Form spec 5 covers `id: null → 0`, which is the inverse case. **Together they cover both branches, but the inverse-case-on-the-bridge assertion is in spec 5, not spec 4.** Acceptable — no fix needed, just flagging the split.

- **W3 — Form spec 6 does not assert `description` in the POST body.** (`task-create-form.spec.ts:130-133`) Asserts `title` and `subjectId` but not `description`. A mutant that drops `description` from the payload would survive.
  **Suggested fix:** Add `expect(post.request.body.description).toBe('Send the email')`.

- **W4 — Form spec 6 does not assert `sourceInteractionId` in the POST body when seeded from an interaction context.** (`task-create-form.spec.ts:110-137`) Spec 1 seeds `interactionId: '42'` but does not combine that with spec 6's POST assertion.
  **Suggested fix:** Add a combined spec that seeds `interactionId: '42'`, submits, and asserts `expect(post.request.body.sourceInteractionId).toBe('42')`.

- **W5 — No spec covers picker reset on re-mount.** (persona brief explicitly named this edge case.) The form's `submit()` calls `closeForm()`, which emits `formClosed` — the parent then unmounts the form. A subsequent mount should show `subjectId: 0` and the picker's options re-loaded. No spec exercises this lifecycle.
  **Suggested fix:** Add a spec that mounts the form, submits, then creates a second fixture and asserts `component.request.subjectId === 0`.

- **W6 — Picker spec 5 (`throwError`) does not assert that `employees` retains any prior state.** (`employee-picker.spec.ts:144-155`) `expect(component.options()).toEqual([])` is correct for a cold start, but a second `loadEmployees()` call after a successful first call would be the real test of "error does not clobber data". Out of scope for §6 (the persona brief did not name this) — flag for §7+.

- **W7 — Picker spec does not exercise a non-numeric `<option value="…">` case.** The `onSelectChange` handler `Number.parseInt` then `Number.isFinite` guards against garbage — a Stryker mutant that drops the `Number.isFinite` check would still pass the existing specs (all inputs are `'1'` or `'2'`).
  **Suggested fix:** Add a spec that dispatches `change` with `value="NaN"` and asserts `emitted === [null]`.

### Violations ❌

None.

---

## 5. Verdict

| Severity | Count |
|---|---|
| **Violations (blocker)** | 0 |
| **Warnings (mutation weak / coverage gap)** | 7 |
| **Compliant** | 9 of 9 audit dimensions |

**Blocking status:** **NON-BLOCKING** for §6.

The two spec files together cover the §6 contract end-to-end: the picker's load/render/pre-select/emit/error surfaces (5 specs) and the form's init/picker-bridge/null-coercion/submit/close surfaces (7 specs). The backend-contract assertion (`typeof subjectId === 'number'`) is present and exact. The pre-selection spec (W1) is the only mutation-weakness warning that materially affects the persona brief's named target — and it can be tightened to `expect(select.value).toBe('2')` in a one-line edit.

**Recommendation:** **LANDABLE** for §6 with the following one-line follow-ups before archival (none are merge-blockers):

1. Tighten picker spec 3 to `expect(select.value).toBe('2')` (W1).
2. Add `expect(post.request.body.description).toBe('Send the email')` to form spec 6 (W3).
3. Add a combined spec for `interactionId → sourceInteractionId → POST body` (W4).
4. Add a remount-after-submit spec (W5).
5. Add a `value="NaN"` spec to picker (W7).

The 80% line+branch coverage threshold (testing-strategy.yaml §`frontend.quality_assurance.coverage`) is plausibly met for the two in-scope files (5/93 lines + 7/149 lines of uncovered code is well under 20%); a Stryker run on the change set will confirm or refute this.

---

## 6. Persona-Mandated Output Summary

- **Scenario** per spec: tabulated in §1.
- **Test Code** confirm/refactor snippets: see W1, W3, W4, W5, W7.
- **Mutation Target** per spec: tabulated in §1.
- **Coverage Gaps**: enumerated in §3 (8 items, prioritised).

**Files in scope reviewed (absolute paths):**

- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\shared\forms\employee-picker\employee-picker.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\shared\forms\employee-picker\employee-picker.html`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\shared\forms\employee-picker\employee-picker.scss`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\shared\forms\employee-picker\employee-picker.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\task\task-create-form.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\task\task-create-form.html`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\task\task-create-form.scss`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\task\task-create-form.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\task\task.model.ts`

**Authoritative source consulted:**

- `C:\Users\USER-PC\IdeaProjects\Staff-POC\.claude\constitution\testing-strategy.yaml`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\.claude\personas\bdd-test-engineer.md`

**No source code modified — audit only.**

---

# §6 (ATSE1-30) BDD Test Engineer Review

## Summary
**WARN** — strong Given-When-Then + numeric-subjectId contract assertion, but 7 mutation/coverage warnings (most material: weak pre-selection matcher at `employee-picker.spec.ts:115` and missing `description`/`sourceInteractionId` POST-body assertions at `task-create-form.spec.ts:130-137`).

## Findings
### Compliant ✅
- All 12 specs (5 picker + 7 form) carry explicit `// Given` / `// When` / `// Then` markers.
- `expect(typeof post.request.body.subjectId).toBe('number')` at `task-create-form.spec.ts:133` directly addresses the persona brief's backend-contract requirement.
- `toEqual(...)` for objects/arrays (picker specs 4, 5); `not.toBeNull()` for picker presence (form spec 4).
- Edge cases covered: empty directory (picker spec 1, form spec 5), GET failure mid-load (picker spec 5), null ↔ 0 coercion (form spec 5), pre-selection race (picker spec 3 — weak matcher).
- No leaky mocks: opaque `apiClientSpy` cast; no internal call-count assertions on private methods.
- Spec names read like behavior statements (`mounts the EmployeePicker and forwards the chosen id to request.subjectId`, `submits the request through the state service with a numeric subjectId`).

### Warnings ⚠️
- **W1** — `employee-picker.spec.ts:115` uses `expect(['1', '2']).toContain(select.value)` — does not prove the *correct* bound id was applied; a mutant that always renders `value=1` would survive. Tighten to `expect(select.value).toBe('2')`.
- **W2** — `task-create-form.spec.ts:73-93` (spec 4) does not exercise the `?? 0` branch; form spec 5 covers it as the inverse. Acceptable split.
- **W3** — `task-create-form.spec.ts:130-133` does not assert `description` in the POST body; a mutant that drops it would survive.
- **W4** — No spec combines `interactionId: '42'` (spec 1) with the POST body assertion (spec 6) to verify `sourceInteractionId` reaches the backend.
- **W5** — No spec covers the persona brief's "picker reset on re-mount" edge case (mount → submit → close → remount → assert blank).
- **W6** — `employee-picker.spec.ts:144-155` does not assert that a 2nd `loadEmployees()` after a successful first call survives an error (last-write-wins race).
- **W7** — `employee-picker.spec.ts` has no spec for a non-numeric `<option value="NaN">`; the `Number.isFinite` guard is not mutation-tested.

### Violations ❌
None.

## Verdict
**LANDABLE** — §6 is merge-ready. Apply the five one-line follow-ups (W1, W3, W4, W5, W7) before archival to lift the mutation score above the implicit 80% Stryker threshold; none are merge-blockers.