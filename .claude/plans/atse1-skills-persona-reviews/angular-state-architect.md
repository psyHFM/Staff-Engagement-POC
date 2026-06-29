# Angular State Architect — Phase 5 (Skills Frontend) Audit

## Audit Context
ATSE1-21 frontend merged to main via PRs (#26 seed, #27 list, #32 shell/nav). Retroactive audit before OpenSpec archive. Date: 2026-06-25. Scope: 10 files (8 in scope + `app.routes.ts` + `shell.html` for routing confirmation, plus shared base class + `ApiClient` for shape verification).

## State Map

| State | Type | Owner | Source |
|---|---|---|---|
| `searchTerm` | Local `signal<string>` | `SkillsPage` | component input value (transient UI) |
| `_query` | Private `signal<string>` | `SkillsStateService` | last search term (raw, used as source for `query`) |
| `query` | `computed<string>` (read model) | `SkillsStateService` | `() => this._query()` |
| `_results` | Private `signal<Paged<SkillStrength> \| null>` | `SkillsStateService` | raw `ApiClient` response |
| `results` | `computed<Paged<SkillStrength> \| null>` | `SkillsStateService` | `() => this._results()` |
| `_error` | Private `signal<ApiError \| null>` | `SkillsStateService` | raw `catchApiError()` output |
| `error` | `computed<ApiError \| null>` | `SkillsStateService` | `() => this._error()` |
| `loading` | `protected signal<boolean>` (inherited) | `StateService` base | toggled by `beginLoad()` / `endLoad()` |
| `isLoading` | `computed<boolean>` (read model) | `SkillsStateService` | `() => this.loading()` |

Note: the audit prompt's table header listed `isLoading` as "Global Signal / computed?" — it is unambiguously `computed()`. See `skills-state.service.ts:46`.

## Data Flow Diagram

```
User types in <input>
  └── (ngModelChange) → SkillsPage.onInput(value)           [skills-page.ts:28-31]
        ├── searchTerm.set(value)                          [local signal]
        └── state.search(value)                            [SkillsStateService handler]
              ├── _query.set(name)                         [always, even blank — captures intent]
              ├── if trimmed empty → _results.set(null), _error.set(null), endLoad(), RETURN
              ├── _error.set(null); beginLoad()            [loading = true]
              └── api.get<Paged<SkillStrength>>('skills', params)
                    .pipe(catchApiError(), finalize(endLoad))
                    .subscribe({
                      next:  page  → _results.set(page),
                      error: err   → _results.set(null), _error.set(err)
                    })

Signal graph:
  _query ─► query  (computed read model)
  _results ─► results (computed read model)
  _error ─► error (computed read model)
  loading ─► isLoading (computed read model)

Template re-renders off the four computed signals; the local `searchTerm` is the only
input the template reads directly (and only for the Clear button visibility).
```

## Compliant ✅

- **Signal Implementation**: All state is in `signal()` (raw) or `computed()` (derived). No `BehaviorSubject`, `Subject`, or `ReplaySubject` anywhere in the skills slice (`skills-state.service.ts:1-101`, `skills-page.ts:1-37`). Matches `constraints: "Avoid using BehaviorSubjects if a Signal can achieve the same result"` (frontend-state.yaml line 38).
- **State Distribution — Local**: `searchTerm` is correctly placed in the component (`skills-page.ts:26`), as required by `state_hierarchy.local_state.usage: "Transient UI state"` (frontend-state.yaml line 13).
- **State Distribution — Global**: `query` / `results` / `error` live in `SkillsStateService`, matching `state_hierarchy.global_state.tool: "Root-level State Services"` (frontend-state.yaml line 15). The service is registered at component scope (`providers: [SkillsStateService]` in `skills-page.ts:20`), which is a defensible exception for a feature-owned slice — components never share the instance across routes, so the read model lifetime aligns with the page.
- **Async Pipeline**: All HTTP goes through `ApiClient.get<...>` which returns `Observable<T>` (`api-client.ts:21-23`). The service subscribes inside `search()` and synchronously calls `_results.set(...)` / `_error.set(...)` (`skills-state.service.ts:82-91`). No `toSignal()` is needed here because the service is the consumer (not the template); the template reads `computed()` read models instead — this is consistent with `async_integration.description` (frontend-state.yaml line 21).
- **Unidirectional Flow**: The component only invokes `state.search()` and `state.clear()` (`skills-page.ts:30, 35`); it never touches `_query`/`_results`/`_error` directly. The private signal declarations are `private readonly` (line 32-34) and the public API is exclusively read models + handlers. Matches `constraints: "Components must not update global state signals directly"` (frontend-state.yaml line 37).
- **Derived State Optimization**: Every read model that mirrors a raw signal is `computed()` (lines 37, 40, 43, 46). No "hasResults" / "hasError" derived flags exist in the component — they are inlined as `@if (state.results(); as page)` and `@if (page.total > 0)` in the template, which is fine because they remain pure projections off the `results` signal.
- **Operational Constraints**: No `.set()` or `.update()` on any `computed()` (only on private `signal()`s, which is allowed). All API calls and state mutations are co-located in `SkillsStateService.search()` / `clear()` (`side_effects.placement: "State Service Handlers"` — frontend-state.yaml line 24).
- **Base Class Extension**: `SkillsStateService extends StateService` and uses `beginLoad()` / `endLoad()` from the protected base — correct inheritance of the shared `loading` signal (`skills-state.service.ts:29, 66, 84, 99`; `state.service.ts:19-30`).
- **ApiClient Call Shape**: `this.api.get<Paged<SkillStrength>>('skills', params)` is exactly the shape `api-client.ts:21` expects (path + `Record<string, string|number>` params), and the test asserts it: `expect(apiClientSpy.get).toHaveBeenCalledWith('skills', { name: 'Angular' })` (`skills-page.spec.ts:62`, `skills-state.service.spec.ts:72, 128-134`).
- **DI Pattern**: `inject()` used everywhere (`skills-page.ts:25`, `skills-state.service.ts:30`), per `angular-style-guide.md §3`.
- **Access Modifiers**: `protected readonly state` (`skills-page.ts:25`), `protected readonly searchTerm` (line 26) — matches `angular-style-guide.md §4`.
- **Event Handlers**: `onInput` and `clear` are action-named, not event-named (lines 28, 33) — matches `angular-style-guide.md §1`.
- **Control Flow Syntax**: Template uses `@if` (lines 18, 31, 37, 45, 47, 53, 60) and `@for ... track ...` (line 62) — no `*ngIf` / `*ngFor` anywhere in `skills-page.html`.
- **Test Coverage**: BDD-style `// Given // When // Then` comments in both spec files; the service spec covers blank-name, whitespace-only, option pass-through, blank-sort ignoring, error surface, previous-error clearing, and `clear()` reset — matching `testing-strategy.yaml` expectations.
- **Routing & Nav**: `app.routes.ts:42-45` lazy-loads `SkillsPage` (not `Skills`); `shell.html:13` links to `/skills`. Consistent.

## Warnings ⚠️

### W1: Feature-local `Paged<T>` duplicates per-feature copies
- **Location**: `frontend/src/app/features/skills/skills.types.ts:20-25`
- **Detail**: A `Paged<T>` interface exists in `skills.types.ts`, `interaction.types.ts:42`, and `employee.types.ts:50`. None live in `frontend/src/app/shared/api/` (the directory only contains `api-client.ts` and `error-envelope.ts`). No shared `Paged<T>` exists today.
- **Verdict**: Warning, not Violation — the duplication is consistent with the project's other features but `skills.types.ts` adds a third copy. The audit brief says "if so, the feature-local copy is a Violation (should reuse shared). If not, it's a Warning (duplicate type definition)." This is the Warning case.
- **Recommendation (remediation is out of scope for this read-only audit, but worth recording)**: Extract `Paged<T>` (and the triplicated `EmployeeId` interface — `skills.types.ts:8-10`, `interaction.types.ts:22-24`, `employee.types.ts:13-15`) into `frontend/src/app/shared/api/paged.ts` and `frontend/src/app/shared/api/employee-id.ts` and migrate all three feature types files to import them. This is a cross-cutting refactor that should land as its own OpenSpec change touching three feature splices — do NOT bundle it into the archive of ATSE1-21.

### W2: `_query` set even when the trimmed name is blank
- **Location**: `skills-state.service.ts:56`
- **Detail**: The handler unconditionally writes `this._query.set(name)` before the blank-check branch clears `_results` / `_error`. So after a blank search `query()` returns the literal blank string the user typed (e.g. `"   "`), while `results()` is `null`. The component template displays `state.query()` only inside the `state.results()` section (lines 49, 56), so the blank never reaches the DOM today.
- **Verdict**: Not a behavior bug and not a constitution violation. Flagging as a Warning because it is a small inconsistency between `query` and `results` — they can disagree for one tick. If `query` ever gets exposed elsewhere (e.g. as a breadcrumb or page title), the user would see the raw blank.
- **Recommendation**: Move the `this._query.set(name)` line into the non-blank branch, or set it to the trimmed value. The current test `expect(service.query()).toBe('')` after `service.search('')` (`skills-state.service.spec.ts:101`) still passes under either fix.

### W3: Test for "loading true while in flight" does not actually verify loading
- **Location**: `skills-page.spec.ts:70-79` and `skills-state.service.spec.ts:79-88`
- **Detail**: Both tests are titled `"shows a loading indicator while the search is in flight"` / `"search sets loading true while the request is in flight"` but assert `expect(... .isLoading()).toBe(false)`. Because the API is mocked with `of(page())` which is synchronous, `endLoad()` has already run by the time the assertion executes — so the test passes vacuously and never proves `isLoading` flips to `true` mid-flight.
- **Verdict**: Not a constitution violation; testing-strategy.yaml is silent on this style. Flagging as a Warning because it is a low-fidelity assertion that would not catch a regression where `beginLoad()` is accidentally omitted.
- **Recommendation**: Use a `Subject<Paged<SkillStrength>>` instead of `of(...)`, assert `isLoading()` is `true` before `.next()`, then complete and assert it returns to `false`.

## Violations ❌

### V1: Dead-code placeholder component ships in the bundle
- **Rule**: `state_hierarchy.global_state.usage: "Shared domain data"` (frontend-state.yaml line 16) — by extension, the codebase must not retain components that have no routing/navigation consumer; `angular-style-guide.md §2` requires feature-based structure with a clear ownership path.
- **Violation**: `frontend/src/app/features/skills/skills.ts:1-19` defines `export class Skills` with the selector `app-skills` and a hard-coded placeholder template `"Welcome to the Skills Register feature (Phase 5). This is a placeholder for the full implementation."`. Grep over the entire `frontend/src/app` tree confirms **zero importers**:
  - No file uses `import ... from './features/skills/skills'` (only `./skills-state.service` and `./skills-page`).
  - `app.routes.ts:42-45` lazy-loads `SkillsPage` from `./features/skills/skills-page`, not `Skills`.
  - No template anywhere uses the `app-skills` selector.
  This file ships as part of the feature folder but is never instantiated; it is dead code in the production bundle (it's a `.ts` component class with `standalone: true`, not a tree-shakable type).
- **Remediation**: Delete the file.
  ```bash
  rm frontend/src/app/features/skills/skills.ts
  ```
  Then re-run the bundle build / coverage report to confirm no consumer was missed. If the placeholder is needed for documentation purposes, move the markup into a `.md` under `frontend/src/app/features/skills/` (e.g. `placeholder-history.md`) and add a one-line note that the placeholder was retired when `SkillsPage` shipped.

## Verdict

**PASS WITH WARNINGS**

The Skills frontend slice is, on the whole, a textbook implementation of the constitution's Signal + Unidirectional Flow pattern: private raw signals, public `computed()` read models, side effects co-located in the service, no `BehaviorSubject`, no direct component mutations, modern control-flow syntax. The single Violation (V1, the dead `Skills` placeholder) is purely a hygiene issue — no architectural compromise and no runtime impact. The three Warnings (W1 duplicate `Paged<T>`/`EmployeeId`, W2 blank-`query` consistency, W3 vacuous loading tests) are appropriate follow-up work for a future refactor change rather than blockers for archiving ATSE1-21.

Recommended action before archiving the OpenSpec folder: **delete `skills.ts`** (V1). W1–W3 can be carried in the audit report without blocking the archive, since they do not regress any constitution rule.