## Why

The system records who people are (Employee), what's been discussed (Interaction), and what's outstanding (Task), but there is no place to capture *what someone is capable of* — their skills, education, projects, and public links. Without a portfolio, the POC cannot deliver capability #3 ("see the whole person") nor feed the Skills register centrepiece (Phase 5), which answers **"Who's strong on Angular?"** using portfolio skill entries (years + project count). Phase 4 fills that gap with a per-employee portfolio module, developed in parallel against the frozen `EmployeeContract`.

## What Changes

- **Backend Portfolio Module**: a new modular-monolith module `com.staffengagement.portfolio` containing:
    - `Portfolio` aggregate (one per employee) with four entry collections: skill entries (skill name, years, project count), education entries, project entries, and public links.
    - `PortfolioService implements PortfolioContract` (the frozen port from `shared/api/`), exposing the read model the Skills register (Phase 5) will aggregate.
    - `PortfolioController` providing REST endpoints for portfolio retrieval and editing.
- **Database Persistence**: new `portfolio_*` Liquibase tables under `db/changelog/modules/portfolio/` (portfolio header + child tables for skills, education, projects, links), with a FK back to `employee`.
- **Frontend Portfolio Feature**: a new Angular feature folder `features/portfolio` providing:
    - A portfolio editor (skills with years + project count, education, projects, links).
    - `PortfolioStateService` using Angular Signals (unidirectional flow per `frontend-state.yaml`).
- **Routing**: appending one lazy-loaded `loadChildren` line for the Portfolio feature to `routes.ts` (append-only coordination point).
- **Quality Assurance**: BDD-style unit tests (Given-When-Then) for all business logic, verified via PITest (backend) and Stryker (frontend); ArchUnit boundary test ensuring `portfolio` only depends on `EmployeeContract`.

## Capabilities

### New Capabilities
- `portfolio-persistence`: Liquibase `portfolio_*` schema and the `Portfolio` entity / repository lifecycle backing the per-employee portfolio.
- `portfolio-api`: REST contract under `/api/v1/employees/{id}/portfolio` (and sub-resource CRUD for skills, education, projects, links) — kebab-case URLs, camelCase JSON, unwrapped responses, uniform error envelope, offset pagination.
- `portfolio-service`: `PortfolioService` implementing the frozen `PortfolioContract`, including validation against `EmployeeContract` and the read model consumed by the Skills register.
- `portfolio-ui`: Angular feature folder with `PortfolioStateService` (Signals) and the portfolio editor components, lazy-routed.

### Modified Capabilities
None. (Phase 4 consumes the frozen `EmployeeContract`; it adds no requirement changes to existing specs.)

## Impact

- **Codebase**: new packages in `backend/.../portfolio/**` and `frontend/.../features/portfolio/**`; one append-only line in `frontend/.../app/routes.ts`. No edits to frozen `shared/**` or another module's files.
- **API**: new endpoints under `/api/v1/employees/{id}/portfolio` and `/api/v1/employees/{id}/portfolio/{skills|education|projects|links}`.
- **Dependencies**: depends only on the frozen `EmployeeContract` (Phase 0) for subject existence checks. No new third-party dependencies (dependency set is locked in Phase 0).
- **Database**: new `portfolio_*` tables via Liquibase, owned by this splice.
- **Downstream**: Phase 5 (Skills register) develops against the frozen `PortfolioContract` that this splice implements.