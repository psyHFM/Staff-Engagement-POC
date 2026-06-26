# Angular State Architect — Audit Report

**Subject:** §9 portfolio add-row no-op fix (ATSE1-35) in commit `47fe5b7`
**Auditor:** angular-state-architect persona
**Date:** 2026-06-25
**Scope:** the §9 slice of `openspec/changes/atse1-25-35-ux-walkthrough-fixes/`
**Authoritative spec:** `.claude/constitution/frontend-state.yaml` v1.1.0 + `.claude/angular-style-guide.md`

**Files audited**

| Status   | Path                                                          |
|----------|---------------------------------------------------------------|
| modified | `frontend/src/app/features/portfolio/portfolio.ts`            |
| modified | `frontend/src/app/features/portfolio/portfolio.spec.ts`       |

---

## State Map (`Portfolio` component, after §9)

| Member                        | Kind                          | Owner            | Notes                                                                |
|-------------------------------|-------------------------------|------------------|----------------------------------------------------------------------|
| `state`                       | inject of state service       | `Portfolio`      | Root-level `PortfolioStateService`. Read-only access from component. |
| `employeeId`                  | writable `signal('1')`        | `Portfolio`      | Local UI state (transient: which employee is being viewed).          |
| `portfolio`                   | `computed(() => state.portfolio())` | `Portfolio` | Read-only view of the global portfolio signal.                       |
| `state.loading()` / `.error()` | signal-reads                | service          | Inherited from `StateService` base.                                  |
| `skillModel` / `eduModel` / `projModel` / `linkModel` | **plain class fields** (NOT signals) | `Portfolio` | Local form-bound model objects. Reassigned on submit.                |
| `skillForm` / `eduForm` / `projForm` / `linkForm`     | `@ViewChild` `NgForm` refs    | `Portfolio`      | Used for `form.valid` and `form.resetForm()`.                        |

The service side is unchanged from before §9 and is compliant (`PortfolioStateService` in `portfolio-state.service.ts`).

---

## Data Flow Diagram

1. **User types into an add-row input**
   `[(ngModel)]="skillModel.skill"` → two-way binding writes to the plain
   object field `skillModel.skill`. Angular cannot observe that mutation
   on its own — but because the user is the one driving the change (and
   the submit handler reads the same object synchronously), no
   change-detection signal is required for this UX path.

2. **User submits the form**
   `(ngSubmit)="addSkill()"` → `addSkill()` reads the same `skillModel`
   object, calls `state.addSkill(employeeId(), {...})` →
   `PortfolioStateService` performs the POST and updates its private
   `_portfolio` signal inside the handler's subscribe block →

3. **Signal re-evaluation + UI re-render**
   `portfolio` (computed) re-emits → `*ngIf="portfolio() as p"` /
   `*ngFor="let s of p.skills"` re-render the new row.

4. **Form reset**
   `this.skillModel = { skill: '', years: null, projectCount: null }`
   reassigns the local field reference, AND `this.skillForm.resetForm()`
   asks Angular Forms to clear its internal control state + `pristine`
   flags. The two reset operations are partially redundant — see
   Findings.

This is **unidirectional on the global axis** (component → service →
signal → UI). It is **not signal-observed on the local axis** — see
W1 below.

---

## Compliant ✅

- **The bug fix itself is correct and necessary.**
  Before §9 the template had bare `ngModel` with no two-way binding
  (lines 41-44 in the pre-fix file). Angular Forms registered zero
  controls in the `NgForm` group because `ngModel` (one-way) doesn't
  register a control unless it is paired with a `name` AND a `[(…)]`
  binding. `form.value` was therefore `{}` and every `addX()` was a
  no-op. The new `[(ngModel)]="skillModel.skill"` pattern is the
  textbook fix for template-driven forms and is exactly what the
  Angular Style Guide and FormsModule docs prescribe. Compliant.

- **`portfolio = computed(() => this.state.portfolio())`.**
  `portfolio.ts:138`. Local derived view of the global signal — matches
  `derived_state` ("Any state that can be calculated from other signals
  must use `computed()`"). Never `.set()`'d anywhere.

- **`employeeId = signal('1')`.**
  `portfolio.ts:135`. Local UI state via component-level signal, as
  prescribed by `state_hierarchy.local_state.tool`.

- **Components dispatch via service methods — never touch service signals directly.**
  All four `addX()` handlers call `state.addSkill(...)`,
  `state.addEducation(...)`, `state.addProject(...)`, `state.addLink(...)`.
  The service handler updates the `_portfolio` signal inside its own
  subscribe block. This matches `side_effects.placement` and
  `constraints[0]` ("Components must not update global state signals
  directly"). Compliant.

- **No `BehaviorSubject` / `Subject` introduced.**
  Grep confirms no new reactive primitives. The service continues to
  bridge RxJS → Signal via `.set()` / `.update()` inside subscribe.

- **Two-way binding scope is appropriate.**
  The `[(ngModel)]` is scoped to the per-form local model object; no
  two-way binding writes to a global signal. This is consistent with
  how `LogInteraction` (`log-interaction.ts:30-34`) and
  `TaskCreateForm` (`task-create-form.ts:42-46`) bind their own
  in-progress forms, and with `SkillsPage` (`skills-page.ts:26-36`)
  which uses a `signal('')` for the search input.

- **Test coverage is comprehensive and BDD-shaped.**
  `portfolio.spec.ts:91-258` has 16 specs across 5 features
  (load/empty/addSkill/addEducation/addProject/addLink/removeX) and
  exercises both the happy path AND the no-op-when-invalid path
  (`spec.ts:151-162` and `spec.ts:245-257`). The DOM-input reset
  assertion at `spec.ts:144-149` confirms the inputs are actually
  cleared (a regression catch for this exact bug). This is the
  shape the testing-strategy.yaml BDD policy prescribes.

- **No illegal cross-module imports.**
  The component only imports from its own feature folder
  (`./portfolio-state.service`, `./portfolio.model`) and from
  `@angular/*`. Modular Monolith boundary is preserved.

- **`ChangeDetectionStrategy` unchanged** — the component inherits the
  default `Default` strategy. Not signal-observed state, but for a
  template-driven form this is the conventional choice; Zone still
  fires on `(ngSubmit)` and on `(ngModel)` change. Not blocking.

---

## Warnings ⚠️

### W1 — Form models are plain mutable objects, not signals

`portfolio.ts:149-169`:

```ts
protected skillModel: { skill: string; years: number | null; projectCount: number | null } = {
  skill: '',
  years: null,
  projectCount: null
};
protected eduModel: { institution: string; qualification: string; startYear: number | null; endYear: number | null } = { /* ... */ };
protected projModel: { name: string; description: string; startYear: number | null; endYear: number | null } = { /* ... */ };
protected linkModel: { label: string; url: string } = { label: '', url: '' };
```

The file-level doc-comment (`portfolio.ts:7-12`) claims "Local UI
state … lives here as signals", but these four fields are **plain
TypeScript class fields**, not `signal()` wrappers. The rest of the
file consistently uses signals (`signal('1')`, `computed(...)`), so
this is a stylistically inconsistent step backwards.

Why this is still functionally correct today:
- Angular Forms' `[(ngModel)]` writes directly to the bound property
  via zone-patched change detection; the component re-reads the object
  on submit and reads back the latest field values. The UI does not
  need to react to in-form typing outside of the input's own
  redraw.
- The submit handler reassigns the field reference (`this.skillModel =
  { ... }`), which is a structural change the template picks up on
  the next CD cycle.

Why it is still a Warning:
- It silently opts the local form state out of the rest of the
  codebase's signal idiom. The only other place that follows this
  pattern in the codebase is `LogInteraction`
  (`log-interaction.ts:30-34`, pre-existing, also plain fields) and
  `TaskCreateForm.request`
  (`task-create-form.ts:42-46`, pre-existing, also plain fields).
  So there is precedent — but the precedent is also questionable
  against `frontend-state.yaml` and was not introduced by §9.
- If a derived state like "is this form currently submittable?" were
  needed in the template (rather than relying on `[disabled]="!form.valid"`
  which today comes from `@ViewChild NgForm`), `computed()` could not
  be used.
- The reassignment trick (`this.skillModel = { skill: '', ... }`) only
  works because Angular's `[(ngModel)]` does NOT cache the original
  object reference internally — it re-binds on each change-detection
  cycle by reading `skillModel.skill` again. If a future refactor
  introduced a `computed` or `effect` that captured `skillModel`
  once, the reassignment would break it.

**Remediation 🛠️:** Convert each model to a `signal<{...}>({ ... })`
and reset via `.set({ ... })`. The submit handler then reads
`m = this.skillModel()`. This brings the local state in line with
`employeeId` (a signal) and the project's signal-first idiom. NOT
BLOCKING because the current behaviour is correct.

**Reference rule:** `frontend-state.yaml -> primary_mechanism`
("Angular Signals") + `state_hierarchy.local_state.tool`
("component-level signals").

---

### W2 — Mixed validity sources: `form.valid` vs. private `isXValid` mirror methods

`portfolio.ts:188` (`addSkill`) and `portfolio.ts:251` (`addLink`)
call private validators that mirror the `required` HTML attribute:

```ts
private isSkillValid(m: { skill: string }): boolean {
  return m.skill.trim().length > 0;
}

private isLinkValid(m: { url: string }): boolean {
  return m.url.trim().length > 0;
}
```

Meanwhile `addEducation` (`portfolio.ts:210-213`) and `addProject`
(`portfolio.ts:230-233`) read `form.valid` from the `@ViewChild NgForm`.

The asymmetry comes from the JSDOM environment — bare `ngModel`
without a `[(…)]` binding (the pre-§9 bug) prevented Angular Forms
from instantiating the control group. After §9 the controls ARE
instantiated, so `form.valid` *should* be reliable in JSDOM too. The
two handlers that still go through `form.valid` (`addEducation`,
`addProject`) prove this works; the two that don't (`addSkill`,
`addLink`) introduce a parallel source of truth.

Risk: drift between the validator (`isSkillValid`) and the
`required` attribute. If someone adds `minlength="3"` to the skill
input, `isSkillValid` won't pick it up, the submit handler will fire
with a too-short skill, the server may reject it, but the button
state (driven by `[disabled]="!skillForm.valid"`) will already reflect
the new validator. The two views of "valid" disagree.

**Remediation 🛠️:** Use `this.skillForm?.valid` consistently across all
four handlers (delete `isSkillValid` / `isLinkValid`) OR remove the
`required` attributes and let `isSkillValid` be the sole authority.
The former is the smaller diff and matches the post-§9 control
instantiation behaviour the test suite already proves.

**Reference rule:** `frontend-state.yaml -> derived_state`
("must use `computed()` to avoid manual synchronization errors") —
the spirit of the rule applies here even though these are methods, not
signals: a single computed/derived source of truth is preferable to
two parallel validators that can drift.

---

### W3 — Redundant reset: model reassignment vs. `form.resetForm()`

`portfolio.ts:196-197` (and analogues at 221-222, 241-242, 255-256):

```ts
this.skillModel = { skill: '', years: null, projectCount: null };
this.skillForm.resetForm();
```

`form.resetForm()` (Angular Forms API) does two things:
1. Resets every registered control's value to its initial state.
2. Sets `pristine: true` and `touched: false` on each control.

The model reassignment (`this.skillModel = { ... }`) achieves (1)
because the template's `[(ngModel)]` reads back from the new model.

However, (2) — `pristine`/`touched` — is **only** achieved by
`form.resetForm()`. So `form.resetForm()` is NOT redundant on its own.

The redundancy is in the other direction: if you only called
`form.resetForm()` and left `skillModel` alone, the reassignment would
be redundant — but the model is the only thing the test suite inspects
(`portfolio.spec.ts:139-149` asserts `api.skillModel.skill === ''` AND
the input `value === ''`), so we need both.

**Remediation 🛠️:** Keep both. Document the intent with a one-line
comment ("model reassignment clears the bound values; `resetForm()`
clears the control's `pristine`/`touched` flags"). NOT BLOCKING —
the behaviour is correct, just insufficiently documented.

**Reference rule:** `angular-style-guide.md` §4 ("Move complex logic
into the TypeScript class") — a comment is the right answer here.

---

### W4 — Test coverage gap: invalid-form no-op tests don't exercise the disabled button

`portfolio.spec.ts:151-162` (addSkill invalid) and
`portfolio.spec.ts:245-257` (addLink invalid) test that **no POST is
issued**, which is the right functional contract. But neither asserts
that the submit button is `disabled` while the form is invalid — i.e.,
neither asserts the *upstream* gate (the `[disabled]="!skillForm.valid"`
template binding) is doing its job. A regression that disables the
template-level gate would still pass these two specs.

The DOM reset assertion at `spec.ts:144-149` does prove the inputs
are wired to the model after a successful submit, which is the most
important regression catch for ATSE1-35. So coverage is good, not
perfect.

**Remediation 🛠️:** Add two specs that query the `<button>` element
and assert `[disabled]` is `true` while `skillModel.skill === ''` and
`false` after `skillModel.skill = 'X'`. Optional polish.

**Reference rule:** `testing-strategy.yaml -> unit-test fidelity`
(implicit: tests should drive the public contract, not just the happy
path).

---

## Violations ❌

**None.**

The §9 fix is correct, the data flow is unidirectional on the global
axis, the service is unchanged and remains the single owner of the
portfolio signal, and no constitutional rule is broken. The warnings
above are stylistically suboptimal against `frontend-state.yaml`'s
signal-first posture but not rule-breaking. The most consequential
warning (W1) has a clear precedent in `LogInteraction` and
`TaskCreateForm`, both pre-existing.

---

## Cross-references

- `frontend-state.yaml` v1.1.0 → `primary_mechanism` — signals are the
  primary mechanism. The §9 form models are plain objects (W1) but
  the global signal ownership and dispatch pattern is intact.
- `frontend-state.yaml` → `state_hierarchy.local_state.tool` —
  `employeeId` is a signal; the new form models are not (W1).
- `frontend-state.yaml` → `derived_state` — `portfolio = computed(...)`
  is the only derived signal in the component and it is correctly
  declared.
- `frontend-state.yaml` → `side_effects.placement` — all four `addX()`
  handlers call service methods; the service updates its private
  `_portfolio` signal inside the subscribe. Compliant.
- `frontend-state.yaml` → `constraints[0]` — components never touch the
  service's signal directly. Compliant.
- `frontend-state.yaml` → `constraints[1]` — no `BehaviorSubject` or
  `Subject` introduced by §9. Compliant.
- `angular-style-guide.md` §4 ("Class Structure: place Angular-specific
  properties before methods") — the `@ViewChild` properties are
  declared after the `xxxModel` fields but before the methods. Minor
  inconsistency with the style guide but not a violation; the file
  already groups state-related fields together.
- Precedent for plain-object form models:
  `frontend/src/app/features/interaction/log-interaction/log-interaction.ts:30-34`
  and `frontend/src/app/features/task/task-create-form.ts:42-46`.
  These are pre-existing and not introduced by §9 — flagged here for
  future refactor (W1).

---

## Summary

| Severity     | Count |
|--------------|-------|
| Compliant ✅ | 9     |
| Warning ⚠️   | 4     |
| Violation ❌  | 0     |

**Most important issue:** *none blocking.* W1 (form models as plain
objects instead of signals) is the most consequential deviation from
the project's signal-first posture, but (a) the pre-existing
`LogInteraction` and `TaskCreateForm` already establish this pattern
as accepted in the codebase, (b) the global signal ownership and
unidirectional dispatch are intact, and (c) the test suite
specifically asserts the model fields are reset after submit, which
proves the wiring is observably correct. W2 (mixed validity sources)
is the easiest cleanup and would tighten the test surface.

§9 is approved to merge from the Angular State Architect's perspective.
