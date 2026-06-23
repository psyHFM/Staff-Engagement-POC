## Context

Phase 0 (PR #11) has merged the modular-monolith foundation: base package `com.staffengagement`, frozen kernel ID types and `InteractionType`, the uniform `ErrorEnvelope` + `GlobalExceptionHandler`, the JWT/RBAC security stub, and the frozen cross-module port interfaces + DTOs in `shared/api/` (`EmployeeContract`, `InteractionContract`, `InteractionSummary`, `PageRequest`, `Paged`, …). `master.yaml` is wired with `includeAll` over `db/changelog/modules/`.

Phase 2 is a parallel splice (ROADMAP §5) that branches off Phase 0. It owns only `backend/.../interaction/**` and `db/changelog/modules/interaction/**`. It must not edit any frozen file (`shared/**`, `master.yaml`, `application.yml`, `pom.xml`). Cross-module access is via the frozen `EmployeeContract` only — never the Employee module's impl/repository/domain (ArchUnit-enforced).

Key constraint that shapes this design: the Phase 0 auth stub sets the Spring Security principal to the JWT **subject**, which is a bare username string (`"employee"` / `"manager"` from `StubUserStore`). There is no `EmployeeId` on the principal, `EmployeeContract` exposes only `findById` / `exists` (no `findByUsername`), and Phase 1 (Employee) is not yet merged. Resolving "the logged-in user" to an `EmployeeId` is therefore not possible inside this splice without editing frozen `shared/**` or assuming employee rows that do not yet exist.

## Goals / Non-Goals

**Goals:**
- Implement the Interaction domain module (entity, repository, `InteractionService implements InteractionContract`, controller) entirely within `interaction/**`.
- Expose `POST /api/v1/interactions`, `GET /api/v1/employees/{id}/interactions` (paginated), `GET /api/v1/interactions/{id}` per `api-standards.yaml`.
- Validate `subject` and `facilitator` against `EmployeeContract.exists`, and `type` against the frozen `InteractionType` vocabulary.
- Add the `interaction` Liquibase table under `db/changelog/modules/interaction/` without touching `master.yaml`.
- Enforce RBAC with `@PreAuthorize` (MANAGER writes; EMPLOYEE reads own).
- Unit tests (BDD Given-When-Then, JUnit5 + Mockito), PITest mutation, JaCoCo ≥ 80%.
- Keep the Phase 0 ArchUnit boundary tests green; add no cross-module impl imports.

**Non-Goals:**
- The "facilitator defaults to the logged-in user, overridable" behavior (deferred — see D3 and Open Questions).
- Any frontend (the interaction feature folder is a separate change).
- Modifying `shared/**`, `master.yaml`, `application.yml`, or `pom.xml`.
- Implementing `EmployeeContract` (Phase 1's job) — this splice codes against the frozen interface only.
- Phase 6 integration / the rounded person view.

## Decisions

### D1 — Package layout within `interaction/`
Follow the Phase 0 convention (`backend-architecture.yaml` layered: Controller → Service → Repository, anemic domain):
```
com.staffengagement.interaction/
  domain/Interaction.java          (anemic JPA entity)
  repository/InteractionRepository.java
  service/InteractionService.java  (implements InteractionContract)
  controller/InteractionController.java
  controller/dto/...                (request/response records, module-local)
```
**Why:** matches the constitution's layering and the sibling modules' expected shape; keeps the splice's files self-contained. **Alternative considered:** a flatter package — rejected because ArchUnit layer rules target `..controller..` / `..repository..` packages.

### D2 — `InteractionService implements InteractionContract`; controller depends on the service, not the repository
The service is the single implementor of the frozen `InteractionContract.findBySubject(EmployeeId)`. The controller injects `InteractionService` (concrete) for write paths and the contract is satisfied by the same service. The controller never touches `InteractionRepository`. **Why:** satisfies `backend-architecture.yaml` ("No direct repository access from the controller layer") and keeps the frozen port the only cross-module surface.

### D3 — Facilitator is **required** in the request body; the "default to logged-in user" is deferred (user-approved)
The request body carries `facilitator` as an `EmployeeId`. When Phase 1 lands and a real principal→`EmployeeId` link exists, a follow-up additive change can make `facilitator` optional and default it. **Why:** the stub principal is a username with no `EmployeeId` mapping, `EmployeeContract` has no `findByUsername`, and `shared/**`/`application.yml` are frozen — so a correct default cannot be built inside this splice without a hack or a coordination PR. The user selected this approach. **Alternatives considered:** (a) module-local hardcoded username→`EmployeeId` map — rejected as fragile and coupled to stub usernames; (b) additive `CurrentUserResolver` port in `shared/api` — rejected as it edits frozen `shared/**` and needs a coordination PR. **Trade-off:** ROADMAP §5 exit criterion "facilitator defaults to the logged-in user and is overridable" is only partially met (overridable yes; default no). Documented as a known gap.

### D4 — Validation delegates to the frozen `EmployeeContract`
`InteractionService` injects `EmployeeContract` (the frozen port). On create, it calls `EmployeeContract.exists(subject)` and `EmployeeContract.exists(facilitator)`; a missing employee throws a domain exception that `GlobalExceptionHandler` maps to 404/400. `type` is validated by deserializing into the `InteractionType` enum (invalid value → 400 via Jackson). **Why:** keeps the splice decoupled from the Employee module's impl; the contract is the only allowed cross-module dependency. **Alternative considered:** a DB-level FK only — rejected because the constitution wants service-layer validation and a clean 404 (not a 500 from an FK violation).

### D5 — Pagination uses the frozen `PageRequest` / `Paged<T>` from `shared/api`
`GET /api/v1/employees/{id}/interactions` accepts `offset` / `limit` (default 20) and `sort=createdAt,desc`, returning an unwrapped `Paged<InteractionSummary>` (camelCase JSON, nulls excluded). **Why:** `api-standards.yaml` mandates offset pagination and unwrapped responses; the frozen `Paged`/`PageRequest` records already encode this. The controller maps query params → `PageRequest`, the service returns `Paged<InteractionSummary>`. **Note:** `InteractionContract.findBySubject` returns `List<InteractionSummary>` (frozen); pagination is applied in the service/controller over the repository query (a `Pageable` repository query), and the contract method is satisfied by returning the full list (the controller-facing read uses a separate paginated service method). This avoids modifying the frozen contract.

### D6 — Liquibase changeset under `db/changelog/modules/interaction/`, module-prefixed IDs
A single file `interaction-001-initial.yaml` (or `.sql`) with changeset id `interaction-001` creating the `interaction` table: `id` (bigint PK, auto-generated), `type` (varchar, constrained to the vocabulary), `subject_id` (bigint not null), `facilitator_id` (bigint not null), `note` (text), `created_at` / `updated_at` (timestamps). No DB-level FK to an `employee` table (that table is owned by Phase 1 and may not exist yet at migration time); referential integrity is enforced in the service layer via `EmployeeContract.exists` (D4). **Why:** avoids cross-module migration coupling and keeps the splice append-only to its own changelog folder; `master.yaml` `includeAll` picks it up automatically. **Alternative considered:** add FK constraints — rejected because Phase 1's `employee` table migration is not guaranteed to have run before this one (parallel splices, independent changeset IDs).

### D7 — RBAC via `@PreAuthorize` on controller methods
- `POST /api/v1/interactions` → `@PreAuthorize("hasRole('MANAGER')")` (only managers log interactions in this POC).
- `GET /api/v1/employees/{id}/interactions` → `@PreAuthorize("hasRole('MANAGER') or #id == authentication.principal")` — **adjusted:** the principal is a username, not an `EmployeeId`, so the `#id == principal` self-check cannot work. For this splice, reads-by-subject require `MANAGER`; `EMPLOYEE` self-read is deferred alongside the principal→`EmployeeId` link (D3). This is documented as a gap.
- `GET /api/v1/interactions/{id}` → `@PreAuthorize("hasRole('MANAGER')")`.
**Why:** method security is the constitution's enforcement model (`api-standards.yaml`). The EMPLOYEE-owns-read rule depends on the same principal→`EmployeeId` mapping that D3 defers, so it is deferred consistently.

### D8 — Path-param `EmployeeId` construction
`EmployeeId` is a record wrapping `Long`. The controller binds `{id}` as a `Long` and constructs `new EmployeeId(id)` (or a small `@PathVariable` conversion). **Why:** keeps the contract layer using typed IDs without needing a Spring `Converter` registered globally (which would touch shared config). A module-local converter or explicit construction keeps the splice self-contained.

### D9 — Error handling reuses the frozen `GlobalExceptionHandler`
The service throws domain exceptions (`SubjectNotFoundException`, `FacilitatorNotFoundException`, `InteractionNotFoundException`) — either mapped by the existing `GlobalExceptionHandler` (if it already handles a generic not-found → 404) or by adding module-local handlers in `interaction/` that produce `ErrorEnvelope`. **Decision:** prefer adding a small `@RestControllerAdvice` scoped to the interaction module (`interaction/controller/InteractionErrorHandler`) that maps these to 400/404 envelopes, rather than editing the frozen `shared/error/GlobalExceptionHandler`. This keeps `shared/**` untouched.

## Risks / Trade-offs

- [Deferred facilitator default] → The ROADMAP §5 exit criterion "facilitator defaults to logged-in user" is only partially met. **Mitigation:** documented in proposal + Open Questions; an additive follow-up wires it once Phase 1 + a principal→`EmployeeId` link exist. Non-breaking.
- [Phase 1 not merged] → `EmployeeContract` has no implementation at runtime yet, so end-to-end creation cannot be demonstrated until Phase 1 lands. **Mitigation:** unit tests mock `EmployeeContract`; the service compiles and is tested in isolation; runtime integration is deferred to Phase 6 (per the parallel-splice model).
- [No DB-level FK] → referential integrity relies on the service-layer `exists` check. **Mitigation:** the check is mandatory on every create and is unit-tested; a data-integrity lapse requires bypassing the service.
- [EMPLOYEE self-read deferred] → only MANAGER can read interactions in this splice. **Mitigation:** documented gap; consistent with D3; additive follow-up restores it.
- [Pagination over a frozen `List`-returning contract] → `findBySubject` returns a `List`, but the REST list endpoint is paginated. **Mitigation:** the paginated read uses a separate service method backed by a `Pageable` repository query; the frozen contract method returns the full list (satisfying the port) and is used by Phase 6, not by the paginated endpoint.

## Migration Plan

1. Branch off `main` (Phase 0 merged).
2. Implement `interaction/**` + the Liquibase changeset; the migration is auto-discovered by `master.yaml` `includeAll` — no shared-file edit.
3. Unit tests green; PITest + JaCoCo reported.
4. PR against `main`; ArchUnit boundary tests must remain green (reviewer checks no `employee.repository` / `employee.domain` imports).
5. **Rollback:** revert the PR; drop the `interaction` table if needed (the changeset can include a `dropTable` rollback or be rolled back via Liquibase). No shared state is touched, so rollback is self-contained.

## Open Questions

- **Facilitator default + EMPLOYEE self-read:** both depend on a principal→`EmployeeId` mapping that does not exist in Phase 0. Should a future coordination PR add an additive `CurrentUserResolver` port to `shared/api` (with a Phase-0-provided stub impl), or should Phase 1 own the username→`EmployeeId` link and expose it additively on `EmployeeContract`? Deferred to a follow-up; non-blocking for this splice.
- **`InteractionType` storage — RESOLVED at implementation:** store the **enum name** (`CHECK_IN`) in the `type` column via `@Enumerated(EnumType.STRING)`. The JSON wire name (`check-in`) is still produced/consumed at the API boundary by the frozen `@JsonProperty` on `InteractionType`; the DB representation is an internal detail, so storing the enum name avoids a custom `AttributeConverter` or reflection on the `@JsonProperty` annotation while keeping the splice free of duplicated vocabulary.
- **PITest on the interaction module — DEFERRED (frozen `pom.xml`):** the Phase 0 `pom.xml` pins PITest `targetClasses` to `com.staffengagement.shared.*`, and `pom.xml` is locked to splices (ROADMAP §2.5/§2.6). Running mutation testing over `interaction.*` therefore needs a tiny coordination PR that appends `com.staffengagement.interaction.*` to `targetClasses` — out of scope for this splice. JaCoCo is agent-based and covers all executed classes, so ≥80% line/branch coverage on the interaction module is verified within this splice; the mutation-score gate on `interaction.*` is the coordination PR's job.