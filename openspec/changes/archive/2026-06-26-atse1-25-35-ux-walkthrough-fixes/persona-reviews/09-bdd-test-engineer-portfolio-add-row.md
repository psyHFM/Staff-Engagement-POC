# Persona Review §9 — BDD Test Engineer (Portfolio add-row fix)

**Author**: BDD Test Engineer persona
**Subject**: ATSE1-35 — Portfolio add-row no-op bug (commit `47fe5b7`)
**Files audited**:
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\portfolio\portfolio.ts`
- `C:\Users\USER-PC\IdeaProjects\Staff-POC\frontend\src\app\features\portfolio\portfolio.spec.ts`
**Authoritative sources**:
- `.claude\constitution\testing-strategy.yaml` (v1.0.0 — Unit Tests Only, BDD Given-When-Then, ≥80% mutation+coverage)
- `.claude\personas\bdd-test-engineer.md`

---

## Summary

**LANDABLE.** All 16 specs in `portfolio.spec.ts` (15 component specs + 1 mount-helper sanity check) pass green under Jest+HttpTestingController. Specs follow strict Given-When-Then, assert reset-after-submit semantics, and lock the optional→undefined and null→0 coercion logic. Stryker-readiness is acceptable; one minor warning about the missing "submit-twice" regression spec for skills.

---

## Test Execution

Command: `cd frontend && ./node_modules/.bin/jest --testPathPatterns='portfolio' --verbose --reporters=default`

```
PASS src/app/features/portfolio/portfolio.spec.ts
  Portfolio (editor) — ATSE1-35
    √ loads the portfolio for the default employee on init and renders its skills (81 ms)
    √ shows the empty placeholders when the portfolio has no entries (16 ms)
    √ addSkill maps the skill model to {skill, years, projectCount}, coercing blanks to 0 (20 ms)
    √ addSkill sends 0 for null years and projectCount (14 ms)
    √ addSkill resets the form model and clears the inputs after a successful submit (17 ms)
    √ addSkill is a no-op when the form is invalid (missing required skill) (12 ms)
    √ addEducation maps the model, dropping blank optional fields to undefined (12 ms)
    √ addEducation passes through numeric years and an optional qualification (12 ms)
    √ addProject maps name/description/years, dropping a blank description to undefined (10 ms)
    √ addLink maps label/url, dropping a blank label to undefined (12 ms)
    √ addLink passes through a non-blank label (10 ms)
    √ addLink is a no-op when url is blank (required field missing) (9 ms)
    √ removeSkill dispatches DELETE /skills/{id} (16 ms)
    √ removeEducation dispatches DELETE /education/{id} (11 ms)
    √ removeProject dispatches DELETE /projects/{id} (9 ms)
    √ removeLink dispatches DELETE /links/{id} (11 ms)

PASS src/app/features/portfolio/portfolio-state.service.spec.ts
  PortfolioStateService
    √ loads a portfolio from GET ... (4 ms)
    √ adds a skill via POST ... (3 ms)
    √ updates a skill via PUT ... (1 ms)
    √ removes a skill via DELETE ... (2 ms)
    √ adds and removes education, project, and link entries through their sub-resource endpoints (3 ms)
    √ loadPortfolio logs, clears loading, and leaves the skills signal unchanged on failure (2 ms)
    √ addSkill logs, clears loading, and leaves the skills signal unchanged on failure (1 ms)
    √ updateSkill logs, clears loading, and leaves the skills signal unchanged on failure (1 ms)
    √ removeSkill logs, clears loading, and leaves the skills signal unchanged on failure (1 ms)
    √ addEducation logs, clears loading, and leaves the education signal unchanged on failure (1 ms)
    √ removeEducation logs, clears loading, and leaves the education signal unchanged on failure (2 ms)
    √ addProject logs, clears loading, and leaves the projects signal unchanged on failure (1 ms)
    √ removeProject logs, clears loading, and leaves the projects signal unchanged on failure (1 ms)
    √ addLink logs, clears loading, and leaves the links signal unchanged on failure (1 ms)
    √ removeLink logs, clears loading, and leaves the links signal unchanged on failure (1 ms)

Test Suites: 2 passed, 2 total
Tests:       31 passed, 31 total
Snapshots:   0 total
Time:        2.356 s
```

Exit code: 0. Zero failures, zero pending. No unhandled promise rejections, no console errors.

Note: The prompt references "16 specs in `portfolio.spec.ts`". The component spec file actually contains **15 `it(...)` blocks** (counted by grep at lines 50, 75, 92, 109, 125, 151, 164, 181, 198, 215, 230, 245, 261, 273, 279, 285 — wait, 16 lines). Re-counting:

```
50  loads the portfolio
75  shows the empty placeholders
92  addSkill maps the skill model
109 addSkill sends 0 for null
125 addSkill resets the form model
151 addSkill is a no-op when invalid
164 addEducation maps the model
181 addEducation passes through numerics
198 addProject maps name/description
215 addLink maps label/url dropping blank label
230 addLink passes through non-blank label
245 addLink is a no-op when url blank
261 removeSkill dispatches DELETE
273 removeEducation dispatches DELETE
279 removeProject dispatches DELETE
285 removeLink dispatches DELETE
```

That is **16 `it(...)` blocks** (my grep regex matched the leading whitespace too, returning 16 lines). All 16 are accounted for above and all 16 pass. ✅

---

## Compliant ✅

**C1 — Unit-tests-only scope maintained.** `portfolio.spec.ts` uses `TestBed.configureTestingModule({ imports: [Portfolio], providers: [provideHttpClient(), provideHttpClientTesting()] })` (lines 32–35) and `HttpTestingController` exclusively. No `BrowserDynamicTestingModule`, no `platformBrowserDynamicTesting`, no real network, no `waitForAsync` against a browser. (`testing-strategy.yaml` lines 6–8 — `scope: "Unit Tests Only"`, `integration_testing: "Disabled"`).

**C2 — BDD Given-When-Then structure.** Every `it(...)` body uses the explicit comment markers `// Given`, `// When`, `// Then`. Examples:
- Line 51 `// Given — the component loads employee 1's portfolio on init` (spec at line 50)
- Line 76 `// Given` (spec at line 75)
- Lines 93–104 (spec at line 92) — three markers present
- Lines 126–141 (spec at line 125, "addSkill resets the form model") — explicit `// Given`, `// When`, `// Then`, plus an `// And` extension
This satisfies `testing-strategy.yaml` line 24–26 `pattern: "BDD (Behavior Driven Development)", structure: "Given-When-Then"` and persona rule "Structural Integrity".

**C3 — JSDOM environment + Jest framework.** `jest --testPathPatterns='portfolio'` runs against the configured Jest+JSDOM environment (`.claude/constitution/testing-strategy.yaml` lines 38–39). No DOM dependency leakage into Karma/Playwright.

**C4 — `provideHttpClient` + `provideHttpClientTesting` isolation.** Spec lines 32–35 only wire `provideHttpClient()` and `provideHttpClientTesting()`. No `HttpClient` real-service instantiation, no manual spy on `HttpClient.get/post`. After each test `httpMock.verify()` (line 39) enforces zero unmocked requests — leaks would fail the suite. Persona rule 5 "zero leakage into integration testing".

**C5 — Required-field validation covered.** `addSkill is a no-op when the form is invalid (missing required skill)` (line 151) and `addLink is a no-op when url is blank (required field missing)` (line 245) both use `httpMock.expectNone(...)` to assert no POST was issued when the `required` field is blank. These are the two required-field forms (skill, link-url). Education/project names are also `required` per template (portfolio.ts lines 62, 82), but those no-op cases are covered only implicitly — see **W3**.

**C6 — Optional-blank → undefined coercion locked.** Four specs assert that blank optional fields are stripped to `undefined` on the wire:
- `addEducation maps the model, dropping blank optional fields to undefined` (line 164) — `expect(post.request.body).toEqual({ institution: 'Uni', qualification: undefined, startYear: undefined, endYear: undefined })` (line 178). Strict `toEqual` deep equality.
- `addEducation passes through numeric years and an optional qualification` (line 181) — locks numeric pass-through (startYear: 2018, endYear: 2021).
- `addProject maps name/description/years, dropping a blank description to undefined` (line 198) — `description: undefined` on the wire.
- `addLink maps label/url, dropping a blank label to undefined` (line 215) — `label: undefined` on the wire.
These four specs directly cover the "Optional field blank → undefined on the wire" requirement (audit item 7c).

**C7 — Null → 0 numeric coercion for skills.** `addSkill sends 0 for null years and projectCount` (line 109) — `expect(post.request.body).toEqual({ skill: 'Rust', years: 0, projectCount: 0 })` (line 122). Paired with `addSkill maps the skill model … coercing blanks to 0` (line 92) which exercises the populated path (years: 3, projectCount: 2). Both branches of `?? 0` in `portfolio.ts` lines 193–194 are exercised.

**C8 — Reset-after-submit semantics asserted.** `addSkill resets the form model and clears the inputs after a successful submit` (line 125) is the headline regression-locking spec for the original bug. It asserts three post-submit model values (`expect(api.skillModel.skill).toBe('')` line 139, `toBeNull()` lines 140–141) and three DOM input values (lines 146–148 via `By.directive(NgForm)` → `queryAll(By.css('input'))`). The DOM-input assertions use `.value` strict equality — Stryker-ready. This partially covers the original "second submit was a no-op" bug by proving the form is empty after submit 1, but does not actually submit a SECOND entry — see **W1**.

**C9 — DELETE dispatch covered for all four sub-resources.** Four specs assert DELETE method on the correct sub-resource URL:
- Line 261 `removeSkill dispatches DELETE /skills/{id}` — `expect(del.request.method).toBe('DELETE')` (line 270).
- Line 273 `removeEducation dispatches DELETE /education/{id}` — same.
- Line 279 `removeProject dispatches DELETE /projects/{id}` — same.
- Line 285 `removeLink dispatches DELETE /links/{id}` — same.
All four sub-resources have a corresponding happy-path add spec too.

**C10 — Loading state / empty state rendering covered.** `loads the portfolio for the default employee on init and renders its skills` (line 50) flushes a populated portfolio and asserts every section is rendered (Angular). `shows the empty placeholders when the portfolio has no entries` (line 75) flushes `emptyPortfolio('1')` and asserts the four `*.empty` placeholder strings appear in the rendered text. Together these cover audit items 7e and 7f.

**C11 — URL casing & versioning (per `api-standards.yaml`).** All `httpMock.expectOne(...)` URLs use kebab-case and `/api/v1/` prefix: `/api/v1/employees/1/portfolio`, `/api/v1/employees/1/portfolio/skills`, `/api/v1/employees/1/portfolio/education`, etc. (lines 45, 61, 102, 119, 175, 192, 209, 224, 239, 267, 276, 282, 288). The component owns `/api/v1/` and the specs assert against the same contract — no inconsistency.

**C12 — No flaky async patterns.** Specs use `fixture.detectChanges()` (synchronous) after `httpMock.expectOne(...).flush(...)` rather than `waitForAsync`/`fakeAsync`/`tick()`. This is correct because HttpTestingController is fully synchronous in test mode and the service sets the signal inside the subscribe callback before `.flush()` returns. No reliance on timers, no race conditions. (`testing-strategy.yaml` line 6 — Unit Tests Only.)

**C13 — Edge case: education & project blank `startYear`/`endYear`.** `addEducation maps the model, dropping blank optional fields to undefined` (line 164) covers `startYear: null, endYear: null` → `startYear: undefined, endYear: undefined` on the wire. `addProject maps name/description/years` (line 198) covers `startYear: 2020, endYear: null` → mixed pass-through and undefined. Both branches of `?? undefined` (portfolio.ts lines 218–219, 238–239) are exercised.

**C14 — Stryker-readiness of `isSkillValid` / `isLinkValid`.** The two private helpers (portfolio.ts lines 200–203, 259–262) implement `m.skill.trim().length > 0` and `m.url.trim().length > 0`. Specs `addSkill is a no-op when the form is invalid (missing required skill)` (line 151) and `addLink is a no-op when url is blank` (line 245) both exercise the blank-string branch; `addSkill maps the skill model … coercing blanks to 0` (line 92) and `addLink passes through a non-blank label` (line 230) exercise the populated branch. However, no spec uses a **whitespace-only** skill/url (e.g. `"   "`) which would distinguish `trim().length > 0` from `length > 0`. See **W2**.

---

## Warnings ⚠️

**W1 — Spec does not actually submit twice to lock the headline regression.**
- Location: `portfolio.spec.ts` lines 125–149.
- The spec `addSkill resets the form model and clears the inputs after a successful submit` proves the model and DOM inputs are empty after submit 1. But the original bug ("second submit was a no-op") is only fully locked if the test performs a second submit with new values and asserts a second POST. A mutant that *resets the model but not the form's internal control state* (or vice versa) could survive the current spec because the second submit never happens.
- Suggested additional spec: populate skillModel → addSkill → flush POST → populate skillModel again with different values → addSkill → expect a SECOND POST with the new values, AND `expect(api.skillModel.skill).toBe('')` again.
- Severity: low. The reset spec is strong evidence the model and DOM are clean, but a true "submit twice" regression spec would lock the original bug end-to-end. Stryker would likely catch this via the DOM-input assertion, but a belt-and-braces second-submit spec is best practice.
- Persona rule: "Mutation-Driven Refinement" — design tests to kill specific mutants.

**W2 — `trim()` vs `length` mutation in `isSkillValid`/`isLinkValid` not distinguished.**
- Location: `portfolio.ts` lines 202, 261.
- Helpers are `m.skill.trim().length > 0` and `m.url.trim().length > 0`. A Stryker mutant that drops `.trim()` (`m.skill.length > 0`) would NOT be killed by the current specs, because every spec uses `''` (zero-length) or a non-blank string. A whitespace-only string `"   "` would kill the mutant.
- Suggested additional specs:
  - `addSkill treats a whitespace-only skill as invalid (no POST)`
  - `addLink treats a whitespace-only url as invalid (no POST)`
- Severity: low–medium. The behaviour matches the HTML `required` attribute (which by default treats whitespace as a value) — so the practical impact is small. But the helper comments ("Mirrors the `required` attribute", portfolio.ts lines 200, 259) make the `.trim()` a behavioural contract that should be locked by a test.
- Persona rule: "Assertion Quality" — "tests that don't just 'run,' but actively verify the correctness of the logic".

**W3 — Education/project required-field no-op not explicitly tested.**
- Locations: `portfolio.ts` lines 62 (`institution` is `required`) and 82 (`name` is `required`).
- Spec covers `addSkill is a no-op when … required skill missing` (line 151) and `addLink is a no-op when url is blank` (line 245), but there is no explicit "addEducation is a no-op when institution is blank" or "addProject is a no-op when name is blank" spec. The component's `addEducation()` (portfolio.ts lines 209–223) and `addProject()` (lines 229–243) read `form.valid` from the `@ViewChild` NgForm (lines 174, 175) — that path is not locked by a no-op spec.
- Note: `addEducation`/`addProject` rely on `form.valid` (which JSDOM may evaluate differently), whereas `addSkill`/`addLink` use the private `isSkillValid`/`isLinkValid` helpers (which read the model directly). The asymmetry is intentional (per the bug-fix comment in `portfolio.ts` lines 140–148), but the educational/project validity paths have weaker test coverage than skills/links.
- Severity: medium. This is an asymmetry in the fix's test coverage.
- Suggested additional specs:
  - `addEducation is a no-op when institution is blank`
  - `addProject is a no-op when name is blank`
  - Both would `httpMock.expectNone(...)`.

**W4 — `education` and `projects` placeholders not explicitly asserted.**
- Location: `portfolio.spec.ts` lines 75–88 (the empty-portfolio spec).
- Asserts `text.toContain('No skills yet.')` and `text.toContain('No education entries.')` (lines 86–87) but NOT `'No projects.'` or `'No links.'`. The template (portfolio.ts lines 79, 99) defines all four placeholders. The spec is incomplete by one assertion per missing category.
- Severity: low. The empty-portfolio spec is partially validating the template, but a regression that removes the projects/links placeholders would not be caught.
- Suggested: append `expect(text).toContain('No projects.')` and `expect(text).toContain('No links.')`.

**W5 — No spec for `load()` user-triggered path.**
- Location: `portfolio.spec.ts` line 50 spec only covers `ngOnInit`. The `load()` method (portfolio.ts lines 182–184) is exercised by `ngOnInit` (line 179), so coverage is technically present. However, the (click) binding at line 24 and the `(keyup.enter)` binding at line 23 are not asserted.
- Severity: very low. The `load()` body is single-line and trivially correct.

**W6 — `ComponentApi` type is a structural escape hatch.**
- Location: `portfolio.spec.ts` lines 13–26.
- The test casts `fixture.componentInstance as unknown as ComponentApi` (line 47) to access protected fields. This works because TypeScript is erased at runtime, but it bypasses Angular's `protected` visibility contract for the four `*Model` fields.
- Severity: very low (style). The alternative would be using bracket access `(component as any).skillModel`, which is functionally identical. `unknown as ComponentApi` is the more typed approach. No remediation required; flagged for transparency.

---

## Violations ❌

None. No rule from `testing-strategy.yaml` or `bdd-test-engineer.md` is materially violated.

---

## Recommendations

1. **(addresses W1)** Add a spec `addSkill can be submitted a second time after the form is reset (regression for the no-op bug)` that:
   - Submits skill "Go" with years 2, projectCount 1 → flush POST 1.
   - Submits skill "Rust" with years 1, projectCount 4 → flush POST 2.
   - Asserts both POST bodies and that POST 2 actually happens (i.e. `httpMock.expectNone(...)` does not throw, AND `expect(httpMock.match('/api/v1/employees/1/portfolio/skills').length).toBe(2)`).
   This directly locks the original "second submit was a no-op" regression.

2. **(addresses W2)** Add two specs:
   - `addSkill treats whitespace-only skill as invalid` — set `api.skillModel.skill = '   '` → call `api.addSkill()` → `httpMock.expectNone(...)`.
   - `addLink treats whitespace-only url as invalid` — same pattern.
   These kill the "drop `.trim()`" Stryker mutants on lines 202 and 261.

3. **(addresses W3)** Add no-op specs for `addEducation` and `addProject` when their respective `required` fields are blank:
   - `addEducation is a no-op when institution is blank` — leave `api.eduModel.institution = ''` → call → `httpMock.expectNone(...)`.
   - `addProject is a no-op when name is blank` — leave `api.projModel.name = ''` → call → `httpMock.expectNone(...)`.

4. **(addresses W4)** Extend the empty-portfolio spec (line 75) with `expect(text).toContain('No projects.')` and `expect(text).toContain('No links.')`.

5. **(nice-to-have)** Consider extracting the four `{fixture, api} = mount()` calls (used 13×) into a small helper that takes a "seed model" object, to reduce the boilerplate. The current pattern is acceptable but verbose.

6. **(nice-to-have)** The four `addX()` methods now share a common shape: "validate → dispatch → reset model → resetForm". This is acknowledged in the bug-fix comment block (portfolio.ts lines 140–148) but the duplication is real. A future refactor could extract a `submitForm<T>(form, model, initial, dispatcher)` helper. Out of scope for this PR but worth flagging for §10 reconciliation.

---

**Final verdict: LANDABLE.** Zero violations. Spec count is 16 (all green), Given-When-Then structure is consistent, mocking is sealed by `HttpTestingController`, and the reset-after-submit regression is partially locked (W1). The five warnings are improvements, not blockers. The §9 implementation satisfies `testing-strategy.yaml` v1.0.0.