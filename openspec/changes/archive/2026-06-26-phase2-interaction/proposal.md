## Why

Phase 0 has merged the modular-monolith foundation with the frozen cross-module contracts in place. ROADMAP §5 (Phase 2 — Interaction) is one of the parallel splices that can now branch off Phase 0. It delivers the ability to record a typed engagement against an employee — capturing its **type**, **subject** (who it was for), and **facilitator** (who facilitated) — and to list an employee's interactions. This is the second of the domain modules that Phase 6 will later integrate into the rounded person view, and it exercises the frozen-contract boundary (coding against `EmployeeContract` only, never the Employee module's internals).

## What Changes

- Add a new `interaction` backend module under `com.staffengagement.interaction` (controller/service/repository/domain), owned exclusively by this splice.
- `InteractionService implements InteractionContract` (the frozen port from `shared/api`), providing `findBySubject(EmployeeId)` and the create/read operations behind the REST API.
- REST endpoints (per `api-standards.yaml`): `POST /api/v1/interactions`, `GET /api/v1/employees/{id}/interactions` (paginated by subject), `GET /api/v1/interactions/{id}` — kebab-case URLs, camelCase JSON, unwrapped responses, uniform error envelope, offset pagination.
- Validation: `subject` must reference an existing employee (`EmployeeContract.exists`); `type` must be a valid `InteractionType`; `facilitator` must be an existing employee.
- Liquibase `interaction` table under `db/changelog/modules/interaction/` (module-prefixed changeset IDs `interaction-001…`); `master.yaml` is **not** edited (it `includeAll`s the modules folder).
- RBAC via `@PreAuthorize`: `MANAGER` may log interactions; `EMPLOYEE` may read their own (subject == themselves); reads by subject are role-scoped.
- Unit tests (JUnit5 + Mockito, BDD Given-When-Then), PITest mutation, JaCoCo ≥ 80%.

**Deferred (known gap, documented):** "facilitator defaults to the logged-in user, overridable" — the Phase 0 auth stub sets the principal to a bare username with no `EmployeeId` mapping, `EmployeeContract` exposes no `findByUsername`, `shared/**` and `application.yml` are frozen, and Phase 1 is not yet merged. The facilitator is therefore **required** in the request body for this splice; the auto-default is wired later once a real principal→`EmployeeId` link exists. This is non-breaking and additive.

## Capabilities

### New Capabilities
- `interaction-service`: The Interaction domain — entity, repository, and `InteractionService implements InteractionContract`, including subject/facilitator/type validation and the `findBySubject` read model.
- `interaction-api`: The REST surface for interactions — request/response shapes for create, list-by-subject (offset pagination), and get-by-id, plus validation-failure and not-found error behavior via the uniform error envelope.
- `interaction-persistence`: The Liquibase `interaction` table and its module-owned changelog under `db/changelog/modules/interaction/`, without editing `master.yaml`.
- `interaction-access-control`: RBAC enforcement on the interaction endpoints via `@PreAuthorize` (MANAGER writes; EMPLOYEE reads own).

### Modified Capabilities
<!-- No existing specs in openspec/specs/ yet — Phase 2 introduces new capabilities only. -->
- none

## Impact

- **New code:** `backend/src/main/java/com/staffengagement/interaction/**` (controller, service, repository, domain) — owned only by this splice.
- **New migration:** `backend/src/main/resources/db/changelog/modules/interaction/**` — owned only by this splice; `master.yaml` untouched.
- **Frozen contracts consumed (read-only):** `EmployeeContract` (for `exists`), `InteractionContract` + `InteractionSummary` (implemented, not modified), `InteractionType` / `EmployeeId` / `InteractionId` from `shared/kernel`.
- **Not modified:** anything under `shared/**`, `employee/**`, `master.yaml`, `application.yml`, `pom.xml` (locked). No dependencies added.
- **ArchUnit:** existing Phase 0 boundary tests must stay green; this splice must not import any sibling module's `repository`/`domain`.
- **API surface:** new endpoints under `/api/v1/interactions` and `/api/v1/employees/{id}/interactions`.
- **No frontend** in this change (the interaction feature folder is a separate concern; this change is backend-only).