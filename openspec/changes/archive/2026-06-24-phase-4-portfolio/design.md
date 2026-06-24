## Context

Phase 4 introduces the Portfolio module to the Staff Engagement POC — the per-employee record of *what someone is capable of*: skills (quantified by years + project count), education history, projects worked on, and public links. It is splice D in the roadmap, developed in parallel against the frozen `EmployeeContract` (Phase 0). It is a prerequisite for Phase 5 (Skills register), which aggregates portfolio skill entries to answer **"Who's strong on Angular?"**, and for Phase 6 (rounded person view), which composes the portfolio into a single profile.

The module follows the established Modular Monolith conventions proven by Phases 1–3: package-based module under `com.staffengagement.portfolio`, layered `controller/ → service/ → repository/` (+ anemic domain), cross-module communication only via frozen Service interfaces in `shared/api/`, and an append-only touch to the shared frontend `routes.ts`.

### Persona Mandate (required)

This change **REQUIRES** the project personas (defined in `.claude/personas/`) to be applied to the relevant aspects of the work. They are not optional reviewers — they are the authoritative roles for their dimensions, and each artifact they govern must be produced or audited under that persona:

- **Constitution Guard** (`.claude/personas/constitution-guard.md`) — *absolute authority auditor*. MUST red-team the design and every implementation artifact against the constitution YAMLs (`tech-stack.yaml`, `api-standards.yaml`, `backend-architecture.yaml`, `frontend-state.yaml`, `testing-strategy.yaml`) and the ROADMAP §2 conflict-avoidance contract. Owns the `/constitution-audit`, `/api-check`, and `/arch-verify` checks. No code lands without a Compliant ✅ verdict on module boundaries, API casing, and ArchUnit.
- **BDD Test Engineer** (`.claude/personas/bdd-test-engineer.md`) — *quality assurance specialist*. MUST define and verify all unit tests for `PortfolioService` and the frontend `PortfolioStateService`/components in Given-When-Then form, designed to survive PITest (backend) and Stryker (frontend) mutation. Enforces the Unit-Tests-Only policy (no integration tests, no DB/Spring context) and the ≥ 80% coverage target. Owns the `/mutation-report` check.
- **Angular State Architect** (`.claude/personas/angular-state-architect.md`) — *frontend state specialist*. MUST design the `PortfolioStateService` (Signals, `toSignal()` bridge, `computed()` for derived state) and audit the portfolio components for unidirectional data flow, no `BehaviorSubject`, and the local-vs-global signal split. Owns the frontend state dimension against `frontend-state.yaml` and `.claude/angular-style-guide.md`.
- **Modular Monolith Architect** / **Constitutional Backend Developer** (`.claude/personas/`) — consulted for the `Portfolio` aggregate shape and the `portfolio/` package layering, ensuring the module never imports another module's `repository/` or `domain/`.

## Goals / Non-Goals

**Goals:**
- Implement the `Portfolio` aggregate (one per employee) with skill, education, project, and link entries.
- Implement `PortfolioService` satisfying the frozen `PortfolioContract` (`portfolioFor(EmployeeId)` returning `PortfolioSummary` with `List<SkillStrength>`), the read model Phase 5 aggregates.
- Provide REST endpoints for portfolio retrieval and editing (including sub-resource CRUD for the four entry collections) under `/api/v1/employees/{id}/portfolio`, kebab-case, camelCase JSON, unwrapped, uniform error envelope, offset pagination on list-shaped sub-resources.
- Build a frontend portfolio editor using Angular Signals (`PortfolioStateService` + components), lazy-routed via the append-only `routes.ts` convention.
- Maintain strict module boundaries via ArchUnit and the frozen `EmployeeContract`; `portfolio` must not import another module's `repository/`/`domain/`.

**Non-Goals:**
- The Skills register aggregation ("Who's strong on Angular?") — that is Phase 5, which consumes the frozen `PortfolioContract` this splice implements.
- The rounded person view — that is Phase 6.
- File upload / binary storage for public links (links are URLs only).
- Integration testing (explicitly disabled per `testing-strategy.yaml`).
- Persistence of frontend state across page refreshes (in-memory only, per `frontend-state.yaml`).
- Auth/identity provider integration (JWT + RBAC remains the Phase 0 stub).

## Decisions

- **Aggregate shape**: `Portfolio` is the aggregate root keyed by `EmployeeId` (1:1 — one portfolio per employee, created lazily on first edit if absent). It owns four child collections modelled as separate entities/tables: `PortfolioSkill` (skill name, years, projectCount), `PortfolioEducation`, `PortfolioProject`, `PortfolioLink`. Alternatives considered: (a) a single wide JSON column — rejected because Phase 5 must aggregate skill years/project counts efficiently via the frozen contract, and a JSON blob forces full-portfolio reads; (b) a standalone `skills` table owned by Phase 5 — rejected because MISSION.md assigns skills-with-years to the *portfolio* and keeps the Skills register read-only. The normalized child tables keep the `portfolioFor` read model cheap and let Phase 5 read skills without loading education/projects/links.
- **Contract surface (frozen, additive)**: `PortfolioContract.portfolioFor(EmployeeId)` returns `PortfolioSummary(EmployeeId, List<SkillStrength>)`. Skill entries map to `SkillStrength(employeeId, employeeName, skill, years, projectCount)`. Education, projects, and links are owned by Phase 4 but **not** exposed on the frozen contract — they are served only by the portfolio REST API. This keeps the cross-module surface minimal and avoids a contract coordination PR. Alternative: expose the full portfolio on the contract — rejected as it would couple Phase 5/6 to portfolio internals and violate the "additive only" contract rule for a non-additive shape change.
- **Cross-module communication**: `PortfolioService` injects `EmployeeContract` only. Subject existence is validated via `EmployeeContract.exists(EmployeeId)`; the employee display name for `SkillStrength.employeeName` is resolved via `EmployeeContract.findById(EmployeeId)` (the frozen summary). No imports of `employee/` impl, repository, or domain. Enforced by ArchUnit denylist (per the build-env memory: cross-module ArchUnit rules must be denylists).
- **Security & "me" context**: the portfolio endpoints are scoped by employee path variable (`/api/v1/employees/{id}/portfolio`). For the POC, any authenticated user (roles `EMPLOYEE`, `MANAGER`) may read/edit a portfolio; RBAC is the stubbed `@PreAuthorize` from Phase 0. A future "edit only your own" rule is out of POC scope.
- **REST shape**: `GET /api/v1/employees/{id}/portfolio` returns the whole portfolio (unwrapped, camelCase). Child collections are edited via sub-resources: `POST /api/v1/employees/{id}/portfolio/skills`, `PUT/DELETE /api/v1/employees/{id}/portfolio/skills/{entryId}` (and likewise `education`, `projects`, `links`). The full `PUT /api/v1/employees/{id}/portfolio` replaces the entire portfolio body for bulk edits. All casing/versioning/error envelope per `api-standards.yaml`.
- **Liquibase**: files added only under `db/changelog/modules/portfolio/`, changeset IDs prefixed `portfolio-001`, `portfolio-002`, … so no collision with other modules. `master.yaml` (`includeAll`) is untouched. `portfolio` table references `employee(id)` via FK; child tables reference `portfolio(id)`.
- **Frontend architecture**: `PortfolioStateService` (root state service in `features/portfolio/`) holds the active portfolio as a signal, exposes `computed()` views per section, and co-locates all API calls/side effects. Components dispatch actions to the service (never `.set()` global signals directly). `toSignal()` bridges the RxJS HTTP call to the signal world. Lazy route appended to `routes.ts` as the single append-only shared-file touch.

## Risks / Trade-offs

- [Risk] Adding portfolio skill entries to the frozen contract could drift toward a breaking shape change. → [Mitigation] The contract already freezes `PortfolioSummary` + `SkillStrength` (Phase 0); Phase 4 implements it verbatim — additive only, no contract PR.
- [Risk] 1:1 portfolio-per-employee could race on concurrent first-edit (two creates). → [Mitigation] Unique constraint on `portfolio.employee_id`; service upserts idempotently. POC scale makes this low-risk.
- [Risk] Loading the full portfolio on every `GET` could become heavy with many links/projects. → [Mitigation] POC scale is small; sub-resource endpoints keep edits targeted. Pagination is applied where list semantics exist if needed later.
- [Risk] `employeeName` on `SkillStrength` couples `portfolioFor` to an `EmployeeContract` call. → [Mitigation] Single cheap `findById`; resolved in the service layer, not the repository, preserving layer boundaries.
- [Risk] Drift from constitution during parallel development (e.g., a `BehaviorSubject` slipping in, or an illegal cross-module import). → [Mitigation] Constitution Guard red-teams each PR; ArchUnit denylist test in the module; `/api-check` and `/arch-verify` gates.

## Migration Plan

- Forward-only Liquibase changesets under `db/changelog/modules/portfolio/`. Applied automatically by the existing `master.yaml` `includeAll` on app startup — no edits to shared files.
- Rollback: drop `portfolio_*` tables (POC data is non-production). No downstream schema depends on them yet (Phase 5 reads via contract, not direct table access).

## Open Questions

- Should `GET /api/v1/employees/{id}/portfolio` return 404 or an empty portfolio when the employee has never edited one? *Proposed: return an empty portfolio (zero entries) for an existing employee, 404 only when the employee itself does not exist.* To confirm during implementation.
- Whether the bulk `PUT` replace semantics should delete-and-reinsert child rows or diff. *Proposed: replace (delete + insert) for POC simplicity.* To confirm during implementation.