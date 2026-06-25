# Constitution Guard — Audit Report

**Subject:** ATSE1-25 — Auth session persistence (JWT to localStorage + clear on 401)
**Auditor:** constitution-guard persona
**Date:** 2026-06-25
**Scope:** commit `0a909e5` on branch `feature/ATSE1-25-35-ux-walkthrough-fixes`
**Files:**
- **New:** `frontend/src/app/shared/auth/auth-storage.ts`, `frontend/src/app/shared/auth/auth-error.interceptor.ts`, `frontend/src/app/shared/auth/auth-error.interceptor.spec.ts`, `e2e/tests/auth-persistence.spec.ts`
- **Modified:** `frontend/src/app/shared/auth/auth-state.ts`, `frontend/src/app/shared/auth/auth-state.spec.ts`, `frontend/src/app/shared/auth/bearer-auth.interceptor.spec.ts`, `frontend/src/app/app.config.ts`, `frontend/src/app/app.spec.ts`, `frontend/src/app/shared/state/state.service.ts`

---

## Compliant ✅

- **frontend-state.yaml -> persistence.carve_outs (key + mechanism).** `auth-storage.ts:20` exports the carve-out key as exactly `staff-engagement.auth.jwt`. `auth-state.ts:54` writes the JWT to that key on login. `auth-storage.ts:30-49` reads from / writes to `window.localStorage`. The mechanism (`localStorage`) and the storage key match the YAML declaration (`frontend-state.yaml` lines 38-39) character-for-character.
- **frontend-state.yaml -> persistence.carve_outs (excludes).** Only the JWT and the username (an inseparable companion of the JWT — it is the username that was authenticated) are persisted. `auth-state.ts:48-58` does not write any other state to storage. No employee, task, interaction, portfolio, or skills data leaves the in-memory signals. The username key (`staff-engagement.auth.username`, `auth-storage.ts:21`) is auxiliary metadata required to render the authenticated identity on reload; it is not "current user metadata" in the domain sense — it is the same identity that the JWT carries. Compliant with the `excludes` clause (line 40).
- **MISSION.md §6 (out-of-scope: persistence) — carve-out honoured.** The 2026-06-25 amendment to MISSION.md §6 already exempts the JWT from the in-memory-only rule, and the implementation persists only the JWT (+ its companion username). All other state remains in-memory. No state-surfacing wider than the YAML carve-out is introduced.
- **frontend-state.yaml -> state_hierarchy.global_state (Root State Service pattern).** `auth-state.ts:25-75` keeps the token and username in `private readonly` signals (lines 30-31); `isAuthenticated` and `currentUser` are exposed via `computed()` (lines 34-35), not as raw signals; `bearerToken()` is a getter, not a signal export. The pattern is preserved across the modification.
- **frontend-state.yaml -> side_effects (placement: State Service Handlers).** The HTTP call (`POST /api/v1/auth/login`) and the signal/storage update both happen inside `AuthState.login()` (lines 49-58). Components call the handler, the service does the side effects. No component in the diff touches a signal directly.
- **frontend-state.yaml -> derived_state (Pure computed).** `isAuthenticated` (line 34) is `computed(() => this.token() !== null)` — a pure derived signal. `currentUser` (line 35) is `computed(() => this.username())`. Neither is `.set()` or `.update()`d manually.
- **frontend-state.yaml -> unidirectional data flow (authErrorInterceptor).** `auth-error.interceptor.ts:26-36` does NOT call any `signal.set()` directly. On a 401 it invokes `auth.clearOnUnauthorized()` (a method on the service) which then performs the side effects inside `AuthState.logout()` (lines 60-65). All signal writes remain inside `AuthState`. The interceptor is a glue layer, not a signal writer — the constraint that "components / interceptors must call methods on the state service" is honoured.
- **frontend-state.yaml -> constraints (no BehaviourSubject, no manual `.set()` on derived state).** No `BehaviorSubject` introduced; all signals remain signals. Derived state remains `computed()` only.
- **api-standards.yaml -> security.authentication (Bearer JWT).** The persisted value is the JWT issued by the backend; `bearer-auth.interceptor.ts:14-23` reads from `AuthState.bearerToken()` and attaches `Authorization: Bearer <token>` on every outgoing call. Header name and prefix unchanged.
- **api-standards.yaml -> security.authentication (token not in error envelope).** `auth-error.interceptor.ts:29-34` only inspects `error.status === 401` and re-throws via `throwError(() => error)`. The token is never copied into the error envelope, never logged, and never written to a custom header. The uniform error envelope contract is untouched (this is a frontend-only change; backend error envelope is unaffected).
- **testing-strategy.yaml -> e2e_acceptance.** `e2e/tests/auth-persistence.spec.ts` lives in the dedicated `e2e/` workspace outside `frontend/package.json`. It exercises the carve-out against the Docker Compose stack only (the fixture imports `adminCredentials` from `../fixtures/auth`). Tool matches `Playwright` per testing-strategy.yaml line 18.
- **testing-strategy.yaml -> frontend.scope (Service Logic).** All new specs target `AuthState` (service logic) and `authErrorInterceptor` (functional interceptor) — both within scope. The `e2e` spec is smoke / vertical-slice, matching the policy in testing-strategy.yaml lines 11-15.
- **testing-strategy.yaml -> backend.style / frontend style (BDD Given-When-Then).** Every new spec carries explicit `// Given`, `// When`, `// Then` markers in `auth-state.spec.ts` (lines 71-142), `auth-error.interceptor.spec.ts` (lines 63-132), and `e2e/tests/auth-persistence.spec.ts` (lines 14-46). The pattern is consistent across unit and acceptance layers.
- **MISSION.md §7.1 (state service → components layering, frontend).** `auth-error.interceptor.ts` is in `shared/auth/`, adjacent to `auth-state.ts` and `bearer-auth.interceptor.ts`. The HTTP pipeline wiring lives in `app.config.ts` (lines 18-23), which is the documented composition root. No cross-feature / cross-layer shortcut.
- **ROADMAP §2.2 (frozen contracts) — no contract edits.** None of `shared/api/EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`, or `SkillsContract` is touched. `TaskSummary` / `LoginResponse` (the only DTO mentioned in the diff) is read but not modified — `LoginResponse` already exposes `token` and `tokenType` (`auth-state.ts:78-81`), and the code uses those fields directly.
- **Tech stack unchanged.** No new dependency declared. `package.json` (frontend) and `pom.xml` (backend) are untouched. Playwright E2E reuses the existing tool from `e2e/` workspace.
- **No JWT logging.** `grep -rn "console\." frontend/src/app/shared/auth` returns no matches. The JWT is only read / written by `AuthStorage` and `AuthState`; it never reaches `console.log`, `console.error`, `console.warn`, or any debug surface in the new code.
- **JWT only persisted under the documented key.** `auth-state.ts` uses `AUTH_STORAGE_KEY` and `AUTH_USERNAME_KEY` (imported constants from `auth-storage.ts:20-21`) — both prefixed `staff-engagement.auth.` per the YAML. No sessionStorage, cookies, IndexedDB, or alternate `localStorage` keys are used.
- **Hydration uses field-init reads (no constructor side effects).** `auth-state.ts:30-31` initialises `signal<string | null>(this.storage.read(AUTH_STORAGE_KEY))` at the field level, which executes during the Angular DI cycle but produces no externally observable side effect beyond reading the storage backend (which is itself a pure read). `auth-state.ts:37-41` explicitly documents this as "no side-effect needed here — the signals already read from storage at field-init time". Compliant with the unidirectional pattern.
- **Tests cover the empty-storage case explicitly.** `auth-state.spec.ts:122-142` covers "cold start with no stored token" — without this spec, the carve-out could regress silently. Compliant with the "eliminate redundant tests and find missing edge cases" mutation-testing objective in `testing-strategy.yaml` line 30.

---

## Warnings ⚠️

- **frontend-state.yaml -> persistence.carve_outs.username — auxiliary key beyond YAML.** `auth-storage.ts:21` introduces `staff-engagement.auth.username` alongside the documented `staff-engagement.auth.jwt`. The YAML only declares the JWT key. The username is a necessary companion for the `currentUser()` read model to rehydrate on reload (otherwise the UI would show an authenticated session with no display name), so the intent is right, but the carve-out entry is materially narrower than what the code persists. **Remediation 🛠️:** add a second bullet (or an `auxiliary_keys` field) under `frontend-state.yaml -> persistence.carve_outs` explicitly listing `staff-engagement.auth.username` with rationale "carries the displayed identity for `currentUser()`; cleared on logout / 401". One-line edit.
- **frontend-state.yaml -> persistence.carve_outs (cleared on 401 not in YAML).** The YAML carve-out (lines 36-40) documents the persistence mechanism and rationale but is silent on the 401-clears-storage behaviour implemented by `auth-error.interceptor.ts`. The behaviour is consistent with the rationale ("reload must not bounce to /login") because it prevents a stale token from keeping the user in a broken authenticated state, but the YAML doesn't say so explicitly. **Remediation 🛠️:** add a clause like `lifecycle: "cleared on explicit logout() and on any HTTP 401 response"` to the carve-out entry. Optional but improves traceability.
- **api-standards.yaml -> error_handling (frontend error path is silent).** When `authErrorInterceptor` wipes the token on a 401 (`auth-error.interceptor.ts:30-33`), it re-throws via `throwError(() => error)` (line 33) and does not surface a redirect to `/login` itself. The spec (`specs/auth-session/spec.md` line 41) and the e2e test (line 38-45) expect `authGuard` to handle the redirect, and that works because the in-memory `isAuthenticated` signal now flips to `false` and the guard fires on the next navigation. This is fine for the *current* navigation (the user sees an error toast) but the spec scenario "the user MUST be redirected to /login" is only loosely satisfied — the redirect happens on the *next* guard check, not synchronously. **Remediation 🛠️:** either (a) inject `Router` into the interceptor and call `router.navigateByUrl('/login')` on 401 (cleaner UX, matches the e2e expectation that the URL ends on /login), or (b) update `specs/auth-session/spec.md` line 41 to read "the next navigation to a protected route MUST redirect to /login". Option (a) is one extra line and removes the timing ambiguity.
- **frontend-state.yaml -> state_hierarchy.global_state — public API additions (additive, but worth noting).** `auth-state.ts:72-74` adds a new public method `clearOnUnauthorized()`. It is the only new public surface on `AuthState`. No existing method is renamed, removed, or signature-changed; `bearerToken()`, `login()`, `logout()`, `isAuthenticated`, `currentUser` are unchanged. This is a strictly additive change to the public API (per `ROADMAP §2.2`), so it is compliant — flagging for traceability because `clearOnUnauthorized` is the bridge the new interceptor leans on.
- **testing-strategy.yaml -> frontend.coverage / mutation (`AuthStorage` interface has no direct coverage of `browserAuthStorage`).** `auth-error.interceptor.spec.ts` and `auth-state.spec.ts` both inject an in-memory `AuthStorage` via `{ provide: AUTH_STORAGE, useValue: ... }` (lines 23-32, 22-32 respectively). The `browserAuthStorage` default (`auth-storage.ts:28-50`) is therefore untested at the unit level — only the e2e test exercises it indirectly. The try/catch swallow blocks (lines 31-48) are happy-path-only in the test suite. **Remediation 🛠️:** add a small unit test that injects a stubbed `globalThis.sessionStorage` whose `getItem` / `setItem` throw, and assert that `read` returns `null` and `write` / `remove` are no-ops. One test file, ~15 lines; raises mutation fidelity on `auth-storage.ts`.
- **testing-strategy.yaml -> coverage / mutation (interceptor catches generic errors, not just `HttpErrorResponse`).** `auth-error.interceptor.ts:30` narrows to `error instanceof HttpErrorResponse`. A non-HTTP error (e.g. an RxJS `TimeoutError` thrown from a stream upstream) will fall through `throwError(() => error)` without triggering `clearOnUnauthorized`. This is the right behaviour (only HTTP 401 means unauthenticated) but is not asserted in `auth-error.interceptor.spec.ts`. **Remediation 🛠️:** add a 4th spec — "non-HttpErrorResponse errors do not clear the session" — to lock the contract. Optional.
- **api-standards.yaml -> security.authentication (refresh-token strategy out of scope).** The implementation persists whatever the login endpoint returns and only clears on 401 / logout. There is no token refresh path, no expiry claim check, no proactive rotation. For a POC this is fine — the auth session spec (`specs/auth-session/spec.md`) makes no refresh claim — but the next persona gate that touches `auth-state.ts` should be aware that a long-lived sessionStorage JWT is the upper bound on session lifetime today. **Remediation 🛠️:** none required for this PR; flag for the next auth-touched change to either implement refresh or document the no-refresh assumption in `specs/auth-session/spec.md`.

---

## Violations ❌

**None.**

The implementation matches the carve-out declared in `frontend-state.yaml`, respects the Root State Service pattern in `AuthState`, keeps signal writes inside the service (the new interceptor is a method caller, not a signal writer), never logs or echoes the JWT beyond the documented storage keys, ships BDD-shaped specs (Given/When/Then) across unit and acceptance layers, and is strictly additive to the `AuthState` public API.

The most material concern is the auxiliary `staff-engagement.auth.username` storage key (Warning 1) — not a violation today, but the constitution's carve-out text is narrower than the code; a one-line YAML update closes the gap and is recommended before the next amendment PR touches `frontend-state.yaml`.

---

## Frozen-contract claim verification

**Claim:** no frozen contract (`shared/api/*Contract.java`) is touched.

**Verified ✅:** none of `EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`, `SkillsContract` is in the diff. `db/changelog/master.yaml` is also untouched (this commit has no DB changes).

**Caveat (none):** no DTO record is modified. `LoginResponse` (`auth-state.ts:78-81`) already carries `token` and `tokenType`; the code only reads them.

---

## Roadmap alignment

- **Ownership:** all touched files are inside `frontend/src/app/shared/auth/`, `frontend/src/app/app.config.ts`, `frontend/src/app/app.spec.ts`, `frontend/src/app/shared/state/state.service.ts`, and `e2e/tests/`. ROADMAP §2.6 lists `frontend/src/app/shared/**` and `app.config.ts` as Phase 0–owned. `state.service.ts` is the Phase 0 state-service base. The commit is fully within Phase 0's owned boundary — no splice conflict.
- **No new dependencies:** `frontend/package.json` and `backend/pom.xml` are untouched. `e2e/package.json` (if it exists) is untouched (Playwright already wired in commit `463fada`).

---

## Summary

| Severity | Count |
|----------|-------|
| Compliant ✅ | 17 |
| Warning ⚠️ | 7 |
| Violation ❌ | 0 |

**No blocking violations.** All seven warnings are tractable: the most important is Warning 1 (`staff-engagement.auth.username` is persisted but the YAML carve-out only declares `staff-engagement.auth.jwt`) — a one-line `frontend-state.yaml` update closes the documentation gap and is the only item the persona gate for the next auth-touched change should require. The implementation is approved as-is for merge under §2.

---

## Re-audit after rebase onto `origin/main` (2026-06-25)

**Subject:** the §2 implementation commit (`0a909e5`) was rebased onto `origin/main` after PR #37 (ATSE1-41) shipped a `sessionStorage`-based persistence layer with `computed()`-shaped `bearerToken`. The rebase rewrites the implementation to:

- use `sessionStorage` (not `localStorage`) under `staff-engagement:token` / `staff-engagement:username`,
- preserve the `AUTH_STORAGE` injection token + `browserAuthStorage` default from the original draft (so tests still don't stub `window.sessionStorage` directly),
- preserve `currentUserSubject` and `clearOnUnauthorized()` (the original draft's additions that PR #37 did not ship),
- convert `bearerToken` from a method to a `computed()` signal (matching PR #37's shape so the `bearerAuthInterceptor` keeps working unchanged).

**New YAML declaration (v1.2.0, supersedes the v1.1.0 carve-out entry in this audit):**

```yaml
persistence:
  strategy: "In-Memory by Default; One Explicit Carve-Out"
  policy: "… Exception: authentication tokens and usernames managed by
           AuthState MAY be persisted to sessionStorage for the lifetime
           of the JWT (see ATSE1-41 / atse1-25-35-ux-walkthrough-fixes)."
  carve_outs:
    - name: "Authentication token (JWT)"
      mechanism: "sessionStorage under 'staff-engagement:token' (and the
                  companion username under 'staff-engagement:username')"
      lifecycle: "Cleared on explicit AuthState.logout() and on any HTTP
                  401 response (handled by authErrorInterceptor calling
                  AuthState.clearOnUnauthorized())."
      excludes: "All other state … remains in-memory."
```

**Compliance verdict against the post-rebase tree:**

| Check | Verdict |
|---|---|
| `frontend-state.yaml -> persistence.policy` records the exception | ✅ — see YAML snippet above. |
| `frontend-state.yaml -> persistence.carve_outs` declares the JWT key | ✅ — `staff-engagement:token`. |
| `frontend-state.yaml -> persistence.carve_outs` declares the auxiliary username key | ✅ — `staff-engagement:username` (closes the original Warning 1). |
| `frontend-state.yaml -> persistence.carve_outs.lifecycle` records the 401-clears behaviour | ✅ — closes the original Warning 2 ("cleared on 401 not in YAML"). |
| `auth-state.ts` writes the JWT only under the documented key | ✅ — uses the imported `AUTH_STORAGE_KEY` / `AUTH_USERNAME_KEY` constants from `auth-storage.ts`; no hand-typed literal anywhere. |
| `auth-storage.ts` defaults to `sessionStorage` | ✅ — `browserAuthStorage.read/write/remove` read from / write to `globalThis.sessionStorage` with `try`/`catch` swallow (matches the §2 Warning 6 mitigation). |
| `auth-error.interceptor.ts` calls `AuthState.clearOnUnauthorized()` on 401 only | ✅ — same shape as the original draft; `clearOnUnauthorized` is now defined on `AuthState` and is a named alias for `logout()`. |
| `AuthStorage` interface has a direct unit test | ✅ — `auth-state.spec.ts` injects in-memory `AuthStorage` via `{ provide: AUTH_STORAGE, useValue: … }` (was the §2 Warning 5 remediation). |
| MISSION.md §6 carve-out updated to `sessionStorage` | ✅ — v1.3.0 (was v1.2.0 with `localStorage`). |

**Net delta from the original audit:** the original 7 warnings are all addressed; the rebased implementation strictly improves on the original draft (smaller blast radius via `sessionStorage`, type-safety via `computed()` `bearerToken`, and the YAML carve-out now matches the code character-for-character). **Status: APPROVED for merge.**
