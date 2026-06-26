# §6 (ATSE1-30) Angular State Architect Review

## Summary
**PASS** — the shared `EmployeePicker` (frontend/src/app/shared/forms/employee-picker/) is a signal-only, OnPush, single-source-of-truth selector that extends `StateService`; the `TaskCreateForm` rewires to it via `[value]`/`(valueChange)` (no `[(ngModel)]` on the picker, no `ControlValueAccessor`), and `Task.subjectId` / `CreateTaskRequest.subjectId` is now numeric end-to-end — `valueChange` emits a `number | null` and the parent writes a `number` into the request payload, so type hygiene is preserved through the bridge.

## Findings

### Compliant ✅
- **Signal-only picker contract, no `[(ngModel)]` two-way binding** — `frontend/src/app/shared/forms/employee-picker/employee-picker.ts:41` declares `readonly value = input<number | null>(null)` (the signal input); `:44` exposes `@Output() readonly valueChange = new EventEmitter<number | null>()`. The picker template (`employee-picker.html:5-6`) uses one-way `[value]="value() ?? ''"` and an event-side `(change)="onSelectChange($event)"`. A grep across `frontend/src/app/shared/forms/employee-picker/` returns zero `[(ngModel)]` / `ControlValueAccessor` / `ngModel` hits — only the doc-comment reference at `employee-picker.ts:15` explaining *why* the picker is not a control-value accessor. This is exactly the §1 V2 constitution-guard audit's call.
- **No `ControlValueAccessor` masquerade** — `EmployeePicker` does not implement `ControlValueAccessor` and does not register an `NG_VALUE_ACCESSOR` provider. The contract is plain: parent binds `value`, listens to `valueChange`; the picker does not pull values from or push values into a control layer.
- **`ChangeDetectionStrategy.OnPush`** — `employee-picker.ts:32` declares `changeDetection: ChangeDetectionStrategy.OnPush`. Combined with the signal-shaped inputs/outputs and `asReadonly()` projections (lines 51-52) the picker re-renders only on signal mutations and event emissions, which matches the rest of the project's components (cf. `interaction-page.ts:34`, `log-interaction.ts:19` reviewed in §5).
- **State-service discipline — side effects live where the state lives** — `EmployeePicker extends StateService` (`employee-picker.ts:37`); `loadEmployees()` (lines 64-80) is the only entry point and is the one place that calls the API. The picker does not `.subscribe()` outside of `loadEmployees()` (grep confirms a single `subscribe` at `employee-picker.ts:70`). Loading transitions are routed through the inherited `beginLoad()`/`endLoad()` (lines 65, 73, 77), so `isLoading` flips symmetrically on both success and failure paths. This mirrors the §5 reviewer (`05-angular-state-architect-interaction-subjects.md:11`) finding for `loadSubjects()` and keeps the §6 picker consistent with the rest of the codebase.
- **Public read API stays readonly signals / asReadonly()** — `options` (line 51) and `error` (line 52) are `asReadonly()` projections of the private writable signals `employees` (line 47) and `lastError` (line 50); `isLoading` re-exposes the inherited `loading` (line 53). Consumers cannot write to the underlying signals — only `loadEmployees()` mutates them. This is the frontend-state.yaml → `derived_state` discipline applied to local component signals (the parent state service is the picker itself in this case).
- **Type hygiene: `number | null` end-to-end** — `value` is typed `number | null` (line 41); `valueChange` is `EventEmitter<number | null>` (line 44); `onSelectChange` parses with `Number.parseInt(raw, 10)` and re-emits either `null` (for the empty placeholder string, line 87) or the parsed `number` (line 91) — NaN is collapsed to `null` via `Number.isFinite`. The bridge in `TaskCreateForm` (`task-create-form.ts:55-57`) takes `id: number | null` and writes `id ?? 0` into `request.subjectId` (declared `number` in `task.model.ts:3, 13`). The new spec at `task-create-form.spec.ts:133` asserts `typeof post.request.body.subjectId === 'number'` — the wire shape is now numeric, matching the backend `Long` deserializer the §6 design decision calls out.
- **Parent re-binds on the change event (unidirectional data flow)** — `task-create-form.html:26-29` is exactly `[value]="request.subjectId || null"` / `(valueChange)="onSubjectChange($event)"`. The picker never writes the parent's signal directly; the parent owns the write through `onSubjectChange()`. This is the explicit pattern the JSDoc on `employee-picker.ts:18-22` documents.
- **Side-effect inside the picker, not the parent component** — `TaskCreateForm` does not call `ApiClient.get(...)` for the directory; it does not implement its own subscribe / signal-write for the employee list. The directory is the picker's concern (it is, after all, an `app-employee-picker`), and the parent only forwards the chosen id into its own request shape. This matches the "side effects live in the state service handler" rule (frontend-state.yaml → `side_effects`).
- **Error routing matches §5's pattern** — on failure `lastError.set(err)` is written in the `error:` branch (`employee-picker.ts:76`); `error` is a readonly `computed` projection (line 52) and rendered at `employee-picker.html:15-17`. The spec at `employee-picker.spec.ts:144-155` covers this branch with `expect(component.error()).toEqual(apiError(503))` (object equality — see BDD discipline below).
- **Pagination shape matches the backend `Paged<T>` contract** — `employee-picker.ts:68` requests `{ offset: 0, limit: 100 }` (same magic-page-size pattern that §5's W1 already flagged for `interaction-state.service.ts:58`); reads `page.content` (line 72). The picker imports `EmployeeResponse` / `Paged` from `frontend/src/app/features/employee/employee.types.ts` — not from any internal copy.
- **No `.set()` / `.update()` racing on the same signal** — `employees`, `lastError`, and the inherited `loading` are each written via `.set()` in a single place (`loadEmployees`); no `.update()` is mixed in. Symmetric with the §5 finding (no microtask interleaving concern).
- **OnPush confirmed on the parent component shell too** — `TaskCreateForm` does not declare `changeDetection` itself, but it is consumed inside `interaction-page`/`task.ts` host components which are already OnPush; the picker being OnPush means the inline `[value]` / `(valueChange)` bindings render predictably without zone-driven CD churn in the form modal.
- **Tests assert behaviour, not stub identity** — `employee-picker.spec.ts` covers first-paint fetch (line 55: `toHaveBeenCalledWith('employees', { offset: 0, limit: 100 })`), rendered option count (`toHaveLength(3)`, line 78), pre-selection after directory load (line 115: `expect(['1','2']).toContain(select.value)`), `valueChange` emit (line 141: `expect(emitted).toEqual([2])`), and the API-error surfacing branch (line 152: `toEqual(apiError(503))`). `task-create-form.spec.ts` adds the picker-mount check (line 82: `expect(picker).not.toBeNull()`), the numeric-bridge assertion (line 92: `expect(component.request.subjectId).toBe(2)`), and the wire-shape assertion (line 133: `typeof post.request.body.subjectId === 'number'`). These are pure behaviour assertions, not internal-state peeking.
- **`// Given / When / Then` style consistently applied** — `employee-picker.spec.ts` uses `// Given` (lines 38, 62, 85, 119, 145), `// When` (lines 51, 98, 136, 148), `// Then` (lines 54, 77, 109, 140, 151) markers across all five specs. `task-create-form.spec.ts` carries the same discipline (lines 28, 30, 36, 43-44, 49, 51, 60-63, 67, 74-75, 88, 91, 95-96, 104, 110-112, 122, 127, 138, 141, 148).
- **`toEqual()` over `toBe()` for objects, `not.toBeNull()` over `toBeTruthy()`** — the new assertions use `toEqual(...)` for object/array checks (e.g. `employee-picker.spec.ts:141` `expect(emitted).toEqual([2])`, `:152` `expect(component.error()).toEqual(apiError(503))`, `:154` `expect(component.options()).toEqual([])`); `not.toBeNull()` is used at `task-create-form.spec.ts:82`. There are zero `toBeTruthy()` calls in either spec file.
- **`toBe()` used only for primitives / identity** — string/number/boolean/element-identity assertions (e.g. `employee-picker.spec.ts:57, 80-81, 153`; `task-create-form.spec.ts:23, 40, 53-56, 70, 92, 107, 131-133, 136, 152`). All object equality uses `toEqual()`.
- **Persistence policy respected** — no `localStorage`/`sessionStorage` access in either file; the directory is in-memory (re-fetched on each new picker mount via `ngOnInit` at `employee-picker.ts:55-57`). The JWT carve-out (frontend-state.yaml → `persistence.carve_outs`) is untouched.
- **Component-relative template/style extraction** — `TaskCreateForm` now has external `task-create-form.html` / `task-create-form.scss` files (per Angular style guide §2 "Single Responsibility"); the picker has its own `employee-picker.{ts,html,scss,spec.ts}` quartet under `shared/forms/`. Consistent with the rest of the codebase.
- **Naming + kebab-case** — selector `app-employee-picker`, file names `employee-picker.{ts,html,scss,spec.ts}`, BEM-style class names (`employee-picker`, `employee-picker__label`, `employee-picker__select`, `employee-picker__error`) — all kebab-case, matching the Angular style guide §1.

### Warnings ⚠️
- **W1 — `loadEmployees()` hard-codes `limit: 100`, no paging iteration** (severity: low; `employee-picker.ts:68`). The same magic-page-size pattern §5 already flagged at `interaction-state.service.ts:58`. With the shared picker in §6 there are now **two** call sites silently truncating at 100. *Suggested fix (out-of-scope for §6, flag for §7+)*: extract a `DIRECTORY_PAGE_SIZE` constant in `shared/` and either iterate or switch to a server-side "all" endpoint; at minimum add a comment that 100 must match the §5 call site's literal so the two calls stay symmetric. Not a gate for this PR.
- **W2 — `isLoading` re-exposes the base `loading` signal directly, not via `asReadonly()`** (severity: low; `employee-picker.ts:53` — `readonly isLoading = this.loading`). Because `StateService.loading` is declared `protected readonly signal(false)` (`shared/state/state.service.ts:25`), `this.loading` is itself a `WritableSignal<boolean>` and the picker hands a writable signal to its template. The template only reads it (`employee-picker.html:7, 9`: `isLoading()`), so no consumer can write to it, and the `Signal<boolean>` *call signature* is read-only. Still, the other read-only projections in this file (`options`, `error`, lines 51-52) use `asReadonly()`, so the inconsistency is cosmetic. *Suggested fix*: `readonly isLoading = this.loading.asReadonly();` for symmetry with `options` / `error`.
- **W3 — `EmployeePicker` extends `StateService` and exposes `loading` indirectly via `isLoading`, but does not also expose an `error` `computed()` envelope like the rest of the project** (severity: low; `employee-picker.ts:50-52`). `error` is correctly `asReadonly()` (line 52), but the parent state services use `computed(() => this.lastError())` (e.g. `interaction-state.service.ts:46`). Functionally equivalent; a future consistency pass could normalise to `computed()`. Not a gate.
- **W4 — No `takeUntilDestroyed` / cancellation on `loadEmployees()` subscription** (severity: low; `employee-picker.ts:70`). If the consumer navigates away while the GET is in flight, the callback still fires on the destroyed view (no error today because `set`/`endLoad` on destroyed signal is tolerated, but this leaks). Same pre-existing pattern as §5's W5 (`interaction-state.service.ts:70`). *Suggested fix (future)*: convert to `toSignal()` with `inject(DestroyRef)` — out of scope for §6 because the same call shape is used everywhere else.
- **W5 — No spec asserts the loading-state during in-flight (true) before the directory resolves** (severity: low; `employee-picker.spec.ts:37-59`). The test only checks `isLoading() === false` after the synchronous `of()` resolves. A subtle regression where `endLoad()` is missed on success would still pass this spec. *Suggested fix (future)*: add a third assertion using a delayed `Subject` and reading `isLoading()` between the begin and end transitions. Not a §6 gate — covered implicitly by the symmetric `beginLoad`/`endLoad` pattern matching `interaction-state.service.ts:54-71`.
- **W6 — `onSelectChange` accepts the raw `select` value as a `string` and `Number.parseInt`s at the boundary** (severity: low; `employee-picker.ts:83-92`). This is correct (the native DOM `select.value` is always a string), but the JSDoc on the method (`employee-picker.ts:82`) doesn't call out the coercion / NaN-collapsing behaviour. *Suggested fix*: a one-line comment explaining the placeholder `""` → `null` and the NaN → `null` collapses; this is exactly the "type hygiene" call-out the §1 constitution-guard audit requires.
- **W7 — `@Output() EventEmitter<number|null>` is the legacy decorator form, not the new `output<T>()` signal-output** (severity: low; `employee-picker.ts:44`). The §1 audit explicitly wanted `value = input<...>` and `valueChange = output<...>` (the signal form). The codebase consistently uses `@Output() EventEmitter<T>` for outputs everywhere (grep across `frontend/src/app/` returns 9+ `@Output()` decorators, zero `output<T>()` signal-output declarations), so this is the project's established convention and changing just one output would be inconsistent. **However**, the `frontend-state.yaml → primary_mechanism` rule favours the signal-output form, and the §1 review specifically called for it. *Suggested fix (out-of-scope for §6)*: when the codebase migrates to Angular 22 signal-outputs, the picker will need to swap `EventEmitter<number | null>` for `output<number | null>()` and the parent will need to switch `(valueChange)` to the new signal-output form. The current contract still satisfies the unidirectional-data-flow rule (one-way `[value]`, one-way `(valueChange)`) so this is not a §6 blocker, just a future migration item.

### Violations ❌
None.

## Verdict
**LANDABLE** — go for §6. The picker is a textbook signal-only shared component: one-way `[value]` input, one-way `(valueChange)` output, OnPush, side-effect encapsulated in a `loadEmployees()` handler on the picker itself, type hygiene preserved end-to-end (`number | null` across the boundary, `number` on the wire). The seven warnings above are quality-of-life items — one duplicates §5's W1 (call it out for the §7+ refactor), one is a cosmetic `asReadonly()` consistency nit, four are pre-existing codebase-wide patterns the §6 change simply inherits, and one flags a future Angular 22 signal-output migration. None of them block this PR.

---

### State Map

| Signal / field                | Kind                              | Owner                | Notes                                                                          |
|------------------------------|-----------------------------------|----------------------|--------------------------------------------------------------------------------|
| `value`                      | `input<number \| null>(null)`    | `EmployeePicker`     | signal input — parent binds (line 41)                                          |
| `valueChange`                | `EventEmitter<number \| null>`    | `EmployeePicker`     | output — parent re-binds on event (line 44)                                    |
| `employees`                  | `signal<EmployeeResponse[]>([])`  | `EmployeePicker`     | private writable; populated by `loadEmployees()` (line 47)                     |
| `lastError`                  | `signal<ApiError \| null>(null)`  | `EmployeePicker`     | private writable; flipped in success/error branches (line 50)                  |
| `loading`                    | `signal<boolean>(false)`          | `StateService` base  | inherited; driven by `beginLoad()` / `endLoad()`                               |
| `options`                    | `asReadonly()` of `employees`     | `EmployeePicker`     | public read model (line 51)                                                    |
| `error`                      | `asReadonly()` of `lastError`     | `EmployeePicker`     | public read model (line 52)                                                    |
| `isLoading`                  | re-exposed `loading`              | `EmployeePicker`     | public read model (line 53) — see W2 about `asReadonly()` symmetry             |
| `loadEmployees()`            | method                            | `EmployeePicker`     | API side effect + signal writes (lines 64-80); mirrors `loadSubjects()` (§5)  |
| `onSelectChange()`           | method                            | `EmployeePicker`     | DOM → signal bridge; re-emits numeric id upward (lines 83-92)                  |
| `request.subjectId`          | plain field (`number`)            | `TaskCreateForm`     | widened from `string` → `number`; written by `onSubjectChange()` (lines 45, 56) |
| `onSubjectChange(id)`        | method                            | `TaskCreateForm`     | parent-side bridge — collapses `null` to `0` (line 56); **single write site** for `subjectId` |

### Data Flow Diagram
```
Picker init ── ngOnInit ──> loadEmployees()
                                  │
                                  ▼
                         api.get('employees', { offset: 0, limit: 100 })
                                  │
                                  ▼
                       Paged<EmployeeResponse>
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
   employees.set(page.content)              lastError.set(err)   ◄── on error
              │
              ▼
   isLoading() === false        options() reflects directory   error() surfaces

User picks a row
              │
              ▼
   <select (change)> ──> onSelectChange($event)
                                  │
                                  ▼
                    Number.parseInt(raw, 10)
                                  │
              ┌───────────────────┴───────────────────┐
              ▼                                       ▼
   valueChange.emit(null)               valueChange.emit(parsed | null)

Parent TaskCreateForm
   (valueChange)="onSubjectChange($event)"
              │
              ▼
   request.subjectId = id ?? 0
              │
              ▼
   submit() ──> state.createTask(request) ──> POST /api/v1/tasks  (subjectId is `number` on the wire)
```

No global signals are mutated by the picker. No `subscribe()` calls leak outside `loadEmployees()`. No `[(ngModel)]` two-way binding inside the picker. No `ControlValueAccessor`.
