## Why

Phase 0 of the roadmap is the serial prerequisite for every later splice. Without a backend skeleton — base package, frozen cross-module contracts, shared kernel, uniform error handling, an auth stub, migration wiring, and ArchUnit boundary enforcement — the five parallel domain splices (Employee, Interaction, Task, Portfolio, Skills) cannot branch independently without merge conflicts or boundary violations. This change stands up that skeleton so ATSE1-8 (Jira) is deliverable and the rest of the roadmap can proceed.

## What Changes

- New Spring Boot (Java 21, Maven) backend project under `backend/`, base package `com.staffengagement`.
- `shared/kernel`: ID value types (`EmployeeId`, `InteractionId`, `TaskId`, `PortfolioId`), the **frozen** `InteractionType` enum (`check-in`, `mentoring`, `catch-up`, `performance`, `other`), and Lombok base entity classes.
- `shared/error`: uniform error envelope via `@RestControllerAdvice` (timestamp, status, error, message, path).
- `shared/security`: JWT + Spring Security + RBAC `@PreAuthorize` **stub** — one in-memory user, roles `EMPLOYEE`, `MANAGER`.
- `shared/api`: **frozen** cross-module port interfaces (`EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`, `SkillsContract`) plus their DTOs (`InteractionSummary`, `TaskSummary`, `PortfolioSummary`, `SkillStrength`, etc.). Empty/stub methods only — implementations belong to later splices.
- Liquibase `master.yaml` with `includeAll` over `db/changelog/modules/` + one baseline changeset.
- ArchUnit boundary baseline test: no cross-module `repository`/`domain` imports; controllers must not touch repositories directly.
- One example stub `GET /api/v1/health` → 200 proving the layout compiles and runs.

## Capabilities

### New Capabilities
- `backend-skeleton`: Maven project layout, base package, Spring Boot bootstrap, application config, and the stub health endpoint.
- `shared-kernel`: ID value types, the frozen `InteractionType` enum, and base entity classes shared across modules.
- `error-handling`: uniform error envelope and global exception handling.
- `auth-stub`: bearer JWT + Spring Security + RBAC `@PreAuthorize` stub with one in-memory user.
- `module-contracts`: frozen cross-module port interfaces and their DTOs.
- `database-migrations`: Liquibase `master.yaml` `includeAll` setup and baseline changeset.
- `architecture-boundaries`: ArchUnit boundary baseline tests enforcing module/layer rules.

### Modified Capabilities
<!-- None — this is the foundational change; no prior specs exist. -->

## Impact

- **Code**: adds `backend/` (Maven, Java 21). No existing backend code to modify.
- **APIs**: introduces `GET /api/v1/health` (stub). No domain REST endpoints yet.
- **Dependencies (locked here, frozen after)**: Spring Boot (web, data-jpa, security), Liquibase, Lombok, PostgreSQL driver, ArchUnit, PITest, JaCoCo; Jackson for JSON.
- **Systems**: Postgres expected via Docker Compose (compose file itself is out of scope — separate task).
- **Contracts**: the port interfaces in `shared/api/` are **frozen** on merge; later splices implement, never redefine (additive changes only).
- **Testing**: JUnit 5 + Mockito (BDD), PITest mutation, JaCoCo ≥ 80%; integration testing remains disabled per `testing-strategy.yaml`.
- **Out of scope**: domain module implementations, frontend, `docker-compose.yml`.