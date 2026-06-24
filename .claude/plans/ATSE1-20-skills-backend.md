# Plan: ATSE1-20 — Backend Skills register aggregation + `/skills` filtering + tests

## Context
- **Jira:** ATSE1-20 (Story) under Epic ATSE1-6 "Phase 5 — Skills register (centrepiece: 'Who's strong on Angular?')".
- **Constitution:** Phase 5 is a parallel splice that owns `backend/.../skills/**` and `frontend/.../features/skills/**`, depends on the frozen `PortfolioContract` (and may use `EmployeeContract` additively).
- **Current state:**
  - `Employee` and `Portfolio` backend modules exist and are green.
  - Frozen contracts exist: `EmployeeContract`, `PortfolioContract`, `SkillsContract`, `SkillStrength`, `Paged`, `PageRequest`.
  - `PortfolioService` already returns `SkillStrength` with `employeeName` resolved via `EmployeeContract`.
  - No `skills` backend package exists yet; the frontend `features/skills` folder only contains a `.gitkeep`.
- **Scope of this story:** backend only (matches the Jira title). Frontend skills UI is a separate story.

## Goal
Implement `SkillsService implements SkillsContract` that answers **"Who's strong on Angular?"** by aggregating `PortfolioSummary` skill entries across employees, exposed as `GET /api/v1/skills?name=angular&minYears=3&sort=years,desc&offset=0&limit=20`.

## Key design decision
The `SkillsContract` surface is `strongIn(String skill, int minYears, PageRequest)`. To aggregate, the service needs the set of all employees (to ask `PortfolioContract` for each portfolio). `EmployeeContract` currently exposes only `findById`, `exists`, and `findByEmail` — no bulk list.

**Chosen approach: additive contract extension.**
- Add `List<EmployeeSummary> allEmployees()` to `EmployeeContract`.
- This is a **coordination-level additive change** (ROADMAP §2.2 allows additive contract changes; no existing method changes).
- `EmployeeService` implements it by returning all employees from its repository.
- `SkillsService` then iterates `employeeContract.allEmployees()`, calls `portfolioContract.portfolioFor(id)` for each, collects matching `SkillStrength` entries, filters by `minYears`, sorts, and paginates in memory.

**Rejected alternatives:**
- Directly importing `portfolio` repositories → violates modular-monolith boundaries (ArchUnit).
- Maintaining a dedicated skills projection table → would require either cross-module events (not in architecture) or a circular `PortfolioService → SkillsContract` dependency, which is over-engineering for a POC when the issue explicitly calls the projection "optional".
- Adding `allPortfolios()` to `PortfolioContract` → also a contract change, but still requires name resolution; reusing `portfolioFor` per employee is already implemented and returns `employeeName`.

## Files to create / modify

### OpenSpec proposal
Create `openspec/changes/atse1-20-skills-backend/`:
- `.openspec.yaml` — schema marker.
- `proposal.md` — why/what/capabilities/impact.
- `design.md` — design decisions, deferred items, contract change rationale.
- `tasks.md` — checkable implementation tasks.
- `specs/skills-service/spec.md` — BDD requirements for `SkillsService`.
- `specs/skills-api/spec.md` — BDD requirements for `GET /api/v1/skills`.
- `specs/skills-contract/spec.md` — additive `EmployeeContract.allEmployees()` requirement.
- `specs/skills-tests/spec.md` — test requirements.

### Backend implementation
1. `backend/src/main/java/com/staffengagement/shared/api/EmployeeContract.java`
   - Add `List<EmployeeSummary> allEmployees();`
2. `backend/src/main/java/com/staffengagement/employee/service/EmployeeService.java`
   - Implement `allEmployees()` returning all employees mapped to `EmployeeSummary`.
3. New package `backend/src/main/java/com/staffengagement/skills/`:
   - `service/SkillsService.java` — implements `SkillsContract`.
   - `controller/SkillsController.java` — `GET /api/v1/skills`.
   - `controller/SkillsErrorHandler.java` — module-local error handler.
4. `backend/src/main/resources/db/changelog/modules/skills/` — no migration needed for the in-memory aggregation approach; if a future story switches to a projection, it lands here.

### Tests (BDD, JUnit 5 + Mockito)
1. `backend/src/test/java/com/staffengagement/skills/service/SkillsServiceTest.java`
2. `backend/src/test/java/com/staffengagement/skills/controller/SkillsControllerTest.java`
3. Extend `backend/src/test/java/com/staffengagement/employee/service/EmployeeServiceTest.java` to cover `allEmployees()`.
4. `backend/src/test/java/com/staffengagement/skills/controller/SkillsAccessControlTest.java` — reflection-based RBAC check.

### Files we will NOT touch
- `shared/**` other than `EmployeeContract` (additive method only).
- `employee/**` other than `EmployeeService` (implements the new method).
- `portfolio/**` — no changes; Skills reads via the frozen `PortfolioContract` only.
- `master.yaml`, `application.yml`, `pom.xml` — locked.
- Frontend files — out of scope for ATSE1-20.

## Personas to use
1. **Constitution Guard** — audits the plan and final code against `backend-architecture.yaml`, `api-standards.yaml`, `testing-strategy.yaml`, and `ROADMAP.md` §2.
2. **Modular Monolith Architect** — validates that the `skills` package ownership is disjoint, the additive `EmployeeContract` change is minimal, and no illegal cross-module imports are introduced.
3. **BDD Test Engineer** — designs the Given-When-Then test scenarios and mutation targets before/during implementation.
4. **Constitutional Backend Developer** — reviews the Java code for idioms, layering, `@PreAuthorize`, pagination, and error-envelope compliance.

## Implementation sequence
1. **Propose:** write the OpenSpec change documents and run the four personas as reviewers (Constitution Guard + Modular Monolith Architect + BDD Test Engineer + Constitutional Backend Developer) against the proposal.
2. **Implement backend:**
   a. Add `allEmployees()` to `EmployeeContract`.
   b. Implement `allEmployees()` in `EmployeeService`.
   c. Create `SkillsService` + `SkillsController` + `SkillsErrorHandler`.
   d. Write unit tests.
3. **Verify:** run `mvn -f backend/pom.xml test`, check ArchUnit, JaCoCo coverage on the new module, and PITest if `pom.xml` already covers `com.staffengagement.skills.*` (otherwise document the same deferred mutation gap as earlier phases).
4. **Commit and push** on the current branch `feature/ATSE1-15-interaction-frontend` or a new dedicated branch, per user preference.

## Risks / deferred items
- **Performance:** in-memory aggregation is O(n) over employees and their skills. This is acceptable for the POC scope; a future projection story can optimize if needed.
- **PITest target classes:** `pom.xml` may still pin `targetClasses` to `com.staffengagement.shared.*`. If so, backend mutation testing for the `skills` module is deferred to a coordination PR (same pattern as Phase 2/3/4).
- **Case-insensitive skill matching:** design will treat skill names case-insensitively (e.g. `?name=angular` matches "Angular" and "angular"). This matches natural user search behavior and is documented in the spec.
- **No Liquibase change:** because the read model is built from existing `portfolio_skill` data via contracts, no new table is required for this story.
