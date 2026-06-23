## 1. Branch & CI/meta port

- [x] 1.1 Create `feature/phase-0-foundation` branch off `main`
- [x] 1.2 Port `.github/workflows/ci.yml` from `feature/git-workflow-setup` (read via `git show`, write new file)
- [x] 1.3 Port `.github/pull_request_template.md`
- [x] 1.4 Port `CONTRIBUTING.md`
- [x] 1.5 Merge `.gitignore` (keep Claude-hook + `settings.local.json` entries; add Java/Maven + Node entries)

## 2. Backend build & skeleton

- [x] 2.1 Create `backend/pom.xml` (Spring Boot **3.5.15** — constitution pins no minor; Initializr requires >=3.5.0, 3.3.x no longer offered. Java 21, starters web/data-jpa/security/validation, liquibase, lombok, postgresql, archunit-junit5 1.3.0, pitest 1.15.1 + **pitest-junit5 1.2.2** [bumped from 1.2.1 for JUnit Platform 1.12 compat — see notes], jacoco 0.8.12)
- [x] 2.2 Add Maven wrapper (`mvnw`, `mvnw.cmd`, `.mvn/wrapper/`)
- [x] 2.3 Create `StaffEngagementApplication.java` base package `com.staffengagement`
- [x] 2.4 Create `shared/kernel` ID value types (`EmployeeId`, `InteractionId`, `TaskId`, `PortfolioId`) and `InteractionType` enum
- [x] 2.5 Create `shared/error` uniform envelope (`ErrorEnvelope` record + `@RestControllerAdvice`)
- [x] 2.6 Create `shared/security` JWT + Spring Security + RBAC stub (one in-memory user, roles `EMPLOYEE`/`MANAGER`, `@PreAuthorize`)
- [x] 2.7 Create `shared/api` frozen contracts + DTOs (`EmployeeContract`, `InteractionContract.findBySubject`, `TaskContract` w/ optional source `InteractionId`, `PortfolioContract`, `SkillsContract`, `*Summary`, `Paged`, `PageRequest`)
- [x] 2.8 Create Liquibase `master.yaml` (`includeAll` over `db/changelog/modules/`) + baseline changeset; reserve `modules/` folders
- [x] 2.9 Create `application.yml` (Postgres datasource, JPA ddl:none, Liquibase, JWT stub config)
- [x] 2.10 Create `GET /api/v1/health` controller stub (protected, returns 200)

## 3. Backend tests & boundaries

- [x] 3.1 Write `ArchUnitTest` (controller→service→repository; shared never depends on module repository/domain; contracts are interfaces; no circular deps)
- [x] 3.2 Write BDD Given-When-Then unit tests for the health stub + security stub
- [x] 3.3 Verify `./mvnw clean package` + `./mvnw test` pass with `JAVA_HOME=/c/myprograms/java/jdk-21.0.10` (9 tests green)
- [x] 3.4 Run PITest mutation coverage and confirm report (runs + `pit-reports/` generated; soft-warning threshold)

## 4. Frontend skeleton

- [x] 4.1 (User) Node 22 — upgraded to **22.23.0** (Angular CLI 22 requires >=22.22.3; 22.11.0 was insufficient)
- [x] 4.2 Scaffold Angular 22 workspace under `frontend/` (`npx -p @angular/cli@22 ng new`, standalone, scss, routing)
- [x] 4.3 Add `app.config.ts`, router, `routes.ts` append-per-feature + stub lazy route
- [x] 4.4 Create `shell/` (layout, nav, auth gate login stub calling backend JWT stub)
- [x] 4.5 Create `shared/` (HTTP client + uniform error handling, base state service via Signals, PrimeIcons)
- [x] 4.6 Create `features/{employee,interaction,task,portfolio,skills}/` reserved folders + `dashboard` stub route
- [x] 4.7 Configure Jest + JSDOM (`jest-preset-angular` 17, zoneless env) + BDD passing test (3 tests green)
- [x] 4.8 Configure Stryker (`@stryker-mutator/jest-runner`) — runs, mutation report generated
- [x] 4.9 Add `angular-eslint` + `lint` npm script; ensure `lint`, `build`, `test` scripts exist

## 5. Docker & infra

- [x] 5.1 Create `docker-compose.yml` (postgres + backend + frontend, volume, healthcheck, depends_on)
- [x] 5.2 Create `backend/Dockerfile` (multi-stage Maven, Java 21 runtime)
- [x] 5.3 Create `frontend/Dockerfile` (build + nginx serve `dist/frontend/browser`)
- [x] 5.4 Create `.env.example` (placeholder Postgres creds + JWT secret)

## 6. End-to-end verification

- [x] 6.1 `docker compose build && docker compose up` (Docker Desktop running) — all three healthy
- [x] 6.2 `GET /api/v1/health` returns 200 (with JWT); login stub issues JWT; protected endpoint returns 401 + uniform `ErrorEnvelope` without a token; bad-credentials returns 400 + envelope; nginx proxies `/api/v1/*` to backend
- [x] 6.3 Frontend: `npm ci`, `npm run lint`, `npm run build`, `npm test` pass
- [x] 6.4 Push branch → CI backend + frontend jobs green  *(PR #11 merged; CI run #28029533275 — conclusion: success)*

## 7. OpenSpec finalize

- [x] 7.1 Track/tick tasks through implementation (this file)
- [x] 7.2 After merge, run `openspec-archive-change` to archive the change  *(archived 2026-06-23)*

---

### Notes / deviations from original task text

- **Spring Boot 3.5.15** (not 3.3.x): the constitution (`tech-stack.yaml`) pins only "Spring Boot", and Initializr no longer offers 3.3.x. 3.5.15 is the latest stable.
- **pitest-junit5-plugin 1.2.2** (not 1.2.1): the constitution names only the tool "PITest" (no version pin); 1.2.1 crashes against JUnit Platform 1.12.x that Spring Boot 3.5 pulls in. 1.2.2 adds 1.12 support.
- **Node 22.23.0** (not 22.11.0): Angular CLI 22 requires Node >=22.22.3.
- **Jest confirmed feasible**: jest-preset-angular v17.0.0 (2026-06-16) supports Angular 22 + TS 6 + Jest 30, so the constitution's Jest mandate is honored (Angular 22's scaffold default is Vitest, replaced).
- **Stryker not in CI**: `npm run stryker` is configured and runs locally; it is omitted from `ci.yml` for CI runtime reasons (constitution's soft-warning enforcement). Revisit if mutation score should gate CI.