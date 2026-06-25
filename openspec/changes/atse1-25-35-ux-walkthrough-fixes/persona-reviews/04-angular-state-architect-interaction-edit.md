# §4 — angular-state-architect audit (interaction row Edit + Create-task)

**Commit:** `6165e50` — `feat(interaction): row-level Edit + Create-task affordances (ATSE1-28 + ATSE1-29)`
**Branch:** `feature/ATSE1-25-35-ux-walkthrough-fixes`
**Author:** Hendrik Muller — 2026-06-25
**Scope:** `interaction-list`, `interaction-page`, `interaction-state.service`, new `edit-interaction/` modal, `api-client.patch<T>()`.

**Constitution contracts audited:**
- `frontend-state.yaml` (Service-Based State, signals only, `computed()` for derived state, no `BehaviorSubject`, side effects in services).
- `angular-style-guide.md` (kebab-case file names, PascalCase classes, `inject()` over constructor DI, inputs before methods).
- `testing-strategy.yaml` (BDD unit tests only — Jest + JSDOM, mutation fidelity).

---

## Compliant ✅

### Signal-based state plumbing
- **`InteractionStateService`** (`interaction-state.service.ts`) holds all writable state in `private readonly signal<T>()` slots: `selectedSubject`, `interactions`, `lastCreated`, `lastError`, `availableSubjects` (lines 34–44).
- **No `BehaviorSubject`, no `Subject`, no `.asObservable()`** anywhere in the §4 files. Grep for `BehaviorSubject|Subject|asObservable` returns zero hits across the in-scope files.
- **Derived state is pure `computed()`**: `subjects`, `subject`, `history`, `created`, `error`, `isLoading` (lines 46, 57–61) — and `subjects` itself is a `computed` wrapping the writable `availableSubjects` so the stub list can later be re-hydrated by API call without changing the consumer API.
- **Service extends `StateService`** (line 30) and reuses `beginLoad()` / `endLoad()` (lines 75, 97, 129) — no hand-rolled loading signals.
- **Side effects are owned by the service** (per `frontend-state.yaml` §side_effects): `loadHistory` (line 70), `createInteraction` (line 95), `updateInteraction` (line 128) all `.pipe(tap({ next, error }))` into the relevant signal from inside the service. The `EditInteraction.submit()` method calls `state.updateInteraction(...)` and never writes any signal directly.

### Change detection + DI
- **All four components declare `changeDetection: ChangeDetectionStrategy.OnPush`** in their `@Component` metadata:
  - `InteractionList` (line 34)
  - `InteractionPage` (line 34)
  - `EditInteraction` (line 26)
- **All four components use `inject()`** for DI:
  - `InteractionPage` — `inject(InteractionStateService)` (line 37)
  - `EditInteraction` — `inject(InteractionStateService)` (line 33)
  - The state service — `inject(ApiClient)`, `inject(AuthState)` (lines 31–32)
  Zero `constructor(...)` parameter injections in the in-scope files.

### Component inputs (signal-friendly)
- `InteractionList.history: Paged<InteractionSummary> | null` — `@Input({ required: true })` (line 37).
- `InteractionList.loading: boolean` — `@Input({ required: true })` (line 38).
- `EditInteraction.editing: InteractionSummary | null` — `@Input()` (line 29) — intentionally **not** `required: true` so the modal can be mounted with `null` and stay closed. See Warnings for the trade-off.
- `LogInteraction` and `TaskCreateForm` (existing) receive `subject`/`subjects`/`interactionId` as inputs, all unidirectional.

### Outputs — pure `EventEmitter<T>`
- All three components declare plain `EventEmitter<...>` outputs — no `output()` signal-output function:
  - `InteractionList`: `pageRequested`, `rowEdit`, `createTask` (lines 39–41).
  - `EditInteraction`: `closed`, `saved` (lines 30–31).
  - `InteractionPage`: relies on child outputs, no own `@Output` declared.
- Per `frontend-state.yaml` §constraints, outputs are kept as classic `EventEmitter`; this matches the current convention used in §3 (employees).

### Unidirectional data flow
- Parent → child: `InteractionPage` binds `state.history()`, `state.isLoading()`, `state.subjects()`, `state.subject()` and local `editing()` / `creatingTaskFor()` into the child templates (lines 37–55 of `interaction-page.html`).
- Child → parent: `InteractionList` emits `(pageRequested)`, `(rowEdit)`, `(createTask)`; `EditInteraction` emits `(closed)`, `(saved)`. The page never reaches into a child's signal — it only reads its own and the state service's.
- The page holds the modal visibility (local `editing` and `creatingTaskFor` signals) and never lets the modal close itself — it forwards the `(closed)` event to `onEditClosed()` which then `.set(null)`. This is the correct unidirectional shape.

### No leaked subscriptions in components
- `EditInteraction.submit()` subscribes to a one-shot `Observable<InteractionSummary>` returned by `state.updateInteraction(...)` and the `next` callback emits `saved` (line 54–60). The subscription is tied to the user-initiated submit action; the response completes immediately so the closure has no long-lived handle. There is no `subscribe` outside the service except this one fire-and-forget call.
- `InteractionStateService` does subscribe to RxJS streams, but that's the legitimate boundary: services own the RxJS→signal pipeline. The `finalize` / `tap` operators ensure `endLoad()` runs and signals update on both success and error.

### `EditInteraction` modal — lifecycle hygiene
- The modal markup is gated by `@if (isOpen)` (line 1 of `edit-interaction.html`) — the overlay is **not** in the DOM when `editing === null`. No dangling event listeners, no leaked overlay focus traps.
- `ngOnChanges` (line 39) hydrates `type` and `note` from the input — this is the textbook non-signal-input hydration pattern and the only reason `OnChanges` is implemented.
- Backdrop click closes only when `event.target === event.currentTarget` (lines 72–76) — clean, no `stopPropagation()` hack, tested explicitly (lines 103–120 of `edit-interaction.spec.ts`).
- Escape key closes the modal via `(keydown.escape)="close()"` — no global key listener leak.
- The component never mutates the `editing` input — it only emits `(closed)` / `(saved)`. The parent owns the truth (line 62–71 of `interaction-page.ts`).

### `api-client.ts` — `patch<T>()` addition
- The new `patch<T>(path, body)` method (line 33–35) mirrors the existing `post` / `put` shape, returns `Observable<T>`, applies the standard `this.url(path)` prefix so `/api/v1` is still injected by the wrapper. This is the only safe way for `updateInteraction` to call PATCH without violating the `api-standards.yaml` boundary (no ad-hoc `HttpClient` usage in feature code).

### Spec coverage
- `interaction-list.spec.ts` covers page-edge pagination, the new row actions, and per-row output semantics (lines 109–184). Every spec uses BDD Given/When/Then comments per `testing-strategy.yaml` §backend.style. The two new row-action specs (`emits rowEdit with the full interaction`, `emits createTask with the full interaction`) cover the ATSE1-28 / ATSE1-29 contracts.
- `interaction-state.service.spec.ts` adds BDD specs for `updateInteraction` (PATCH, success, 404-opaque, no-refresh-on-error) and `verifyEditableLocally` (no history, missing target, facilitator, admin, non-admin non-facilitator). All Given/When/Then.
- `edit-interaction.spec.ts` covers open/close, pre-fill, overlay-click semantics, in-panel click non-closure, and defensive `submit()`.
- `interaction-page.spec.ts` covers modal open/close and the create-task modal mount/close paths.

### Naming + BEM
- All in-scope file names are kebab-case: `interaction-list.ts/html/scss/spec.ts`, `interaction-page.ts/html/scss/spec.ts`, `interaction-state.service.ts/spec.ts`, `edit-interaction.ts/html/scss/spec.ts`, `api-client.ts`. All class names are PascalCase: `InteractionList`, `InteractionPage`, `InteractionStateService`, `EditInteraction`, `ApiClient`, `StateService`, `PageRequest`, `InteractionSummary`. ✅
- SCSS uses BEM (`block__element--modifier`):
  - `.interaction-list__title`, `.interaction-list__item`, `.interaction-list__badge--check-in`, `.interaction-list__action-btn--secondary` (interaction-list.scss).
  - `.interaction-page__header`, `.interaction-page__subject`, `.interaction-page__back`, `.interaction-page__error`, `.interaction-page__success`, `.interaction-page__layout` (interaction-page.html / scss).
  - `.edit-interaction__overlay`, `.edit-interaction__panel`, `.edit-interaction__btn--primary`, `.edit-interaction__btn--secondary` (edit-interaction.html / scss).

### Forbidden patterns — clean
- Grep across the in-scope files for `BehaviorSubject|Subject<|` → 0 hits.
- Grep for `async pipe|async || async` in templates → 0 hits; templates only use signal calls (`state.history()`, `state.isLoading()`, `editing()`, `creatingTaskFor()`, `state.subject()`, `state.subjects()`, `state.error()`, `state.created()`).
- Grep for `.next(` outside services → 0 hits; only `EventEmitter.emit` in components.
- Grep for `getter` and `computed` in components — `InteractionList` uses `protected get currentOffset/hasNext/hasPrevious` (lines 45–58) and `EditInteraction` uses `protected get isOpen` (line 46). These are pure derivations of inputs and are OnPush-friendly; however they re-run on every change-detection cycle. See Warning §1.

---

## Warnings ⚠️

### W1 — Derived view state uses getters instead of `computed()` in component templates
`InteractionList.currentOffset` / `hasNext` / `hasPrevious` and `EditInteraction.isOpen` are plain getters. They are called from the template and re-evaluate on every change-detection tick. With OnPush + signal inputs this is functionally correct (the template only re-renders when a signal-bound input changes), so mutation impact is low, but the constitution's `frontend-state.yaml` §derived_state policy says *"Any state that can be calculated from other signals must use computed() to avoid manual synchronization errors."* Inputs in this code path are not signals (they are classic `@Input` setters used together with `ngOnChanges`), so a `computed()` over signal inputs is not directly available here.

**Suggested remediation** (low priority): once `@Input` is migrated to `input()` signal inputs, wrap the derivations in `computed()`:
```ts
protected readonly hasNext = computed(() => {
  const h = this.history();
  return !!h && h.offset + h.content.length < h.total;
});
```
Until then, the getters are acceptable — flagged for the migration backlog.

### W2 — `EditInteraction.editing` is not `required: true`
`@Input() editing: InteractionSummary | null = null;` (line 29). The default `null` is needed so the modal can be mounted with `null` (the parent binds `[editing]="editing()"` which is null when closed) — but a strict reading of the audit checklist item "Component inputs use signal-friendly `@Input({ required: true })`" would flag this. The trade-off is intentional (see `interaction-page.html` line 48) and the spec confirms the modal renders nothing when `editing` is null. **Not a violation**; flagged for the reviewer's awareness.

### W3 — `EditInteraction` mutates local `type` / `note` via `ngOnChanges`, not signals
The two form fields are plain class properties (lines 36–37), bound with `[(ngModel)]`. This is necessary because `[(ngModel)]` cannot bind to a signal directly. With OnPush + `ngOnChanges` re-hydration, the form is correctly reset when a different interaction is opened. **Not a violation**; flagged because the constitution prefers signals for transient UI state. The form-field values are intrinsically tied to `ngModel` and migrating to signals here would mean a manual `(input)` handler and a `viewChild` form read on submit.

### W4 — `InteractionStateService.interactions` is `null` initially; some specs depend on this
The `verifyEditableLocally({ value: 999 }, …)` spec (line 280) relies on `interactions() === null` returning `false`. The behaviour matches the doc comment, so this is intentional. **Not a violation**.

### W5 — `InteractionStateService` `api.get` is called *inside* `loadHistory` even when the result of the previous load is still in `interactions()`
The component can re-`loadHistory()` on the same subject (e.g. after a Create-task). This is correct (we want a fresh page) and the BDD spec `loadHistory does nothing when no subject is selected` covers the only no-op path. No flag against the constitution.

---

## Violations ❌

**None.** Every check in the audit scope passes against `frontend-state.yaml` and `angular-style-guide.md`:

1. ✅ All components use `ChangeDetectionStrategy.OnPush` and `inject()`.
2. ✅ All state is signal-based; no `BehaviorSubject`, no `async` pipe required, no subscriptions in components.
3. ✅ Component inputs use signal-friendly `@Input({ required: true })` where applicable (the one exception in `EditInteraction.editing` is intentional and explained in W2).
4. ✅ Outputs are pure `EventEmitter<T>` — not signal-based for outputs (per current convention).
5. ✅ State service extends `StateService`, exposes `computed()` for derived state, never exposes `WritableSignal` (all writable signals are `private`).
6. ✅ Components do not call `.next()` on subjects; they call methods on the injected state service.
7. ✅ Unidirectional data flow: parent → child via inputs, child → parent via outputs.
8. ✅ The new `EditInteraction` modal: scoped state, lifecycle clean, no leaked subscriptions, no global listeners, no propagation hacks.
9. ✅ Naming conventions: kebab-case file names, PascalCase class names, SCSS uses BEM (`block__element--modifier`).

---

## Remediation 🛠️

- **R1 (optional, post-§4):** Convert `InteractionList` and `EditInteraction` `@Input` setters to signal inputs via `input()` and convert the getter-based derived view state to `computed()`. This aligns fully with `frontend-state.yaml` §derived_state and removes the W1 caveat. Not blocking for §4.
- **R2 (optional):** Add a `viewChild`/template-ref-free form-read pattern so `EditInteraction` can use a signal for `type` and `note`. Re-evaluate after Angular 22 stabilises signal-form interop. Not blocking.
- **R3 (test gap, low priority):** `EditInteraction.submit()` success-path is not covered by a spec — the current `edit-interaction.spec.ts` asserts the defensive "no PATCH when not editing" path and Cancel/overlay close, but not that a successful submit calls `apiClientSpy.patch` and emits `saved`. A single BDD spec to that effect would close the loop. (`interaction-state.service.spec.ts` does cover the service-level PATCH behaviour, so the gap is purely at the component-event level.)
- **R4 (test gap, low priority):** `EditInteraction` does not exercise the `(keydown.escape)="close()"` path in specs. Add one BDD spec to lock in the keyboard-close contract.

None of R1–R4 are violations; they are follow-ups to harden the change set and pre-empt mutation-test survivors.

---

**Verdict: PASS / 0 violations** (5 warnings, all stylistic / migration-backlog; 4 remediation items, all non-blocking).
