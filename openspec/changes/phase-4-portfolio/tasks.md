## 1. Backend Foundation — Persistence & Domain

> **Personas required:** *Modular Monolith Architect* + *Constitutional Backend Developer* (`.claude/personas/`) for aggregate shape and package layering; *Constitution Guard* (`.claude/personas/constitution-guard.md`) for migration-rule compliance.

- [ ] 1.1 Create Liquibase changesets under `db/changelog/modules/portfolio/` for `portfolio` (unique `employee_id` FK), `portfolio_skill` (`skill`, `years >= 0`, `project_count >= 0`), `portfolio_education`, `portfolio_project`, `portfolio_link`; IDs prefixed `portfolio-NNN`; do not touch `master.yaml`
- [ ] 1.2 Implement `Portfolio` aggregate root + child entities (`PortfolioSkill`, `PortfolioEducation`, `PortfolioProject`, `PortfolioLink`) in `com.staffengagement.portfolio.domain` (anemic, Lombok)
- [ ] 1.3 Implement repositories in `com.staffengagement.portfolio.repository` (one per entity; no cross-module repository imports)

## 2. Backend Service & Contract

> **Personas required:** *BDD Test Engineer* (`.claude/personas/bdd-test-engineer.md`) for BDD unit tests + PITest; *Constitution Guard* + *Modular Monolith Architect* for cross-module boundary via `EmployeeContract` only.

- [ ] 2.1 Implement `PortfolioService implements PortfolioContract` in `com.staffengagement.portfolio.service` — `portfolioFor(EmployeeId)` returning `PortfolioSummary` with `List<SkillStrength>`; resolve `employeeName` via `EmployeeContract.findById`; validate existence via `EmployeeContract.exists`
- [ ] 2.2 Implement skill-entry validation (reject negative `years`/`projectCount`, blank `skill`) and idempotent 1:1 portfolio upsert
- [ ] 2.3 Write BDD (Given-When-Then) JUnit5 + Mockito unit tests for `PortfolioService`, mocking `EmployeeContract` and repositories (no Spring context, no DB)
- [ ] 2.4 Run PITest; ensure mutation score >= 80% and JaCoCo coverage >= 80% for the portfolio module

## 3. Backend API

> **Personas required:** *Constitution Guard* (`.claude/personas/constitution-guard.md`) via `/api-check`; *Modular Monolith Architect* for layer adherence (`controller/ → service/`).

- [ ] 3.1 Create `PortfolioController` — `GET /api/v1/employees/{id}/portfolio` (empty portfolio for existing-but-unset, 404 envelope for unknown employee)
- [ ] 3.2 Implement `PUT /api/v1/employees/{id}/portfolio` (full replace: delete + reinsert child rows)
- [ ] 3.3 Implement skill sub-resource CRUD: `POST /api/v1/employees/{id}/portfolio/skills`, `PUT/DELETE .../skills/{entryId}`
- [ ] 3.4 Implement education, project, and link sub-resource CRUD under `.../portfolio/{education|projects|links}` and `.../{sub}/{entryId}`
- [ ] 3.5 Verify kebab-case URLs, camelCase JSON (`projectCount`, `employeeId`), unwrapped responses, uniform `ErrorEnvelope` on 4xx, `/api/v1` prefix
- [ ] 3.6 Run `/api-check` and resolve all Violations ❌

## 4. Frontend State & UI

> **Personas required:** *Angular State Architect* (`.claude/personas/angular-state-architect.md`) for Signals/`toSignal()`/`computed()` and unidirectional flow; *BDD Test Engineer* for Jest unit tests + Stryker; *Constitution Guard* for the append-only `routes.ts` touch.

- [ ] 4.1 Create `features/portfolio/` and `PortfolioStateService` (Signals): active portfolio `signal()`, per-section `computed()` views, `toSignal()` HTTP bridge, co-located API calls/side effects, no `BehaviorSubject`
- [ ] 4.2 Implement HTTP client calls for `GET`/`PUT` portfolio and sub-resource CRUD
- [ ] 4.3 Build portfolio editor components (skills with years + project count, education, projects, links) that dispatch to the state service
- [ ] 4.4 Append exactly one lazy `loadChildren` line to `routes.ts` (kebab-case path); touch no other shared file
- [ ] 4.5 Write Jest Given-When-Then unit tests for `PortfolioStateService` and components (mock HTTP)
- [ ] 4.6 Run Stryker; ensure frontend mutation score >= 80% and coverage >= 80% for the portfolio feature

## 5. Verification & Quality Gates

> **Personas required:** *Constitution Guard* (`.claude/personas/constitution-guard.md`) for the final red-team across all dimensions.

- [ ] 5.1 Run `/arch-verify` — confirm `portfolio` imports no other module's `repository/`/`domain/` and ArchUnit denylist test passes
- [ ] 5.2 Run `/constitution-audit` — Compliant ✅ on tech stack, API standards, testing strategy, backend arch, frontend state
- [ ] 5.3 Confirm `PortfolioContract` implemented verbatim (no frozen-contract edits, additive only)
- [ ] 5.4 Verify Phase 4 exit criteria: capture/edit a person's portfolio incl. skill years + project counts; `PortfolioContract` implemented; ArchUnit green; CI green