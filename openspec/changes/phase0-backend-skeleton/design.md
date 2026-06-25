## Context

This is the foundational backend change for the Staff-Engagement POC — a modular monolith (package-based modules) on Spring Boot / Java 21 / Maven, persisted to PostgreSQL with Liquibase. The project constitution (`.claude/constitution/*.yaml`) fixes the stack, the layered architecture (`controller → service → repository`), anemic domain model, REST under `/api/v1` (kebab-case URLs, camelCase JSON, uniform error envelope), bearer JWT + RBAC, and unit-only testing (JUnit5 + Mockito BDD, PITest, JaCoCo ≥ 80%).

There is no backend yet. Phase 0 must produce a skeleton that later splices (Phases 1–5) can branch from in parallel without merge conflicts. The roadmap's conflict-avoidance contract (`ROADMAP.md` §2) drives the structure: disjoint folder ownership, **frozen** cross-module contracts, append-only shared files, and locked dependencies.

## Goals / Non-Goals

**Goals:**
- A compiling, runnable Spring Boot backend with the package layout from `ROADMAP.md` §2.1.
- A `shared/` kernel that is **frozen** on merge: ID types, `InteractionType` enum, base entities.
- Frozen port interfaces + DTOs in `shared/api/` that later splices implement.
- Uniform error envelope + global exception handling per `api-standards.yaml`.
- A working auth **stub** (JWT issue + `@PreAuthorize` enforcement) sufficient for POC.
- Liquibase `includeAll` migration wiring + one baseline changeset.
- ArchUnit tests enforcing module/layer boundaries — green from day one.
- A stub `GET /api/v1/health` proving the layout.
- PITest + JaCoCo configured (≥ 80% soft warning).

**Non-Goals:**
- Any domain module implementation (Employee, Interaction, Task, Portfolio, Skills).
- Frontend.
- `docker-compose.yml` (separate task; backend must still run against an external Postgres).
- Real identity-provider integration; production auth; notifications; scheduling.
- Integration / end-to-end tests (disabled per `testing-strategy.yaml`).

## Decisions

### D1: Maven multi-module vs single module
**Choice:** A single Maven module with **package-based modules** (`com.staffengagement.employee`, `.interaction`, …) rather than a Maven multi-module build.
**Why:** The constitution mandates a *modular monolith* with *package-based modules* and ArchUnit-enforced boundaries — not physical Maven modules. This keeps the build simple and matches `backend-architecture.yaml`.
**Alternatives considered:** Maven multi-module (rejected — adds build complexity the constitution doesn't ask for; ArchUnit is the chosen boundary tool, not module isolation).

### D2: Base package and folder layout
**Choice:** `backend/src/main/java/com/staffengagement/` with `shared/{kernel,error,security,api}` plus per-domain packages (`employee`, `interaction`, `task`, `portfolio`, `skills`), each layered `controller/service/repository/domain`. Migrations under `backend/src/main/resources/db/changelog/{master.yaml, modules/<module>/}`.
**Why:** Exactly the layout in `ROADMAP.md` §2.1/§2.3, so later splices own disjoint folders and append-only migration files.

### D3: Value types for IDs
**Choice:** ID types as Java `record`s wrapping a `Long`/`UUID` value, with explicit conversion adapters for JPA (the anemic domain stores primitives; the contract layer hands out ID records).
**Why:** Type-safe cross-module references at the contract boundary without forcing JPA weirdness; keeps the anemic domain simple. `InteractionType` is a Java `enum` frozen here.
**Alternatives considered:** String IDs (rejected — no type safety across contracts); JPA `@EmbeddedId` everywhere (rejected — couples persistence to contract layer).

### D4: Frozen contracts
**Choice:** Port interfaces in `shared/api/` with DTO records (`InteractionSummary`, `TaskSummary`, `PortfolioSummary`, `SkillStrength`, etc.). Methods return empty/stub defaults or throw `UnsupportedOperationException` where a real impl is required. No business logic.
**Why:** Later splices code against these interfaces from day one, in parallel. Additive-only changes are allowed; breaking changes need a roadmap amendment (`ROADMAP.md` §2.2, §11).
**Alternatives considered:** Deferring contracts to each splice (rejected — destroys parallelism and the conflict-avoidance contract).

### D5: Error envelope
**Choice:** A `record ApiError(Instant timestamp, int status, String error, String message, String path)` serialized with Jackson; a `@RestControllerAdvice` maps exceptions → envelope with strict semantic status codes, excluding nulls (`api-standards.yaml`).
**Why:** Constitution mandates the exact envelope schema and unwrapped responses.

### D6: Auth stub
**Choice:** Spring Security with a `SecurityFilterChain` accepting a Bearer JWT. A `JwtDecoder` stub validates a hardcoded/signed test token; an in-memory `UserDetails` user (`employee`/`manager` with roles `EMPLOYEE`, `MANAGER`) backs a trivial login. `@PreAuthorize("hasRole('...')")` enforced on the health endpoint as a smoke test (or left anonymous — see Open Questions).
**Why:** `api-standards.yaml` requires Bearer JWT + RBAC `@PreAuthorize`; the constitution scopes auth as stubbed for POC.
**Alternatives considered:** Real OAuth2 resource server (rejected — out of POC scope).

### D7: Migration strategy
**Choice:** Liquibase `master.yaml` with `includeAll: db/changelog/modules/` (recursive). Phase 0 adds one baseline changeset (e.g., a `databasechangelog`-independent seed or an empty marker) and leaves `modules/` empty for later splices.
**Why:** `ROADMAP.md` §2.3 — no `master.yaml` edits by splices; each adds files under its own `modules/<module>/` folder.

### D8: ArchUnit boundary test
**Choice:** JUnit5 + ArchUnit tests asserting: (a) classes in `..controller..` do not depend on `..repository..`; (b) no class in a module package depends on another module's `..repository..` or `..domain..` packages; (c) cross-module deps go only to `..shared.api..`. Tests live in `backend/src/test/java/.../shared/architecture/`.
**Why:** Enforces `backend-architecture.yaml` constraints at compile/test time; green baseline proves the skeleton.

### D9: Health endpoint
**Choice:** A `@RestController` `HealthController` at `/api/v1/health` returning `{ "status": "UP" }` (camelCase JSON, unwrapped). Stays in `shared` (not a domain module) so it doesn't claim a splice folder.
**Why:** Minimal proof the layout compiles and runs; satisfies the Phase 0 exit criterion.

## Risks / Trade-offs

- **Frozen-too-early contracts** → if a later splice discovers a contract gap, an additive method is fine but a breaking change needs a roadmap amendment. *Mitigation:* contracts are minimal and additive-friendly; review at Phase 0 merge.
- **ArchUnit false sense of safety** → rules only catch *package* violations, not semantic coupling. *Mitigation:* rules are the baseline; code review remains required.
- **Auth stub drift** → a stub can accrete into pseudo-production auth. *Mitigation:* clearly marked `// POC STUB` and a Non-Goal; real auth is a later change.
- **Postgres availability for local runs** → backend expects Postgres; without `docker-compose.yml` (out of scope) a dev must run Postgres separately. *Mitgage:* document the expected connection env vars; compose is a separate task.
- **ID record ↔ JPA primitive mapping** → an extra adapter layer per entity. *Mitigation:* kept in repository layer, not exposed via contracts.

## Migration Plan

1. Add `backend/` Maven project; configure plugins (PITest, JaCoCo, Spring Boot).
2. Implement `shared/kernel`, `shared/error`, `shared/security`, `shared/api` (contracts + DTOs).
3. Wire Liquibase `master.yaml` + baseline changeset; `application.yml` Postgres + JWT config.
4. Add ArchUnit tests + health endpoint.
5. `mvn test` green (incl. PITest + JaCoCo); `mvn spring-boot:run` serves `/api/v1/health`.
6. PR review; on merge the contracts are frozen — later splices branch from this result.

**Rollback:** delete the `backend/` tree; no shared files outside it are touched, so rollback is a single revert.

## Open Questions

- **Health endpoint auth:** should `/api/v1/health` be anonymous (standard actuator-style) or require a role to exercise `@PreAuthorize`? *Recommendation:* anonymous for health, but add a separate protected stub endpoint to prove RBAC enforcement.
- **ID storage type:** `Long` (DB sequence-friendly) vs `UUID`. *Recommendation:* `Long` for POC simplicity; revisit if external sharing is ever needed.