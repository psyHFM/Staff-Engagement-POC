# Angular State Architect — Audit Report (§3)

**Subject:** §3 employees-directory + your-details-page implementation in commit `11a891e`
**Auditor:** angular-state-architect persona
**Date:** 2026-06-25
**Scope:** §3 of `openspec/changes/atse1-25-35-ux-walkthrough-fixes/` — tickets ATSE1-27 + ATSE1-32.
**Authoritative spec:** `.claude/constitution/frontend-state.yaml` v1.1.0 + `.claude/angular-style-guide.md`.

**Files audited**

| Status   | Path                                                                                                       |
|----------|------------------------------------------------------------------------------------------------------------|
| added    | `frontend/src/app/your-details/your-details-state.service.ts`                                             |
| added    | `frontend/src/app/your-details/your-details-page.ts`                                                      |
| added    | `frontend/src/app/your-details/your-details-page.html`                                                    |
| added    | `frontend/src/app/your-details/your-details-page.spec.ts`                                                 |
| modified | `frontend/src/app/shared/auth/auth-state.ts` (added `currentUserSubject` computed)                        |
| modified | `frontend/src/app/shared/auth/auth-state.spec.ts`                                                         |
| modified | `frontend/src/app/features/employee/employee.ts` (slimmed)                                                |
| modified | `frontend/src/app/features/employee/employee.html` (slimmed)                                              |
| modified | `frontend/src/app/features/employee/employee.spec.ts`                                                     |
| modified | `frontend/src/app/features/employee/employee-create-form/employee-create-form.ts` (parent-driven)         |
| modified | `frontend/src/app/features/employee/employee-create-form/employee-create-form.html`                       |
| modified | `frontend/src/app/features/employee/employee-create-form/employee-create-form.spec.ts`                   |
| modified | `frontend/src/app/shell/shell.html` (shell__user is now an `<a routerLink="/profile">`)                   |
| modified | `frontend/src/app/shell/shell.spec.ts`                                                                    |
| modified | `frontend/src/app/app.routes.ts` (appends `path: 'profile'` line — append-only per ROADMAP §2.4)          |

---

## State Map

### 3.1 `AuthState` (modified — adds `currentUserSubject`)

| Signal / computed        | Kind              | Owner      | Notes                                                                                       |
|--------------------------|-------------------|------------|---------------------------------------------------------------------------------------------|
| `token`                  | writable signal   | `AuthState`| unchanged from §2 (hydrated from storage at field-init)                                     |
| `username`               | writable signal   | `AuthState`| unchanged from §2                                                                           |
| `isAuthenticated`        | computed          | `AuthState`| `computed(() => token() !== null)` — never `.set()`                                         |
| `currentUser`            | computed          | `AuthState`| `computed(() => username())` — kept for shell display                                       |
| **`currentUserSubject`** | **computed**      | `AuthState`| `computed(() => decodeSubject(token()))` — authoritative JWT `sub` claim, base64url-decoded |
| `login()` / `logout()`   | methods           | `AuthState`| side-effect handlers (unchanged)                                                            |
| `decodeSubject()`        | pure fn           | module     | tolerates `null`, malformed tokens, non-string `sub`, throw inside `try/catch` → `null`     |

### 3.2 `YourDetailsStateService` (NEW; `@Injectable()` component-scoped, extends `StateService`)

| Signal / field      | Kind             | Owner                          | Notes                                                                  |
|---------------------|------------------|--------------------------------|------------------------------------------------------------------------|
| `_profile`          | writable signal  | `YourDetailsStateService`      | private; the current user's Employee record                            |
| `_notFound`         | writable signal  | `YourDetailsStateService`      | private; flips true when the directory has no match for `sub`         |
| `_lastError`        | writable signal  | `YourDetailsStateService`      | private; most-recent `ApiError`                                        |
| `loading` (inherited)| writable signal | `StateService` base            | base; toggled by `beginLoad()` / `endLoad()`                           |
| `profile`           | computed         | service                        | `computed(() => _profile())` — read model                              |
| `notFound`          | computed         | service                        | `computed(() => _notFound())`                                          |
| `error`             | computed         | service                        | `computed(() => _lastError())`                                         |
| `isLoading`         | computed         | service                        | `computed(() => loading())` — re-exposes the inherited signal          |
| `isAdmin`           | computed         | service                        | `computed(() => isAdminToken(auth.bearerToken()))` — JWT-derived       |
| `loadCurrent()`     | method           | service                        | API side-effect + signal writes (component never touches the signals)  |
| `create()`          | method           | service                        | `POST /api/v1/employees` + signals                                     |
| `update()`          | method           | service                        | `PUT /api/v1/employees/{id}` + signals                                 |

### 3.3 `YourDetailsPage` (NEW component)

| Signal / field   | Kind             | Owner                | Notes                                                                 |
|------------------|------------------|----------------------|-----------------------------------------------------------------------|
| `state`          | readonly inject  | component            | `inject(YourDetailsStateService)`                                     |
| `showProfile`    | **computed**     | component (local)    | `computed(() => profile() !== null && !notFound())` — single source of truth for the template branch |

No component-level writable signals (form-state is encapsulated inside the child `EmployeeDetail` / `EmployeeCreateForm`).

### 3.4 `EmployeeCreateForm` (modified — parent-driven)

| Field           | Kind            | Owner            | Notes                                                                  |
|-----------------|-----------------|------------------|------------------------------------------------------------------------|
| `fullName`      | plain property  | component (local)| bound via `[(ngModel)]` — transient form input                         |
| `jobTitle`      | plain property  | component (local)| transient form input                                                   |
| `department`    | plain property  | component (local)| transient form input                                                   |
| `level`         | plain property  | component (local)| transient form input                                                   |
| `submitting`    | `@Input()`      | component (local)| presentational flag — parent toggles while API is in-flight           |
| `create`        | `@Output()`     | EventEmitter     | emits `CreateEmployeeRequest`; parent chooses the state service        |

All local. No signals, no global state. Pure presentational input/output.

### 3.5 `Employee` (slimmed)

| Field                  | Kind         | Owner        | Notes                                                                  |
|------------------------|--------------|--------------|------------------------------------------------------------------------|
| `state`                | readonly     | component    | `inject(EmployeeStateService)`                                         |
| `sort`                 | signal       | component (local) | directory sort — page-local; not shared                              |
| `canEditSelected`      | computed     | component (local) | derives from `state.selectedEmployee` + `state.isAdmin` + `state.currentEmail` |
| `canEditRoleSelected`  | computed     | component (local) | derives from `state.isAdmin`                                          |

### 3.6 `Shell` (modified — no signal changes)

The shell reads `auth.isAuthenticated()` and `auth.currentUser()` only; it does not introduce any new signals. The `<span class="shell__user">` was swapped for `<a routerLink="/profile" class="shell__user">` — pure template change, zero signal impact.

---

## Data Flow Diagram

### Cold-start on `/profile`

```
localStorage ─read→ AuthStorage
        └→ AuthState.token (signal field-init)
              └→ AuthState.currentUserSubject = computed(() => decodeSubject(token()))
                    └→ YourDetailsStateService.loadCurrent()
                          ├─ if subject === null → _notFound.set(true); return
                          ├─ beginLoad() → loading.set(true)
                          ├─ api.get('employees', { offset: 0, limit: 200 })
                          │     .pipe(catchApiError(), finalize(endLoad), tap(...), catchError(...))
                          │     └─ match by `email === subject`
                          │           ├─ found      → _profile.set(match)
                          │           └─ not-found  → _notFound.set(true)
                          └─ error → _lastError.set(err)
                                    └→ YourDetailsPage.showProfile (computed)
                                          └→ template @if/@else switches between
                                             <app-employee-detail> and <app-employee-create-form>
```

### Create (first-time user)

```
EmployeeCreateForm.submit()                       (component-local state)
  └→ emits CreateEmployeeRequest via @Output create
        └→ YourDetailsPage.onCreated() (no-op)
              (the page does NOT subscribe; the template sees the signal flip)

Better path (and how the spec actually wires it):
  EmployeeCreateForm @Output create ─parent owns the API→  ??? (gap — see §A below)

Spec wiring (your-details-page.spec.ts mock + your-details-state.service.ts):
  create.request() → api.post('employees', request)
                   .pipe(tap({ next: created → _profile.set(created); _notFound.set(false) }))
                     └→ profile signal flips → showProfile flips → <app-employee-detail> mounts
```

### Update

```
EmployeeDetail (updated) emit
  └→ YourDetailsPage.onUpdated(request)
        └→ YourDetailsStateService.update(current.id.value, request)
              .pipe(tap({ next: updated → _profile.set(updated) }))
                    └→ template re-renders
```

### Directory-page update (admin editing another employee)

```
EmployeeDetail (updated) emit
  └→ Employee.onUpdateSelected(request)
        └→ EmployeeStateService.updateEmployee(selected.id, request)
              .subscribe({ next: () → loadDirectory(0, 20, sort()) })
```

### Shell top-bar link

```
auth.isAuthenticated() ─true→ shell__user anchor with routerLink="/profile"
                              title="Your details"
                              text content = auth.currentUser()
```

---

## Compliant ✅

- **`primary_mechanism` (Signals + Service-Based State + unidirectional).** `YourDetailsStateService` is the single source of truth for the page; the component never touches `_profile`, `_notFound`, or `_lastError` directly. The directory `Employee` page likewise delegates every mutation to `EmployeeStateService`.

- **`state_hierarchy.local_state` vs `state_hierarchy.global_state`.**
  - Global (root-provided): `AuthState` (auth identity + token), `EmployeeStateService` (directory state).
  - Component-scoped global state: `YourDetailsStateService` (page-scoped via `providers: [YourDetailsStateService]` on the component — the same pattern as `EmployeeStateService`).
  - Local (component / form): `sort` signal in `Employee`, `fullName`/`jobTitle`/`department`/`level` in `EmployeeCreateForm`, `submitting` presentational input, `showProfile` derived `computed` in `YourDetailsPage`.
  No cross-feature signal sharing introduced. `AuthState.currentUserSubject` is consumed by `YourDetailsStateService` via the (root-provided) `AuthState` service — the canonical Phase 0 sharing channel per `ROADMAP §2.4` ("No cross-feature signal sharing except through a Phase 0 shared service").

- **`derived_state` — pure `computed()`.**
  `profile`, `notFound`, `error`, `isLoading`, `isAdmin`, `showProfile`, `canEditSelected`, `canEditRoleSelected`, `isAuthenticated`, `currentUser`, `currentUserSubject` are all `computed()`. Grep confirms no `.set()` / `.update()` is ever called on a computed signal across the diff.

- **`side_effects.placement` — service handlers own the API + signal write.**
  Every API call (`loadCurrent`, `create`, `update`, `createEmployee`, `updateEmployee`, `loadDirectory`, `selectEmployee`, `clearSelection`, `clearTransient`) lives in the State Service. Components only call methods and read computed signals. `EmployeeCreateForm` is intentionally pure presentation — it has no service injection at all; the parent decides where the request goes.

- **`async_integration.pipeline` — `toSignal()` only when needed.**
  No stream is exposed to the template. `YourDetailsStateService` uses `subscribe()` internally to fold the HTTP observable into the signal store; the page consumes only signals. `Employee` likewise uses `subscribe()` for the same reason. No `Observable<…>` or `| async` reaches the template — `your-details-page.html` and `employee.html` are pure signal-driven (`@if (state.xxx())`, `state.yyy()`).

- **`constraints` — no `BehaviorSubject` / `Subject`.**
  Grep over the diff returns zero hits for `BehaviorSubject` or `Subject`. The only RxJS imports are `Observable`, `catchError`, `finalize`, `of`, `tap` — used strictly as plumbing between the HTTP client and the signal store.

- **`no illegal persistence` — only the documented carve-out is written.**
  The directory page no longer keeps a per-row "ownProfile" snapshot; the profile state is page-scoped (`@Injectable()` with `providers: [...]` on `YourDetailsPage`) so it dies with the route. Per `frontend-state.yaml -> persistence.policy`: "All other state … remains in-memory." Compliant.

- **Parent-driven form refactor is a clean unidirectional contract.**
  `EmployeeCreateForm` now emits a `CreateEmployeeRequest` and the parent (`Employee` for directory / `YourDetailsPage` for self-service) is the only place that decides which State Service performs the call. The form itself does not import a state service, so it cannot accidentally couple to one or the other. This is the textbook unidirectional pattern from the §2 review.

- **`AuthState.currentUserSubject` gracefully handles malformed JWTs.**
  `decodeSubject` (lines 105-122): `null` token → `null`; token with fewer than 2 segments → `null`; base64 decode wrapped in `try/catch` returning `null`; non-string `sub` (number/object) → `null`. No throws escape to callers. The spec at `auth-state.spec.ts:162-179` ("currentUserSubject is null when the stored token is malformed") proves this contract.

- **`@Input()` / `@Output()` pattern preserves `inject()` discipline for state-bearing classes.**
  `EmployeeCreateForm` and `EmployeeDetail` are presentational (no service injection); `YourDetailsPage`, `Employee` use `inject()` to grab their State Service. No constructor-injection anywhere in the diff (Angular Style Guide §3 — "Use the `inject()` function for dependency injection").

- **`ChangeDetectionStrategy.OnPush` + signal-driven templates.**
  `YourDetailsPage`, `Employee`, `EmployeeCreateForm`, `EmployeeDetail`, `Shell` (existing) all set `OnPush` and bind purely through signal getters. No `markForCheck()` calls are needed (or used).

---

## Violation Report

### Violations ❌

**None.** All audit dimensions pass. See "Compliant" section.

### Warnings ⚠️

#### W1 — `create` pipeline asymmetry between spec and component

`YourDetailsStateService.create()` exists and is wired with `tap({ next: created => _profile.set(created); _notFound.set(false) })`, but `YourDetailsPage.onCreated()` is a deliberate **no-op**:

```ts
// your-details-page.ts:46-50
protected onCreated(): void {
  // The create handler already populated `profile` via the service.
  // Nothing else to do — the template flips to the detail form on
  // the next CD cycle.
}
```

The template binds `(created)="onCreated()"` on `<app-employee-create-form>`, but the form does **not** call back into the State Service itself — it only emits `CreateEmployeeRequest` via the `@Output() create`. The comment is misleading: `profile` is only populated if the parent subscribes to `state.create()` somewhere, which it does not. With the current shape, a first-time user clicking "Create profile" would see the form's `submit()` emit, `onCreated()` no-op, and nothing else happen — the request would never fire.

**YAML rule:** `frontend-state.yaml -> side_effects.placement` ("The state service is responsible for calling the API and updating the associated signal."), and `state_hierarchy.global_state` (the page is meant to delegate to the State Service).

**Suggested fix (parent-side delegation, no service-import in the form):**

```ts
// your-details-page.ts — replace the no-op onCreated with a delegation
protected onCreated(request: CreateEmployeeRequest): void {
  this.state.create(request).subscribe({
    error: (err) => {
      // _lastError is already set inside the service tap's error branch;
      // nothing more needed unless we want a toast.
    }
  });
}
```

```html
<!-- your-details-page.html:32 -->
<app-employee-create-form (created)="onCreated($event)"></app-employee-create-form>
```

And on the form, widen the `@Output()` to emit the request:

```ts
// employee-create-form.ts:35
@Output() created = new EventEmitter<CreateEmployeeRequest>();
// and rename the @Output `create` → `created` for clarity.
```

This keeps `EmployeeCreateForm` free of any State Service injection (still pure presentation, still testable in isolation — the `employee-create-form.spec.ts` already asserts the payload shape and need not change) while letting `YourDetailsPage` delegate to `YourDetailsStateService.create()` exactly like the directory page delegates to `EmployeeStateService.createEmployee()`. The spec mock in `your-details-page.spec.ts` is already structured for this (`stateMock.create = jest.fn()`), so the test would need to expand the `onCreated` assertion, but the existing assertion for `loadCurrent` and `update` is unaffected.

**Severity:** medium (functional gap, not a state-pattern violation per se — but it does violate `side_effects.placement` because the component has not completed the delegation it claims it has).

**Blocking for §3 acceptance?** Yes — without this fix the self-service create path is dead on arrival.

#### W2 — `decodeSubject` duplicates `decodeBase64Url` from `features/employee/jwt-claims.ts`

`AuthState.decodeSubject` reimplements the base64url-decode dance (`features/employee/jwt-claims.ts:47-51` already has `decodeBase64Url`). The two helpers are identical: `replace(/-/g, '+').replace(/_/g, '/')` → pad → `atob`. Duplication invites drift (e.g. one is later fixed for a JWT-encoding edge case, the other isn't).

**YAML rule:** not strictly a state-rule violation, but it touches the State Service boundary — when the duplicate is fixed, the audit will have to re-check both call sites. Recommend extracting to `shared/auth/jwt.ts` (Phase 0 territory per `ROADMAP §2.6` — `app/shared/**` is owned by Phase 0; this would need a tiny coordination PR, not a splice edit).

**Suggested fix (refactor only; the existing calls keep working):**

```ts
// shared/auth/jwt-decode.ts (Phase 0-owned)
export function decodeJwtPayload<T = unknown>(token: string | null): T | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(globalThis.atob(padded)) as T;
  } catch {
    return null;
  }
}
```

```ts
// auth-state.ts:51
readonly currentUserSubject = computed(() => {
  const payload = decodeJwtPayload<{ sub?: unknown }>(this.token());
  return typeof payload?.sub === 'string' ? payload.sub : null;
});
```

```ts
// features/employee/jwt-claims.ts — same helper internally
const payload = decodeJwtPayload<{ roles?: unknown }>(token);
```

**Severity:** low (maintainability, not correctness). Acceptable to defer to a coordination PR; flagged here so §3.8 doesn't ship with two divergent decoders.

### Informational ℹ️

#### I1 — `loading` signal is re-exposed as `isLoading` computed in `YourDetailsStateService`

`StateService.loading` is `protected` (correct — subclasses only), so `YourDetailsStateService` re-publishes it as a public computed `isLoading()`. This is identical to what `EmployeeStateService` does and is fine, but worth noting for any future base-class refactor: a `protected readonly loading` + `public readonly isLoading = computed(() => this.loading())` could be lifted into the base class to remove the per-subclass repetition.

#### I2 — `your-details-page.html` reads three signals in one guard

Line 21: `@if (!state.isLoading() && state.profile(); as profile)` — combined with line 28 `@else if (!state.isLoading() && state.notFound())` — this implicitly requires that `profile` and `notFound` are mutually exclusive. They are: the service writes one or the other (never both). The `showProfile` computed could drive a single `@if/@else` to make the exclusivity explicit in the type system, e.g.:

```ts
// your-details-page.ts
type View = { kind: 'loading' } | { kind: 'error'; message: string }
          | { kind: 'profile'; profile: EmployeeResponse; canEditRole: boolean }
          | { kind: 'notFound' };

protected readonly view = computed<View>(() => {
  if (this.state.isLoading()) return { kind: 'loading' };
  const err = this.state.error();
  if (err) return { kind: 'error', message: err.message };
  const profile = this.state.profile();
  if (profile) return { kind: 'profile', profile, canEditRole: this.state.isAdmin() };
  if (this.state.notFound()) return { kind: 'notFound' };
  return { kind: 'loading' }; // brief idle window before load fires
});
```

…with a `@switch (view().kind) { … }` in the template. Not a violation; just a stronger expression of the "one derived view, one branch" discipline. Optional.

---

## Verdict

**0 violations, 2 warnings (1 medium / 1 low), 2 informational.**

- **W1 is blocking for §3 acceptance** — the `onCreated()` no-op means the self-service create path is unwired; the page does not actually delegate the create request to the State Service despite the doc-comment claim. Fix: have `YourDetailsPage.onCreated(request)` call `this.state.create(request).subscribe()` and widen the form's `@Output()` to carry the `CreateEmployeeRequest` payload.
- **W2 is non-blocking** — `decodeSubject` duplicates `decodeBase64Url`; consolidate via a Phase 0 coordination PR.
- **I1 / I2 are non-blocking** — pure code-quality suggestions.

The signal classification, derived-state discipline, async pipeline, side-effect placement, and DI conventions all conform to `frontend-state.yaml` v1.1.0 and `angular-style-guide.md`. The §3 implementation is approved conditionally on the W1 fix.

---

## Audit Checklist

| Audit dimension                                       | Result |
|-------------------------------------------------------|--------|
| All state via Signals                                 | ✅      |
| Service-Based State (no inline signal mutation in components) | ✅ |
| Unidirectional data flow                              | ✅      |
| Async pipeline: RxJS → signal via subscribe/fold; no `\| async` in templates | ✅ |
| No `BehaviorSubject` / `Subject`                      | ✅      |
| No `.set()` / `.update()` on computed signals         | ✅      |
| API calls live in State Service handlers              | ⚠️ (W1 — `onCreated` doesn't actually delegate) |
| `inject()` preferred over constructor injection       | ✅      |
| Derived state via `computed()`                        | ✅      |
| Malformed-JWT tolerance for `currentUserSubject`      | ✅      |
| Persistence policy respected (only JWT carve-out)     | ✅      |
| `OnPush` + signal-driven templates                    | ✅      |
| Parent-driven `EmployeeCreateForm` keeps form purely local | ✅  |
| `showProfile` derived via `computed()`                | ✅      |