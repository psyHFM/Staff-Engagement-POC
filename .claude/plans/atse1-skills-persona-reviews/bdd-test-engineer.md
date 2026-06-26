# BDD Test Engineer — Phase 5 (Skills) Audit

## Audit Context
Phase 5 Skills test suite (backend + frontend) merged via PRs #25/#26/#29. Retroactive audit. Date: 2026-06-25.

Files reviewed:
- `backend/src/test/java/com/staffengagement/skills/service/SkillsServiceTest.java` (477 lines, 24 scenarios)
- `backend/src/test/java/com/staffengagement/skills/controller/SkillsControllerTest.java` (7 scenarios)
- `backend/src/test/java/com/staffengagement/skills/controller/SkillsAccessControlTest.java` (1 scenario)
- `frontend/src/app/features/skills/skills-state.service.spec.ts` (10 scenarios)
- `frontend/src/app/features/skills/skills-page.spec.ts` (6 scenarios)
- `backend/pom.xml` (PITest config)

---

## Backend — SkillsServiceTest

### Scenarios (n = 24)
| # | Scenario | Mutation Targets Killed | G/W/T? | Pass? |
|---|---|---|---|---|
| 1 | `strongInReturnsEmptyPageWhenNoEmployeesExist` | empty short-circuit (no `allEmployees` → empty page) | ✅ G/W/T | ✅ |
| 2 | `strongInReturnsEmptyPageWhenNoSkillMatches` | filter short-circuit (`contains`/`equals` removal) | ✅ G/W/T | ✅ |
| 3 | `strongInReturnsMatchingSkillEntriesRankedByYearsDescendingByDefault` | default sort direction, `contains` matcher | ✅ G/W/T | ✅ |
| 4 | `strongInFiltersByMinYearsIncludingBoundary` | **>= vs > vs <** boundary mutant — explicit comment in code | ✅ G/W/T | ✅ |
| 5 | `searchNormalizesNegativeMinYearsToZero` | **`Math.max(0, minYears)` clamp** removal | ✅ G/W/T | ✅ |
| 6 | `searchIsCaseInsensitiveForSkillName` | `toLowerCase()`/`equalsIgnoreCase` removal (3-case sweep) | ✅ G/W/T | ✅ |
| 7 | `searchUsesContainsForPartialMatch` | **`contains` vs `equals`** on skill matching — explicitly tested | ✅ G/W/T | ✅ |
| 8 | `searchPagesAfterFilterAndSort` | pagination slice offset+limit, default desc ordering | ✅ G/W/T | ✅ |
| 9 | `searchReturnsEmptyContentWhenOffsetExceedsTotal` | offset-out-of-bounds empty slice | ✅ G/W/T | ✅ |
| 10 | `searchClampsLimitToMax` | **`limit > maxLimit` clamp** (asserted equals `SkillsService.maxLimit()`) | ✅ G/W/T | ✅ |
| 11 | `searchUsesDefaultLimitWhenLimitIsNonPositive` | **limit ≤ 0** clamp (default fallback) | ✅ G/W/T | ✅ |
| 12 | `searchUsesZeroOffsetWhenOffsetIsNegative` | **negative offset clamp** (Math.max(0, …)) | ✅ G/W/T | ✅ |
| 13 | `searchSortsByProjectCountAscending` | comparator direction flip on projectCount+asc | ✅ G/W/T | ✅ |
| 14 | `searchSortsByProjectCountDescending` | comparator direction flip on projectCount+desc | ✅ G/W/T | ✅ |
| 15 | `searchSortsByYearsAscending` | comparator direction flip on years+asc | ✅ G/W/T | ✅ |
| 16 | `searchUsesDefaultDirectionWhenSortHasNoDirection` | default direction (desc) when direction omitted | ✅ G/W/T | ✅ |
| 17 | `searchUsesDefaultSortWhenSortIsBlank` | blank/null sort fallback to `years,desc` | ✅ G/W/T | ✅ |
| 18 | `searchBreaksTiesByOtherStrengthIndicatorThenName` | **default sort tie-break** (years tie → projectCount desc → name asc) | ✅ G/W/T | ✅ |
| 19 | `searchRejectsBlankSkillName` | `isBlank()` guard removal mutant | ✅ When/Then (no Given — assertion-only) | ✅ |
| 20 | `searchRejectsNullSkillName` | null-check guard removal | ✅ When/Then | ✅ |
| 21 | `searchRejectsUnknownSortField` | sort field allow-list removal | ✅ Given/When/Then (Given collapsed) | ✅ |
| 22 | `searchRejectsMalformedSortDirection` | direction allow-list (`asc`/`desc`) removal | ✅ Given/When/Then | ✅ |
| 23 | `searchIgnoresPortfolioEntryWithNullSkillName` | null-skill resilience (filter `Objects.nonNull` / `s != null`) | ✅ G/W/T | ✅ |
| 24 | `searchTieBreakHandlesNullEmployeeName` | null-name tie-break comparator (nullsFirst/nullsLast) | ✅ G/W/T | ✅ |
| 25 (bonus) | `searchSkipsEmployeeWithoutPortfolio` | empty-portfolio handling | ✅ G/W/T | ✅ |
| 26 (bonus) | `searchCollectsMultipleSkillsPerEmployee` | aggregation across multi-skill portfolio | ✅ G/W/T | ✅ |
| 27 (bonus) | `searchDoesNotInvokePortfolioContractWhenNoEmployees` | empty-employees short-circuit `verifyNoInteractions` | ✅ G/W/T | ✅ |

(Total = 27 tests; spec called out "24 scenarios" but file actually contains 27 `@Test` methods — 3 extras covering resilience.)

### Findings
- **Strength**: Explicit `// Given`, `// When`, `// Then` markers are present in every test. A few validation tests merge Given into When/Then (acceptable for assertion-only paths).
- **Strength**: Aggregate scenarios cover both fields (`years`, `projectCount`) × both directions (`asc`, `desc`) — kills comparator-direction mutants on every axis.
- **Strength**: All four pagination edge cases are present (offset>total, limit>max, limit≤0, negative offset).
- **Strength**: Boundary test (#4) explicitly states "kills mutants that replace >= with > or <" in the Then comment.
- **Strength**: Negation-of-minYears (#5) covers the `Math.max(0, minYears)` clamp.
- **Strength**: Default sort tie-break (#18) covers the secondary+tertiary sort keys.
- **Strength**: `verifyNoInteractions(portfolioContract)` (#27) kills the "remove empty-list short-circuit" mutant.
- **Note**: This is a **pure unit test** — `EmployeeContract` and `PortfolioContract` are mocked, no Spring context, no DB. Conforms to `testing-strategy.yaml` `scope: Unit Tests Only`.

---

## Backend — SkillsControllerTest

### Scenarios (n = 7)
| # | Scenario | Mutation Targets Killed | G/W/T? | Pass? |
|---|---|---|---|---|
| 1 | `searchBindsAllParametersAndForwardsToService` | parameter binding order | ✅ G/W/T | ✅ |
| 2 | `searchTrimsWhitespaceFromName` | `String.trim()` removal on `name` | ✅ G/W/T | ✅ |
| 3 | `searchRejectsBlankNameWith400AndDoesNotCallService` | **`Mockito.never()` kills the "skip blank check" mutant** (key target) | ✅ When/Then | ✅ |
| 4 | `searchRejectsNullNameWith400AndDoesNotCallService` | null-check removal + `Mockito.never()` | ✅ When/Then | ✅ |
| 5 | `searchForwardsDefaultSortWhenSortIsNull` | controller does NOT inject a sort default (passes null through) | ✅ G/W/T | ✅ |
| 6 | `searchForwardsProvidedSortString` | sort string pass-through | ✅ G/W/T | ✅ |
| 7 | `searchUsesDefaultOffsetAndLimitWhenOmitted` | default offset/limit applied | ✅ G/W/T | ✅ |

### Findings
- **Strength**: Tests #3 and #4 use `then(skillsService).should(never()).search(...)` — the canonical kill for "skip validation" mutants.
- **Strength**: Tests #5–#7 use `eq(...)` matchers explicitly so accidental default-injection regressions would surface (e.g. controller passing a non-null sort default when none given).
- **Conformance**: Pure Mockito unit test (`@ExtendWith(MockitoExtension.class)`, `@InjectMocks`); no MockMvc, no Spring. Constitution-compliant.

---

## Backend — SkillsAccessControlTest

### Scenarios (n = 1)
| # | Scenario | Mutation Targets Killed | G/W/T? | Pass? |
|---|---|---|---|---|
| 1 | `searchEndpointRequiresAuthenticatedUser` | `@PreAuthorize` annotation removal / `value()` change | ✅ Given/When/Then | ✅ |

### Findings
- Uses **reflection** (`Method.getAnnotation(PreAuthorize.class)`) — keeps the test as a pure unit (no Spring/AOP context).
- Asserts both presence (`isNotNull`) and exact value (`isEqualTo("isAuthenticated()")`).
- **Note**: Behavioural 401/403 envelope tests live in the shared `AuthErrorHandlers` test (Phase 0, out of scope) — appropriate boundary-keeping.
- **Coverage gap (acceptable)**: this test cannot kill "annotation present but AOP disabled" mutants; that requires a `@SpringBootTest` slice which would violate the unit-only rule. Acceptable trade-off.

---

## Frontend — skills-state.service.spec.ts

### Scenarios (n = 10)
| # | Scenario | Mutation Targets Killed | G/W/T? | Pass? |
|---|---|---|---|---|
| 1 | `starts with empty default state` | default-state initializer (`results=null`, `error=null`, `isLoading=false`, `query=''`) | ✅ Then-only (acceptable — assertion of initial state) | ✅ |
| 2 | `search fetches GET /api/v1/skills with the skill name and exposes the page` | happy path: URL `'skills'`, params, signal updates, loading reset | ✅ G/W/T | ✅ |
| 3 | `search sets loading true while the request is in flight` | ⚠️ **WEAK** — see Warning W1 | ✅ G/W/T | ⚠️ |
| 4 | `search with blank name clears results and does not call the API` | **blank-search short-circuit + `toHaveBeenCalledTimes(1)`** (key mutation target) | ✅ G/W/T | ✅ |
| 5 | `search with whitespace-only name is treated as blank` | trim/blank check on input | ✅ G/W/T | ✅ |
| 6 | `search passes options through to the API` | minYears/sort/offset/limit pass-through | ✅ G/W/T | ✅ |
| 7 | `search ignores blank sort option` | blank-sort filter (`if (sort && !sort.isBlank())`) | ✅ G/W/T | ✅ |
| 8 | `search surfaces an API error and clears results and loading` | **`finalize` block on error path** (key target — kills missing error-handler mutant) | ✅ G/W/T | ✅ |
| 9 | `search clears a previous error before a new search` | error reset on new search (kills "append error" mutant) | ✅ G/W/T | ✅ |
| 10 | `clear resets all feature state` | `clear()` body removal | ✅ G/W/T | ✅ |

### Findings
- **Strength**: Default state assertion (#1) covers all four baseline signals.
- **Strength**: Blank-search short-circuit (#4) is the strongest test in the file — it both asserts no API call AND verifies prior call count = 1, so a mutant that "skips the blank check" would still emit a 2nd call.
- **Strength**: Error-path test (#8) uses `throwError(() => apiError())` — distinct success and error code paths.
- **Critical mutation target (`finalize`)**: Both success path (test #2: `expect(service.isLoading()).toBe(false)`) and error path (test #8) assert `isLoading === false` post-completion, so the `finalize` operator removal is killed by either test.

---

## Frontend — skills-page.spec.ts

### Scenarios (n = 6)
| # | Scenario | Mutation Targets Killed | G/W/T? | Pass? |
|---|---|---|---|---|
| 1 | `renders the search input and empty state by default` | default empty DOM (`<input aria-label="Skill search">`, `.skills-results` hidden) | ✅ When/Then | ✅ |
| 2 | `calls the API and displays ranked results when the user types a skill name` | onInput → service.search → DOM render (name + years + projectCount) | ✅ G/W/T | ✅ |
| 3 | `shows a loading indicator while the search is in flight` | ⚠️ **WEAK — see Warning W2** | ✅ G/W/T | ⚠️ |
| 4 | `shows an empty message when no results are returned` | empty-content branch + `.empty-state` text | ✅ G/W/T | ✅ |
| 5 | `clear button resets the input and state` | `clear()` resets `searchTerm` and DOM | ✅ G/W/T | ✅ |
| 6 | `does not call the API for blank input` | blank-input short-circuit at the component level | ✅ When/Then (light Given) | ✅ |

### Findings
- **Strength**: ARIA label assertion (`Skill search`) and class-name selectors ensure accessibility/DOM contract is checked, not just internal state.
- **Strength**: Empty-state message text assertion catches UI-string regression.
- **Strength**: Clear-button test asserts both internal signal (`searchTerm`) and DOM (`.skills-results` absent).

---

## PITest / Mutation Config
- **`com.staffengagement.skills.*` in `targetClasses`? NO** (see `backend/pom.xml` lines 138–143).
  ```xml
  <targetClasses>
    <param>com.staffengagement.shared.*</param>
    <param>com.staffengagement.task.*</param>
    <param>com.staffengagement.employee.*</param>
    <param>com.staffengagement.profile.*</param>
  </targetClasses>
  ```
- **Remediation**: Add `<param>com.staffengagement.skills.*</param>` to the `targetClasses` list. Until then, PITest will not exercise any skills-module mutants, so mutation-score reporting for Phase 5 is silently zero — even though the test suite is mutation-ready.
- **Side-note**: This is a **Warning**, not a Violation, because the underlying tests are well-constructed; the gap is config-only. The skills tests would almost certainly score high under PITest *if* added to scope, based on the explicit boundary/null/clamp assertions visible in the suite.

---

## Compliant ✅
- All tests follow BDD `Given/When/Then` structure (with the acceptable Given-collapse convention used for pure validation tests).
- Pure unit tests only — no Spring context, no DB, no MockMvc, no `@SpringBootTest`. Conforms to `testing-strategy.yaml` `scope: Unit Tests Only`.
- Mutation-target design: boundary cases, null resilience, clamp behaviors, sort tie-breaks, and "service not called on validation failure" all explicitly covered.
- Reflection-based access-control test avoids the Spring-AOP integration pitfall while still asserting the annotation contract.
- Default state, blank-input short-circuit, error surfacing, error clearing, clear() — all covered on the frontend.
- `Math.max(0, x)` clamp mutants are killed by `searchNormalizesNegativeMinYearsToZero` and `searchUsesZeroOffsetWhenOffsetIsNegative`.
- `>=` vs `>` vs `<` boundary mutant is explicitly killed by `strongInFiltersByMinYearsIncludingBoundary` (with comment).
- `contains` vs `equals` mutant is explicitly killed by `searchUsesContainsForPartialMatch`.
- `finalize`/loading-reset mutants are killed by both success and error path tests.

---

## Warnings ⚠️
### W1: skills-state — "loading true while in flight" never observes `isLoading === true`
- **File**: `frontend/src/app/features/skills/skills-state.service.spec.ts` lines 79–88.
- **Issue**: Test mocks `apiClientSpy.get.mockReturnValue(of(page()))` (synchronous observable). `of(...)` emits + completes **synchronously** on subscribe, so by the time `expect(service.isLoading()).toBe(false)` runs the observable is already completed and the `finalize` block has run. The test only asserts the post-completion state, never the in-flight `isLoading === true` state. A mutant that removes the `isLoading = true` line at the start of `search()` would still pass this test.
- **Mutation target**: `isLoading.set(true)` assignment removal.
- **Remediation**: Use `new Subject<T>()` (or `BehaviorSubject`) and push values manually; assert `isLoading === true` immediately after calling `service.search()` and BEFORE emitting. Example:
  ```ts
  it('sets isLoading to true while the request is pending', () => {
    // Given
    const subject = new Subject<Paged<SkillStrength>>();
    apiClientSpy.get.mockReturnValue(subject.asObservable());
    // When
    service.search('Angular');
    // Then — pending, before subject emits
    expect(service.isLoading()).toBe(true);
    subject.next(page());
    subject.complete();
    expect(service.isLoading()).toBe(false);
  });
  ```

### W2: skills-page — same loading-indicator weakness
- **File**: `frontend/src/app/features/skills/skills-page.spec.ts` lines 70–79.
- **Issue**: Identical pattern — `mockReturnValue(of(page()))` is synchronous, so the assertion `expect(fixture.componentInstance.state.isLoading()).toBe(false)` runs after completion. Test name is misleading ("while the search is in flight") but the test does not actually verify in-flight state.
- **Mutation target**: same as W1.
- **Remediation**: Same fix — use a manually-controlled Subject and assert `isLoading === true` before pushing the value.

### W3: PITest `targetClasses` does not include `skills.*`
- **File**: `backend/pom.xml` lines 138–143.
- **Issue**: Phase 5 skills code is not under PITest mutation analysis. Even though the test suite is mutation-quality, no mutants are being generated for the skills package.
- **Remediation**: Add `<param>com.staffengagement.skills.*</param>` to `<targetClasses>`.

### W4: Test count off-by-three vs spec
- **Files**: `SkillsServiceTest.java` has **27 `@Test` methods**, but the audit task description said "24 scenarios." Three extra resilience tests exist (`searchSkipsEmployeeWithoutPortfolio`, `searchCollectsMultipleSkillsPerEmployee`, `searchDoesNotInvokePortfolioContractWhenNoEmployees`) — they are **bonus** and a positive, not a violation. Flagging so the audit count reconciles.

---

## Violations ❌
None. All structural rules from `testing-strategy.yaml` are respected.

---

## Mutation Score Estimate
Assuming `skills.*` is added to PITest scope:
- **Estimated mutants killed**: ~85–92%.
  - SkillsService has roughly 30–40 mutation points (sort comparator, clamps, filters, validators, null guards).
  - 27 targeted tests cover every observable behavior branch; clamp/equals/contains/`>=`/`finalize`/`null`-guard mutants all have explicit dedicated tests.
  - Likely **survivors**: log-message string mutants, dead-code conditional mutants inside sort-allow-list (mutating `"years"` → `"year"` would still produce a valid comparator if comparator is by-name lookup), and possibly the `Optional`-vs-`null` return path on empty portfolios.
- **Without** `skills.*` in PITest scope: reported mutation score for skills is **0% by omission** (warning W3).

---

## Verdict
**PASS WITH WARNINGS**

The skills test suite is structurally compliant with `testing-strategy.yaml`: pure unit tests, BDD Given-When-Then structure, explicit boundary/null/clamp assertions, and direct mutation-target coverage on every critical branch identified by the persona. The two loading-in-flight tests (W1, W2) can be hardened by switching to a manually-controlled `Subject` so the in-flight state is actually observed. Adding `com.staffengagement.skills.*` to the PITest `targetClasses` (W3) is a follow-up config change, not a test rewrite. No constitution violations found.
