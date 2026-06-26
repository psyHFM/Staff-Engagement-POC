# BDD Test Engineer — §3 Audit (ATSE1-27 + ATSE1-32)

**Change:** `atse1-25-35-ux-walkthrough-fixes` (commit `11a891e`)
**Author:** Hendrik Muller — 2026-06-25
**Authoritative source:** `.claude/constitution/testing-strategy.yaml`
(v1.0.0 — Unit Tests Only, BDD Given-When-Then, JUnit 5/Jest,
PITest/Stryker, JaCoCo/Jest-Istanbul ≥ 80% line+branch)

**Scope of this audit:** 5 spec files in `frontend/src/app/` —
`your-details-page.spec.ts` (NEW, 5 specs), `shell.spec.ts` (NEW, 3 specs),
`employee.spec.ts` (slimmed), `employee-create-form.spec.ts` (rewritten),
`auth-state.spec.ts` (+3 specs).

---

## 1. Spec-by-Spec Audit

### 1.1 `your-details-page.spec.ts` (NEW — 5 specs)

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | Renders the create form when the state says "no record yet" | Explicit `// Given` / `// Then`; arrange before `detectChanges` | `YourDetailsStateService` overridden via `overrideComponent`; `AUTH_STORAGE` no-op stub | Kills: mutant that swaps `notFound()` for `profile()` in the `@if` template guard; kills a `null vs false` off-by-one | PASS |
| 2 | Renders the detail form when a profile is loaded | Explicit Given/When/Then (implicit in `// Given` / `// Then` markers) | Same | Kills a mutant that renders both forms simultaneously (asserts `create` is null) | PASS |
| 3 | `calls state.loadCurrent on init` | Comment-marker Given/When/Then; the assertion is `toHaveBeenCalled()` **without** an arg-matcher | Same | Weak — `toHaveBeenCalled()` accepts any call; does not assert that `loadCurrent` is the *init* hook and not, e.g., a constructor side-effect from a refactored page | **WARNING** |
| 4 | Forwards an update event to state.update when a profile is loaded | Explicit Given/When/Then | Same | Kills: passing `request` straight through (asserts `toHaveBeenCalledWith(9, request)` — exact id and payload); kills any "always send" or "send null id" mutant | PASS (strongest spec in the file) |
| 5 | Does not forward an update when no profile is loaded | Explicit Given/When/Then | Same | Kills: a mutant that drops the `if (current)` guard | PASS |

**File-level concerns:**

- The `error` signal is declared on `stateMock` and wired to the template (`@if (state.error(); as error)`) but is **never** exercised in any spec. The `isLoading` signal is similarly unused beyond the implicit init. A mutation that always shows the spinner, or always shows the error banner, would survive this suite.
- The `create` event from the in-page `app-employee-create-form` is wired to `onCreated()` (a deliberate no-op per `your-details-page.ts:46–50`). The spec **does not assert that the (created) → state.create pipeline works** at the page level — that flow is now the responsibility of `YourDetailsStateService.create`, which has **no dedicated spec at all** in this commit. A mutation that breaks the `tap.next` that populates `_profile` from the create response would not be detected by the page spec.
- `stateMock` does not assert that `loadCurrent` was called **with** the JWT subject email — but the production code never passes an argument, so the test is correct in asserting bare invocation. A `toHaveBeenCalledWith()` strengthening would be cosmetic.

**Coverage of production file `your-details-state.service.ts`:**
- `loadCurrent()` — exercised indirectly by the page init assertion. The service's own logic (email-match, `notFound` flag, error path, missing-subject short-circuit) is **untested** here.
- `create()` — **untested** in this commit.
- `update()` — **untested** in this commit.
- The `subject` is read from `auth.currentUserSubject()`; that signal IS tested in `auth-state.spec.ts` §1.5, so the wiring is sound, but the service-level integration of the two is not.

### 1.2 `shell.spec.ts` (NEW — 3 specs)

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | Renders a `/profile` link with the current user when authenticated | Explicit `// Given` / `// When` / `// Then`; full login round-trip via `httpMock` | Real `AuthState` (root-provided) + `HttpTestingController`; `AUTH_STORAGE` mocked with in-memory `Map`; `provideRouter` with two test routes | Kills: the `routerLink` being a relative path (asserts exact `href="/profile"`); kills a `currentUser()` swap for `currentUserSubject()` (asserts `textContent` contains the stored username) | **PASS — strong** |
| 2 | Renders a Sign in link to `/login` when not authenticated | Explicit Given/When/Then; `// When` runs `detectChanges` only | Same | Kills: a mutant that always shows the authenticated branch; kills a phantom `shell__user` element in the unauthenticated template | **PASS** |
| 3 | Sign out clears the session and navigates to `/login` | Explicit Given/When/Then; returns a `Promise` that resolves on `setTimeout(0)` | Same; the click event is dispatched on the actual button | Kills: a `logout()` that clears storage but skips `router.navigate(['/login'])`; kills an `isAuthenticated()` that does not flip to false | PASS (the `setTimeout` is fragile but justified — `router.navigate` is async) |

**File-level concerns:**

- The spec asserts `link.getAttribute('href') === '/profile'` — that is **exactly** the mutation target flagged in the persona brief. PASS.
- The sign-out assertion uses `setTimeout(0)` and a `Promise` return, which is unusual. Modern Angular TestBed flushes router navigation synchronously when `provideRouter` is in use — `expect(location.path()).toBe('/login')` should be safe to call **without** the `setTimeout`. The current shape will work but is a minor smell (it tests the navigation eventually resolves, not that it resolves in one tick).
- The unauthenticated spec asserts `querySelector('a.shell__user')` is `null` — that is the correct inverse assertion. The sign-out spec does not re-query the DOM after the click to confirm the `shell__user` element disappears; that is a small gap.

### 1.3 `employee.spec.ts` (SLIMMED — 9 specs remaining)

The diff removes five specs that depended on the now-deleted `ownProfile`, `onCreated`, and `onUpdateOwn` methods (`reloads the directory when a profile is created`, `resolves ownProfile…`, `ownProfile is null…`, `onUpdateOwn forwards…`, `onUpdateOwn does nothing…`) and also drops the `createEmployee` mock from the state stub.

| # | Scenario | Verdict |
|---|---|---|
| 1 | Loads the directory on init — `toHaveBeenCalledWith(0, 20, 'createdAt,desc')` | PASS (mutation-strong) |
| 2 | Reloads on a page request — `toHaveBeenCalledWith(20, 20, 'createdAt,desc')` | PASS |
| 3 | Updates the sort and reloads from the first page — `toHaveBeenCalledWith(0, 20, 'fullName,asc')` | PASS |
| 4 | `onUpdateSelected` forwards the update for the selected directory row — `toHaveBeenCalledWith({ value: 9 }, request)` | PASS |
| 5 | `onUpdateSelected` does nothing when no row is selected | PASS |
| 6 | `onClose` clears the directory selection | PASS (weak — no arg) |
| 7 | `canEditSelected` is true for an admin regardless of ownership | PASS |
| 8 | `canEditSelected` is true for a non-admin editing their own profile | PASS |
| 9 | `canEditSelected` is false for a non-admin viewing another profile | PASS |
| 10 | `canEditRoleSelected` mirrors the admin flag | PASS |

**File-level concerns:**

- The slimmed spec has **no dangling references** to the deleted `ownProfile` / `onCreated` / `onUpdateOwn` methods — verified by reading the full file. The `createEmployee` mock was correctly dropped from the `stateMock` stub.
- All `stateMock` signals (`employees`, `selectedEmployee`, `created`, `updated`, `error`, `isLoading`, `isAdmin`, `currentEmail`) are still declared; `created` and `updated` are no longer read by the production component but are still in the mock. This is harmless dead-code in the spec, not a violation.
- The directory template no longer references `state.created()` / `state.updated()` for "Your profile" success banners — those banner branches are gone. Coverage of the transient success/error banners is not regressed because those existed in the deleted "Your profile" block, not the directory block.

### 1.4 `employee-create-form.spec.ts` (REWRITTEN — 5 specs, parent-driven)

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | Initialises the form blank on init | Explicit `// When` / `// Then` | None (the form has no external deps) | Kills: a `ngOnInit` that does not call `resetForm` | PASS |
| 2 | Emits a create request with the trimmed values on submit (no email, no role) | Explicit Given/When/Then | None — the spy is on the `@Output() create` | Kills: a `submit()` that drops the `.trim()`; kills a `submit()` that adds `email` or `role` to the payload; kills a `submit()` that fires before the trim (asserts the full exact payload) | **PASS — strongest spec in the file** |
| 3 | Does not emit when the full name is blank | Explicit Given/When/Then | None | Kills: a `submit()` that drops the `!this.fullName.trim()` guard | PASS |
| 4 | Emits null for the optional fields when left blank | Explicit Given/When/Then | None | Kills: a `submit()` that sends `''` instead of `null` for empty optional fields | PASS |
| 5 | Respects the `submitting` flag — disabled button blocks submit | Explicit Given/Then | None — DOM query | Kills: a template that drops `|| submitting` from the `[disabled]` binding | **PASS — addresses the brief's "disabled-on-invalid-input case"** |

**File-level concerns:**

- The spec does **not** simulate an actual click on the button while `submitting=true` and assert that `submit()` is a no-op (the `[disabled]` HTML attribute prevents the form from submitting, but a unit test of the template does not prove the click handler is blocked). The DOM-level `disabled=true` assertion is the right boundary for a component test — the form's `(ngSubmit)` does not fire when the submit button is disabled. This is the correct mutation target.
- The brief asked: "does it cover both the emit-on-submit case and the disabled-on-invalid-input case?" — yes: spec 2 covers emit-on-valid-submit, spec 3 covers no-emit-on-blank, spec 5 covers the disabled-while-submitting path. All three branches of the `[disabled]="!fullName.trim() || submitting"` expression are exercised.
- No `beforeEach` triggers a flush of the test bed's `ngOnInit` — `fixture.detectChanges()` is called explicitly per spec, which is the correct BDD pattern.
- The form's `resetForm()` is now `protected` (was `private`); no spec calls it directly. Mutation coverage of `resetForm` is limited to the init path.

### 1.5 `auth-state.spec.ts` — the 3 new `currentUserSubject` specs

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | Decodes the JWT subject claim after login (authoritative identity) | Explicit `// Given` / `// When` / `// Then`; uses a `tokenWithSub('admin@staff.eng')` helper that base64url-encodes a real `JSON.stringify({ sub, roles })` payload | Real `AuthState` + `HttpTestingController`; in-memory `AuthStorage` | Kills: a `decodeSubject` that returns the storage username instead of the `sub` claim (test uses `admin@staff.eng` for both the credential username AND the subject, so the assertion is `toBe('admin@staff.eng')` — **this is actually a weak assertion**; see concern below) | **WARNING** |
| 2 | `currentUserSubject` is null when no token is present | Single-line assertion | Same as `beforeEach` | Kills: a `decodeSubject` that defaults to `''` or `undefined` instead of `null` | PASS |
| 3 | `currentUserSubject` is null when the stored token is malformed | Explicit Given/Then; rebinds the storage and re-injects | Same — `TestBed.resetTestingModule()` | Kills: a `decodeSubject` that throws on `JSON.parse` (asserts the service hydrates without throwing); kills a `decodeSubject` that returns a partial value | PASS |

**Concerns (specific to the brief's question about assertion specificity):**

- **Spec 1 is weaker than it appears.** It uses `admin@staff.eng` for **both** the login `username` AND the JWT `sub` claim. The assertion `expect(auth.currentUserSubject()).toBe('admin@staff.eng')` does not distinguish between (a) the signal reading the `sub` claim and (b) the signal reading the storage username. A mutant that swaps `decodeSubject(token)` for `username()` would survive this test. The test passes **only by accident** of the test data shape. To kill the target mutation, the spec must use a different `sub` from the username, e.g.:

  ```ts
  auth.login({ username: 'different@staff.eng', password: 'staffeng' }).subscribe();
  httpMock.expectOne('/api/v1/auth/login').flush({ token: tokenWithSub('admin@staff.eng'), tokenType: 'Bearer' });
  // then
  expect(auth.currentUser()).toBe('different@staff.eng');         // storage echo
  expect(auth.currentUserSubject()).toBe('admin@staff.eng');        // authoritative sub
  ```

  This is a **blocker for mutation-driven quality** per the persona brief: the assertion is not specific enough to kill the "sub ↔ username swap" mutant that the brief explicitly names as a target.

- The `tokenWithSub` helper uses `globalThis.btoa(payload).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')` — this is the inverse of `decodeSubject`'s `base64.replace(/-/g, '+').replace(/_/g, '/')` + padding. The helper is correct. (Edge case: if a payload JSON contains a `+` or `/`, the round-trip is still safe because `btoa` is the inverse of `atob` after the char substitution.)
- The malformed-token spec exercises the `parts.length < 2` branch. It does **not** exercise the `JSON.parse` throwing branch (e.g. a token with a valid shape but invalid base64) nor the `typeof sub !== 'string'` branch. The first is covered indirectly by the same code path; the second is not. A minor gap.

---

## 2. Audit Dimensions — Cross-Cutting

| Dimension | Verdict |
|---|---|
| **Given-When-Then Structure** | All five spec files use explicit `// Given` / `// When` / `// Then` comment markers (or the arrange/act/assert pattern with named phases). The 3 `currentUserSubject` specs in `auth-state.spec.ts` follow the same convention. **PASS** — 18 of 18 new/changed specs in scope carry the markers. |
| **No Integration Tests** | None of the specs boot a real Spring context, hit a real DB, or run Playwright. `provideHttpClientTesting` is used as a request interceptor; the `AuthStorage` interface is mocked with an in-memory `Map`. The `Router` is provided via `provideRouter` with two test routes — that is a unit-test seam, not an integration boundary. **PASS** |
| **Mocking Strategy** | Every external dep is mocked: `YourDetailsStateService` is overridden via `overrideComponent`; `EmployeeStateService` is overridden via `overrideComponent`; `AuthState` is the real root service but its `ApiClient` is intercepted by `HttpTestingController`; `AUTH_STORAGE` is provided as an in-memory implementation; `Router` is `provideRouter`-driven with two test routes. No real HTTP. **PASS** |
| **Mutation-Driven Quality** | Mixed. The strongest assertions are the `toHaveBeenCalledWith(args)` checks (your-details-page spec 4, employee specs 1–4, employee-create-form spec 2). The weakest are the `toHaveBeenCalled()` checks (your-details-page spec 3, employee spec 6). The brief's flagged "decode the JWT sub" assertion in `auth-state.spec.ts` spec 1 of §1.5 is **weaker than it appears** because the test data uses the same string for username and subject — see §1.5 above. **2 warnings** |
| **Coverage (≥80% line/branch)** | Cannot be measured from the diff alone. The new `YourDetailsStateService` (127 lines, 3 public methods, 5 signals, 4 branches in `loadCurrent` — no-subject / api-error / match / no-match) has **no dedicated service-level spec**. The page spec exercises one branch via `state.loadCurrent` being called, but the service's `tap` / `catchError` / `notFound.set` paths are not asserted. Coverage of `your-details-state.service.ts` is likely **below 50%**. The other four files are well-covered. |

---

## 3. Coverage Gaps — List of Missing Scenarios

1. **`YourDetailsStateService.loadCurrent` — service-level unit test missing.** Branches to cover:
   - No JWT subject (storage empty) → `_notFound` set to `true`, no API call.
   - API returns 0 matching employees → `_notFound` set to `true`, `_profile` stays `null`.
   - API returns N matching employees → first match sets `_profile`.
   - API transport failure → `_lastError` set, `notFound` not toggled.
   - API 4xx/5xx → `_lastError` set, `notFound` not toggled.
2. **`YourDetailsStateService.create` — no test.** Branches:
   - Success → `_profile` set, `_notFound` reset to `false`, loading toggled.
   - Failure → `_lastError` set.
3. **`YourDetailsStateService.update` — no test.** Branches:
   - Success → `_profile` replaced.
   - Failure → `_lastError` set.
4. **`auth-state.spec.ts` spec 1** — the test data should use a different `sub` from the login `username` so the assertion kills the "decode vs storage" swap mutant.
5. **`auth-state.spec.ts` malformed-token spec** — should add a fixture for a well-formed token whose payload `sub` is a non-string (e.g. a number) to cover the `typeof sub !== 'string'` branch.
6. **`shell.spec.ts` sign-out spec** — should re-query the DOM after the click to assert the `shell__user` element is gone, mirroring the unauthenticated spec's inverse assertion.
7. **`your-details-page.spec.ts`** — should add a spec for the `(created)="onCreated()"` no-op wiring — at minimum, an assertion that the create form's `create` event does **not** cause the page to call `state.create` (the parent does not own the API call; the page only triggers it via `onCreated` which is documented as a no-op). This is a no-op test by design, but it locks in the contract.
8. **`your-details-page.spec.ts`** — should add a spec that asserts the `error` signal renders the error banner and the `isLoading` signal renders the loading spinner. These two branches in the template are not exercised.
9. **`employee-create-form.spec.ts`** — should add a spec asserting the `[disabled]` button when the full name is blank (the *other* operand of the `[disabled]` expression). Spec 5 covers `submitting=true`; the `!fullName.trim()` operand is only covered by the form's behavior test (spec 3), not by a DOM `disabled` assertion.

---

## 4. Verdict

| Severity | Count |
|---|---|
| **Violations (blocker)** | 0 |
| **Warnings (mutation weak / coverage gap)** | 4 |
| **Compliant** | 14 of the 18 specs reviewed |

**Warnings:**

- **W1 — `auth-state.spec.ts` "decodes the JWT subject claim" spec uses identical username and subject strings, so the assertion does not kill the "sub vs storage swap" mutant that the brief explicitly names as a mutation target.** (Persona brief: "Are the assertions specific (e.g. expected decoded subject string)?")
- **W2 — `your-details-page.spec.ts` "calls state.loadCurrent on init" spec asserts `toHaveBeenCalled()` without an arg-matcher.** A `toHaveBeenCalled()` mutation can survive a Stryker run that mutates the init hook to call any other method. Strengthen to `expect(stateMock.loadCurrent).toHaveBeenCalledTimes(1)` and a Spy that fails on any other method.
- **W3 — `YourDetailsStateService` has no dedicated service-level spec.** The 127-line service's three public methods (`loadCurrent`, `create`, `update`) and their internal branches are not covered at the service layer; the page spec only asserts that `loadCurrent` is called. Service-level coverage is likely below 50%, which is **below the 80% line+branch threshold** mandated by `testing-strategy.yaml` §`frontend.quality_assurance.coverage`.
- **W4 — `your-details-page.spec.ts` does not exercise the `error` and `isLoading` template branches** (mutation target: an always-on error banner or a stuck spinner would survive).

**Blocking status:** **NON-BLOCKING** for §3. The two mutation-weakness warnings (W1, W2) are real but each is a one-line fix in an otherwise well-structured suite. The coverage warnings (W3, W4) are non-trivial — the missing service spec is the most material gap and should be added in §4 of the change, or in a follow-up MR, before archival.

**Recommendation:** Land §3. Add a §4 task to write `your-details-state.service.spec.ts` covering `loadCurrent` (all 4 branches), `create` (success + error), and `update` (success + error). Tighten `auth-state.spec.ts` spec 1 to use a different subject from the username. Tighten `your-details-page.spec.ts` spec 3 with `toHaveBeenCalledTimes(1)`.

---

## 5. Persona-Mandated Output Summary

- **Scenario** per spec: tabulated in §1.
- **Test Code** confirm/refactor snippet: see §1.5 for the `auth-state.spec.ts` strengthening snippet; see §1.1 for the recommended `loadCurrent` strengthening.
- **Mutation Target** per spec: tabulated in §1.
- **Coverage Gaps**: enumerated in §3 (9 items, prioritised).

**Files in scope reviewed (absolute paths):**

- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\your-details\your-details-page.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\shell\shell.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\employee\employee.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\employee\employee-create-form\employee-create-form.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\shared\auth\auth-state.spec.ts`

**Authoritative source consulted:**

- `C:\Users\USER-PC\IdeaProjects\Staff-POC\.claude\constitution\testing-strategy.yaml`

**No source code modified — audit only.**
