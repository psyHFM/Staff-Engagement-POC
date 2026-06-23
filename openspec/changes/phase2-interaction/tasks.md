## 1. Module scaffold

- [ ] 1.1 Create package tree `com.staffengagement.interaction/{domain,repository,service,controller,controller/dto}` under `backend/src/main/java/`
- [ ] 1.2 Verify no edits to `shared/**`, `master.yaml`, `application.yml`, `pom.xml` (splice owns only `interaction/**`)

## 2. Domain & persistence

- [ ] 2.1 Create anemic `Interaction` JPA entity (`id`, `type` as `InteractionType` (stored as the wire name), `subjectId`, `facilitatorId`, `note`, `createdAt`, `updatedAt`)
- [ ] 2.2 Create `InteractionRepository` with a `Pageable` query by `subjectId` ordered by `createdAt` desc
- [ ] 2.3 Create Liquibase changeset `interaction-001` under `db/changelog/modules/interaction/` creating the `interaction` table (no employee FK)
- [ ] 2.4 Confirm `master.yaml` `includeAll` discovers the changeset without editing `master.yaml`

## 3. Service (implements frozen contract)

- [ ] 3.1 Create `InteractionService implements InteractionContract` with `findBySubject(EmployeeId)` → `List<InteractionSummary>`
- [ ] 3.2 Add a paginated read method `findPageBySubject(EmployeeId, PageRequest)` → `Paged<InteractionSummary>` (controller-facing)
- [ ] 3.3 Inject `EmployeeContract`; validate `subject` and `facilitator` via `exists` (throw not-found domain exceptions)
- [ ] 3.4 Implement create: persist, return `InteractionSummary`; type validated via `InteractionType` deserialization
- [ ] 3.5 Implement `findById(InteractionId)` → `Optional<InteractionSummary>` (for the get-by-id endpoint)

## 4. Error handling (module-local)

- [ ] 4.1 Create `interaction/controller/InteractionErrorHandler` `@RestControllerAdvice` mapping subject/facilitator/interaction not-found → 404 and invalid-type → 400, using `ErrorEnvelope`
- [ ] 4.2 Confirm `shared/error/GlobalExceptionHandler` is untouched

## 5. REST controller

- [ ] 5.1 Create `InteractionController` with `POST /api/v1/interactions` (201, unwrapped `InteractionSummary`)
- [ ] 5.2 Add `GET /api/v1/employees/{id}/interactions` with `offset`/`limit` (default 20)/`sort=createdAt,desc` → `Paged<InteractionSummary>`
- [ ] 5.3 Add `GET /api/v1/interactions/{id}` → `InteractionSummary` or 404
- [ ] 5.4 Bind path `{id}` to `EmployeeId`/`InteractionId` via module-local construction (no shared converter)
- [ ] 5.5 Verify kebab-case URLs, camelCase JSON, nulls excluded, `/api/v1` prefix

## 6. Access control

- [ ] 6.1 `@PreAuthorize("hasRole('MANAGER')")` on `POST /api/v1/interactions`
- [ ] 6.2 `@PreAuthorize("hasRole('MANAGER')")` on `GET /api/v1/employees/{id}/interactions` and `GET /api/v1/interactions/{id}` (EMPLOYEE self-read deferred — design D3/D7)
- [ ] 6.3 Document the deferred facilitator-default + EMPLOYEE self-read gap (design D3)

## 7. Unit tests (BDD)

- [ ] 7.1 `InteractionServiceTest` — Given-When-Then: create with valid/unknown subject, valid/unknown facilitator, valid/invalid type; `findBySubject` (empty + populated)
- [ ] 7.2 `InteractionControllerTest` — Mockito the service: 201 create, 404 unknown subject/facilitator, paginated list, 404 unknown interaction, invalid type → 400
- [ ] 7.3 Pagination test: `offset`/`limit`/`sort` honored on list-by-subject
- [ ] 7.4 RBAC test: 401 unauthenticated, 403 EMPLOYEE on create, MANAGER permitted

## 8. Architecture & quality gates

- [ ] 8.1 Confirm ArchUnit boundary tests green (no `employee.repository`/`employee.domain` imports in `interaction/**`)
- [ ] 8.2 Run `mvn -f backend/pom.xml test` — all green
- [ ] 8.3 Run PITest (mutation) + JaCoCo (≥80%) on the interaction module
- [ ] 8.4 Commit on branch `phase2/interaction`; open PR against `main` (reviewer checks no shared-file edits)