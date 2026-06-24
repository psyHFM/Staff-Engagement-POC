## Why

The POC already records employees (Phase 1), their interactions (Phase 2), follow-up tasks (Phase 3), and their portfolio of skills (Phase 4). Phase 5 — the Skills register — turns that data into the central question the product must answer: **"Who's strong on Angular?"**. ATSE1-20 is the backend slice of Phase 5: it aggregates skill entries across every employee's portfolio and exposes a ranked, filterable, paginated search endpoint.

This story is backend-only. It consumes the frozen `PortfolioContract` read model (already returning `SkillStrength` with `employeeName`) and extends the frozen `EmployeeContract` with one additive bulk-read method so the aggregator can enumerate employees without importing any other module's internals.

## What Changes

- **Additive contract extension**: `EmployeeContract` gains `List<EmployeeSummary> allEmployees()`; `EmployeeService` implements it.
- **New `skills` backend module** under `com.staffengagement.skills`:
  - `SkillsService implements SkillsContract` — aggregates `SkillStrength` across all employees via `PortfolioContract`, filtering by skill name (case-insensitive) and minimum years, then sorting/paginating in memory.
  - `SkillsController` — `GET /api/v1/skills` with query params `name`, `minYears`, `sort`, `offset`, `limit`.
  - `SkillsErrorHandler` — module-local `@RestControllerAdvice` mapping validation errors to the uniform `ErrorEnvelope`.
- **Unit tests** (BDD Given-When-Then, JUnit 5 + Mockito) covering aggregation, filtering, pagination, sorting, and RBAC.

## Capabilities

### New Capabilities
- `skills-service`: `SkillsService implements SkillsContract` and the in-memory aggregation logic that answers "Who's strong on Angular?".
- `skills-api`: REST endpoint `GET /api/v1/skills` returning a `Paged<SkillStrength>` (employee id, name, skill, years, project count), filterable by skill name and minimum years, sortable by `years` or `projectCount`.
- `skills-contract-extension`: additive `EmployeeContract.allEmployees()` enabling cross-module bulk reads without exposing repositories.
- `skills-tests`: BDD unit tests for the service and controller, plus coverage for the contract extension.

### Modified Capabilities
- `employee-service`: adds `allEmployees()` to `EmployeeService` as part of its `EmployeeContract` implementation.
- `employee-contract`: one additive method on the frozen `EmployeeContract` interface.

## Impact

- **New code:** `backend/src/main/java/com/staffengagement/skills/**` and `backend/src/test/java/com/staffengagement/skills/**`.
- **Modified code:** `backend/src/main/java/com/staffengagement/shared/api/EmployeeContract.java` and `backend/src/main/java/com/staffengagement/employee/service/EmployeeService.java` (additive only).
- **No new database tables:** the read model is built from existing `portfolio_skill` data through `PortfolioContract`; no Liquibase changeset is required for this story.
- **No shared files edited:** `master.yaml`, `application.yml`, `pom.xml`, and other `shared/**` files remain untouched.
- **ArchUnit:** the `skills` module must depend only on `EmployeeContract` and `PortfolioContract`; no imports of `employee.*`, `portfolio.*` internals.
- **Frontend:** out of scope; the `features/skills` UI is a separate story.
