## 1. OpenSpec proposal
- [x] 1.1 Create `openspec/changes/atse1-20-skills-backend/` with `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`.
- [x] 1.2 Write BDD specs under `specs/{skills-contract,skills-service,skills-api,skills-tests}/`.
- [x] 1.3 Run persona review (Constitution Guard, Modular Monolith Architect, BDD Test Engineer, Constitutional Backend Developer).
- [x] 1.4 Incorporate review feedback: limit ceiling, sort parsing in service, ArchUnit skills rule, additional BDD boundary scenarios.

## 2. Additive contract extension (coordination-level change)
- [x] 2.1 Add `List<EmployeeSummary> allEmployees()` to `EmployeeContract`.
- [x] 2.2 Implement `allEmployees()` in `EmployeeService`.
- [x] 2.3 Add unit test for the new contract method.
- [x] 2.4 Commit these additive shared/employee changes separately as the coordination-level contract extension.

## 3. Skills backend module
- [x] 3.1 Create package `com.staffengagement.skills/{service,controller}`.
- [x] 3.2 Implement `SkillsService implements SkillsContract` with aggregation/filter/sort/page logic; parse `sort` in the service; clamp `limit` to max 100; normalize negative `minYears`.
- [x] 3.3 Implement `SkillsController` with `GET /api/v1/skills` and thin parameter binding.
- [x] 3.4 Rely on `shared.error.GlobalExceptionHandler` for 400/500 mapping; omit module-local error handler.
- [x] 3.5 Add ArchUnit rule in `ArchUnitTest.java` isolating `com.staffengagement.skills..` from other module internals.
- [x] 3.6 Verify no illegal cross-module imports (only `shared.api.*` and `shared.kernel.*`).

## 4. Unit tests
- [x] 4.1 `SkillsServiceTest` — BDD scenarios: no employees, no matches, minYears filter including equality boundary, name matching both directions, pagination including offset-out-of-bounds, sorting both fields/directions, employee-without-portfolio resilience, tie-breaking order, null-skill/name handling.
- [x] 4.2 `SkillsControllerTest` — parameter binding, 400 on blank/missing name, invalid sort direction, default sort delegation, mock service not called on validation failure.
- [x] 4.3 `SkillsAccessControlTest` — reflection-based `@PreAuthorize("isAuthenticated()")` check.
- [x] 4.4 Confirm ArchUnit boundary tests pass.

## 5. Verification
- [x] 5.1 `mvn -f backend/pom.xml test` green (204 tests).
- [x] 5.2 JaCoCo ≥ 80% on new module (skills.service: 89% instructions / 82% branches; skills.controller: 100%).
- [x] 5.3 Document PITest status: `com.staffengagement.skills.*` is not in `pom.xml` `targetClasses`; deferred to a coordination PR (same precedent as interaction/portfolio phases).

## 6. Commit and push
- [x] 6.1 Stage all changes.
- [x] 6.2 Commit the coordination-level contract extension first, then the skills module + tests.
- [x] 6.3 Push to `feature/ATSE1-20-skills-backend`.

## 7. Archive closeout (2026-06-25)
- [x] Retroactive persona review by Constitution Guard, Angular State Architect, BDD Test Engineer (verdict: PASS WITH WARNINGS; zero blocking Violations). Reports at `.claude/plans/atse1-skills-persona-reviews/`.
- [x] The original PR #25 (ATSE1-20 backend) and the downstream PR #26 (ATSE1-21 frontend) + PR #29 (e2e) + PR #32 (shell nav) all reached `main`. The `feature/ATSE1-21-skills-frontend` branch is now stale (4 conflicts vs current main) and was tagged `archive/atse1-21-skills-frontend-branch` for audit, then deleted locally only.
- [x] Non-blocking follow-ups logged in `.claude/plans/atse1-skills-persona-reviews/reconciliation.md`:
  - Add `com.staffengagement.skills.*` to PITest `targetClasses` in `backend/pom.xml:138-143` (W4/W3 across personas; coordination-level config change; out of scope for this archive).
  - Stryker CI invocation not inspected (flag-only; verify in `verify` skill).
- [x] Archived to `openspec/changes/archive/2026-06-25-atse1-20-skills-backend/`. Canonical specs at `openspec/specs/skills-{api,contract,service,tests}/spec.md`.
