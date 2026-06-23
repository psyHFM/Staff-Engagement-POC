## 1. Module scaffold

- [x] 1.1 Create package tree `com.staffengagement.interaction/{domain,repository,service,controller,controller/dto}` under `backend/src/main/java/`
- [x] 1.2 Verify no edits to `shared/**`, `master.yaml`, `application.yml`, `pom.xml` (splice owns only `interaction/**`) — verified via `git status` (frozen files untouched)

## 2. Domain & persistence

- [x] 2.1 Create anemic `Interaction` JPA entity (`id`, `type` as `InteractionType` (stored as the enum name via `@Enumerated(STRING)` — design Open Question resolved), `subjectId`, `facilitatorId`, `note`, `createdAt`, `updatedAt`)
- [x] 2.2 Create `InteractionRepository` with a `Pageable` query by `subjectId` (sort from `Pageable`, default `createdAt,desc`) + a full-list ordered query for the frozen contract
- [x] 2.3 Create Liquibase changeset `interaction-001` under `db/changelog/modules/interaction/` creating the `interaction` table (no employee FK)
- [x] 2.4 Confirm `master.yaml` `includeAll` discovers the changeset without editing `master.yaml` — `includeAll: db/changelog/modules/` picks up the new folder; `master.yaml` unchanged

## 3. Service (implements frozen contract)

- [x] 3.1 Create `InteractionService implements InteractionContract` with `findBySubject(EmployeeId)` → `List<InteractionSummary>`
- [x] 3.2 Add a paginated read method `findPageBySubject(EmployeeId, PageRequest, Sort)` → `Paged<InteractionSummary>` (controller-facing)
- [x] 3.3 Inject `EmployeeContract`; validate `subject` and `facilitator` via `exists` (throw `SubjectNotFoundException` / `FacilitatorNotFoundException` → 404)
- [x] 3.4 Implement create: persist, return `InteractionSummary`; type validated via `InteractionType` deserialization (invalid → 400 before service)
- [x] 3.5 Implement `findById(InteractionId)` → `Optional<InteractionSummary>` (for the get-by-id endpoint)

## 4. Error handling (module-local)

- [x] 4.1 Create `interaction/controller/InteractionErrorHandler` `@RestControllerAdvice(basePackages=interaction.controller)` mapping not-found → 404 and `HttpMessageNotReadableException` → 400, using `ErrorEnvelope`
- [x] 4.2 Confirm `shared/error/GlobalExceptionHandler` is untouched

## 5. REST controller

- [x] 5.1 Create `InteractionController` with `POST /api/v1/interactions` (201, unwrapped `InteractionSummary`)
- [x] 5.2 Add `GET /api/v1/employees/{id}/interactions` with `offset`/`limit` (default 20)/`sort=createdAt,desc` → `Paged<InteractionSummary>`
- [x] 5.3 Add `GET /api/v1/interactions/{id}` → `InteractionSummary` or 404
- [x] 5.4 Bind path `{id}` to `EmployeeId`/`InteractionId` via module-local construction (`new EmployeeId(id)` / `new InteractionId(id)` — no shared converter)
- [x] 5.5 Verify kebab-case URLs, camelCase JSON, nulls excluded (global `non_null`), `/api/v1` prefix

## 6. Access control

- [x] 6.1 `@PreAuthorize("hasRole('MANAGER')")` on `POST /api/v1/interactions`
- [x] 6.2 `@PreAuthorize("hasRole('MANAGER')")` on `GET /api/v1/employees/{id}/interactions` and `GET /api/v1/interactions/{id}` (EMPLOYEE self-read deferred — design D3/D7)
- [x] 6.3 Document the deferred facilitator-default + EMPLOYEE self-read gap (design D3 + Open Questions; access-control spec "Deferred default-facilitator and self-read")

## 7. Unit tests (BDD)

- [x] 7.1 `InteractionServiceTest` — Given-When-Then: create with valid/unknown subject, valid/unknown facilitator, missing type/subject/facilitator; `findBySubject` (empty + populated)
- [x] 7.2 `InteractionControllerTest` + `InteractionErrorHandlerTest` — Mockito the service: 201 create, 404 unknown subject/facilitator/interaction, paginated list, 404 unknown interaction, invalid type → 400
- [x] 7.3 Pagination test: `offset`/`limit`/`sort` honored on list-by-subject (`InteractionServiceTest` + `OffsetPageRequestTest`)
- [x] 7.4 RBAC test: `InteractionAccessControlTest` asserts `@PreAuthorize("hasRole('MANAGER')")` on all three endpoints (reflection-based pure unit; 401/403 envelope behaviour is the Phase 0 shared security layer)

## 8. Architecture & quality gates

- [x] 8.1 ArchUnit boundary tests green — no `employee.repository`/`employee.domain` imports in `interaction/**`; `controllersMustNotDependOnRepositories` satisfied (controller → service only); `noCyclicModuleDependencies` satisfied
- [x] 8.2 `mvn -f backend/pom.xml test` — 44 tests, all green
- [x] 8.3 JaCoCo ≥80% on the interaction module — **verified: lines 100%, branches 89.3%**. PITest mutation on `interaction.*` is **deferred**: `pom.xml` pins `targetClasses` to `com.staffengagement.shared.*` and is locked to splices (ROADMAP §2.5/§2.6); a coordination PR must append `com.staffengagement.interaction.*` to run mutation over this module (see design Open Questions).
- [x] 8.4 Commit on branch `phase2/interaction`; PR against `main` — committed; PR pending user go-ahead (see "Out of scope / deferred" below).

## Out of scope / deferred (documented gaps)

- **PITest on `interaction.*`** — frozen `pom.xml` `targetClasses`; coordination PR required (design Open Questions).
- **Facilitator default-to-logged-in-user** — Phase 0 principal is a username with no `EmployeeId` mapping; deferred additive follow-up (design D3).
- **EMPLOYEE self-read** — same principal→`EmployeeId` gap; deferred alongside D3 (design D7, access-control spec).
- **Runtime end-to-end** — `EmployeeContract` has no impl until Phase 1 merges; unit tests mock it; runtime integration is Phase 6.