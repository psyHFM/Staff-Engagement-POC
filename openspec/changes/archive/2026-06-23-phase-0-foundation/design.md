## Context

Greenfield repository: the constitution (`.claude/constitution/` v1.1.0) and OpenSpec
tooling exist, but there is no application code, CI, or orchestration. `ROADMAP.md §3`
defines Phase 0 as the serial prerequisite for the five parallel domain splices
(Phases 1–5). The constitution fixes the stack (Java 21 / Spring Boot / Angular 22 /
Postgres / Liquibase / Docker Compose), the layering
(`controller/ → service/ → repository/` + anemic `domain/`), the API standards
(`/api/v1`, kebab-case URLs, camelCase JSON, unwrapped, uniform error envelope, Bearer
JWT + RBAC), and the cross-module rule (Service-interface contracts only, ArchUnit
enforced). A stale `feature/git-workflow-setup` branch already contains a suitable
`ci.yml`, PR template, `CONTRIBUTING.md`, and a Java/Node `.gitignore` — these are
ported, not merged (the branch predates the constitution and would delete the
foundation if merged wholesale).

## Goals / Non-Goals

**Goals:**
- A compilable, runnable modular-monolith backend skeleton with the `shared/`
  foundation frozen for later splices.
- Frozen cross-module contracts (`shared/api`) encoding the v1.1.0 domain model, so
  Phases 1–5 can code against them before implementers merge.
- ArchUnit baseline that enforces layering and module boundaries.
- An Angular 22 frontend shell with the routing/state conventions later features
  append to.
- Docker Compose that starts Postgres + backend + frontend, and a CI pipeline that
  builds/tests both.
- `GET /api/v1/health` proves the layout end-to-end.

**Non-Goals:**
- Any domain module implementation (Employee, Interaction, Task, Portfolio, Skills) —
  Phases 1–5.
- Real auth/identity provider — JWT/RBAC is stubbed (one in-memory user).
- Integration / end-to-end tests — disabled per `testing-strategy.yaml`.
- Frontend state persistence across refresh — in-memory only.
- Notifications, email, scheduling, mobile, data migration.

## Decisions

- **Spring Boot 3.3.x on Java 21**: matches `tech-stack.yaml`; 3.3 is the current
  stable line with Java 21 support and the security stack the JWT stub needs.
  Alternative: 3.2 — rejected (older). 3.4 — considered, but 3.3 is the safer
  widely-validated target for the POC.
- **Maven + `mvnw` wrapper**: constitution mandates Maven; the wrapper makes CI and
  local builds version-independent of the installed Maven. The CI uses `./mvnw`.
- **Typed ID value types in `shared/kernel`** (`EmployeeId`, etc.): keeps cross-module
  contracts module-agnostic (no raw `Long`s) and aligns with the
  `constitutional-backend-developer` persona. Implemented as records wrapping a value.
- **`InteractionType` enum frozen in the kernel**: the controlled vocabulary
  (`check-in`, `mentoring`, `catch-up`, `performance`, `other`) is shared by the
  Interaction module and the `InteractionSummary` contract; freezing it here prevents
  drift.
- **Frozen contracts as interfaces in `shared/api` with summary DTOs**: per
  `backend-architecture.yaml` cross-module-via-Service-interfaces. DTOs (`*Summary`,
  `Paged`, `PageRequest`) live alongside so contracts are self-contained. No impls in
  Phase 0 — Phases 1–5 provide `implements <Contract>`.
- **`controller → service → repository` layering enforced by ArchUnit**: v1.1.0
  constitution naming. Rules: controllers must not import repositories; modules must
  not import another module's `repository/` or `domain/`; `shared/api` contracts are
  interfaces; no circular module deps.
- **JWT + Spring Security stub**: one in-memory user, roles `EMPLOYEE`/`MANAGER`,
  `@PreAuthorize` enforced. Sufficient to prove a protected endpoint and gate the
  frontend; not production auth.
- **Liquibase `master.yaml` with `includeAll` over `db/changelog/modules/`**: lets each
  splice add changelogs under its own folder without editing `master.yaml` (the
  conflict-avoidance contract). One baseline changeset in Phase 0.
- **Angular 22 standalone + Signals + `inject()`**: per `frontend-state.yaml` and the
  Angular style guide. `routes.ts` uses `loadChildren` append-per-feature so splices
  never conflict.
- **Jest + `jest-preset-angular` + Stryker (not Angular's default test runner)**:
  `testing-strategy.yaml` mandates Jest/JSDOM/Stryker. `angular-eslint` provides the
  `lint` script the CI expects.
- **CI ported, not merged**: `ci.yml` already targets `backend/` (Java 21 + Maven +
  PITest) and `frontend/` (Node 22 + Angular lint/build/test) — no adaptation needed
  beyond ensuring the scaffold provides `mvnw`, the pitest plugin, and `lint`/`build`/
  `test` npm scripts.
- **Docker Compose three-service shape**: Postgres + backend (multi-stage Maven image)
  + frontend (nginx serving `dist/`). Satisfies the Phase 0 exit criterion directly.

## Risks / Trade-offs

- [Node 25 vs Angular 22] Angular 22 supports Node 20/22/24, not 25 (the dev's current
  version). → Mitigation: require `nvm use 22.11.0` locally; CI pins Node 22 via
  `actions/setup-node`.
- [Local PATH still on Java 17] → Mitigation: build backend with
  `JAVA_HOME=/c/myprograms/java/jdk-21.0.10` inline; CI pins Java 21 via
  `actions/setup-java`.
- [PITest / Stryker runtime] mutation coverage can be slow and may exceed local command
  timeouts. → Mitigation: CI runs them on every PR; locally, fall back to user-run if a
  tool call times out.
- [Frozen contracts freeze risk] getting a contract signature wrong now forces a
  roadmap amendment later. → Mitigation: contracts are additive-only by policy; this
  proposal encodes the v1.1.0 model already reviewed in the constitution.
- [`jest-preset-angular` Angular 22 compat] preset must support Angular 22. →
  Mitigation: pin a preset version known to support Angular 22; if it lags, flag and
  fall back to Angular's built-in runner temporarily (constitution deviation would need
  a note).
- [Stale CI branch] merging `feature/git-workflow-setup` would delete the constitution.
  → Mitigation: port only the additions; never merge the branch.

## Migration Plan

Greenfield — no migration. Rollout = merge the Phase 0 PR to `main`; all later splice
branches fork from it. Rollback = revert the Phase 0 merge (no downstream consumers yet).

## Open Questions

- None blocking. (The controlled `InteractionType` vocabulary and the contract
  signatures are already fixed in the v1.1.0 constitution.)