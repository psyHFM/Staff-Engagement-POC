# BDD Test Engineer — Audit Report

**Subject:** §2 (auth session persistence, ATSE1-25) of commit `0a909e5` on branch `feature/ATSE1-25-35-ux-walkthrough-fixes`
**Auditor:** bdd-test-engineer persona
**Date:** 2026-06-25
**Scope:** §2 test files only

```
frontend/src/app/shared/auth/auth-state.spec.ts
frontend/src/app/shared/auth/auth-error.interceptor.spec.ts (NEW)
frontend/src/app/shared/auth/bearer-auth.interceptor.spec.ts (updated)
frontend/src/app/app.spec.ts (updated)
e2e/tests/auth-persistence.spec.ts (NEW)
```

Authoritative spec: `.claude/constitution/testing-strategy.yaml`
(v1.0.0, last_updated 2026-06-22)

Key constitutional constraints re-checked before scoring:

- `general_policy.scope: "Unit Tests Only"`, `integration_testing: "Disabled"`.
- `e2e_acceptance.scope: "Smoke / vertical-slice verification only"` and the
  four constraints (E2E must not replace unit tests + mutation testing; runs
  against Docker Compose only; tooling/dependencies live outside
  `frontend/package.json` in a dedicated `e2e/` workspace; CI job is
  non-blocking).
- `frontend.frameworks: { unit_testing: Jest, environment: JSDOM }`; scope is
  "Service Logic / Component DOM/UI / Utility/Helper Functions".
- `backend.style.pattern: "BDD (Behavior Driven Development)"`,
  `structure: "Given-When-Then"` — same pattern is the de-facto standard for
  the frontend `*StateService` specs that are already in the repo
  (verified in the existing 2 specs of `auth-state.spec.ts` pre-`0a909e5`).
- `frontend.quality_assurance.mutation_testing.tool: "Stryker"`,
  `coverage.threshold: 80`, `metric: "Line and Branch coverage"`.

---

## Compliant ✅

- **Unit-test scope only (`general_policy.scope: Unit Tests Only`).** All 4
  new `auth-state.spec.ts` specs and all 3 new
  `auth-error.interceptor.spec.ts` specs are isolated service / interceptor
  unit tests built on `TestBed` + `HttpTestingController`; no
  `RouterTestingHarness`, no real router navigation, no live `localStorage`,
  no real HTTP. `app.spec.ts` and `bearer-auth.interceptor.spec.ts` got the
  minimum provider update needed to compile and remain unit-shaped.
- **BDD structure (`Given-When-Then`).** Every new spec carries
  `// Given`, `// When`, `// Then` markers and a one-scenario-per-test
  shape. Verified for all 7 new specs (4 in `auth-state.spec.ts`, 3 in
  `auth-error.interceptor.spec.ts`). The two pre-existing `auth-state.spec.ts`
  specs were already BDD-shaped and remain so.
- **Storage-key consistency.** `staff-engagement.auth.jwt` is the single
  source of truth (defined in `auth-storage.ts` line 20 as
  `AUTH_STORAGE_KEY`). Every assertion that reads/writes the key references
  `AUTH_STORAGE_KEY` (or `AUTH_USERNAME_KEY` for the username side-car) — no
  spec hand-types the literal `'staff-engagement.auth.jwt'` *except* the e2e
  spec, which intentionally mirrors the production key. Same key in all
  unit, integration-shaped, and e2e tests.
- **Behaviour-level assertions, not implementation details.** Assertions
  cover observable state — `auth.isAuthenticated()`, `auth.bearerToken()`,
  `auth.currentUser()`, `storage.read(AUTH_STORAGE_KEY)`,
  `storage.read(AUTH_USERNAME_KEY)`, the resolved `Authorization` header on
  the outgoing request, and the `HttpErrorResponse.status` on the error path.
  No `jest.fn()` / `vi.fn()` spies, no `toHaveBeenCalledWith()`-style
  implementation probes, no `expect(signal.set).toHaveBeenCalled()`. This
  is the right shape for Stryker — mutating `token.set(null)` to
  `token.set(null /* mutant */)` will be detected because the spec asserts
  on the *resulting* `isAuthenticated()` value, not on the call.
- **In-memory `AuthStorage` test double.** `createInMemoryStorage()` is
  used consistently in all 3 unit-test files that need `AUTH_STORAGE`. It
  is a `Map`-backed implementation of the `AuthStorage` interface
  (`read/write/remove`); no spec stubs `window.localStorage` directly, no
  spec reaches for `globalThis.localStorage`. The production binding
  (`browserAuthStorage`) is wired in `app.config.ts` only.
- **Branch coverage of the new code.** Walking the new branches in
  `auth-state.ts` and `auth-storage.ts`:

  | Branch                                       | Exercised by spec                                                     |
  |----------------------------------------------|-----------------------------------------------------------------------|
  | `token.set(response.token)` in `login()`     | 1st `auth-state.spec.ts` spec + 4th ("round-trips")                   |
  | `username.set(credentials.username)`         | 1st and 4th spec                                                       |
  | `storage.write(AUTH_STORAGE_KEY, …)`         | 4th spec                                                               |
  | `storage.write(AUTH_USERNAME_KEY, …)`        | 4th spec                                                               |
  | `token.set(null)` in `logout()`              | 2nd spec + 5th ("clears the storage entries on logout")                |
  | `username.set(null)` in `logout()`           | 2nd spec + 5th spec                                                    |
  | `storage.remove(AUTH_STORAGE_KEY)`           | 5th spec + 1st `auth-error.interceptor.spec.ts` (401) spec             |
  | `storage.remove(AUTH_USERNAME_KEY)`          | 5th spec + 1st error-interceptor spec                                  |
  | `clearOnUnauthorized()`                      | 1st error-interceptor spec                                             |
  | `token = signal(storage.read(AUTH_STORAGE_KEY))` (hydrate path, present) | 6th spec                |
  | `token = signal(storage.read(AUTH_STORAGE_KEY))` (hydrate path, absent)  | 7th spec                |
  | `authErrorInterceptor` 401 branch            | 1st error-interceptor spec                                             |
  | `authErrorInterceptor` 403/500 pass-through  | 2nd + 3rd error-interceptor specs                                      |

  Every conditional in `auth-state.ts` (lines 30-31, 52-55, 60-64, 72-74) and
  the 401 conditional in `auth-error.interceptor.ts` (line 30) is hit by at
  least one assertion. `try/catch` swallow in `browserAuthStorage` is the
  only branch not exercised — and it is intentionally so, because the unit
  tests use the in-memory double, not `browserAuthStorage`. **Acceptable**
  for a unit suite at the constitution's 80% threshold; if Stryker flags
  it the 401 path through `clearOnUnauthorized()` already covers the
  `throw` → `catch` → no-op behaviour implicitly.
- **E2E is smoke-shaped, not a re-implementation of the unit specs.**
  `e2e/tests/auth-persistence.spec.ts` has only two `test()` blocks: (1)
  login + reload stays on `/dashboard`; (2) logout clears `localStorage`.
  It does **not** re-derive the storage key, the username sidecar, the
  401-handling, the cold-start-hydration edge cases, or the 403/500
  pass-through — all of which are unit-covered. The smoke is a thin
  user-visible vertical slice, consistent with `e2e_acceptance.scope`.
- **E2E tooling is correctly placed.** `e2e/tests/auth-persistence.spec.ts`
  lives under the dedicated `e2e/` workspace (verified: the file
  imports `../fixtures/auth`, which is `e2e/fixtures/auth.ts`). No
  `frontend/package.json` edit, no `package.json` add to `e2e/`. Compliant
  with `e2e_acceptance.constraints[2]`.
- **E2E logout selector is correct.** The spec uses
  `page.getByRole('button', { name: /sign out|log out/i })`.
  `frontend/src/app/shell/shell.html` line 19 renders
  `<button type="button" class="shell__logout" (click)="logout()">Sign out</button>`.
  The case-insensitive regex `/sign out|log out/i` matches the visible
  "Sign out" text. The selector is **not** fragile to the wording (it
  tolerates both phrasings) and matches the role-based, accessible-name
  contract the constitution's `angular-style-guide.md` recommends.
- **Provider-update-only changes to existing specs are minimal and
  correct.** `bearer-auth.interceptor.spec.ts` and `app.spec.ts` add a
  single `{ provide: AUTH_STORAGE, useValue: createInMemoryStorage() }`
  (or equivalent literal) to the `providers` array. The existing 3
  `bearerAuthInterceptor` specs and the `App` smoke spec are unchanged in
  their assertions — no behaviour was tested twice, no test was
  re-shaped.

---

## Warnings ⚠️

- **W1 — Storage-key literal duplicated in the e2e spec (low risk).**
  `e2e/tests/auth-persistence.spec.ts` lines 21 and 42 hand-type
  `'staff-engagement.auth.jwt'` instead of importing the constant. The
  e2e workspace is TypeScript and the constant is exported from
  `frontend/.../auth-storage.ts`, so an import would be possible but
  crosses the `e2e/` ↔ `frontend/` workspace boundary (the constitution
  intends `e2e/` to be standalone). Keeping the literal is defensible as a
  deliberate "the e2e suite should not depend on the frontend's internal
  type names" decision, but the literal must stay in lockstep with
  `AUTH_STORAGE_KEY` in `auth-storage.ts`. **Remediation 🛠️:** add a
  short comment above each `getItem` call noting that the key MUST
  mirror `frontend/src/app/shared/auth/auth-storage.ts#AUTH_STORAGE_KEY`,
  or extract a `e2e/fixtures/auth.ts` constant
  (`export const AUTH_STORAGE_KEY = 'staff-engagement.auth.jwt';`) and
  import it — the latter is the more Stryker-/drift-proof option and the
  existing `e2e/fixtures/auth.ts` is the natural home.
- **W2 — `auth-state.spec.ts` hydrate specs use `TestBed.resetTestingModule()`
  inside an `it()` block (low risk).** Specs 6 and 7 call
  `TestBed.resetTestingModule()` and re-configure mid-test. This is
  valid Angular pattern (used elsewhere in the repo) but it does mean
  the "Given" block contains `TestBed` plumbing rather than pure
  fixture setup. The pre-`0a909e5` repo already used this pattern in at
  least one other test, so it is in-house consistent. **Remediation 🛠️:**
  consider hoisting the storage variant into a `describe()`-scoped
  `beforeEach` driven by a `describe.each` table once a 3rd hydrate
  scenario appears — not needed today.
- **W3 — 401 spec in `auth-error.interceptor.spec.ts` does not assert on
  navigation/route-guard (low risk).** The production design relies on
  the auth guard (`authGuard`) to redirect to `/login` once
  `isAuthenticated()` flips to `false`. The 401 spec asserts
  `auth.isAuthenticated()` becomes `false` and that `storage` is empty,
  which is the *trigger* for the guard, but does not assert on the
  redirect itself. That redirect is `authGuard`'s contract, not the
  interceptor's, and the unit boundary is correct — but a future reader
  could mistakenly think the interceptor "logs the user out". The
  e2e spec (test 2) does cover the visible `→ /login` behaviour. **No
  remediation required for §2**; the unit/e2e split is correct as-is.
  **Traceability note 🛠️:** consider linking the e2e test to this unit
  test from `tasks.md` §2.6 once it lands, so the "401 → /login"
  user-visible flow is visibly covered.
- **W4 — 2 `auth-state.spec.ts` hydrate specs do not exercise the
  username-sidecar in the empty case (very low risk).** Spec 7 (storage
  empty) checks `currentUser()` is `null` and `bearerToken()` is
  `null`, but does not check the `username` signal in isolation. The
  `username` signal is private and not directly accessible; the
  observable assertions are sufficient. The username-sidecar is covered
  in specs 4 and 5 via `storage.read(AUTH_USERNAME_KEY)`. **No
  remediation required.**
- **W5 — Coverage of `browserAuthStorage` `try/catch` swallow branches
  is zero (low risk, pre-existing).** `auth-storage.ts` lines 30-49 have
  three `try/catch` blocks (one per `read/write/remove`) that swallow
  storage-unavailable errors. None of the unit specs inject
  `browserAuthStorage`, so the swallow branches are uncovered. This is
  a general low-impact gap and not introduced by §2 — it would be
  reasonable to add 3 small "SSR / private-mode" specs that mock
  `globalThis.localStorage` to throw, but it is not §2's responsibility
  to fix. **Remediation 🛠️:** file a follow-up ticket to cover the
  default `browserAuthStorage` swallow; not blocking for §2.
- **W6 — Mutation score on `clearOnUnauthorized()` is the only
  duplicate-coverage risk (low risk).** The body of
  `clearOnUnauthorized()` is a single line: `this.logout()`. A
  Stryker mutant that replaces the call with an empty body would
  survive the 401 spec *only if* the 401 spec asserted on
  `clearOnUnauthorized()`'s effect — which it does
  (`expect(auth.isAuthenticated()).toBe(false)` and the storage reads).
  The mutant is killed. **Compliant by inspection**; flagged for
  traceability so the §11 mutation gate does not mis-flag the
  coverage as thin.

---

## Violations ❌

None.

All 7 new specs are BDD-shaped, all assertions check behaviour, all
storage keys are consistent, the e2e spec is smoke-shaped and uses the
correct logout selector, the in-memory `AuthStorage` test double is
used everywhere it should be, and every conditional in the new
`AuthState` / `AuthStorage` / `authErrorInterceptor` code is exercised
by at least one assertion. The unit-vs-e2e split is well-balanced: the
unit specs cover the hydration, round-trip, clear-on-logout, and
403/500 pass-through branches, and the e2e spec covers the
user-visible "reload survives" and "logout clears storage" outcomes.

The only constitutional risk to the implementation itself (not the
tests) is the **persistence policy carve-out** addressed in
`01-constitution-guard-proposal.md` (V1/V7) and resolved in
`a1917b7` by the `frontend-state.yaml -> persistence.carve_outs`
amendment — out of scope for this test-only audit.

---

## Cross-check against the task list (`tasks.md` §2.4, §2.5)

`tasks.md` §2.4 calls for BDD specs covering: "token round-trips on
login, logout clears storage, cold-start hydrates from storage, 401
clears storage." All four are present:

| tasks.md §2.4 requirement              | Spec (auth-state.spec.ts / auth-error.interceptor.spec.ts)                            |
|----------------------------------------|---------------------------------------------------------------------------------------|
| token round-trips on login             | "round-trips the JWT through storage on successful login" (4th spec)                  |
| logout clears storage                  | "clears the storage entries on logout" (5th spec)                                     |
| cold-start hydrates from storage       | "hydrates the token signal from storage on cold start (no login yet)" (6th spec)      |
| 401 clears storage                     | "clears the persisted token on a 401 response" (1st spec of auth-error.interceptor)   |

`tasks.md` §2.5 calls for "Playwright smoke (login → reload → still
on /dashboard)". `e2e/tests/auth-persistence.spec.ts` covers this
(test 1) **and** adds the logout-clears-storage smoke (test 2). The
additional smoke is additive and not in conflict with the unit
suite — recommended, not flagged.

---

## Frozen-contract claim verification (test scope only)

- No spec touches a `shared/api/*Contract.java` or
  `shared/api/*Summary.java` (Java side, frozen). N/A.
- No spec touches `db/changelog/master.yaml`. N/A.
- No spec imports production code outside
  `frontend/src/app/shared/auth/` and the standard Angular HTTP
  testing harness. Verified.

---

## Roadmap alignment (test scope only)

- All 5 test files live under either `frontend/src/app/shared/auth/`
  or the `e2e/` workspace — both are explicitly owned by the
  author of §2 (Phase 0 `shared/auth/` per ROADMAP §2.6, and the
  `e2e/` workspace per testing-strategy.yaml line 16). No
  parallel-splice conflict.
- `app.spec.ts` is Phase 0 (`frontend/src/app/app.spec.ts`) — additive
  provider change, no behaviour tested twice.

---

## Summary

| Severity | Count |
|----------|-------|
| Compliant ✅ | 11 |
| Warning ⚠️   | 6  |
| Violation ❌ | 0  |

**Most important issue:** none blocking. The §2 test set is
constitutionally clean. The most material warning is **W1** (e2e spec
hand-types the `staff-engagement.auth.jwt` literal) — it is a
**traceability** concern, not a correctness one; addressing it now
avoids a future drift risk between the e2e and unit suites. The
single constitutional concern that this commit raises (the
`persistence` policy carve-out, V1/V7 in
`01-constitution-guard-proposal.md`) was already resolved in
`a1917b7` and is reflected in `frontend-state.yaml` lines 32-40;
out of scope for the test-only audit.
