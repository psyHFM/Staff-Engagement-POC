## Why

The repository has a constitution (`.claude/constitution/` v1.1.0) but no application
code, CI, or orchestration. `ROADMAP.md §3` makes Phase 0 the **serial prerequisite**
for Phases 1–5: until a modular-monolith skeleton with frozen contracts, ArchUnit
boundaries, a JWT/RBAC stub, and Docker Compose exist, no splice can branch and run in
parallel without merge conflicts. This change stands up that foundation so the five
domain splices (Employee, Interaction, Task, Portfolio, Skills) can proceed in parallel.

## What Changes

- **Backend skeleton** — Spring Boot 3.3 / Java 21 / Maven (with `mvnw` wrapper), base
  package `com.staffengagement`, layered modules (`controller/ → service/ → repository/`
  + anemic `domain/`), and a `shared/` foundation owned and frozen by Phase 0.
- **`shared/kernel`** — typed IDs (`EmployeeId`, `InteractionId`, `TaskId`,
  `PortfolioId`) and the `InteractionType` enum (`check-in`, `mentoring`, `catch-up`,
  `performance`, `other`).
- **`shared/error`** — uniform error envelope (`@RestControllerAdvice`) per
  `api-standards.yaml`.
- **`shared/security`** — JWT + Spring Security + RBAC `@PreAuthorize` stub (one
  in-memory user, roles `EMPLOYEE`, `MANAGER`).
- **`shared/api` (FROZEN contracts)** — port interfaces + summary DTOs encoding the
  v1.1.0 domain model: `EmployeeContract`, `InteractionContract.findBySubject`
  (exposing `type`/`subject`/`facilitator`), `TaskContract` (optional source
  `InteractionId`), `PortfolioContract`, `SkillsContract`, plus `EmployeeSummary`,
  `InteractionSummary`, `TaskSummary`, `PortfolioSummary`, `SkillStrength`, `Paged`,
  `PageRequest`. No implementations yet — Phases 1–5 implement them.
- **Liquibase foundation** — `master.yaml` with `includeAll` over
  `db/changelog/modules/` + one baseline changeset; per-module changelog folders
  reserved.
- **ArchUnit baseline** — enforces `controller → service → repository` layering, no
  cross-module `repository`/`domain` imports, contracts are interfaces, no circular
  module dependencies.
- **Health stub** — `GET /api/v1/health` returns 200 (kebab-case, protected by the
  security stub) proving the layout compiles and runs.
- **Frontend skeleton** — Angular 22 workspace under `frontend/`: `app.config.ts`,
  `routes.ts` with the append-one-line-per-feature convention + one stub lazy route,
  `shell/` (layout, nav, auth gate login stub), `shared/` (HTTP client with uniform
  error handling, base state service via Signals + `toSignal()`, PrimeIcons), and the
  `features/` folder convention (`employee/`, `interaction/`, `task/`, `portfolio/`,
  `skills/`). Jest + JSDOM (`jest-preset-angular`) + Stryker configured; `angular-eslint`
  with a `lint` npm script.
- **DevOps** — `docker-compose.yml` (Postgres + backend + frontend),
  `backend/Dockerfile` (multi-stage Maven), `frontend/Dockerfile` (nginx serve `dist/`),
  `.env.example`.
- **CI + meta** — port `.github/workflows/ci.yml` (backend Java 21 + Maven
  build/test/PITest; frontend Node 22 + Angular lint/build/test),
  `.github/pull_request_template.md`, `CONTRIBUTING.md` from the
  `feature/git-workflow-setup` branch, and merge `.gitignore`.

## Capabilities

### New Capabilities
- `backend-foundation`: modular-monolith backend skeleton — `shared/{kernel,error,security,api}`
  with the frozen contracts and v1.1.0 domain types, Liquibase foundation, ArchUnit
  boundary baseline, and the `/api/v1/health` stub.
- `frontend-foundation`: Angular 22 workspace shell — `app.config.ts`, append-per-feature
  `routes.ts`, `shell/` auth gate, `shared/` HTTP+state utilities, `features/` folder
  convention, Jest+Stryker+ESLint tooling.
- `devops-foundation`: Docker Compose orchestration (Postgres + backend + frontend),
  Dockerfiles, `.env.example`, the GitHub Actions CI pipeline, PR template,
  CONTRIBUTING guide, and merged `.gitignore`.

### Modified Capabilities
<!-- None — no existing specs in openspec/specs/. -->

## Impact

- **New code**: `backend/` (Maven project), `frontend/` (Angular workspace),
  `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `.env.example`.
- **New CI/meta**: `.github/workflows/ci.yml`, `.github/pull_request_template.md`,
  `CONTRIBUTING.md`, merged `.gitignore`.
- **Frozen contracts**: `shared/api/**` becomes the cross-module contract surface every
  later splice codes against; changes after Phase 0 are additive-only (roadmap amendment
  for breaking changes).
- **Dependencies**: Spring Boot 3.3.x, Liquibase, Lombok, PostgreSQL driver, ArchUnit,
  PITest, JaCoCo (backend); Angular 22, RxJS, PrimeIcons, jest-preset-angular, Stryker,
  angular-eslint (frontend); Postgres + Docker Compose (infra). Locked by Phase 0 —
  splices must not add dependencies.
- **No behavior removed**: greenfield; nothing existing is broken. No domain module
  logic is implemented in Phase 0.