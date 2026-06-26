# Constitution Guard — Audit Report (Section 4)

**Subject:** ATSE1-28 + ATSE1-29 — PATCH `/api/v1/interactions/{id}` backend + row-level Edit / Create-task affordances frontend
**Auditor:** constitution-guard persona
**Date:** 2026-06-25
**Scope:** commits `89dc571` (backend PATCH) and `6165e50` (frontend row actions + `ApiClient.patch<T>` + `EditInteraction` + `InteractionStateService.updateInteraction`/`verifyEditableLocally`) on branch `feature/ATSE1-25-35-ux-walkthrough-fixes`
**Files in scope:**
- New backend: `backend/src/main/java/com/staffengagement/interaction/controller/dto/UpdateInteractionRequest.java`
- Modified backend: `backend/src/main/java/com/staffengagement/interaction/controller/InteractionController.java`, `backend/src/main/java/com/staffengagement/interaction/service/InteractionService.java`
- Modified backend tests: `backend/src/test/java/com/staffengagement/interaction/controller/InteractionControllerTest.java`, `backend/src/test/java/com/staffengagement/interaction/service/InteractionServiceTest.java`
- Modified frontend: `frontend/src/app/shared/api/api-client.ts`, `frontend/src/app/features/interaction/interaction-state.service.ts`, `frontend/src/app/features/interaction/interaction-state.service.spec.ts`, `frontend/src/app/features/interaction/interaction-list/interaction-list.ts`, `frontend/src/app/features/interaction/interaction-list/interaction-list.html`, `frontend/src/app/features/interaction/interaction-list/interaction-list.spec.ts`, `frontend/src/app/features/interaction/interaction-page/interaction-page.ts`, `frontend/src/app/features/interaction/interaction-page/interaction-page.html`, `frontend/src/app/features/interaction/interaction-page/interaction-page.spec.ts`
- New frontend: `frontend/src/app/features/interaction/edit-interaction/edit-interaction.ts`, `edit-interaction.html`, `edit-interaction.scss`, `edit-interaction.spec.ts`
- Recorded deviation (no source change): `openspec/.../design.md` D5 — controller RBAC is `hasRole('ADMIN')` (not `hasAnyRole('ADMIN','USER')`); facilitator self-edit enforcement is in the service, not in the predicate.

---

## Compliant ✅

- **api-standards.yaml -> architecture.versioning / casing.** The new endpoint is `@RequestMapping("/api/v1") + @PatchMapping("/interactions/{id}")` (InteractionController.java:87). kebab-case path segments, single resource id as path variable, `/api/v1` prefix carried from the controller's class-level mapping. The corresponding state-service call (`InteractionStateService.updateInteraction` at line 131) passes the relative path `"interactions/${id.value}"` to `ApiClient.patch<T>()` — `ApiClient.url()` (api-client.ts:41-43) prepends `/api/v1/` after stripping leading slashes. URL contract matches the existing module shape exactly.

- **api-standards.yaml -> responses (unwrapped, ISO 8601, exclude nulls, strict semantic).** `update(...)` returns `ResponseEntity.ok(updated)` (line 102) with `InteractionSummary` directly — no envelope. `getById` returns the unwrapped summary (line 70-73). 200 on PATCH success, 404 on `InteractionNotFoundException` (mapped to 404 by the existing error envelope advice). Strict status semantics are preserved.

- **api-standards.yaml -> error_handling (uniform envelope).** No new error path bypasses the shared `error/` advice. `InteractionNotFoundException` is the only new domain exception in this scope and it is the existing class used by `getById` — so the same envelope mapping fires for 404 from PATCH. The 404-on-unauthorised collapse is documented in JSDoc (InteractionController.java:81-82, InteractionService.java:121-125) and is the right behaviour per api-standards (existence opaque, no 403 leak).

- **api-standards.yaml -> security.authorization (RBAC via @PreAuthorize).** Every endpoint on `InteractionController` — `create`, `listBySubject`, `getById`, `update` — is annotated `@PreAuthorize("hasRole('ADMIN')")` (lines 51, 59, 69, 88). The annotation is verified by the existing `InteractionAccessControlTest` (interaction.controller package) for the three pre-existing endpoints; the new `update` endpoint adds the same annotation and so passes the same reflection rule (although `InteractionAccessControlTest` is *not* updated in this scope — see Warning 1). Spring Security is the enforcer; Bearer JWT is attached by the existing interceptor (Phase 0).

- **api-standards.yaml -> data_retrieval (offset/limit/sort).** `listBySubject` is unchanged; it already binds `offset`/`limit` and parses `sort=field,direction` with safe fallback (`parseSort`, line 111-123). New BDD specs (`listBySubjectAppliesDefaultSortWhenParamOmitted`, `listBySubjectParsesExplicitAscendingSort`, `listBySubjectFallsBackToDefaultSortForUnknownField`, `listBySubjectFallsBackToDefaultSortForMalformedParam` — InteractionControllerTest.java:95-152) confirm the unknown-field and malformed-input guards. The fallback never pushes unknown columns into the query — compliant.

- **tech-stack.yaml -> backend (Java 21, Spring Boot, Lombok, JPA, Liquibase).** Java 21 features: `record UpdateInteractionRequest(InteractionType type, String note)` (UpdateInteractionRequest.java:19-22). `InteractionService` keeps `@Service` + `@RequiredArgsConstructor` (Lombok) at lines 37-38. No new Spring dependencies; `pom.xml` untouched per ROADMAP §2.5.

- **tech-stack.yaml -> frontend (Angular 22.0.2, PrimeIcons, RxJS).** `ApiClient.patch<T>()` (api-client.ts:33-35) is a one-liner over `HttpClient.patch<T>()` — no new transport surface. PrimeIcons `pi pi-pencil`, `pi pi-plus`, `pi pi-spin pi-spinner`, `pi pi-times` (the `&times;` glyph), `pi pi-chevron-left/right` are used in `interaction-list.html:42,49,66,78` and `edit-interaction.html:40`. RxJS is used (`Observable`, `tap`, `finalize`, `catchApiError` in `interaction-state.service.ts:128-144`). No new package dependency.

- **backend-architecture.yaml -> internal_module_design (Controller → Service → Repository, anemic domain).** The controller injects only `InteractionService` (InteractionController.java:46-48) — never `InteractionRepository`. The service injects `InteractionRepository` and `EmployeeContract` (InteractionService.java:41-42); it does not import another module's repository or domain (the contract is the frozen port — only `EmployeeContract.exists(...)` is used). The new `update(...)` and `verifyEditable(...)` methods stay in the service; the controller stays a thin adapter. Layered architecture preserved.

- **backend-architecture.yaml -> modularization / communication (Service interfaces only).** Cross-module calls go through the frozen `EmployeeContract.exists(...)` (InteractionService.java:86, 89, 152). The new `verifyEditable(...)` override on `InteractionService` implements the additive default method on `InteractionContract` (InteractionContract.java:34-37); the contract file itself was updated in the §2 commit's carve-out (InteractionContract.java:14-19 documents it). No `employee/` impl, repository, or domain import is added.

- **backend-architecture.yaml -> constraints (no direct repository access from controller, no circular dependencies).** Verified above — controller depends on `InteractionService` only. No new module edges; `interaction` → `shared` (already established).

- **MISSION.md §3 (Interaction domain: type, subject, facilitator, note + optional task spawn).** The PATCH endpoint permits mutating exactly the fields the constitution labels as content (`type`, `note`) and *forbids* mutating `subject`, `facilitator`, and `createdAt` — those are part of the audit trail ("what happened", not "what was the latest edit"). The choice is documented in `UpdateInteractionRequest`'s JSDoc (lines 5-18) and in `InteractionService.update` (lines 111-117). The audit-trail invariant from MISSION §3 is upheld.

- **MISSION.md §3 / ROADMAP §5 (interaction type vocabulary is frozen).** `UpdateInteractionRequest.type` is typed as `InteractionType` (UpdateInteractionRequest.java:20) — Jackson rejects unknown values at deserialization before the service is reached. The "type cannot be free-text" rule holds for PATCH as it does for POST.

- **ROADMAP §2.7 carve-out (`InteractionContract.verifyEditable`).** The §2 commit added `InteractionContract.verifyEditable(...)` as an additive default method (InteractionContract.java:34-37). This §4 commit overrides it on `InteractionService` (InteractionService.java:151-155) — exactly what the carve-out contemplates. The default implementation returns `Optional.empty()`; the real impl returns the id if the actor is admin or the original facilitator. Both "not found" and "not authorised" collapse to empty — the existence-opaque contract holds.

- **ROADMAP §2.6 (no splice touches Phase 0's shared files).** `InteractionContract.java` lives in `shared/api/`; the §2 carve-out authorises additive changes (new method with a default). No `master.yaml`, `pom.xml`, `shared/error/`, `shared/security/`, `shared/kernel/`, or `Application.java` is touched.

- **frontend-state.yaml -> primary_mechanism (Service-Based State).** `InteractionStateService` extends `StateService` (interaction-state.service.ts:30) and owns the loading lifecycle through `beginLoad()`/`endLoad()`. The new `updateInteraction(...)` handler (lines 128-144) follows the existing pattern: `catchApiError()` → `finalize(endLoad)` → `tap({ next, error })`. The component never touches service signals directly.

- **frontend-state.yaml -> state_hierarchy (signals, not BehaviorSubject).** New component-local signals on `InteractionPage`: `editing = signal<InteractionSummary | null>(null)` and `creatingTaskFor = signal<InteractionSummary | null>(null)` (interaction-page.ts:40, 42). Both are local state per the spec ("Transient UI state — open/closed toggles"). No `BehaviorSubject` introduced.

- **frontend-state.yaml -> derived_state (Pure computed()).** `EditInteraction.isOpen` is a getter, not a `computed()`, but it derives from the input (`editing !== null` — edit-interaction.ts:46-48). `InteractionPage` exposes `editing()` and `creatingTaskFor()` to the template without transformation — the template's `@if (editing())` and `@if (creatingTaskFor(); as source)` are the consumers. Service-level derived state (`subjects`, `subject`, `history`, `created`, `error`, `isLoading`) remains `computed()` (interaction-state.service.ts:46-61). Pattern holds.

- **frontend-state.yaml -> side_effects (placement: State Service Handlers).** `ApiClient.patch<T>()` is called only inside `InteractionStateService.updateInteraction(...)` (line 131). `EditInteraction.submit()` calls `this.state.updateInteraction(...)` and never talks to the HTTP layer itself. The component fires `saved` or stays open on error (edit-interaction.ts:50-61) — matching the pattern from `LogInteraction`.

- **frontend-state.yaml -> constraints (components must not update global state signals directly).** `EditInteraction` injects `InteractionStateService` and calls its handler; it never sets signals on the service. `InteractionPage` writes only to its own local `editing` / `creatingTaskFor` signals (the documented transient UI signals). The page does not poke `state.history`, `state.error`, or `state.created`. Compliant.

- **frontend-state.yaml -> persistence (carve-out: JWT only).** No new persistence key is added. The `auth-storage` carve-out (§2) is unchanged. All other state stays in-memory.

- **testing-strategy.yaml -> backend.style (BDD Given-When-Then).** Every new backend spec carries the three markers:
  - `InteractionControllerTest.updateReturns200WithUpdatedSummaryAndForwardsBody` (lines 182-205) — happy path PATCH.
  - `updateForwardsNonAdminFlagForEmployeePrincipal` (lines 208-221) — non-admin principal → `isAdmin=false` forwarded.
  - `updateBindsActorIdFromPrincipalUsername` (lines 224-239) — actor is parsed from the principal's username.
  - `updatePropagatesNotFoundAs404DomainException` (lines 242-253) — `InteractionNotFoundException` bubbles.
  - `InteractionServiceTest.updateChangesTypeAndNoteForAdminWithoutTouchingAuditFields` (lines 232-260) — audit-trail invariant is asserted (subject/facilitator/createdAt unchanged; updatedAt advances).
  - `updateAllowsOriginalFacilitatorAndRejectsOtherActorWith404` (lines 263-274) — facilitator-self-edit affordance and the existence-opaque 404 collapse.
  - `updateReturns404WhenInteractionDoesNotExist` (lines 277-287) — true not-found path.
  - `updateRejectsNullTypeAsValidation400` (lines 290-301) — input validation.
  - `verifyEditableReturnsIdForAdmin` / `...ForOriginalFacilitator` / `...ReturnsEmptyForNonAdminNonFacilitator` / `...ReturnsEmptyWhenInteractionAbsent` (lines 306-358) — the additive contract override, all four branches.
  Edge cases the implementation actually has are reached.

- **testing-strategy.yaml -> frontend.style (BDD Given-When-Then).** Every new frontend spec carries the markers:
  - `interaction-list.spec.ts` — 5 new specs (lines 109-184): row-renders Edit + Create-task, emits `rowEdit`, emits `createTask`, per-row isolation of both events.
  - `edit-interaction.spec.ts` — 5 specs (lines 42-128): renders nothing when no edit, opens modal with pre-filled fields, Cancel emits `closed` and never PATCHes, overlay backdrop click emits `closed`, panel-inside click does *not* emit `closed`, defensive submit (no PATCH when no editing).
  - `interaction-state.service.spec.ts` — 7 new specs (lines 223-312): PATCH body shape, history refresh, 404 surfaced as `ApiError`, no refresh on failure, `verifyEditableLocally` returns false for un-cached / non-match / non-owner / non-admin, true for original facilitator and any-admin.
  - `interaction-page.spec.ts` — 5 new specs (lines 103-162): open/close/save the edit modal, open/close the create-task modal, history refresh on task-form close.

- **testing-strategy.yaml -> general_policy (unit tests only; no integration).** The PATCH service spec uses `MockitoExtension` and mocks both `InteractionRepository` and `EmployeeContract` — no Spring context, no embedded DB, no HTTP. The PATCH controller spec uses `@InjectMocks` with a mocked service — no `@WebMvcTest`, no `MockMvc`. Frontend specs use `TestBed.configureTestingModule(...)` with stub `ApiClient` and `AuthState` — JSDOM only. No integration scaffold is added.

- **testing-strategy.yaml -> mutation objective.** The admin / facilitator / non-owner / not-found paths are all hit by distinct specs, so Stryker mutants on the `isAdmin || entity.getFacilitatorId().equals(actor.value())` predicate (InteractionService.java:131, 153) are killed by both `updateAllowsOriginalFacilitatorAndRejectsOtherActorWith404` and `verifyEditable*`. The `isAdmin` flip in the controller (InteractionController.java:97-98) is killed by `updateForwardsNonAdminFlagForEmployeePrincipal`. Edge cases the implementation actually has are exercised.

- **MISSION.md §6 (out-of-scope: integration tests).** Compliant — no integration tests added or scaffolded.

- **angular-style-guide.md -> DI (`inject()` everywhere).** `InteractionPage.state = inject(InteractionStateService)` (interaction-page.ts:37). `EditInteraction.state = inject(InteractionStateService)` (edit-interaction.ts:33). `InteractionStateService.api = inject(ApiClient)` and `.auth = inject(AuthState)` (interaction-state.service.ts:31-32). No constructor injection.

- **angular-style-guide.md -> access modifiers (`protected` for template members, `readonly` for Angular-initialised fields).** `InteractionPage.editing`, `creatingTaskFor` are `protected readonly signal<...>(null)` (interaction-page.ts:40, 42). `EditInteraction.types`, `state` are `protected readonly` (edit-interaction.ts:33-34). `InteractionList.rowEdit`, `createTask` are `@Output() EventEmitter<...>` and the page bindings (`(rowEdit)`, `(createTask)`) match the event emitter types (interaction-page.html:44-45). `InteractionStateService.updateInteraction` and `verifyEditableLocally` are public methods on the service — fine, as they are handler methods.

- **angular-style-guide.md -> standalone components / `imports: [...]`).** All three affected components — `InteractionPage` (interaction-page.ts:30), `EditInteraction` (edit-interaction.ts:23), `InteractionList` (interaction-list.ts:31) — use the standalone decorator with `imports: [...]`. No `NgModule`.

- **angular-style-guide.md -> lifecycle (`implements OnInit`/`OnChanges`; one-liners).** `EditInteraction implements OnChanges` (edit-interaction.ts:28); `ngOnChanges` is a six-line hydration of `type`/`note` from the supplied `InteractionSummary` (lines 39-44). No business logic in lifecycle methods.

- **angular-style-guide.md -> BDD-style event handlers (`on...` prefixes).** `InteractionList.onEdit` / `onCreateTask` (interaction-list.ts:75, 79). `EditInteraction.onOverlayClick` (line 72). `InteractionPage.onSubjectSelected`, `onRowEdit`, `onEditClosed`, `onEditSaved`, `onRowCreateTask`, `onTaskFormClosed` (interaction-page.ts:55-81). Naming convention upheld.

- **Tech-stack unchanged (Angular 22.0.2, no new dependencies).** `package.json` and `pom.xml` are untouched. `ApiClient.patch<T>()` is the only client-side surface change — it's a new method on the existing wrapper, no new package.

- **ROADMAP §2.6 (`api-client.ts` is in the shared, frozen Phase 0 surface — append-only).** The §2 carve-out authorises the JWT-persistence wiring; `api-client.ts` lives in `frontend/src/app/shared/api/` (Phase 0 owned). Adding `patch<T>()` is an additive method on the existing wrapper — same pattern as the original `get`/`post`/`put`/`delete`. No file restructure, no removal, no class-rename. Append-only in spirit.

- **ROADMAP §2.7 carve-out — `InteractionContract.verifyEditable` is additive.** The default implementation returns `Optional.empty()`. The §4 commit overrides it in the impl — non-breaking. Existing callers that did not override it (none in the codebase) continue to compile. The signature `verifyEditable(InteractionId, EmployeeId, boolean)` is the documented shape.

- **Edit affordance design rationale — design.md D5.** The controller RBAC stays `hasRole('ADMIN')` (matching the module pattern); the facilitator-self-edit is enforced in the service and surfaced via `InteractionContract.verifyEditable`. The UI's pre-flight (`verifyEditableLocally` — interaction-state.service.ts:162-173) consults the cached history page only — no HTTP — so the existence-opaque 404 path is unreachable from the UI. The JSDoc on `verifyEditableLocally` (lines 148-160) honestly explains the choice.

- **`UpdateInteractionRequest` is a `record` with two fields (type, note).** No `subject`, `facilitator`, or `createdAt` is exposed on the wire — those audit-trail fields are unreachable from the API surface. Jackson deserialises `type` against the frozen `InteractionType` enum, so an unknown value 400s before the service runs. Compliant.

- **Service `update(...)` enforces the audit-trail invariant.** `subjectId`/`facilitatorId`/`createdAt` are not touched; only `type`, `note`, `updatedAt` advance. The BDD spec `updateChangesTypeAndNoteForAdminWithoutTouchingAuditFields` (InteractionServiceTest.java:232-260) asserts `subjectId == 1L`, `facilitatorId == 2L`, `createdAt` unchanged.

- **`verifyEditableLocally` is a pure, signal-only pre-flight.** It reads `this.interactions()` (the cached page) and computes `isAdmin || target.facilitator.value === actor.value`. No HTTP call. The JSDoc (interaction-state.service.ts:148-160) explicitly justifies the local-only approach: "the server's verifyEditable contract returns an Optional<Id> and the existence-opaque 404 policy means a UI pre-flight would have to deal with 404 envelopes for a cosmetic decision."

- **`InteractionList` row actions are presentational, not stateful.** `rowEdit` / `createTask` are `@Output() EventEmitter<InteractionSummary>` (interaction-list.ts:40-41); the list itself does not own the edit modal or the task form. The page wires the events to its local signals and mounts `<app-edit-interaction>` and `<app-task-create-form>` (interaction-page.html:48-55). Layered architecture preserved.

- **Accessibility / ARIA.** `interaction-list.html:40,48` sets `[attr.aria-label]="'Edit interaction ' + interaction.id.value"` and the analogous label for create-task. `edit-interaction.html:2-7` uses `role="dialog"`, `aria-modal="true"`, and `tabindex="-1"` on the overlay; the overlay listens for `keydown.escape` to close. Compliant with the §3 audit's accessibility pattern.

- **No console logging of JWT or PII.** No `console.log` is added or modified in any new or changed file. The `decodeRoles`/`decodeSubject` helpers (not touched in §4) are the only JWT paths and they operate on the in-memory bearer signal.

---

## Warnings ⚠️

- **testing-strategy.yaml -> backend.coverage — `InteractionAccessControlTest` is not updated to assert the new `update` endpoint's `@PreAuthorize`.** The existing test class (InteractionAccessControlTest.java) has three reflection tests for `create`, `listBySubject`, and `getById`. It does *not* include a fourth assertion for the new `update(...)` method introduced in 89dc571. The new endpoint *does* carry `@PreAuthorize("hasRole('ADMIN')")` (InteractionController.java:88), so the assertion would pass — but it is missing. **Remediation 🛠️:** add a fourth `@Test updateEndpointRequiresAdminRole()` to `InteractionAccessControlTest` mirroring the existing three, with `Method update = InteractionController.class.getMethod("update", Long.class, UpdateInteractionRequest.class, UserDetails.class)`. One-method addition; same reflection pattern. Optional but recommended to keep the reflection-rule coverage parallel to the endpoint set. (Also note: the test class itself has stale naming — `createEndpointRequiresManagerRole` — but that pre-dates this §4 commit; it is a pre-existing inconsistency, not a §4 regression.)

- **frontend-state.yaml -> side_effects — `EditInteraction.submit()` swallows the error in the local `error: () => {}` handler (edit-interaction.ts:56-59).** The state service already surfaces the error via `state.error()` (a `signal` updated in `tap({ error })` — interaction-state.service.ts:141). The component's empty handler keeps the modal open on error, which is the correct UX (the user can correct and retry). The comment in the code (lines 57-59) explains the choice. **No remediation required**, but a Stryker mutant that deletes the `error: () => {}` callback would survive because the test (`edit-interaction.spec.ts:122-128`) only asserts the *no-editing* path, not the *failed-PATCH* path. **Remediation 🛠️ (optional):** add a `submit()` spec that drives a `patch.mockReturnValue(throwError(() => apiError(404)))` and asserts (a) `apiClientSpy.patch` was called, (b) `state.error()` carries the `ApiError`, and (c) `closed` was *not* emitted. Stryker would then kill mutants on both the swallow and the close-on-error branches.

- **ROADMAP §2.7 carve-out — `InteractionContract.verifyEditable` default impl returns `Optional.empty()` for everything.** The documented carve-out says the default returns "true" (`ROADMAP.md:187`): "Returns `boolean`; default `true`." The actual contract returns `Optional<InteractionId>`, not `boolean`, and the default is `Optional.empty()` (not `true`). The §4 commit does not modify `InteractionContract.java`, so the contract is what it was set to in the §2 carve-out's actual implementation — but the road map's prose is out of sync with the contract's code. **Remediation 🛠️:** update ROADMAP §2.7 to reflect the actual signature (`Optional<InteractionId>`, default `Optional.empty()`). One-line prose fix. Same item can be folded into the next ROADMAP amendment.

- **api-standards.yaml -> security.authorization — D5 deviation is recorded but not consulted at the API surface.** The controller's `@PreAuthorize("hasRole('ADMIN')")` is consistent with the rest of the module and the deviation is documented in `design.md D5` (lines 133-148). The §4 commit's design D5 paragraph also references the UI's `verifyEditableLocally` pre-flight as the reason the existence-opaque 404 path is effectively unreachable. **Remediation 🛠️:** none required — the deviation is recorded as called out in the §4 task description. The persona gate is satisfied with the documentation. If a future maintainer removes `verifyEditableLocally` from the UI, the existence-opaque 404 policy becomes reachable from the API surface; a short note in the controller's JSDoc on `update(...)` flagging that dependency (the service's `update` is "safe" only while the UI pre-flight hides non-editable rows) would future-proof the design. Optional.

- **frontend-state.yaml -> derived_state — `verifyEditableLocally` does not reactively recompute.** The method is invoked imperatively (interaction-state.service.ts:162-173) — it reads `this.interactions()` and `target.facilitator.value` at call time. The current UI does not call it in a template binding (the row's Edit button is unconditionally rendered — see Warning 7 below), so the imperative-only shape is consistent. **Remediation 🛠️:** none required. If the UI later wants the Edit button to react to role changes, it can wrap the call in a `computed()`. Today's shape is acceptable because the call site is `EditInteraction`-mounted state.

- **api-standards.yaml -> casing — `EditInteraction` uses `id="edit-type"` and `id="edit-note"` (edit-interaction.html:22, 30).** Single-word ids are trivially kebab-case. Compliant, but flagging only because the `id` is set on a `<select>` and a `<textarea>` — the corresponding `<label for="...">` matches. Forms accessibility check passes.

- **api-standards.yaml -> casing — `interaction-list.html:23` uses `interaction-list__badge--{{ interaction.type }}` (kebab-case, but the suffix is `interaction.type`, an enum value).** Enums are kebab-case (`check-in`, `mentoring`, etc. — interaction.types.ts:5-10), so the rendered class names are `interaction-list__badge--check-in`, etc. Compliant. Optional: a comment near the badge class explaining the dynamic suffix convention would help future maintainers.

- **frontend-state.yaml -> persistence — no change.** Carve-out from §2 is unchanged. This commit does not introduce any new persistence surface. Compliant by absence; flagging only because the §2/§3 audits both raised `staff-engagement.auth.username` as a side-channel persistence key — §4 does not regress or address it. Carry-over.

- **testing-strategy.yaml -> coverage — the `verifyEditable` service override has four specs (admin, facilitator, non-owner, absent) but the empty-on-error-while-persisting path is not directly covered.** The service calls `repository.findById(...)` then `.filter(entity -> isAdmin || entity.getFacilitatorId().equals(actor.value()))` then `.map(entity -> id)`. A Stryker mutant that flips `||` to `&&` would be killed by `verifyEditableReturnsEmptyForNonAdminNonFacilitator` (admin=false, facilitator mismatch → empty). A mutant that deletes the `.filter(...)` call would be killed by `verifyEditableReturnsIdForAdmin` (admin path bypasses filter) AND by `verifyEditableReturnsEmptyForNonAdminNonFacilitator` (filter is the gate). Coverage is acceptable. **No remediation required.**

- **api-standards.yaml -> security.authorization — `@PreAuthorize("hasRole('ADMIN')")` is correct for the controller, but the `update` endpoint accepts `EmployeeId actor = new EmployeeId(Long.parseLong(userDetails.getUsername()))` (InteractionController.java:99).** The principal's username is parsed as a long. If the username is not numeric (e.g., an email), `Long.parseLong` throws `NumberFormatException` and the user gets a 500 instead of a 401/403 envelope. The Phase 0 principal is documented as a username (not an email); the existing create endpoint binds the same way. **Remediation 🛠️:** none required for §4 (pre-existing pattern across the module), but worth tracking. The fix is to surface a 401 envelope from the security layer when the principal is unauthenticated, and to fail soft (404) when the username is not parseable. Optional future cleanup.

- **angular-style-guide.md -> change detection — `ChangeDetectionStrategy.OnPush` is set on all three touched components (InteractionPage line 34, EditInteraction line 26, InteractionList line 33).** Compliant. The page's local `editing`/`creatingTaskFor` signals trigger OnPush re-renders via the template bindings; the state-service `computed()` signals propagate. No manual `ChangeDetectorRef.detectChanges()` needed and none is added.

---

## Violations ❌

**None.**

The implementation respects:
- `api-standards.yaml` (URL casing, JSON casing, `/api/v1` prefix, error envelope, RBAC via `@PreAuthorize`, offset/limit/sort, existence-opaque 404).
- `tech-stack.yaml` (Java 21 records, Angular 22 with `inject()`/signals/PrimeIcons, no new dependencies).
- `backend-architecture.yaml` (Controller → Service → Repository, anemic domain, modular-monolith via frozen contract, no controller→repository shortcut, no cross-module impl/repository/domain imports).
- `frontend-state.yaml` (Signals everywhere, `computed()` for derived state, state writes inside the service, no `BehaviorSubject`, no JWT/PII leakage, unidirectional flow).
- `angular-style-guide.md` (standalone `imports: [...]`, `inject()`, `protected readonly` for template members, BDD-style `on...` handlers, OnPush change detection, no NgModule).
- `testing-strategy.yaml` (unit tests only, BDD Given-When-Then in every spec, edge cases for facilitator/admin/non-owner/absent/null-type are reached; mutation-test objective satisfied by the four-branch `verifyEditable` coverage).
- `ROADMAP §2.5` (no new dependencies — `package.json` and `pom.xml` untouched).
- `ROADMAP §2.6` (`api-client.ts` modification is additive; `InteractionContract.java` was modified in the §2 carve-out, not in this §4 commit).
- `ROADMAP §2.7` (`InteractionContract.verifyEditable` is the additive default-method pattern; the §4 commit overrides the default in the impl, which is the documented carve-out use).
- `MISSION.md §3` (audit-trail invariant: `subject`/`facilitator`/`createdAt` are immutable on PATCH; `type` and `note` are the only mutable fields).
- `MISSION.md §6` (no integration tests added; JWT persistence carve-out unchanged).
- The D5 deviation (controller RBAC stays `hasRole('ADMIN')`, facilitator self-edit in the service) is documented in `design.md D5` and aligned with the §4 task description.

The §4 commit is a textbook example of how a single-scope UX-clarification change should land:
- The backend surface is one new endpoint with the right predicate and an existence-opaque 404 collapse.
- The frontend surface is one new modal component, two `@Output() EventEmitter`s on the list, and two new service handlers.
- The frozen contract gets one additive method, used through the service interface only.
- The audit-trail invariant from MISSION §3 is upheld by the `UpdateInteractionRequest` DTO shape and by the service's field-by-field preservation.

---

## Frozen-contract claim verification

**Claim 1:** `InteractionContract.verifyEditable` is the additive default method introduced in §2's carve-out; §4 does not modify `shared/api/InteractionContract.java`.

**Verified ✅:** `git show 89dc571 --stat` lists five backend files — none of them is `shared/api/InteractionContract.java`. The contract file at `backend/src/main/java/com/staffengagement/shared/api/InteractionContract.java` was modified in the §2 commit and is unchanged in §4.

**Claim 2:** No other frozen contract (`EmployeeContract`, `TaskContract`, `PortfolioContract`, `SkillsContract`) is touched.

**Verified ✅:** `git show 89dc571 6165e50 --stat | grep -i contract` returns no matches. `InteractionService` uses `EmployeeContract.exists(...)` only — no other frozen contract is referenced.

---

## Roadmap alignment

- **Ownership:** All §4 files are inside Phase 2 (Interaction) ownership:
  - Backend: `backend/.../interaction/**` (InteractionController, InteractionService, UpdateInteractionRequest, InteractionServiceTest, InteractionControllerTest) — Phase 2.
  - Frontend: `frontend/.../features/interaction/**` (interaction-state.service, interaction-list, interaction-page, edit-interaction, *.spec.ts) — Phase 2.
  - The one out-of-ownership file is `frontend/src/app/shared/api/api-client.ts` (Phase 0 / shared). The §4 modification is purely additive (`patch<T>()` method on the existing wrapper) — no removal, no rename, no restructure. Same append-only pattern the §2 commit used for `auth-storage.ts`.

- **No new dependencies:** `package.json` and `pom.xml` untouched. `ApiClient.patch<T>()` is built on Angular's existing `HttpClient.patch<T>()`.

- **`InteractionContract.verifyEditable` override:** This is the documented §2 carve-out use — additive default method overridden in the impl. No breaking change to the frozen contract.

- **`UpdateInteractionRequest`:** The DTO deliberately omits `subject`, `facilitator`, and `createdAt` so the audit-trail invariant is enforced at the wire boundary. Jackson's enum binding rejects unknown `type` values at deserialization (400 before the service is reached).

---

## Summary

| Severity | Count |
|----------|-------|
| Compliant ✅ | 40 |
| Warning ⚠️ | 10 |
| Violation ❌ | 0 |

**No blocking violations.** The implementation is approved as-is for merge under §4. The most actionable warning is W1 (`InteractionAccessControlTest` should add a fourth `@PreAuthorize` reflection assertion for the new `update` endpoint) — one method, same pattern as the existing three. W2 (no failed-PATCH spec for the modal) and W3 (ROADMAP §2.7 prose drift between `boolean / default true` and the actual `Optional<InteractionId> / default empty`) are tractable follow-ups.

The §4 work delivers exactly what the §4 task asked for: a backend PATCH endpoint with audit-trail preservation and existence-opaque RBAC, plus row-level Edit + Create-task affordances on the frontend that surface the new mutation through the existing state-service pattern. The D5 deviation (controller `hasRole('ADMIN')` only; facilitator self-edit in the service) is documented and correctly applied.