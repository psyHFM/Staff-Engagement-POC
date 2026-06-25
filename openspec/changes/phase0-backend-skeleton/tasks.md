## 1. Maven project bootstrap

- [ ] 1.1 Create `backend/pom.xml` — Spring Boot parent, Java 21, dependencies (web, data-jpa, security, validation, liquibase, postgresql, lombok, archunit, jackson), plugins (spring-boot-maven-plugin, jacoco-maven-plugin ≥80%, pitest-maven)
- [ ] 1.2 Create `backend/src/main/java/com/staffengagement/StaffEngagementApplication.java` (`@SpringBootApplication` main class)
- [ ] 1.3 Create empty per-domain packages `employee`, `interaction`, `task`, `portfolio`, `skills` under `com.staffengagement` (package-info or placeholder so the tree exists)
- [ ] 1.4 Create `application.yml` — Postgres datasource (env-var externalised), JPA/Hibernate ddl-auto=none, Liquibase enabled, JWT stub config

## 2. Shared kernel

- [ ] 2.1 Create ID records `EmployeeId`, `InteractionId`, `TaskId`, `PortfolioId` (wrap `Long`, expose `value()`)
- [ ] 2.2 Create frozen `InteractionType` enum (`CHECK_IN`, `MENTORING`, `CATCH_UP`, `PERFORMANCE`, `OTHER`) with JSON wire names `check-in`, `mentoring`, `catch-up`, `performance`, `other`
- [ ] 2.3 Create Lombok base entity class (`id`, `createdAt`, `updatedAt`) in `shared/kernel`
- [ ] 2.4 Add unit tests for ID equality/hashing and `InteractionType` vocabulary + wire-name mapping (BDD Given-When-Then)

## 3. Error handling

- [ ] 3.1 Create `ApiError` record (timestamp, status, error, message, path) with Jackson null-exclusion
- [ ] 3.2 Create `@RestControllerAdvice` `GlobalExceptionHandler` mapping generic + not-found exceptions → envelope with semantic status codes
- [ ] 3.3 Add unit tests: 500 envelope, 404 envelope, null-field omission, content-type application/json

## 4. Auth stub

- [ ] 4.1 Create Spring Security `SecurityFilterChain` accepting Bearer JWT (POC stub decoder/verifier)
- [ ] 4.2 Create in-memory users: one `EMPLOYEE`, one `MANAGER`, plus a trivial login/token issue path
- [ ] 4.3 Add a protected stub endpoint demonstrating `@PreAuthorize` enforcement
- [ ] 4.4 Add unit tests: 401 without token, accept with valid stub token, 403 on wrong role

## 5. Module contracts (frozen)

- [ ] 5.1 Create port interfaces in `shared/api/`: `EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`, `SkillsContract` (empty/stub methods only)
- [ ] 5.2 Create DTOs: `InteractionSummary`, `TaskSummary`, `PortfolioSummary`, `SkillStrength` (+ any referenced summaries) as records
- [ ] 5.3 Add unit tests: contracts compile standalone; DTO field exposure (`InteractionSummary`, `SkillStrength`)
- [ ] 5.4 Verify ArchUnit allows cross-module access only to `shared.api`

## 6. Database migrations

- [ ] 6.1 Create `master.yaml` at `db/changelog/master.yaml` with `includeAll: db/changelog/modules/` (recursive)
- [ ] 6.2 Create one baseline changeset (module-prefixed, e.g. `shared-001`) establishing the migration baseline
- [ ] 6.3 Create empty `modules/{employee,interaction,task,portfolio,skills}/` folders so later splices append only
- [ ] 6.4 Verify Liquibase runs cleanly against an empty Postgres (manual/CI)

## 7. Architecture boundaries (ArchUnit)

- [ ] 7.1 Create ArchUnit test: `controller` must not depend on `repository`
- [ ] 7.2 Create ArchUnit test: no cross-module imports of a sibling module's `repository` or `domain`
- [ ] 7.3 Create ArchUnit test: cross-module deps target only `com.staffengagement.shared.api`
- [ ] 7.4 Create ArchUnit test: no circular dependencies between modules

## 8. Health endpoint + wiring

- [ ] 8.1 Create `HealthController` (`@RestController`) at `GET /api/v1/health` → 200 `{ "status": "UP" }` (anonymous)
- [ ] 8.2 Add unit test: health returns 200 with `{ "status": "UP" }`
- [ ] 8.3 Run `mvn -pl backend test` — all tests green, PITest + JaCoCo reported
- [ ] 8.4 Run `mvn -pl backend spring-boot:run` and confirm `/api/v1/health` responds 200

## 9. Documentation

- [ ] 9.1 Add `backend/README.md` — how to run, required env vars, the frozen-contract rule, ArchUnit intent
- [ ] 9.2 Commit OpenSpec artifacts + backend skeleton on branch `phase0/backend-skeleton-atse1-8`; open PR