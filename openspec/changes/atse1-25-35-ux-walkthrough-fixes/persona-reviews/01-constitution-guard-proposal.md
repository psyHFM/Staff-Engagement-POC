# Constitution Guard — Audit Report

**Subject:** `openspec/changes/atse1-25-35-ux-walkthrough-fixes/`
**Auditor:** constitution-guard persona
**Date:** 2026-06-25
**Scope:** `proposal.md`, `design.md`, `tasks.md`, `specs/*/spec.md`

---

## Resolution (committed in `a1917b7`)

All 5 blocking violations were addressed in the same commit that
landed this audit + the proposal:

| ID   | Violation                                              | Resolution |
|------|--------------------------------------------------------|------------|
| V1   | `frontend-state.yaml -> persistence` (in-memory only)  | Added explicit `carve_outs` entry for the auth token (localStorage key `staff-engagement.auth.jwt`); bumped YAML to v1.1.0. |
| V7   | `MISSION.md §6` out-of-scope: persistence              | Replaced clause with auth-token-only carve-out referencing the YAML; bumped to v1.2.0. |
| V2   | EmployeePicker `ngModel` (anti-pattern)                | Rewrote `task-subject-dropdown` spec to require signal input + output on the shared picker (no `[(ngModel)]`); updated tasks §6.1. |
| V3   | Adding `items` to `TaskSummary` record (binary break) | Created additive `TaskSummaryWithItems` wrapper + `TaskItemSummary`; added `TaskContract.taskWithItems(TaskId)` default method; `TaskSummary` is unchanged. |
| V4   | `InteractionContract` lacks cross-module RBAC entry    | Added additive `verifyEditable(InteractionId, EmployeeId, boolean)` default method on `InteractionContract`. |

Warnings (W1..W8) are tracked but not blocking; they will be revisited
in the per-task persona gates.

---

## Compliant ✅

- **tech-stack.yaml** — the change touches only Java 21 / Spring Boot / Angular 22 / PostgreSQL / Liquibase / Maven. No new dependency declared. No `package.json` or `pom.xml` edits in `tasks.md` (ROADMAP §2.5).
- **api-standards.yaml -> versioning.prefix** — every new endpoint uses `/api/v1` prefix:
  - `PATCH /api/v1/interactions/{id}` (tasks.md §4.5)
  - `POST /api/v1/tasks/{id}/items`, `PATCH /api/v1/tasks/{taskId}/items/{itemId}`, `DELETE /api/v1/tasks/{taskId}/items/{itemId}`, `PUT /api/v1/tasks/{taskId}/items/reorder` (tasks.md §8.5)
- **api-standards.yaml -> casing.urls** — all new paths use kebab-case nouns and lowercase verbs. No URL-case violations.
- **api-standards.yaml -> security.authorization** — RBAC stays `@PreAuthorize("hasAnyRole('USER','ADMIN')")` on the new task-item endpoints (tasks.md §8.5), matching the existing pattern; the `PATCH /api/v1/interactions/{id}` uses the same (tasks.md §4.5, D5).
- **api-standards.yaml -> error_handling.envelope_schema** — specs `interaction-row-edit` (line 62) and `task-management` (lines 31, 39, 60) explicitly require the uniform error envelope on failure responses.
- **api-standards.yaml -> responses.null_handling** — `task-subtasks` spec line 56–58 mandates "field MUST be omitted from JSON when empty" for `TaskSummary.items`. Matches "Exclude Nulls".
- **backend-architecture.yaml -> constraints** — D5/D7/R3 hold the `task` module from importing another module's `repository`/`domain`; `TaskItem` and `TaskItemRepository` both live inside `com.staffengagement.task.*` (tasks.md §8.1, §8.3). ArchUnit denylist already covers it.
- **backend-architecture.yaml -> internal_module_design** — all new task controllers route through `TaskService` (tasks.md §8.4, §8.6); no controller→repository shortcut.
- **backend-architecture.yaml -> modularization.communication** — D5, D7, and R3 explicitly forbid cross-module repository/domain imports for the new code; all inter-module reads use the existing `EmployeeContract` / `InteractionContract` ports (proposal Impact lines 128–130).
- **ROADMAP §2.3 (additive Liquibase)** — two new files only: `db/changelog/modules/task/002-add-task-title.yaml` (tasks.md §7.3) and `db/changelog/modules/task/003-create-task-item-table.yaml` (tasks.md §8.2). Changeset IDs follow the `task-NNN-…` convention already used by `task/001-create-task-table.yaml`.
- **ROADMAP §2.6 (frozen master.yaml)** — both new changelog files live under `db/changelog/modules/task/`. Verified: `db/changelog/master.yaml` is untouched (proposal §Impact line 130, tasks.md §7.3 and §8.2 explicitly note "master.yaml untouched").
- **ROADMAP §2.2 (frozen contracts)** — `shared/api/TaskSummary.java` line 16–22 currently has 6 fields (id, subject, title, sourceInteractionId, completed, description). Adding `items` (tasks.md §8.4) is additive only — no existing field removed/renamed. Aligns with ROADMAP §2.2 "additive changes only".
- **testing-strategy.yaml -> backend.style** — every new spec explicitly calls for BDD Given-When-Then: `TaskControllerSecurityTest`, `TaskServiceMappingTest`, `InteractionServiceTest.update*`, `InteractionControllerTest.update*`, `TaskItemController/Service` tests (tasks.md §4.8, §7.7, §7.8, §8.7).
- **testing-strategy.yaml -> e2e_acceptance** — task 2.5 adds `e2e/tests/auth-persistence.spec.ts` against the Docker Compose stack only; lives in the dedicated `e2e/` workspace outside `frontend/package.json` (testing-strategy.yaml line 16, ROADMAP §2.6).
- **testing-strategy.yaml -> coverage/mutation** — final verification at §11.2 (PITest ≥ 80%, JaCoCo ≥ 80%) and §11.3–§11.4 (Istanbul ≥ 80%, Stryker ≥ 80%) matches the constitution thresholds.
- **MISSION.md §6 (POC scope)** — work stays inside the five listed domain areas; no notifications/email/scheduling/mobile creep.
- **ROADMAP §2.6 / §3 (Phase 0 ownership)** — the auth-state persistence (§2) edits `frontend/src/app/shared/auth/auth-state.ts` only; no edits to `shell/`, `shared/` (HTTP client), `routes.ts`, `app.config.ts`, or `package.json`. Co-located in Phase 0-owned `shared/auth/` subfolder, consistent with prior Phase 0 baseline work.

---

## Warnings ⚠️

- **api-standards.yaml -> architecture.casing.json_keys — additive contract drift.** `TaskSummary.java` line 16–22 already exposes `title` as a record component, but it is currently "retained for backward compatibility with earlier consumers and carries the same value" as `description` (line 14 doc). After the change, `title` becomes semantically distinct (tasks.md §7.5). This is correct in direction (proposal §Impact line 85) but the change needs to be called out as a behaviour change to consumers, not just an additive field rename in JSON keys. The `task-management` spec does state "title field that is distinct from description" (line 64) so the *contract* is unambiguous; the risk is downstream consumers keyed on the current "title == description" assumption. **Remediation 🛠️:** before merging §7, run `git grep "TaskSummary"` across all modules and confirm no code reads `title` and `description` interchangeably; if any do, add a follow-up ticket.
- **api-standards.yaml -> data_retrieval.pagination — missing on new task-item list.** `TaskController.getForEmployee` and `getMyTasks` already return unwrapped `List<TaskSummary>` (no offset/limit). The new `TaskSummary.items` field carries a list of subtasks; the `task-subtasks` spec (lines 50–57) does not specify pagination on `items`. For a POC this is acceptable, but if a task ever exceeds 100+ subtasks it will fail the size budget. **Remediation 🛠️:** keep items capped to a reasonable count in the service (e.g., limit 500) or document the bounded assumption in the `task-subtasks` spec.
- **api-standards.yaml -> data_retrieval.sorting — `/reorder` custom action.** `PUT /api/v1/tasks/{taskId}/items/reorder` (tasks.md §8.5) uses a verb-style action outside the standard `sort=field,direction` query convention. This is justified (atomic reorder with explicit ordering input) but should be acknowledged. **Remediation 🛠️:** none — flagged for traceability.
- **frontend-state.yaml -> persistence (in-memory only).** The proposal explicitly extends persistence to `localStorage` (D1, R1). This is a deliberate **change of policy** for the auth slice only — design.md §57–58 already scopes non-goals to "Building a per-user preferences layer… the persistence layer in §2 is explicitly scoped to the auth token." `frontend-state.yaml` line 34 currently says "No state persistence across refreshes for the POC". **Remediation 🛠️:** add a coordination-points note to `frontend-state.yaml` (and `ROADMAP.md`) recording that auth-token persistence is the one carve-out. Currently captured only in the proposal; the constitution should be updated to match the new policy in the same PR cluster (tasks.md §1.4 already plans this for `ROADMAP.md`; add the YAML update).
- **ROADMAP §2.6 / Phase 6 ownership — `/profile` route placement.** tasks.md §3.5 adds `{ path: 'profile', loadComponent: …, canActivate: [authGuard] }` to `app.routes.ts`. `app.routes.ts` is listed as Phase 0–owned ("Append one line per feature"). The new `/profile` is an additive entry (not a splice append, but a new top-level route distinct from feature `loadChildren` lines). **Remediation 🛠️:** confirm the `/profile` route is additive (one new object in the `routes` array) and that no existing entry is mutated — based on the wording in tasks.md §3.5 this is the intent. Flagging because `routes.ts` is on the off-limits register.
- **ROADMAP §3 Phase 0 — auth-state scope creep.** Phase 0 already owns `frontend/.../app/shared/**` (ROADMAP §2.6). Adding `localStorage` persistence + 401-clears-storage in `bearerAuthInterceptor` (tasks.md §2.1, §2.3) is an additive change within the Phase 0 boundary — compliant — but the cross-cutting 401 handler affects every API call, which is the kind of coordination change that ROADMAP §2.5 ("dependencies locked") and §2.6 ("shared files") warn about. **Remediation 🛠️:** none — additive and within bounds — but the persona gate for §2 (tasks.md §2.6) must explicitly approve the interceptor change.
- **MISSION.md §3 (interaction.facilitator default).** `defaultFacilitator()` is being changed (tasks.md §5.2) to look up by email against the loaded employee list rather than the current behaviour. This is mission-aligned but the lookup must hit `EmployeeContract.findByEmail` (already added in Phase 1), not a fresh DB query — confirm during §5 implementation.
- **MISSION.md §6 (out-of-scope: persistence of frontend state across refreshes).** This is now contradicted by §2 of the proposal. Out-of-scope clauses are normally constitutional in nature; the proposal treats it as scope-widening rather than a constitution amendment. **Remediation 🛠️:** strike "Persistence of frontend state across refreshes" from MISSION.md §6, or replace with "Persistence of frontend state across refreshes (auth token only)" — same PR cluster, kept in sync with the YAML update above.

---

## Violations ❌

### V1 — frontend-state.yaml -> persistence (in-memory only) ❌

- **Standard:** `frontend-state.yaml -> persistence.policy`: "No state persistence across refreshes for the POC; state is reset on page load."
- **Violation:** `design.md` §D1 and `tasks.md` §2.1 instruct `AuthState` to persist the JWT to `localStorage` and re-hydrate on cold start; `specs/auth-session/spec.md` requires it. This is a direct contradiction of the constitution, not an additive behaviour under the same paragraph.
- **Remediation 🛠️:** either (a) amend `frontend-state.yaml` in the same PR cluster to add an explicit carve-out: "Persistence policy in-memory except for the authentication token, which persists to localStorage under `staff-engagement.auth.jwt` (per change `atse1-25-35-ux-walkthrough-fixes`); all other state remains in-memory", OR (b) reject the auth-session capability and use a different mechanism (e.g., httpOnly cookie) that does not require frontend persistence. Option (a) is the lower-risk path for a POC and aligns with the existing Phase 1 precedent (additive changes to the `EmployeeContract` are recorded as coordination PRs against the YAML).

### V2 — frontend-state.yaml -> async_integration + ROADMAP §2.4 (frontend signals) ❌

- **Standard:** `frontend-state.yaml -> primary_mechanism` ("Angular Signals … Service-Based State … Unidirectional Data Flow"); `ROADMAP §2.4` ("State: each feature owns its root State Service").
- **Violation:** tasks.md §6.1 specifies a new `EmployeePicker` component at `frontend/src/app/shared/forms/employee-picker/` with `[(ngModel)]` two-way binding and a `(change)` flow. The spec confirms this in `task-subject-dropdown` line 44–48 ("accept an `[(ngModel)]` (or signal input)"). `ngModel` + `change` is a **template-driven forms** pattern that bypasses Signals and contradicts the unidirectional flow mandated for global/shared state. The component will be reused by features that already operate through their own `*StateService` (task-create-form is one), which is the exact anti-pattern the constitution warns about.
- **Remediation 🛠️:** rewrite `EmployeePicker` as a standalone, signal-driven component: `value = input<number | null>()` + `valueChange = output<number | null>()`. The hosting feature (task-create-form) keeps `[(ngModel)]` if needed at its own layer, but the shared picker speaks Signals only. Update tasks.md §6.1 and the spec at lines 41–48 accordingly. Note: D4 line 130 also uses `[(ngModel)]` — same fix applies.

### V3 — backend-architecture.yaml -> modularization.communication (frozen contracts) ❌

- **Standard:** `ROADMAP §2.2` — "Changing a frozen contract = a coordination PR, not a splice edit. Contracts are versioned; additive changes only (new methods), breaking changes require a roadmap amendment." `backend-architecture.yaml -> constraints`: "Cross-module communication must occur only via Service interfaces."
- **Violation:** tasks.md §8.4 says: "expose `items` on `TaskSummary` (additive field on `shared/api/TaskSummary.java`)". `TaskSummary` is the read model returned by `TaskContract` and is consumed by the integration `ProfileService` (`backend-.../profile/**`, Phase 6). The change is *additive* in the strictest sense (new optional field, no rename/remove), so it is compliant with "additive changes only" — BUT `TaskSummary` is not a service interface; it is a DTO record (verified: `shared/api/TaskSummary.java` is a `record`). The constitution's frozen-contract list (`EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`, `SkillsContract`) names **interfaces** only. Adding a field to `TaskSummary` requires every implementer of `TaskContract` to construct it with the new field, which Java records enforce at the constructor — this is a binary-incompatible change to anyone compiling against `shared/api/`.
- **Remediation 🛠️:** either (a) add a second compact record `TaskSummaryWithItems(TaskSummary base, List<TaskItemSummary> items)` returned only by a new method on `TaskContract` (additive at the contract level, zero risk to existing consumers), OR (b) convert `TaskSummary` to a class with builder/optional `items` and document the binary break as a coordinated amendment in `ROADMAP.md` §11. Option (a) is the lower-risk additive path that the constitution already endorses for cross-module growth.

### V4 — ROADMAP §2.2 (frozen-contract additive only) ❌

- **Standard:** `ROADMAP §2.2` — additive changes only (new methods on the contract interface).
- **Violation:** tasks.md §4.5 adds `PATCH /api/v1/interactions/{id}` directly to `InteractionController` (the **implementer** of `InteractionContract`), and tasks.md §4.6 adds `update(id, type, note)` to `InteractionService`. **None of this is on the contract interface itself** (`shared/api/InteractionContract.java` has only `findBySubject`, verified). The new method is therefore not exposed to other modules (e.g., `task` cannot look up an interaction it has not been told about), and the spec for `task-management` Scenario line 51 ("task may link to a source interaction") cannot be satisfied by an interaction id alone — it must go through the service. This is fine for the in-module REST endpoint, but **the design is inconsistent**: D5 explicitly says "with the same RBAC as the create endpoint" but offers no path for other modules (e.g., the task module verifying an interaction's `facilitator` matches the current user) to do RBAC enforcement without reaching into the interaction impl.
- **Remediation 🛠️:** add an additive method to `InteractionContract` so cross-module callers can validate an interaction id without importing the interaction impl, e.g., `Optional<InteractionId> verifyEditable(InteractionId id, EmployeeId actor)` returning the id if the actor may edit it and `Optional.empty()` otherwise. This satisfies the constitution's "additive only" rule and removes the need for any future cross-module splice to break the boundary.

### V5 — ROADMAP §2.5 (locked `pom.xml`) ❌

- **Standard:** `ROADMAP §2.5` — "Splices must not add dependencies." `ROADMAP §2.6` — `backend/pom.xml` is "Locked — no splice edits".
- **Violation:** tasks.md §2.5 adds `e2e/tests/auth-persistence.spec.ts`. The Playwright E2E test lives in a separate `e2e/` workspace (testing-strategy.yaml line 16 explicitly says "outside frontend/package.json"), so `frontend/package.json` is not affected — compliant. **However**, no `pom.xml` is touched, but there is no explicit acknowledgement that no new dependencies are added for Playwright on the backend side either. The constitution explicitly allows Playwright as the E2E tool (testing-strategy.yaml line 18), so this is a process note rather than a violation. **Promoted from warning to violation** because: tasks.md §11.6 says `npx playwright test e2e/tests/` which implies the test runner is the existing `@playwright/test` install — confirm in implementation that the existing tool satisfies the smoke constraint; otherwise an `e2e/package.json` add may slip in. Flagging as a violation-class risk that must be cleared at the §11 persona gate.
- **Remediation 🛠️:** in tasks.md §11.6 explicitly cite the existing Playwright config (path) and confirm no new `package.json` is added. If the workspace already has Playwright, the task is free.

### V6 — ROADMAP §2.5 / `pom.xml` lock — `db/changelog` module prefixes ❌ (resolved in design, but worth surfacing)

- **Standard:** `ROADMAP §2.3` — "Changeset IDs are prefixed by module and zero-padded per module, e.g. `employee-001`, `employee-002`, `interaction-001`. No two modules share an ID prefix → no ID collisions."
- **Violation:** tasks.md §7.3 specifies changeset id `task-002-add-title` and tasks.md §8.2 specifies `003-create-task-item-table.yaml`. The **filename** is zero-padded to 3 digits, but the **changeset id inside** uses `task-002-add-title` (no zero-padding) and `task-003-…` would follow the same pattern. Existing `task/001-create-task-table.yaml` uses id `task-001` (zero-padded). **Inconsistency**: new changesets mix padded ids (`task-001`) with non-padded suffixed ids (`task-002-add-title`).
- **Remediation 🛠️:** align to the existing convention — use `task-002-add-task-title` and `task-003-create-task-item-table` (matches the actual filename) — or drop the suffix entirely. The constitution says "no two modules share an ID prefix", which is satisfied either way; the warning is for hygiene.

### V7 — MISSION.md §6 (out-of-scope: persistence) / frontend-state.yaml (in-memory) — coupled amendment ❌

- **Standard:** `MISSION.md §6` out-of-scope: "Persistence of frontend state across refreshes." `frontend-state.yaml -> persistence.policy`.
- **Violation:** Same root cause as V1; flagged separately because the constitution is in **two** places and both must be amended in lockstep. Currently neither is updated in the proposal.
- **Remediation 🛠️:** tasks.md §1.4 already plans a `ROADMAP.md` coordination-points entry; extend §1.4 to also include a `frontend-state.yaml` amendment and a `MISSION.md §6` amendment. Without this, the merged code contradicts the constitution by direct text.

---

## Frozen-contract claim verification

**Claim:** proposal does NOT touch frozen `shared/api/*Contract.java` interfaces and does NOT edit `db/changelog/master.yaml`.

**Verified ✅:**
- `shared/api/InteractionContract.java` (1 method: `findBySubject`) — proposal adds an endpoint to the controller, NOT a method to the contract interface. **Honest: no contract edit.**
- `shared/api/TaskContract.java` (2 methods) — proposal adds endpoints to the controller, does NOT add a method to `TaskContract`. **Honest: no contract edit.**
- `shared/api/EmployeeContract.java`, `PortfolioContract.java`, `SkillsContract.java` — untouched. **Honest.**
- `db/changelog/master.yaml` (3 lines, `includeAll: db/changelog/modules/`) — tasks.md §7.3 and §8.2 explicitly state "master.yaml untouched". **Honest.**

**Caveat ❌ (see V3):** the proposal adds a field to `shared/api/TaskSummary.java`. `TaskSummary` is a record returned by `TaskContract`; the proposal labels this "additive" but the change is **binary-incompatible** for any module compiling against the record. The claim "frozen contracts untouched" is technically true for the five `*Contract.java` interfaces but materially incomplete. Address via V3's remediation.

---

## Roadmap alignment

- This change belongs to a **post-Phase-6 follow-up cluster** (it depends on PRs #33 and #34 being merged, which closes Phase 6). The cluster also handles long-tail UX findings (auth persistence, form bugs, seed-data mismatches) and one cross-cutting schema addition (`title` on task).
- **Ownership conflict check:** the change touches:
  - `task/` module (§7, §8) — Phase 3 owner; safe to extend.
  - `interaction/` module (§4, §5) — Phase 2 owner; safe to extend.
  - `shared/api/` records (§8.4 via V3) — Phase 0 owner; **requires coordination PR**, see V3.
  - `shared/auth/`, `bearerAuthInterceptor` (§2) — Phase 0 owner; additive within own file, see §2 warning.
  - `shared/forms/employee-picker/` (new, §6) — Phase 0 `shared/` owner; new file within `shared/forms/` subfolder is consistent with the Phase 0 ownership pattern.
  - `frontend/src/app/features/employee/` (§3) — Phase 1 owner; deletion-only change is safe.
  - `frontend/src/app/features/portfolio/` (§9) — Phase 4 owner; safe.
  - `frontend/src/app/features/task/` (§8 frontend) — Phase 3 owner; safe.
- **No parallel-splice conflict** because no other in-flight splice exists on these modules (PRs #33 and #34 already merged; no open `feature/*` branch owns these files).

---

## Summary

| Severity | Count |
|----------|-------|
| Compliant ✅ | 18 |
| Warning ⚠️ | 8 |
| Violation ❌ | 7 |

**Blocking violations** that must be resolved before §1.5 persona gate can sign off: **V1, V2, V3, V4, V7**. **V5, V6** are resolvable during implementation without re-opening the proposal.

The proposal is structurally sound (right boundaries, additive Liquibase, correct auth/persistence direction for a POC) but several constitutional text-level updates and one signal-vs-ngModel decision must be made before code lands.
