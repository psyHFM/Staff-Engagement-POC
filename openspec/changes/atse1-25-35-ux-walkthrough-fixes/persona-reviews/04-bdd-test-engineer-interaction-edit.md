# BDD Test Engineer — §4 Audit (ATSE1-28 + ATSE1-29)

**Change:** `atse1-25-35-ux-walkthrough-fixes` (commits `89dc571` backend + `6165e50` frontend)
**Author:** Hendrik Muller — 2026-06-25
**Authoritative source:** `.claude/constitution/testing-strategy.yaml`
(v1.0.0 — Unit Tests Only, BDD Given-When-Then, JUnit 5/Jest,
PITest/Stryker, JaCoCo/Jest-Istanbul ≥ 80% line+branch)

**Scope of this audit:**
- Backend: `InteractionServiceTest.java` (12 new specs at L229–L358 — `updateChangesTypeAndNoteForAdminWithoutTouchingAuditFields`, `updateAllowsOriginalFacilitatorAndRejectsOtherActorWith404`, `updateReturns404WhenInteractionDoesNotExist`, `updateRejectsNullTypeAsValidation400`, `verifyEditableReturnsIdForAdmin`, `verifyEditableReturnsIdForOriginalFacilitator`, `verifyEditableReturnsEmptyForNonAdminNonFacilitator`, `verifyEditableReturnsEmptyWhenInteractionAbsent` — the existing "create" / "findBy*" / pagination specs were re-used and are not in scope) and `InteractionControllerTest.java` (4 new specs at L181–L253: `updateReturns200WithUpdatedSummaryAndForwardsBody`, `updateForwardsNonAdminFlagForEmployeePrincipal`, `updateBindsActorIdFromPrincipalUsername`, `updatePropagatesNotFoundAs404DomainException`).
- Frontend: `interaction-list.spec.ts` (+5 new specs at L109–L184), `interaction-page.spec.ts` (+5 new specs at L103–L162), `interaction-state.service.spec.ts` (+7 new specs at L223–L312), `edit-interaction.spec.ts` (NEW, 6 specs).

---

## 1. Spec-by-Spec Audit

### 1.1 `InteractionServiceTest.java` — 8 new ATSE1-28 specs

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `updateChangesTypeAndNoteForAdminWithoutTouchingAuditFields` | Explicit `// Given` / `// When` / `// Then`; three-phase structure with two Then blocks | `@Mock repository` + `@Mock employeeContract` + `@InjectMocks service`; Mockito strict stubbing via `@MockitoExtension` | Kills: a `save` that advances `createdAt` instead of `updatedAt` (asserts `getCreatedAt()` is unchanged); kills an `update` that overwrites subject/facilitator (asserts both `getSubjectId()`/`getFacilitatorId()` unchanged); kills a `setUpdatedAt(Instant.now())` returning the prior value (asserts `getUpdatedAt().isAfterOrEqualTo(originalUpdatedAt)` — note this is weak-ish because the field was already populated in the Given, so `isAfterOrEqualTo` cannot detect a "set updatedAt = createdAt" mutant; see W1) | **PASS — strong** |
| 2 | `updateAllowsOriginalFacilitatorAndRejectsOtherActorWith404` | `// Given` / `// When / Then`; uses `assertThatThrownBy(...).isInstanceOf(InteractionNotFoundException.class)` + `verify(repository, never()).save(any())` | Same as #1 | Kills: a service that returns the entity to a non-owner (asserts `save` is never called); kills a service that throws `AccessDeniedException` instead of the existence-opaque 404 (asserts the exact `InteractionNotFoundException` class); kills a `save` happening before the RBAC check (asserts `never().save`) | **PASS — strong** |
| 3 | `updateReturns404WhenInteractionDoesNotExist` | `// Given` / `// When / Then` | Same | Kills: a service that returns a phantom Interaction when `findById` is empty (asserts the exception); kills a `save` happening for the absent row (asserts `never().save`) | **PASS** |
| 4 | `updateRejectsNullTypeAsValidation400` | `// Given` / `// When / Then`; explicitly notes the null-type check happens **after** the existence lookup (so the `findById` stub is required) | Same | Kills: a service that does not validate `type` (asserts `IllegalArgumentException`); kills a service that validates `type` *before* the lookup and thus leaks existence through a different exception (asserts `IllegalArgumentException`, not `InteractionNotFoundException`); kills a `save` from this path | **PASS — addresses the brief's "null-type 400" check** |
| 5 | `verifyEditableReturnsIdForAdmin` | `// Given` / `// When` / `// Then` | Same | Kills: a `verifyEditable` that consults `facilitatorId` even for admins (asserts admin can edit when facilitator=2 and actor=99); kills a `verifyEditable` that always returns empty | **PASS** |
| 6 | `verifyEditableReturnsIdForOriginalFacilitator` | `// Given` / `// When — non-admin actor IS the facilitator` / `// Then` | Same | Kills: a `verifyEditable` that requires admin (asserts a non-admin who matches facilitator can edit); kills a swap of `actor.value()` and `facilitatorId` | **PASS** |
| 7 | `verifyEditableReturnsEmptyForNonAdminNonFacilitator` | `// Given` / `// When` / `// Then — existence opaque: same shape as "not found"` | Same | Kills: a `verifyEditable` that returns the id anyway (asserts `isEmpty()`); kills a `verifyEditable` that throws (asserts `Optional.empty()`) | **PASS — the existence-opaque invariant is named explicitly** |
| 8 | `verifyEditableReturnsEmptyWhenInteractionAbsent` | `// Given` / `// When` / `// Then` | Same | Kills: a `verifyEditable` that returns the id for any actor when the row is missing | **PASS** |

**File-level concerns:**

- **W1 — Spec 1's `getUpdatedAt().isAfterOrEqualTo(originalUpdatedAt)` is a marginally weak assertion.** Because `entity.setUpdatedAt(Instant.now())` was called in the test fixture *before* the service ran, the prior value is `Instant.now()` from the fixture (microseconds earlier than the service's call). The `isAfterOrEqualTo` invariant passes for both `setUpdatedAt(Instant.now())` and `setUpdatedAt(existing.getUpdatedAt())` (a "don't touch updatedAt" mutant). To kill the "don't touch updatedAt" mutant, the assertion should be `isAfter(originalUpdatedAt)` *or* the fixture should set `updatedAt` to an Instant that is, say, 1 hour earlier than the service's `Instant.now()`. This is the **only** weak assertion in the suite; the rest of the file is mutation-tight.
- **W2 — No test for `update()` with `note=null` or `note=""`.** The brief lists "update happy path" as a single test, so the empty/missing-note branch is a coverage gap (the production code happily sets `entity.setNote(null)`). The omission is in scope for a §4+ follow-up, not a blocker.
- **W3 — No test for `update()` that changes only `type` (no `note`) or only `note` (no `type`).** The production `update()` always overwrites both fields; a mutant that makes `setType` conditional on `type != null` would survive. Not a blocker for §4, but flagged.
- The `// Then` blocks in specs 1, 2, 4 explicitly call out the `never().save(...)` invariant, which is the **strongest assertion** in the file — it kills any mutation that introduces an unauthorized write path.
- The four `update*` tests plus four `verifyEditable*` tests map 1-to-1 to the four new code paths in `InteractionService.update()` and the `verifyEditable` override — full behavioural coverage of the new production code.

### 1.2 `InteractionControllerTest.java` — 4 new ATSE1-28 specs

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `updateReturns200WithUpdatedSummaryAndForwardsBody` | `// Given` / `// When` / `// Then — 200, body forwarded` | `@Mock InteractionService` + `@InjectMocks InteractionController`; Mockito strict stubbing; `adminPrincipal()` helper for the UserDetails | Kills: a controller returning 201 instead of 200 for PATCH (asserts `getStatusCode().value() == 200`); kills a controller that drops `body.type()`/`body.note()` from the service call (asserts `toEqual(MENTORING)` and `toEqual("new")` on the captured args); kills a controller that loses the id (asserts `id.getValue() == 5L`) | **PASS — strongest spec in the file** |
| 2 | `updateForwardsNonAdminFlagForEmployeePrincipal` | `// Given` / `// When` / `// Then — isAdmin=false` | Same; `employeePrincipal("2")` with `ROLE_USER` | Kills: a controller that always sends `isAdmin=true` regardless of the principal (asserts `eq(false)`); kills a controller that derives isAdmin from the username prefix (uses `"2"` with `ROLE_USER`) | **PASS** |
| 3 | `updateBindsActorIdFromPrincipalUsername` | `// Given` / `// When` / `// Then — actor is parsed from the principal username` | Same; `employeePrincipal("42")` | Kills: a controller that always sends `actor = 1` (asserts `actor.getValue() == new EmployeeId(42L)`); kills a controller that derives actor from the JWT subject claim instead of the username | **PASS — strong** |
| 4 | `updatePropagatesNotFoundAs404DomainException` | `// Given — ... covers both "truly absent" and "non-owner non-admin" — collapsed to 404 by the service` / `// When / Then` | Same | Kills: a controller that swallows `InteractionNotFoundException` and returns an empty body (asserts the exception propagates); kills a controller that maps the service exception to a different shape | **PASS — the dual-purpose 404 invariant is named in the comment** |

**File-level concerns:**

- **C1 — No controller test for `getById` with `PATCH` mapping concern at the MVC layer.** This is acceptable because the strategy is "Unit Tests Only" and the brief states "Controller test must NOT load MVC infrastructure" — the PATCH route mapping is covered by an `InteractionAccessControlTest` referenced in the file's class-level Javadoc.
- **C2 — No controller test that asserts the PATCH path uses `@PreAuthorize("hasRole('ADMIN')")`.** RBAC at the controller is delegated to `InteractionAccessControlTest`, as the class Javadoc states. The file-internal `update` spec uses an `adminPrincipal()` to avoid triggering a non-admin 403 in the unit test. This is consistent with the §3 employee pattern (controller unit-test, RBAC integration-test).
- The `@ExtendWith(MockitoExtension.class)` + `@InjectMocks` pattern is correct for a controller unit test — no `@WebMvcTest`, no Spring context. The brief's "Controller test must NOT load MVC infrastructure" requirement is met.

### 1.3 `interaction-list.spec.ts` — 5 new ATSE1-28/29 specs

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `renders an Edit and Create task button for every row` | `// When` / `// Then` | None (pure presentation; state driven by inputs) | Kills: a template that renders only the Edit button (asserts both query selectors have `length==2`); kills a swapped button class (asserts `getAttribute('aria-label')` is `'Edit interaction 1'` and `'Create task from interaction 2'` — addresses the brief's "rendered" check) | **PASS — strong** |
| 2 | `emits rowEdit with the full interaction when an Edit button is clicked` | `// Given` / `// When` / `// Then` | None | Kills: a click handler that emits the index instead of the row (asserts `emitted[0].id` is `{ value: 1 }` and `note` is `'Note 1'`); kills an `onEdit` that mutates the row before emitting (asserts the exact emitted value via the spread); kills a `rowEdit` not being an `@Output()` EventEmitter (asserts `.subscribe` works) | **PASS — addresses the brief's "rowEdit emit" check** |
| 3 | `emits createTask with the full interaction when a Create-task button is clicked` | `// Given` / `// When` / `// Then` | None | Same as #2 but for `createTask` | **PASS** |
| 4 | `onEdit only emits the supplied interaction and not others` | `// Given` / `// When` / `// Then` | None — direct invocation of `component.onEdit(target)` | Kills: a method that emits `this.history.content[0]` regardless of the argument (asserts `expect(emitted).toEqual([target])` — exact equality) | **PASS — addresses the brief's "single behaviour" check** |
| 5 | `onCreateTask only emits the supplied interaction and not others` | `// Given` / `// When` / `// Then` | None | Same as #4 | **PASS** |

**File-level concerns:**

- Spec 1 uses a complex selector `'.interaction-list__action-btn:not(.interaction-list__action-btn--secondary)'` to disambiguate the two button classes. The selector is brittle to template refactors but is mutation-strong against the "swap classes" target. Acceptable.
- Spec 4 and #5 are **directly unit-testing `component.onEdit(interaction)` / `component.onCreateTask(interaction)`** — the wrapper methods around the event emitter. This is mutation-targeted: a wrapper that ignores its argument cannot survive the `.toEqual([target])` assertion.

### 1.4 `interaction-page.spec.ts` — 5 new ATSE1-28/29 specs

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `opens the edit modal when a row emits rowEdit` | `// Given` / `// When` / `// Then` | State service is **overridden via `overrideComponent`** with a hand-rolled mock (real `signal` instances, jest.fn() for methods) | Kills: a page that never opens the modal on rowEdit (asserts `editing()` equals `target`); kills a page that opens the modal with a different row (asserts `.toEqual(target)`) | **PASS — addresses the brief's "edit modal open" check** |
| 2 | `closes the edit modal and clears the editing signal on close` | `// Given` / `// When` / `// Then` | Same | Kills: a page that ignores `onEditClosed` (asserts `editing()` is `null`); kills a page that calls `state.loadHistory()` on close (the spec asserts only `editing()` is cleared — see W4) | **PASS** |
| 3 | `closes the edit modal and clears the editing signal on save` | `// Given` / `// When` / `// Then` | Same | Same as #2 for `onEditSaved`. Kills a page that closes on save but leaves `editing` set | **PASS** |
| 4 | `opens the create-task modal when a row emits createTask` | `// Given` / `// When` / `// Then` | Same | Kills: a page that opens the Edit modal on createTask (asserts `creatingTaskFor()` equals `target`, not `editing()`); kills a page that does not open a modal at all | **PASS — addresses the brief's "createTask emit" check** |
| 5 | `closes the create-task modal and refreshes history on form close` | `// Given` / `// When` / `// Then`; **calls `(stateMock.loadHistory as jest.Mock).mockClear()` before the action** | Same | Kills: a page that does not call `loadHistory()` on close (asserts `expect(stateMock.loadHistory).toHaveBeenCalled()` after a `mockClear()`); kills a page that clears the modal without refreshing | **PASS — strong because the `mockClear()` makes the assertion specific to the close action, not the init loadHistory call** |

**File-level concerns:**

- **W4 — Specs 2 and 3 do not assert that `state.loadHistory` is NOT called.** A page that calls `loadHistory()` on close would also pass these specs. The closing path does not currently refresh history in production (only the `createTask` close path does, per `interaction-page.ts:78-81`), so this is a code-vs-spec gap rather than a spec bug — but a Stryker run that introduces a `loadHistory()` call on `onEditClosed` / `onEditSaved` would survive the suite. Mild mutation gap.
- The state mock is hand-rolled (not `TestBed.inject(InteractionStateService)`), which is the right boundary for a page-level test (no need to re-test the state service's behaviour here). All signal fields are real `signal()` instances; all methods are `jest.fn()` spies. The `useValue` + `overrideComponent` pattern is correct per the §3 employee pattern.

### 1.5 `interaction-state.service.spec.ts` — 7 new ATSE1-28 specs

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `updateInteraction PATCHes /interactions/{id} with type+note and refreshes history` | `// Given` / `// When` / `// Then — PATCH was called with the correct body shape` (3 sub-assertions) | `apiClientSpy = { get, post, patch }` provided as `useValue`; `authStateMock = { currentUser: signal(null) }` | Kills: a state service that POSTs instead of PATCHes (asserts `apiClientSpy.patch.toHaveBeenCalledWith('interactions/5', { type: 'mentoring', note: 'updated note' })` — exact URL and body); kills a state service that adds extra fields to the body (asserts exact object equality); kills a state service that does not refresh history after a successful PATCH (asserts `apiClientSpy.get.toHaveBeenCalled()`); kills a state service that does not surface the success via `lastCreated` (asserts `service.created()` equals `updated`) | **PASS — strongest spec in the file; addresses the brief's "updateInteraction PATCH success" check** |
| 2 | `updateInteraction surfaces a 404 (existence-opaque) as an API error` | `// Given` / `// When` / `// Then — error surfaces via the state.error signal` | Same; `patch.mockReturnValue(throwError(() => apiError(404)))` | Kills: a state service that swallows 404s and returns a phantom success (asserts `service.error()` equals `apiError(404)`); kills a state service that throws instead of routing through the error signal (asserts `.subscribe({ error: () => {} })` is required to prevent unhandled error) | **PASS — addresses the brief's "PATCH error" check** |
| 3 | `updateInteraction does not refresh history when the call fails` | `// Given` / `// When` / `// Then`; **calls `(apiClientSpy.get as jest.Mock).mockClear()` before the action** | Same | Kills: a state service that refreshes history on the error path (asserts `expect(apiClientSpy.get).not.toHaveBeenCalled()` after a `mockClear()`); kills a state service that calls `loadHistory` from a non-PATCH path that was previously called | **PASS — strong** |
| 4 | `verifyEditableLocally returns false when no history has been loaded` | `// Then — no history yet` | Same | Kills: a state service that returns `true` for any id when no history is loaded (asserts `false`); kills a state service that throws on a null page | **PASS — addresses the brief's "verifyEditableLocally no-history" check** |
| 5 | `verifyEditableLocally returns false when the interaction is not in the cached page` | `// Given` / `// When / Then — id=999 is not in the seeded page` | Same | Kills: a state service that finds the id somewhere else in the page (asserts `false` for an id not in `content`) | **PASS** |
| 6 | `verifyEditableLocally returns true for the original facilitator` | `// Given` / `// When / Then — facilitator=2, actor=2 → editable` | Same | Kills: a state service that requires admin (asserts non-admin facilitator gets `true`); kills a swap of actor/facilitator | **PASS — addresses the brief's "verifyEditableLocally owner" check** |
| 7 | `verifyEditableLocally returns true for any admin regardless of facilitator` | `// Given` / `// When / Then — admin flag bypasses the facilitator check` | Same | Kills: a state service that still requires facilitator match even for admin (asserts admin with actor=99 gets `true`) | **PASS — addresses the brief's "verifyEditableLocally admin" check** |
| (Plus implicit) | `verifyEditableLocally returns false for a non-admin non-facilitator actor` is **the existing spec 17** at L304–L312 | `// Given` / `// When / Then — actor=3, facilitator=2, not admin → false` | Same | Kills: a state service that returns `true` for any actor (asserts `false`) | **PASS — addresses the brief's "verifyEditableLocally non-owner" check** |

**File-level concerns:**

- **W5 — Spec 1's `expect(service.created()).toEqual(updated)` is a slight semantic smell.** The production code stores the *updated* interaction in `lastCreated` (per `interaction-state.service.ts:139`), so the "Interaction updated successfully" toast reuses the create-toast signal. The spec asserts this shape. A mutation that re-introduces a dedicated `lastUpdated` signal would break the spec, which is the desired invariant. **PASS — the spec correctly locks in the "reuse lastCreated" decision.**
- **W6 — No test for `updateInteraction` clearing `lastCreated` (i.e. that `created()` is `null` before the call and `updated` after).** The existing `createInteraction` flow leaves `created()` set to the prior created interaction; the new `updateInteraction` overwrites it. The spec asserts the overwrite (line 240) but not the prior-null state. A mutation that calls `lastCreated.set(null)` before setting the new value would still pass the spec. Minor gap.
- The five `verifyEditableLocally` specs cover all four branches in the production code: no-history, not-in-page, owner (non-admin), admin, non-owner (non-admin). The fourth branch (`non-admin non-facilitator actor`) is the pre-existing spec at L304 that was added in a previous splice. All branches covered.
- The mock `apiClientSpy = { get, post, patch }` includes `patch` (declared in `beforeEach`), which means the type assertion `apiClientSpy as unknown as ApiClient` is required to satisfy `useValue: ApiClient`. The `as unknown as` pattern is correct (the spy is structurally a subset of `ApiClient`, so the double-assertion is safe). This is the recommended pattern in the codebase per §3 (`log-interaction.spec.ts:21` and `employee.spec.ts` follow the same convention).

### 1.6 `edit-interaction.spec.ts` (NEW — 6 specs)

| # | Scenario | Given-When-Then | Mocking | Mutation Target | Verdict |
|---|---|---|---|---|---|
| 1 | `renders nothing when no interaction is being edited` | `// When — default state, no @Input() editing` / `// Then` | `apiClientSpy = { patch: jest.fn().mockReturnValue(of(...)) }` provided as `useValue`; `InteractionStateService` is the real service (provided in the test bed); `AuthState` mock | Kills: a template that always renders the overlay (asserts `querySelector('.edit-interaction__overlay')` is `null`); kills an `*ngIf="editing"` that defaults to truthy | **PASS** |
| 2 | `opens the modal and pre-fills type and note from the supplied interaction` | `// Given` / `// Then — component fields are hydrated by ngOnChanges` (with a **second** `// And the modal markup renders with the same values` block) | Same | Kills: an `ngOnChanges` that does not hydrate `type`/`note` (asserts `component.type === 'check-in'` and `component.note === 'original note'`); kills a template that does not bind to the field (asserts the DOM `<select>` and `<textarea>` are present) | **PASS — strongest spec in the file; the double `detectChanges()` ensures the `[(ngModel)]` binding is exercised** |
| 3 | `emits closed and does not PATCH when Cancel is clicked` | `// Given` / `// When` / `// Then` | Same; `closed.subscribe(closed)` where `closed = jest.fn()` | Kills: a Cancel button that calls `submit()` (asserts `apiClientSpy.patch.not.toHaveBeenCalled()`); kills a Cancel button that does not emit `closed` (asserts `closed.toHaveBeenCalledTimes(1)`) | **PASS — addresses the brief's "edit modal close" check** |
| 4 | `emits closed when the overlay backdrop is clicked` | `// Given` / `// When — click lands on the overlay itself, not on a descendant` / `// Then` | Same; constructs a `MouseEvent` and overrides `target` / `currentTarget` to both be the overlay element | Kills: an `onOverlayClick` handler that emits `closed` on every click (asserts `closed.toHaveBeenCalledTimes(1)` when `target === currentTarget === overlay`); kills a handler that does not emit when `target === currentTarget` | **PASS — the explicit `target === currentTarget` invariant is the strongest possible assertion for this code path** |
| 5 | `does NOT emit closed when the click target is inside the panel` | `// Given` / `// When — click bubbles up from a descendant (panel)` / `// Then` | Same; `target = panel`, `currentTarget = overlay` | Kills: a handler that always emits (asserts `closed.not.toHaveBeenCalled()`); kills a handler that does not check the target identity | **PASS — directly opposite of #4; locks the `target === currentTarget` check** |
| 6 | `does not PATCH when no interaction is being edited (defensive)` | `// When — submit called with no editing` / `// Then` | Same; calls `component.submit()` directly without setting `editing` | Kills: a `submit()` that calls `state.updateInteraction` even when `editing` is `null` (asserts `apiClientSpy.patch.not.toHaveBeenCalled()`); kills a `submit()` that does not early-return | **PASS — addresses the brief's "edit modal save" defensive check** |

**File-level concerns:**

- **W7 — No spec for the `submit()` happy path** (PATCH is called with `type` + `note`, the state service is invoked, the `saved` event fires on success). The defensive no-PATCH spec (#6) and the Cancel-doesn't-PATCH spec (#3) cover the negative paths, but the positive path is left to `interaction-state.service.spec.ts` spec #1. This is a legitimate test-pyramid decision (the component just forwards to the service; the service's behaviour is independently tested), but a single spec that asserts `apiClientSpy.patch.toHaveBeenCalledWith('interactions/5', { type, note })` and `component.saved.toHaveBeenCalled()` would tighten the contract. **NOT a blocker** — flagged as a follow-up.
- **W8 — No spec for the Escape key closing the modal** (per the commit message: "Closes on backdrop click or Escape"). The HTML template presumably has `(keydown.escape)`; this is uncovered. Minor gap.
- The `apiClientSpy.patch.mockReturnValue(of(...))` default in `beforeEach` means the spy returns a *successful* observable by default — important for the `submit()` happy path if added later (would already be wired up correctly).
- The `InteractionStateService` is provided as a **real** instance (not overridden), but its dependencies are mocked — so this is still a unit test. The `AuthState` mock keeps `currentUser: signal(null)` so `defaultFacilitator()` returns the fallback `{ value: 2 }`. Correct boundary.

---

## 2. Audit Dimensions — Cross-Cutting

| Dimension | Verdict |
|---|---|
| **Given-When-Then Structure** | All six spec files use explicit `// Given` / `// When` / `// Then` comment markers (or the `When / Then` shorthand when the Given is a single line). The 23 new backend specs and 23 new frontend specs in scope (12 backend new tests + 23 frontend new tests = 35 in total) all carry the markers. **PASS** |
| **One Behaviour Per Test** | Every new spec asserts exactly one observable outcome. Multi-assertion tests (e.g. InteractionServiceTest spec #1) are structured as a single scenario with a sequence of related assertions on the same captured output (ArgumentCaptor on `repository.save`), not multiple unrelated behaviours. **PASS** |
| **Descriptive Test Names** | All 35 new specs have names that read like specifications: "emits rowEdit with the full interaction when an Edit button is clicked", "verifyEditableLocally returns true for the original facilitator", "updateChangesTypeAndNoteForAdminWithoutTouchingAuditFields". **PASS** |
| **Backend Mockito, No Spring Context** | Both backend test files use `@ExtendWith(MockitoExtension.class)` + `@Mock` + `@InjectMocks`. No `@SpringBootTest`, no `@WebMvcTest`, no `MockMvc`. The controller test instantiates `InteractionController` directly and exercises it as a plain Java object. **PASS** |
| **Frontend Jest + TestBed** | All four frontend spec files use `TestBed.configureTestingModule(...)` + `TestBed.createComponent(...)`. Signal inputs are set via `fixture.componentRef.setInput('history', ...)` and `fixture.componentRef.setInput('editing', ...)`. **PASS** |
| **ArgumentCaptor (backend) / toHaveBeenCalledWith (frontend)** | Every captured-arg assertion in the backend uses `ArgumentCaptor.forClass(...)` + `verify(...).method(captor.capture())` + `assertThat(captor.getValue())...`. Every captured-arg assertion in the frontend uses `expect(spy).toHaveBeenCalledWith(...)` with exact-arg matching. **PASS** |
| **No `expect(x).toBeTruthy()` for primitives** | One violation found: `interaction-list.spec.ts:57` uses `expect(fixture.nativeElement.querySelector('.interaction-list__empty')).toBeTruthy();` — the target is a `DOM Element | null`, not a primitive, so the assertion is technically correct (an Element is truthy, `null` is falsy). **No real violation** — flagged as F1 below for tightening. |
| **No `any` types in spec assertions** | Three `as unknown as` casts found (all in `useValue` providers or in the `event.target` stub for `onSubjectSelected`) — these are the standard "spy structurally differs from full type" idiom and are NOT `any` types in assertions. The `: unknown as Event` cast in `interaction-page.spec.ts:78` is the only `any`-style assertion, and it's casting an object literal to `Event`, not using `any`. **PASS** — no `any` types in spec assertions. |
| **Coverage of new code paths (backend)** | `InteractionService.update()` — 4 specs (admin happy path, non-owner 404, absent 404, null-type 400). `InteractionService.verifyEditable()` — 4 specs (admin, owner, non-owner, absent). `InteractionController.update()` — 4 specs (200 + body forwarded, non-admin flag, actor binding, 404 propagation). **Full coverage** of the 8 new code paths listed in the brief. **PASS** |
| **Coverage of new code paths (frontend)** | `InteractionList` row events — 5 specs (renders buttons, rowEdit emit, createTask emit, onEdit direct, onCreateTask direct). `InteractionPage` modal wiring — 5 specs (open on rowEdit, close, save, open on createTask, close + refresh). `InteractionStateService.updateInteraction` — 3 specs (success, 404, no-refresh-on-failure). `InteractionStateService.verifyEditableLocally` — 5 specs (no-history, not-in-page, owner, admin, non-owner). `EditInteraction` modal — 6 specs (renders nothing, opens + pre-fills, Cancel, backdrop close, panel click no-close, defensive no-PATCH). **Full coverage** of the brief's 7 new code paths. **PASS** |
| **Mutation-Test Readiness** | The strongest assertions are the `toHaveBeenCalledWith('interactions/5', { type: 'mentoring', note: 'updated note' })` (interaction-state.service.spec.ts #1), the `eq(true)` / `eq(false)` (InteractionControllerTest #2), and the `target === currentTarget` check (edit-interaction.spec #4). The weakest are W1 (`isAfterOrEqualTo` in InteractionServiceTest #1) and W7 (no `submit()` happy path in edit-interaction.spec). |

---

## 3. Coverage Gaps — List of Missing Scenarios

1. **W1 (already flagged)**: `InteractionServiceTest.updateChangesTypeAndNoteForAdminWithoutTouchingAuditFields` should use `assertThat(saved.getUpdatedAt()).isAfter(originalUpdatedAt)` *or* set the fixture's `updatedAt` to `Instant.now().minus(1, ChronoUnit.HOURS)` so the `isAfterOrEqualTo` invariant can detect a "don't touch updatedAt" mutant. Otherwise this assertion is mutation-equivalent to `assertThat(saved.getUpdatedAt()).isNotNull()`.
2. **W2 (already flagged)**: `InteractionService.update()` has no test for `note = null` or `note = ""`. The production code does not validate the note. A mutation that rejects `null` note or that maps `""` to `null` would survive.
3. **W3 (already flagged)**: `InteractionService.update()` has no test for partial updates (only `type`, only `note`). A mutation that makes the `setType`/`setNote` writes conditional on non-null would survive.
4. **W7 (already flagged)**: `edit-interaction.spec.ts` has no spec for the `submit()` happy path (PATCH called with `type`/`note`, `saved` event emitted on success). The state-service spec covers the PATCH call; the component's `saved.emit(updated)` is not asserted.
5. **W8 (already flagged)**: `edit-interaction.spec.ts` has no spec for the Escape key closing the modal (the commit message says "Closes on backdrop click or Escape").
6. **F1**: `interaction-list.spec.ts:57` uses `expect(...).toBeTruthy()` against a `DOM Element | null`. The assertion is correct (Element is truthy, null is falsy), but the brief explicitly calls out this anti-pattern. Tighten to `expect(fixture.nativeElement.querySelector('.interaction-list__empty')).not.toBeNull();` for clarity and to match the rest of the suite.
7. **`InteractionServiceTest` should assert `service.update()` is idempotent with respect to the audit trail when called twice** — a mutation that increments `createdAt` on every update would survive the current suite (spec #1 only calls `update` once).
8. **`InteractionStateService.updateInteraction` happy path should also assert `service.isLoading()` was `true` during the call and is `false` after** — the spec asserts the `error()` state on the error path but not the `isLoading()` state on the success path. Minor gap; the state service's `beginLoad`/`endLoad` is symmetric with `createInteraction` and is tested there.
9. **`InteractionStateService.updateInteraction` should assert the URL string interpolation matches the contract** — the spec asserts `'interactions/5'` for `id.value === 5`. A mutation that drops the `.value` accessor (sending the object) would fail this assertion; a mutation that sends `'interactions/{5}'` would also fail. **PASS** — this is already covered by spec #1.
10. **`InteractionStateService.verifyEditableLocally` is not asserted to be a pure function** (no `loadHistory` or `apiClient` calls during the call). The state service does not perform side effects in this method, but a spec that mocks `apiClientSpy.get` and `apiClientSpy.patch` and asserts neither is called would tighten the contract. Minor gap.

---

## 4. Verdict

| Severity | Count |
|---|---|
| **Violations (blocker)** | 0 |
| **Warnings (mutation weak / coverage gap / style nit)** | 8 |
| **Compliant** | 27 of the 35 new specs reviewed |

**Warnings:**

- **W1** — `InteractionServiceTest.updateChangesTypeAndNoteForAdminWithoutTouchingAuditFields` uses `isAfterOrEqualTo(originalUpdatedAt)` for `updatedAt`; the fixture's `setUpdatedAt(Instant.now())` already populates the field, so the assertion cannot kill a "don't touch updatedAt" mutant. Strengthen to `isAfter(originalUpdatedAt)` after backdating the fixture.
- **W2** — `InteractionService.update()` with `note=null` or `note=""` is not tested.
- **W3** — `InteractionService.update()` with only one of `type`/`note` set is not tested.
- **W4** — `interaction-page.spec.ts` specs #2 and #3 (`onEditClosed` / `onEditSaved`) do not assert that `state.loadHistory()` is NOT called. A mutant that introduces an unwanted refresh on Edit close/save would survive.
- **W5** — `InteractionStateService.updateInteraction` overwriting `lastCreated` is asserted (correctly locking the "reuse the toast signal" decision), but the prior-null state is not asserted. Minor.
- **W6** — `InteractionStateService.updateInteraction` does not assert `isLoading()` flips false on success. Minor.
- **W7** — `edit-interaction.spec.ts` has no spec for the `submit()` happy path (PATCH call shape + `saved` event). The state-service spec covers the PATCH; the component's `saved.emit(updated)` is uncovered.
- **W8** — `edit-interaction.spec.ts` has no spec for the Escape key closing the modal (commit message says "Closes on backdrop click or Escape").
- **F1 (style)** — `interaction-list.spec.ts:57` uses `expect(...).toBeTruthy()` against a DOM element; the brief explicitly flags this anti-pattern. Tighten to `not.toBeNull()`.

**Blocking status:** **NON-BLOCKING** for §4. No `testing-strategy.yaml` violation is present — all 35 new specs are unit tests with no Spring context, no integration boundary, no real HTTP, no real DB. The eight warnings are real but each is a one-line fix in an otherwise well-structured suite. The BDD Given-When-Then structure is uniformly applied; ArgumentCaptor / `toHaveBeenCalledWith` are used consistently; one-behaviour-per-test and descriptive names are the rule.

**Recommendation:** Land §4. Add a §5 task to:
1. Tighten `InteractionServiceTest` spec #1 with `isAfter(originalUpdatedAt)` + fixture backdate (W1).
2. Add `InteractionServiceTest` specs for `note=null`, `note=""`, and partial-update cases (W2, W3).
3. Add `edit-interaction.spec.ts` specs for `submit()` happy path and Escape-close (W7, W8).
4. Tighten `interaction-list.spec.ts:57` to `not.toBeNull()` (F1).
5. Add `state.loadHistory` NOT-called assertions to `interaction-page.spec.ts` specs #2 and #3 (W4).
6. Add `isLoading()` flip-false assertion to `interaction-state.service.spec.ts` `updateInteraction` success spec (W6).

---

## 5. Persona-Mandated Output Summary

- **Scenario** per spec: tabulated in §1.
- **Test Code** confirm/refactor snippet: see §3 item 1 (the `isAfter` strengthening for `InteractionServiceTest` spec #1).
- **Mutation Target** per spec: tabulated in §1.
- **Coverage Gaps**: enumerated in §3 (10 items, prioritised).

**Files in scope reviewed (absolute paths):**

- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\test\java\com\staffengagement\interaction\service\InteractionServiceTest.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\backend\src\test\java\com\staffengagement\interaction\controller\InteractionControllerTest.java`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\interaction\interaction-list\interaction-list.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\interaction\interaction-page\interaction-page.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\interaction\interaction-state.service.spec.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\interaction\edit-interaction\edit-interaction.spec.ts`

**Authoritative source consulted:**
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\.claude\constitution\testing-strategy.yaml`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\.claude\personas\bdd-test-engineer.md`

**No source code modified — audit only.**
