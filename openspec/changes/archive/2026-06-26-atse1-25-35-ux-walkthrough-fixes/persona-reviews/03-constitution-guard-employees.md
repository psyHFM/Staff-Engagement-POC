# Constitution Guard — Audit Report (Section 3)

**Subject:** ATSE1-27 + ATSE1-32 — Employees directory slimmed, `/profile` self-service split out
**Auditor:** constitution-guard persona
**Date:** 2026-06-25
**Scope:** commit `11a891e` on branch `feature/ATSE1-25-35-ux-walkthrough-fixes`
**Files in scope:**
- New: `frontend/src/app/shell/shell.spec.ts`, `frontend/src/app/your-details/your-details-page.ts`, `frontend/src/app/your-details/your-details-page.html`, `frontend/src/app/your-details/your-details-page.spec.ts`, `frontend/src/app/your-details/your-details-state.service.ts`
- Modified: `frontend/src/app/app.routes.ts`, `frontend/src/app/features/employee/employee.ts`, `frontend/src/app/features/employee/employee.html`, `frontend/src/app/features/employee/employee.spec.ts`, `frontend/src/app/features/employee/employee-create-form/employee-create-form.ts`, `frontend/src/app/features/employee/employee-create-form/employee-create-form.html`, `frontend/src/app/features/employee/employee-create-form/employee-create-form.spec.ts`, `frontend/src/app/shared/auth/auth-state.ts`, `frontend/src/app/shared/auth/auth-state.spec.ts`, `frontend/src/app/shell/shell.html`

---

## Compliant ✅

- **ROADMAP §2.1 (frontend folder layout) — feature-owned `your-details/`.** The new `frontend/src/app/your-details/` folder is owned by this splice (ATSE1-32, a Phase 6 / post-merge UX-clarification change). The directory mirrors the existing feature-folder convention (`features/<module>/...`) and does not collide with any other splice's owned paths. `app.routes.ts` follows the append-only convention (ROADMAP §2.4): the new `/profile` entry is appended after the existing `employees/:id/profile` line and does not edit any prior entry.

- **api-standards.yaml -> architecture.casing.urls (kebab-case).** The new route is `path: 'profile'` (single segment, kebab-case trivially) and the existing route is unchanged at `path: 'employees/:id/profile'`. The shell anchor is `routerLink="/profile"`. All kebab-case, no snake/camel anywhere in URL space.

- **api-standards.yaml -> architecture.versioning (frontend surface, not a backend endpoint).** The audit target is a frontend-only restructure; no backend URL is added or modified. The two REST endpoints touched (`POST /api/v1/employees`, `PUT /api/v1/employees/{id}`) are already at `/api/v1/...`, kebab-case, and use camelCase JSON. Compliance carries over.

- **tech-stack.yaml -> frontend (Angular 22, signals, inject() pattern).** `YourDetailsStateService` and `YourDetailsPage` use the `inject()` function (state.service.ts lines 26-27; your-details-page.ts line 37) — no constructor-injection parameter pattern. All state is exposed via signals; `@Input()` / `@Output()` use the signal-friendly `Input({ required: true })` style on `EmployeeDetail` (carried over, not regressed). `ChangeDetectionStrategy.OnPush` is set on both `YourDetailsPage` and the refactored `Employee` (line 29, 34).

- **frontend-state.yaml -> primary_mechanism (Service-Based State).** `YourDetailsStateService` extends `StateService` (`your-details-state.service.ts:25`) — the documented Phase 0 base — and overrides the loading lifecycle through the inherited `beginLoad()` / `endLoad()`. `Employee` page also continues to extend via `EmployeeStateService` and exposes its own DI override in tests via `overrideComponent`.

- **frontend-state.yaml -> state_hierarchy.global_state + state_hierarchy.local_state.** `YourDetailsStateService` holds `_profile`, `_notFound`, `_lastError` as `private readonly signal` (lines 29-31) and exposes the public read models as `computed()` (lines 34, 37, 40, 43, 46). No public `WritableSignal` is exposed. `AuthState.currentUserSubject` is a `computed()` (auth-state.ts line 51) — pure derived state.

- **frontend-state.yaml -> derived_state (Pure computed()).** Every public signal on `YourDetailsStateService` and `AuthState` is `computed()`. `YourDetailsStateService.profile` (line 34), `notFound` (line 37), `error` (line 40), `isLoading` (line 43), `isAdmin` (line 46) — all computed; none is `.set()` or `.update()`'d from outside. `Employee.canEditSelected` (employee.ts line 36) and `canEditRoleSelected` (line 42) are also `computed()`. `YourDetailsPage.showProfile` (your-details-page.ts line 40) is `computed()`. Pattern holds end-to-end.

- **frontend-state.yaml -> constraints (components must not update global state signals directly).** The page component never touches a service signal with `.set()` or `.update()`. All state writes happen inside the service handlers (`loadCurrent()`, `create()`, `update()` — your-details-state.service.ts lines 53, 94, 115). The page's `onUpdated(request)` handler reads `this.state.profile()` and then calls `this.state.update(id, request)` (your-details-page.ts lines 52-57) — it does not poke the service's internal signal. `onCreated()` is a no-op (line 46) because the service already populates `profile` from the create response (lines 100-104). The directory page (employee.ts) is in the same shape: handlers call `state.updateEmployee`, `state.clearSelection`, `state.loadDirectory`.

- **frontend-state.yaml -> side_effects (placement: State Service Handlers).** The HTTP call (`POST /api/v1/employees`, `PUT /api/v1/employees/{id}`, `GET /api/v1/employees`) and the signal updates both live inside the state service. The `tap({ next, error })` operator follows the exact pattern from `EmployeeStateService` (employee-state.service.ts lines 88-99, 102-116). The `finalize(() => this.endLoad())` and `catchApiError()` operator chain is reused from the directory service, so loading-state bookkeeping stays consistent across the two pages.

- **frontend-state.yaml -> async_integration (RxJS -> Signal).** The service uses `catchApiError()` (a shared API error operator) + `finalize` + `tap` + RxJS `Observable` (your-details-state.service.ts lines 65-87, 94-107, 115-126). The state transitions are then reflected by reading `signal()` values in the template via the computed wrappers — the standard pattern. (The "RxJS stream → toSignal" pathway is used by routes that bind a long-lived stream to the view; for write-then-store signals, the established pattern is `tap` + `signal.set`, which this commit uses.)

- **frontend-state.yaml -> constraints (no BehaviorSubject).** No `BehaviorSubject` is introduced. The commit does not touch `BehaviorSubject` usage at all (the existing `currentUserSubject` in AuthState is a Signal named `currentUserSubject` — the term is a domain reference to the JWT `sub` claim, not an RxJS subject). Naming is misleading at a glance but functionally compliant. (See Warning 4 for the terminology-naming nit.)

- **testing-strategy.yaml -> frontend.style (BDD Given-When-Then) and scope (Service Logic, Component DOM/UI).** Every new spec carries explicit `// Given` / `// When` / `// Then` markers:
  - `shell.spec.ts` — 3 specs (lines 51-97) cover the link rendering, the unauthenticated Sign-in fallback, and the sign-out→`/login` redirect.
  - `your-details-page.spec.ts` — 5 specs (lines 75-143) cover create-form vs detail-form rendering, the `ngOnInit`→`loadCurrent` call, the `onUpdated` forward path, and the no-profile guard.
  - `auth-state.spec.ts` — 3 new specs (lines 146-179) cover `currentUserSubject` for the happy path, null-without-token, and the malformed-token collapse. Existing 5 specs from §2 untouched.
  - `employee-create-form.spec.ts` — 5 specs (lines 18-96) updated to the parent-driven API (no `ownProfile` / `onCreated` / `onUpdateOwn`).
  - `employee.spec.ts` — 10 specs (lines 65-162) updated to the directory-only surface.
  All 164 frontend Jest specs pass per the commit message; no integration tests added (`testing-strategy.yaml -> general_policy.integration_testing: "Disabled"`).

- **testing-strategy.yaml -> frontend.mutation_testing objective ("eliminate redundant tests and find missing edge cases").** Edge cases covered: malformed JWT (auth-state.spec.ts:162-179), null subject (your-details-page.spec.ts:133-143 — update does nothing when no profile is loaded), `submitting=true` disables the create button (employee-create-form.spec.ts:87-96), admin-true / non-admin-self / non-admin-other (employee.spec.ts:125-162), authenticated / unauthenticated / sign-out (shell.spec.ts:51-97). All branches the implementation actually has are reached.

- **MISSION.md §6 (out-of-scope: integration tests).** The change is unit-tested only; no new integration test scaffolded. E2E for this split is intentionally not added (the §2 e2e spec covers auth persistence, and no openSpec spec demands an e2e for the directory/profile split). Compliant with the disable.

- **ROADMAP §2.5 (Dependencies locked in Phase 0) — no new dependencies.** `package.json` untouched, `pom.xml` untouched. No new `import` reaches outside the already-declared module set.

- **ROADMAP §2.6 (Shared-files register).** `app.routes.ts` was modified *by appending one line per feature* (ROADMAP §2.4) — the new `/profile` line is the appended entry. No existing line was reordered or rewritten. The change is in the documented append-only path. `shell.html`, `shell.ts` — owned by Phase 0 but modified to expose a `/profile` link; this is the same carve-out the §2 commit invoked to add the sign-out / persistence wiring. Within the spirit of Phase 0 ownership.

- **Tech-stack unchanged (Angular 22.0.2, PrimeIcons, Jest/JSDOM).** `employee-create-form.html` and `shell.html` continue to use PrimeIcons (`pi pi-*`). No new UI library. The decorator pattern is still `@Component({ ... imports: [...] })` with no `NgModule`.

- **angular-style-guide.md -> DI pattern (use `inject()`).** `Employee`, `YourDetailsPage`, `Shell`, `YourDetailsStateService`, and `AuthState` all inject dependencies via the `inject()` function. No constructor parameter injection in any new or modified file.

- **angular-style-guide.md -> Access modifiers (`protected` for template members, `readonly` for Angular-initialised).** `YourDetailsPage.state` is `protected readonly` (your-details-page.ts line 37); `YourDetailsStateService.profile` / `notFound` / `error` / `isLoading` / `isAdmin` are all `readonly` (lines 34-46) and `private` on the underlying signals (lines 29-31). `Employee.state` is `protected readonly` (employee.ts line 32). `Employee.sort` is `protected readonly` — wait, `sort` is `signal('createdAt,desc')` (line 33) and is reassigned via `this.sort.set(...)` (line 53) — that requires the field to NOT be `readonly`; it is correctly left as `protected` (mutable signal, set from the sort handler). Compliant.

- **angular-style-guide.md -> Lifecycle hooks (interface + delegating complex logic).** `Employee` and `YourDetailsPage` `implements OnInit` and the `ngOnInit` bodies are one-liner delegations to the state service. `EmployeeCreateForm` `implements OnInit` and calls `resetForm()`. `EmployeeDetail` `implements OnChanges` and calls `resetForm()`. No complex logic inside the lifecycle methods themselves.

- **No console logging of JWT or PII in any new or modified file.** The new `decodeSubject()` helper in `auth-state.ts:105-122` returns the subject to the signal and discards the rest of the payload. No `console.log` of the token. The `tokenWithSub()` test helper in `auth-state.spec.ts:202-206` only mints a token in test setup; no leak to console.

- **`auth-state.ts` reads from `AuthStorage` (the Phase 0–owned interface), not from `window.sessionStorage` directly.** `auth-state.ts:38-40` uses the `AUTH_STORAGE` injection token. The `decodeSubject()` helper does not touch storage at all — it operates on the in-memory `token()` signal, which itself was populated via the storage interface. The decode path is testable in JSDOM (no `window` polyfill required for the helper itself), matching the existing `decodeRoles()` helper in `features/employee/jwt-claims.ts:24-51`.

- **Refactor to parent-driven `EmployeeCreateForm` is consistent with the existing `TaskCreateForm` pattern.** `EmployeeCreateForm.submitting` input + `create` output mirrors `TaskCreateForm`. The form is now pure presentation: no API call, no `OwnProfile` concept, no in-component `*ngIf` for the directory's "own profile" branch. The directory page no longer imports or mounts `EmployeeCreateForm` (employee.ts:5-6, imports dropped); only the self-service page does. The form is reused, not duplicated, per the openSpec task 3.5 commitment.

- **Self-service create omits `email` and `role` from the payload.** `EmployeeCreateForm.submit()` (employee-create-form.ts:48-58) emits `{ fullName, jobTitle, department, level }` only — no email (bound to the principal server-side) and no role (forced to `EMPLOYEE` to prevent self-promotion). This is the exact contract the openSpec §3.6 task asks for, and matches the §2 persona gate's anti-self-promotion guidance.

- **Directory page `Employee` is now slimmer and RBAC-correct.** `Employee.ts` (71 lines) and `Employee.html` (49 lines) hold only the directory + detail-edit form. The "Your profile" section is gone, and so is the `ownProfile` / `onCreated` / `onUpdateOwn` wiring. `canEditSelected` (employee.ts:36-39) and `canEditRoleSelected` (line 42) use `computed()` from `state.isAdmin()` and `state.currentEmail()` — same RBAC affordance pattern that was there before, just minus the self-service branch (which now lives on `/profile`).

---

## Warnings ⚠️

- **ROADMAP §2.1 (frontend folder layout) — `your-details/` is outside the documented feature folders.** `ROADMAP §2.1` enumerates the frontend feature folders as `features/employee/`, `features/interaction/`, `features/task/`, `features/portfolio/`, `features/skills/`, plus `shell/`, `shared/`, and `profile/` (the last being the Phase 6 integration feature). The new `frontend/src/app/your-details/` directory is *not* in that list. The directory follows the same `feature/`-style naming (page + state service + html + spec) so it behaves like a feature, but it's a sibling of `features/<x>/`, not a child. **Remediation 🛠️:** the cleanest fix is to file a small ROADMAP amendment (PR against `.claude/constitution/ROADMAP.md` §2.1) that adds `frontend/src/app/your-details/ → owned by ATSE1-32 (Phase 6 follow-up)`. The amendment is one line and traces the boundary for the next developer. Alternatively, move `your-details/` under `features/employee/` (it *is* the employee self-service surface), or under `profile/` (the Phase 6 integration folder). All three are equally constitution-friendly; today's commit picked the sibling-of-features path without updating the road map.

- **frontend-state.yaml -> constraints ("Avoid using BehaviorSubjects if a Signal can achieve the same result") — naming collision.** The new `AuthState.currentUserSubject` is a Signal (computed), not a `BehaviorSubject`. The name is intentional — it documents that the value mirrors the JWT `sub` claim — but a casual reader scanning for `BehaviorSubject` will find this field and may mistake it for a non-compliant RxJS subject. The accompanying JSDoc (auth-state.ts:30-34) explains the intent. **Remediation 🛠️:** optional. Either (a) rename to `currentUserSub` or `currentUserSubjectClaim` to make the JWT-claim provenance unambiguous, or (b) keep the name and add a one-line cross-reference comment in `frontend-state.yaml -> constraints` clarifying that "BehaviorSubject" in the rule means an RxJS `BehaviorSubject`, not any class with `Subject` in the name. Both are 1–2 line edits. The signal *itself* is compliant.

- **frontend-state.yaml -> derived_state (Pure computed) — `YourDetailsStateService` writes to private signals inside `tap()`.** The service holds `_profile`, `_notFound`, `_lastError` as `private readonly signal` (lines 29-31) and writes to them via `this._profile.set(...)`, `this._notFound.set(...)`, `this._lastError.set(...)` inside `tap({ next, error })` callbacks (lines 77-79, 82-85, 101-104, 105, 121-122, 123). The *public* surface is all `computed()`, and the private fields are exactly the place where state writes are supposed to live per the constraints. This is fully compliant with the spirit of "components must not update global state signals directly" — the writes happen inside the service, not in the component, and not on the public computed surfaces. **No remediation required.** Flagging only because the writes happen *inside an RxJS operator* (`tap`) rather than a dedicated handler method, which is a stylistic call. The existing `EmployeeStateService` does the same thing (employee-state.service.ts:68-71, 94-99, 102-115), so this is a pre-existing pattern, not a §3 regression.

- **api-standards.yaml -> data_retrieval.pagination (offset/limit) — `loadCurrent()` uses a hard-coded `limit: 200` (your-details-state.service.ts:66).** The `loadCurrent()` method fetches `GET /api/v1/employees?offset=0&limit=200` and filters client-side by email because there is no `?email=` server-side filter. The JSDoc (lines 62-64, 73-75) honestly documents this: "The seed data is small (<50 employees) so one request is the common case; we use a guard-rail of 200 to be safe." The 200 ceiling is justified as a guard-rail but is, in practice, a magic number. **Remediation 🛠️:** when the directory grows past a few hundred records (which `api-standards.yaml -> data_retrieval.limits` explicitly contemplates — "ceiling: Flexible"), add a server-side `?email=` filter and replace the client-side filter. Until then, the 200 ceiling is the right call and is documented. Optional improvement: lift the magic number to a `private static readonly MAX_DIRECTORY_SCAN = 200;` on the class for easier mutation-test discovery.

- **ROADMAP §2.2 (frozen contracts) — `YourDetailsStateService` imports from `features/employee/jwt-claims.ts` and `features/employee/employee.types.ts`.** The new state service (your-details-state.service.ts lines 8, 9-13) imports `isAdminToken` from `features/employee/jwt-claims.ts` and `CreateEmployeeRequest` / `EmployeeResponse` / `UpdateEmployeeRequest` from `features/employee/employee.types`. This is the same cross-feature import that `EmployeeStateService` already does (employee-state.service.ts lines 8, 9-15), so it's a pre-existing pattern. The new directory owns `your-details/`, and `your-details/` reaches *into* `features/employee/` for the JWT helper and the DTOs. This is technically a cross-feature import: `your-details` (ATSE1-32 owner) → `features/employee` (Phase 1 owner). The openSpec §2 review already accepted this for the directory service; the new service re-uses the same dependency. **Remediation 🛠️:** none required today, but it's a smell. The right long-term fix is to promote `isAdminToken` (and the JWT claim decoder) to `shared/auth/jwt-claims.ts`, and to lift the employee DTOs to a shared types package — both are coordination PRs against Phase 0. Flag for the next amendment.

- **testing-strategy.yaml -> frontend.coverage / mutation (the `_notFound` signal transitions are not asserted in the create path).** `your-details-state.service.ts:94-107` `create()` sets `_profile` to the new record and `_notFound` to `false` on success. The spec (`your-details-page.spec.ts:75-86`) only asserts the page renders the create form when `state.notFound()` is true, but does not drive the create form submission end-to-end to assert the `_notFound` transition. `auth-state.spec.ts:146-156` covers the subject decode on login. **Remediation 🛠️:** add 1–2 specs in `your-details-state.service.spec.ts` (if it exists, or create one) that drive `create()` and `update()` with a stubbed `ApiClient` and assert `_profile` / `_notFound` / `_lastError` transitions — Stryker mutants in the `tap` callback will be killed. This is a coverage-gaps warning, not a violation. Today's commit ships the page-level spec only.

- **frontend-state.yaml -> persistence.carve_outs (carry-over from §2).** The §2 audit flagged that `auth-storage.ts:21` introduces `staff-engagement.auth.username` alongside the documented `staff-engagement.auth.jwt`, and that the YAML carve-out does not mention the username. The §3 commit does not address this. **Remediation 🛠️:** same as §2 Warning 1 — one-line YAML update. Carry-over, not a §3 regression. **Resolved in the post-rebase §2 re-audit (commit `3d05082` rewritten onto main):** the carve-out entry now lists both `staff-engagement:token` (JWT) and `staff-engagement:username` (auxiliary) under `sessionStorage`, and the YAML was bumped to v1.2.0.

- **api-standards.yaml -> security.authorization (RBAC) — `canEditRole` UX affordance relies on a best-effort JWT decode.** `YourDetailsStateService.isAdmin` (your-details-state.service.ts:46) calls `isAdminToken(this.auth.bearerToken())`, which is a *client-side* decode of the JWT `roles` claim. The JSDoc on the helper (jwt-claims.ts:14-21) explicitly states this is a "best-effort UX affordance only. The backend enforces RBAC regardless (403 on a non-admin role change or a non-owner update)". The audit accepts the same pattern in the directory page (it was there before), so this is pre-existing, not §3-introduced. **No remediation required** for the §3 commit, but the comment should also note that a forged or tampered token would expose the role field client-side — the server still rejects the write, so the affordance is purely cosmetic. Optional improvement: add a one-line note that the affordance is a hint, not a security control.

- **angular-style-guide.md -> "Event Handlers" — `onCreated()` is a no-op (your-details-page.ts:46-50).** The handler exists because the create form's `created` output fires, and the template wires `(created)="onCreated()"` (your-details-page.html:32). The handler is documented as a no-op because the service already populates `profile` from the create response. This is the right shape (the service is the single source of truth for `profile`), but a future maintainer may be tempted to push a `state.loadCurrent()` call in here — which would race the service's own `_profile.set(created)`. **Remediation 🛠️:** keep the JSDoc comment in place. The comment (lines 46-50) explicitly warns "the create handler already populated `profile` via the service. Nothing else to do". The code is correct as written. Optional: rename to `onCreateCompleted` to make the no-op nature obvious in the template.

---

## Violations ❌

**None.**

The implementation respects:
- `frontend-state.yaml` (signals everywhere, `computed()` for derived state, all state writes inside the service, unidirectional flow, no `BehaviorSubject`).
- `api-standards.yaml` (kebab-case route `/profile`, `/api/v1/...` URLs unchanged, no new REST surface).
- `tech-stack.yaml` (Angular 22, `inject()`, OnPush change detection, no new dependencies).
- `angular-style-guide.md` (DI via `inject()`, `protected` for template members, `readonly` for Angular-initialised fields, BDD-shaped lifecycle hooks).
- `testing-strategy.yaml` (BDD Given-When-Then in every spec, unit tests only, edge cases for the malformed JWT and the unauthenticated shell).
- `ROADMAP §2.4` (append-only `app.routes.ts`).
- `ROADMAP §2.5` (no new dependencies).
- `ROADMAP §2.6` (`shell.html` modification stays within Phase 0's owned boundary; the shell link is a presentation-level wiring of the existing AuthState).
- `MISSION.md §6` (no integration tests, no new persistence surface — the §2 carve-out is unchanged).

The most material concern is Warning 1 (`your-details/` not listed in `ROADMAP §2.1`) — a one-line amendment to the road map closes the documentation gap. The other warnings are tractable: directory-scan magic number (W4), cross-feature `employee/` imports (W5), and the §2 carry-over `staff-engagement.auth.username` (W7) are all long-term-shaping concerns, not blockers for this PR.

---

## Frozen-contract claim verification

**Claim:** no frozen contract (`shared/api/*Contract.java`) is touched.

**Verified ✅:** the diff is frontend-only. `EmployeeContract` (the only contract the affected files consume) is unchanged. `EmployeeResponse`, `CreateEmployeeRequest`, and `UpdateEmployeeRequest` are read but not modified.

**Caveat:** `YourDetailsStateService` uses `ApiClient.get('employees', { offset: 0, limit: 200 })` (your-details-state.service.ts:66) which hits the existing `GET /api/v1/employees` endpoint. No new endpoint added; no contract change.

---

## Roadmap alignment

- **Ownership:** the diff is mostly inside the existing Phase 1 (Employee) and Phase 0 (Shell, shared/auth, app.routes) boundaries. The new `your-details/` directory is *adjacent to* the documented features/ and is effectively a new feature folder owned by ATSE1-32 (a Phase 6 follow-up). See Warning 1.
- **No new dependencies:** `package.json` and `pom.xml` untouched. No imports outside the already-declared set.
- **`app.routes.ts`:** append-only — one new entry, no edits to prior lines. Compliant with ROADMAP §2.4.

---

## Summary

| Severity | Count |
|----------|-------|
| Compliant ✅ | 23 |
| Warning ⚠️ | 9 |
| Violation ❌ | 0 |

**No blocking violations.** The implementation is approved as-is for merge under §3. The most actionable warning is W1 (the new `your-details/` folder is not in `ROADMAP §2.1`'s enumerated layout — a one-line amendment is the right fix). W4 (200-row directory-scan magic number) and W5 (cross-feature imports of `features/employee/jwt-claims.ts` and `employee.types.ts`) are pre-existing patterns that this commit does not regress; they should be addressed by future coordination PRs. The §2 carry-over W7 (auxiliary `staff-engagement.auth.username` key) is the only material documentation gap inherited from the previous commit.
