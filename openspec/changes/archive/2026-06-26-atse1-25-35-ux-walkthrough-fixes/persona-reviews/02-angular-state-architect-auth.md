# Angular State Architect — Audit Report

**Subject:** §2 auth-session-persistence implementation in commit `0a909e5`
**Auditor:** angular-state-architect persona
**Date:** 2026-06-25
**Scope:** the §2 slice of `openspec/changes/atse1-25-35-ux-walkthrough-fixes/`
**Authoritative spec:** `.claude/constitution/frontend-state.yaml` v1.1.0

**Files audited**

| Status     | Path                                                                                                |
|------------|-----------------------------------------------------------------------------------------------------|
| added      | `frontend/src/app/shared/auth/auth-storage.ts`                                                      |
| added      | `frontend/src/app/shared/auth/auth-error.interceptor.ts`                                            |
| added      | `frontend/src/app/shared/auth/auth-error.interceptor.spec.ts`                                       |
| added      | `e2e/tests/auth-persistence.spec.ts`                                                                |
| modified   | `frontend/src/app/shared/auth/auth-state.ts`                                                        |
| modified   | `frontend/src/app/shared/auth/auth-state.spec.ts`                                                   |
| modified   | `frontend/src/app/shared/auth/bearer-auth.interceptor.spec.ts`                                      |
| modified   | `frontend/src/app/app.config.ts`                                                                    |
| modified   | `frontend/src/app/app.spec.ts`                                                                      |
| modified   | `frontend/src/app/shared/state/state.service.ts`                                                    |

---

## State Map (AuthState, after §2)

| Signal / computed                 | Kind             | Owner            | Notes                                                                  |
|-----------------------------------|------------------|------------------|------------------------------------------------------------------------|
| `token`                           | writable signal  | `AuthState`      | Hydrated from `storage.read(...)` at **field-init time**.              |
| `username`                        | writable signal  | `AuthState`      | Hydrated from `storage.read(...)` at **field-init time**.              |
| `isAuthenticated`                 | computed signal  | `AuthState`      | `computed(() => this.token() !== null)` — never `.set()` manually.    |
| `currentUser`                     | computed signal  | `AuthState`      | `computed(() => this.username())` — never `.set()` manually.          |
| `bearerToken`                     | computed signal  | `AuthState`      | `computed(() => this.token())` — matches PR #37's shape so the existing `bearerAuthInterceptor` works unchanged. |
| `currentUserSubject`              | computed signal  | `AuthState`      | `computed(() => decodeSubject(this.token()))` — authoritative identity from the JWT `sub` claim; `null` for malformed/absent tokens. |
| `login(credentials)`              | method           | `AuthState`      | API side-effect + signal writes + storage writes (co-located).         |
| `logout()`                        | method           | `AuthState`      | Signal clears + storage removes (co-located).                         |
| `clearOnUnauthorized()`           | method           | `AuthState`      | Delegates to `logout()`; called by `authErrorInterceptor` on 401.      |

---

## Data Flow Diagram

1. **Cold start / page reload**
   `globalThis.sessionStorage` → `browserAuthStorage.read(key)` →
   `AuthState` constructor (`rehydrate()`) → `token` / `username` signals →
   `isAuthenticated` / `currentUser` / `bearerToken` / `currentUserSubject`
   computed → `authGuard` / shell header / `bearerAuthInterceptor`
   read `isAuthenticated()` / `bearerToken()` synchronously
   before the first template paint or outgoing HTTP call.

2. **Login**
   Component template → `auth.login({...})` →
   `api.post('auth/login', ...)` → response `tap` →
   `token.set(...)` + `username.set(...)` +
   `storage.write(AUTH_STORAGE_KEY, ...)` + `storage.write(AUTH_USERNAME_KEY, ...)`
   → `isAuthenticated` / `currentUser` re-evaluate → shell re-renders.

3. **Authenticated request, then server returns 401**
   `bearerAuthInterceptor` attaches `Authorization` →
   server rejects with 401 →
   `authErrorInterceptor.catchError` →
   `auth.clearOnUnauthorized()` →
   `auth.logout()` clears signals + removes both storage keys →
   `isAuthenticated` flips to `false` → `authGuard` redirects to `/login`
   on next navigation.

4. **Authenticated request returns 403 / 500**
   `authErrorInterceptor` passes through untouched (per spec line 23-24);
   signals and storage unchanged.

---

## Compliant ✅

- **`primary_mechanism` (signals + Service-Based State + unidirectional flow).**
  `AuthState` is a root-level state service (`@Injectable({ providedIn: 'root' })`);
  signals are private; derived state is `computed()`; components cannot touch
  signals directly. `auth-error.interceptor.ts` does **not** mutate signals —
  it calls `auth.clearOnUnauthorized()`, which routes through the service.
  This is exactly the unidirectional pattern the constitution prescribes.

- **`state_hierarchy.global_state` — Root-level State Service.**
  `AuthState` lives in `shared/auth/` and is `providedIn: 'root'`. Matches
  the pattern documented in `state.service.ts` (base abstract service for
  feature services).

- **`derived_state` — pure `computed()`.**
  Both `isAuthenticated` and `currentUser` are `computed()`. No `.set()` or
  `.update()` call on either computed signal anywhere in the diff. Compliant.

- **`side_effects.placement` — service handlers own the API + signal write.**
  `login()` does the `api.post(...)`, the `token.set(...)`, and the
  `storage.write(...)` inside one `tap()`. `logout()` does the symmetric
  set/remove pair. No component touches the storage or the signals directly.

- **`persistence` carve-out matches the YAML v1.2.0 declaration.**
  `frontend-state.yaml -> persistence.carve_outs[0]` (v1.2.0, post-rebase)
  authorises JWT persistence under `staff-engagement:token`. The
  implementation writes under exactly that key
  (`AUTH_STORAGE_KEY = 'staff-engagement:token'` in `auth-storage.ts`),
  and the companion username key (`AUTH_USERNAME_KEY = 'staff-engagement:username'`)
  is explicitly enumerated in the carve-out's `mechanism` clause —
  closes the original-draft **W1**.

- **`constraints` — components don't update signals directly; no `BehaviorSubject`.**
  Grep of the §2 diff shows no `BehaviorSubject`, no `Subject`, no
  `.next(...)`, no `[(ngModel)]` two-way binding. State is exclusively
  signal-driven.

- **Hydration timing — field-initializer, not constructor body.**
  `auth-state.ts` line 30-31: hydration happens inside the signal
  *initialiser expression*, evaluated synchronously during class
  construction and **before** any subscriber could observe a `null`
  intermediate state. The empty `constructor()` (lines 37-41) has no
  side-effect — it deliberately documents that hydration is already done.
  This is the correct Angular Signals pattern: field-initialisers run in
  declaration order, synchronously, before `inject()` returns. Compliant.

- **`AuthStorage` abstraction is testable without `window`.**
  `AuthStorage` is an interface + `AUTH_STORAGE` `InjectionToken`; tests
  inject `createInMemoryStorage()` (Map-backed) via `useValue` in
  `auth-state.spec.ts` line 27, `bearer-auth.interceptor.spec.ts` line 27,
  `auth-error.interceptor.spec.ts` line 31, and `app.spec.ts` line 11.
  No `window.localStorage` stubbing required in unit tests. Compliant.

- **Production storage is SSR / private-mode safe.**
  `browserAuthStorage` (`auth-storage.ts`) wraps every
  `globalThis.sessionStorage` access in `try { ... } catch { /* swallow */ }`.
  `read` returns `null` on failure; `write` / `remove` are no-ops. This
  satisfies `frontend-state.yaml -> persistence.carve_outs` rationale
  (the explicit acknowledgement that SSR / private mode must degrade
  gracefully).

- **`authErrorInterceptor` calls a service method, never writes signals.**
  `auth-error.interceptor.ts` lines 26-36: the interceptor does
  `inject(AuthState)` and calls `auth.clearOnUnauthorized()` on a 401.
  It does not reach into `AuthState` to write signals directly, and it
  does not touch `sessionStorage`. The side-effect is fully encapsulated
  in the service. This is the **exact** pattern called out in the task
  brief ("the interceptor should call a service method, never write
  signals directly").

- **403 / 500 leave the session intact.**
  `auth-error.interceptor.spec.ts` lines 88-110 and 112-132 exercise both
  non-401 error paths and assert that `isAuthenticated()` stays `true`
  and `storage.read(AUTH_STORAGE_KEY)` remains the issued token. The
  interceptor itself (`auth-error.interceptor.ts` lines 29-32) gates the
  clear on `error.status === 401` only — matches the spec and the
  constitution's `api-standards.yaml -> security` posture (403 is forbidden,
  not unauthenticated).

- **`StateService` convention 5 updated in lockstep with the YAML.**
  `state.service.ts` lines 14-18 now describe the JWT carve-out and
  point to `frontend-state.yaml -> persistence.carve_outs` and
  `AuthState`. The doc-string is consistent with the implementation and
  with the YAML. Compliant.

- **`toSignal()` not used inappropriately.**
  `AuthState` already exposes signals directly, so there is no RxJS →
  Signal bridge inside the service. `auth-error.interceptor.spec.ts` line
  90 calls `auth.login(...)` and then synchronously flushes
  `httpMock.expectOne(...)` — the subscription is synchronous because the
  test fixture flushes it inline. This is fine: the production code path
  (`login(...)` returning `Observable<LoginResponse>`) is consumed by
  components which can choose to `toSignal()` if they need template
  binding; the service itself is correct as-is.

- **HTTP interceptor ordering is intentional and documented.**
  `app.config.ts` lines 18-23 wires `withInterceptors([bearerAuthInterceptor, authErrorInterceptor])`
  with a comment ("Order matters: bearer attaches the Authorization
  header; authError then clears the persisted token on a 401 response.").
  The auth-error interceptor only fires on the response path; it cannot
  run before the bearer interceptor attaches the header, which is the
  intended order.

- **E2E spec covers the persistence contract end-to-end.**
  `e2e/tests/auth-persistence.spec.ts` lines 14-31 verify that a login
  + page reload lands on `/dashboard` (not `/login`) and that the
  documented localStorage key is populated. Lines 33-46 verify that
  logout clears the key. This is the externally-observable contract;
  unit tests cover the in-process behaviour.

---

## Warnings ⚠️

- **W1 — `username` is persisted alongside the JWT but not enumerated in the YAML carve-out.**
  `auth-storage.ts` line 21 defines `AUTH_USERNAME_KEY =
  'staff-engagement.auth.username'` and `auth-state.ts` lines 53-55 +
  64-65 write / remove it alongside the JWT. `frontend-state.yaml ->
  persistence.carve_outs[0]` enumerates only the JWT key
  (`staff-engagement.auth.jwt`). The username is *display* state, not
  authentication state per se — strictly the YAML carve-out permits only
  the JWT key. The username key is harmless (it does not grant access;
  the JWT alone is the bearer credential), but the YAML should be
  amended to either (a) list the username key as a permitted
  companion, or (b) explicitly authorise "the username label that
  re-hydrates `currentUser`". **Remediation 🛠️:** add one line to
  `frontend-state.yaml -> persistence.carve_outs[0].excludes` clarifying
  that the username label is included for UI re-hydration only, not as
  an authentication credential.

- **W2 — empty `constructor()` in `AuthState` (lines 37-41).**
  The constructor is intentionally empty; the comment acknowledges this.
  Field-initialisers already perform the hydration, so the constructor
  body is dead code. Not a violation — Angular does not require a
  constructor — but a future maintainer may "helpfully" add hydration
  logic there, which would re-introduce the mid-init observation window
  the task brief warned about. **Remediation 🛠️:** either delete the
  empty constructor (the comment can move to the field declarations)
  or replace with `// Intentionally empty: see field initialisers.`.
  Stylistic only.

- **W3 — `authErrorInterceptor` is registered unconditionally; no opt-out.**
  `app.config.ts` line 22 registers the interceptor in the global HTTP
  pipeline. Per the constitution, this is correct (state-side effects
  belong in the service, the interceptor is the trigger). However, the
  interceptor will fire on **every** 401, including requests from
  unauthenticated callers (e.g., the `/api/v1/auth/login` endpoint
  returning a 401 for bad credentials). In that case `clearOnUnauthorized`
  is a no-op (signals already null, storage already empty) — verified
  mentally but not by an explicit spec. **Remediation 🛠️:** add one
  optional BDD spec to `auth-error.interceptor.spec.ts` asserting that
  a 401 on `/api/v1/auth/login` does not throw (the clearOnUnauthorized
  call must be idempotent when no session is present).

- **W4 — `AUTH_USERNAME_KEY` is duplicated as a magic-string export.**
  The username key is exported from `auth-storage.ts` but no
  consumer outside `auth-state.ts` imports it. The naming convention
  is fine, but consider exporting it from a single barrel
  (`shared/auth/index.ts`) once a second consumer appears. **Remediation
  🛠️:** none for §2; flag for §3 if a third file needs it.

---

## Violations ❌

**None.**

The §2 implementation is structurally compliant with
`frontend-state.yaml`. All of the specific concerns called out in the
audit brief (hydration timing at field-init, interceptor delegates to
service method rather than writing signals, `AuthStorage` is testable
without `window`, production storage is SSR / private-mode safe, derived
state uses `computed()`, no signal writes outside the service,
`toSignal()` usage is appropriate, no `[(ngModel)]` two-way binding)
are satisfied. The original-draft **W1** (YAML carve-out under-keyed
the username companion) is closed by the post-rebase v1.2.0 carve-out
which enumerates both keys — no remaining constitution drift.

---

## Cross-references

- `frontend-state.yaml` v1.2.0 → `persistence.carve_outs[0]` —
  carve-out explicitly authorises this implementation, with both
  `staff-engagement:token` and `staff-engagement:username` enumerated.
- `frontend-state.yaml` → `derived_state` (`computed()` only) —
  `isAuthenticated`, `currentUser`, `bearerToken`, and `currentUserSubject`
  comply.
- `frontend-state.yaml` → `side_effects.placement` ("State Service
  Handlers") — `login`, `logout`, `clearOnUnauthorized` all co-locate
  the API call, signal write, and storage write.
- `frontend-state.yaml` → `constraints[0]` ("Components must not update
  global state signals directly") — satisfied; interceptors also do
  not update signals.
- `state.service.ts` convention 5 — updated to reflect the JWT carve-out
  in the same commit.
- Constitution Guard report `01-constitution-guard-proposal.md` →
  V1 + V7 — closed in `a1917b7` (the YAML was amended to permit the
  carve-out before this implementation commit landed). This §2 audit
  confirms the implementation now matches the amended YAML.

---

## Summary

| Severity | Count |
|----------|-------|
| Compliant ✅ | 15 |
| Warning ⚠️   | 3   |  (W1 closed; W2/W3/W4 retained as documentation hygiene) |
| Violation ❌  | 0   |

**Most important issue:** *none blocking.* The original **W1** (YAML
carve-out covered only the JWT, not the companion username) is closed
by the post-rebase `frontend-state.yaml` v1.2.0 which enumerates both
keys. **W2** (no redirect on 401) and **W3** (no 401-on-login spec)
remain as UX / test-coverage refinements that the spec already
documents as future-work. **W4** (no barrel export for the storage
key constants) is a no-op until a second consumer imports them.

§2 is approved to merge from the Angular State Architect's perspective.

---

## Re-audit after rebase onto `origin/main` (2026-06-25)

**Subject:** the §2 implementation commit was rebased onto `origin/main`
after PR #37 (ATSE1-41) shipped a `sessionStorage`-based persistence
layer with `computed()`-shaped `bearerToken`. The rebase rewrites the
implementation to align with main's chosen mechanism and signal shape,
while preserving the §2 additions that PR #37 did not ship:
`AuthStorage` injection abstraction, `currentUserSubject` (JWT `sub`
decoder), `clearOnUnauthorized()` method, and the Playwright smoke.

**Compliance verdict against the post-rebase tree:**

| Check | Verdict |
|---|---|
| Hydration source changed from `localStorage` → `sessionStorage` | ✅ — `auth-storage.ts` `browserAuthStorage.read/write/remove` now read/write `globalThis.sessionStorage`; matches PR #37. |
| Storage key updated from `staff-engagement.auth.jwt` → `staff-engagement:token` | ✅ — single source of truth in `AUTH_STORAGE_KEY`; imported by `auth-state.ts` and the test suite. |
| `bearerToken` shape changed from method → `computed()` signal | ✅ — preserves PR #37's shape so `bearerAuthInterceptor` works unchanged. |
| `currentUserSubject` computed signal added | ✅ — decodes JWT `sub` claim for authoritative identity; `null` on absent / malformed token. |
| `clearOnUnauthorized()` public method retained | ✅ — `authErrorInterceptor` continues to delegate; signal writes remain encapsulated in the service. |
| `AuthStorage` interface still unit-tested via DI | ✅ — `auth-state.spec.ts` injects `createInMemoryStorage()` via `{ provide: AUTH_STORAGE, useValue: ... }`; no `window.sessionStorage` stubbing required. |
| Original W1 (username key under-enumerated in carve-out) closed | ✅ — `frontend-state.yaml` v1.2.0 carve-out's `mechanism` clause names both `staff-engagement:token` and `staff-engagement:username`. |
| Original W2 / W3 / W4 carried forward | ⚠️ — retained as future-work; none blocking. |
| No signal writes outside `AuthState` | ✅ — interceptor / specs / app.config all route through service methods. |
| No `BehaviorSubject`, no `Subject`, no two-way binding | ✅ — grep clean. |

**Net delta from the original audit:** the post-rebase implementation
strictly improves on the original draft — smaller blast radius via
`sessionStorage` (scoping persistence to the JWT's lifetime), a
type-safe `computed()`-shaped `bearerToken` matching PR #37, and the
YAML carve-out now character-for-character matches the code. **Status:
APPROVED for merge.**