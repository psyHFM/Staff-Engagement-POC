# Roadmap — Staff Engagement POC

> Constitution document. Primary source of truth for *how* the mission is delivered, in what order, and how multiple developers work in parallel without merge conflicts.
> Pair with `MISSION.md` (the what/why) and the YAML specs in `.claude/constitution/` (the constraints).

- **Version:** 1.1.0
- **Last updated:** 2026-06-23
- **Architecture:** Modular Monolith (package-based modules, ArchUnit-enforced boundaries, cross-module via Service interfaces — see `backend-architecture.yaml`)

---

## 1. How to read this roadmap

The work is split into **splices**. A splice is a self-contained vertical slice
(backend module + frontend feature + its own migrations + its own tests) that
one developer (or a BE/FE pair) owns end-to-end.

Splices are designed so that **two developers working on different splices at the
same time produce PRs that do not conflict**. This is achieved by:

1. **Disjoint file ownership** — each splice owns a unique set of folders; no
   two splices edit the same files.
2. **Frozen contracts** — cross-module dependencies go through Service
   interfaces (ports) defined once in Phase 0. A splice never imports another
   splice's implementation package.
3. **Append-only coordination points** — the few shared files that must change
   (`routes.ts`, `app.config.ts`, `pom.xml`) change only by *appending* a
   line-per-feature; such conflicts are trivial to resolve.

### Phase ordering and parallelism

```
Phase 0  Foundation ............... SERIAL (prerequisite for everything)
   │
   ├──> Phase 1  Employee ......... PARALLEL  (splice A)
   ├──> Phase 2  Interaction ...... PARALLEL  (splice B)  ── depends on Employee contract
   ├──> Phase 3  Task ............. PARALLEL  (splice C)  ── depends on Employee + Interaction contracts
   ├──> Phase 4  Portfolio ........ PARALLEL  (splice D)  ── depends on Employee contract
   └──> Phase 5  Skills register .. PARALLEL  (splice E, centrepiece) ── depends on Portfolio contract
                │
                └──> Phase 6  Integration (rounded person view) ... SERIAL (merges all modules)
```

- **Phase 0** must merge before any other splice branches. Everyone branches off
  Phase 0's result.
- **Phases 1–5** run in parallel. A splice may *develop* in parallel against the
  frozen contract of a splice it depends on, even before that splice merges.
  Full runtime integration is deferred to Phase 6.
- **Phase 6** merges after the module splices it integrates have landed.

### Parallelism matrix

| Dev | Can work on (concurrently) | Blocked until |
|-----|----------------------------|---------------|
| Dev A | Phase 1 (Employee) | Phase 0 merged |
| Dev B | Phase 2 (Interaction) | Phase 0 merged (codes against frozen `EmployeeContract`) |
| Dev C | Phase 3 (Task) | Phase 0 merged (codes against frozen `EmployeeContract` + `InteractionContract`) |
| Dev D | Phase 4 (Portfolio) | Phase 0 merged |
| Dev E | Phase 5 (Skills register) | Phase 0 merged (codes against frozen `PortfolioContract`) |
| Anyone | Phase 6 (Integration) | Phases 1–5 merged |

> Dev A on Phase 1 and Dev B on Phase 2 at the same time → **no merge conflict**:
> A owns `employee/`, B owns `interaction/`; B depends only on the frozen
> `EmployeeContract` interface from Phase 0, not on A's files.

---

## 2. Conflict-avoidance contract (read before starting any splice)

### 2.1 Package / folder layout

Backend base package (finalised in Phase 0, placeholder `com.staffengagement`):

```
backend/src/main/java/com/staffengagement/
  shared/                      ← Phase 0 owns. FROZEN after Phase 0.
    kernel/                    (EmployeeId, InteractionId, TaskId, PortfolioId, base classes)
    error/                     (uniform error envelope)
    security/                  (JWT + RBAC config, stubbed for POC)
    api/                       (frozen cross-module port interfaces — see 2.2)
  employee/                    ← Phase 1 owns
    controller/ service/ repository/ domain/
  interaction/                 ← Phase 2 owns
  task/                        ← Phase 3 owns
  portfolio/                   ← Phase 4 owns
  skills/                      ← Phase 5 owns
backend/src/main/resources/db/changelog/
  master.yaml                  ← Phase 0 owns. Uses includeAll (see 2.3). FROZEN.
  modules/
    employee/   ← Phase 1 owns (its own changelog files)
    interaction/ ← Phase 2 owns
    task/       ← Phase 3 owns
    portfolio/  ← Phase 4 owns
    skills/     ← Phase 5 owns
```

Frontend (Angular 22, lazy feature folders):

```
frontend/src/app/
  shell/                       ← Phase 0 owns (layout, nav, auth gate, route barrel)
  shared/                      ← Phase 0 owns (HTTP client, error handling, base state service)
  features/
    employee/                  ← Phase 1 owns
    interaction/               ← Phase 2 owns
    task/                      ← Phase 3 owns
    portfolio/                 ← Phase 4 owns
    skills/                    ← Phase 5 owns
  profile/                     ← Phase 6 owns (integration feature)
  your-details/                ← Post-Phase 6 (ATSE1-32 — self-service /profile page)
                                Reuses employee DTOs + create/detail forms; the
                                directory page is a sibling, not a parent.
```

**Rule:** a splice only creates/edits files inside **its own module package**
(backend) and **its own feature folder** (frontend), plus **its own Liquibase
changelog folder**. Anything outside those is off-limits unless this roadmap
says otherwise.

### 2.2 Cross-module communication (the frozen contracts)

Per `backend-architecture.yaml`, modules communicate **only via Service
interfaces**. To allow parallel development, Phase 0 defines and **freezes** the
port interfaces and ID types in `shared/api/`:

- `EmployeeContract` — `Optional<EmployeeSummary> findById(EmployeeId)`, `boolean exists(EmployeeId)`, etc.
- `InteractionContract` — `List<InteractionSummary> findBySubject(EmployeeId)`. `InteractionSummary` exposes `type` (`InteractionType`), `subject` (`EmployeeId`), `facilitator` (`EmployeeId`), and note.
- `TaskContract` — `List<TaskSummary> tasksForEmployee(EmployeeId)`, `List<TaskSummary> myTasks(EmployeeId currentUser)`. Creation accepts an **optional** source `InteractionId` — standalone tasks omit it.
- `PortfolioContract` — `PortfolioSummary portfolioFor(EmployeeId)`, skill entries (years + project count).
- `SkillsContract` — `Paged<SkillStrength> strongIn(String skill, int minYears, PageRequest)`.

**Rules:**
- A splice implements its own contract interface (e.g. `EmployeeService implements EmployeeContract`).
- A splice that needs data from another module injects that module's **contract interface only** — never the impl class, never its repository.
- ArchUnit (Phase 0 baseline test) enforces: no imports from another module's `repository/` or `domain/` package.
- Changing a frozen contract = a coordination PR, not a splice edit. Contracts are versioned; additive changes only (new methods), breaking changes require a roadmap amendment.

### 2.3 Migrations (no master-file conflicts)

- `master.yaml` uses Liquibase `includeAll: db/changelog/modules/` (recursive). Phase 0 sets this up and freezes it.
- Each splice adds files only under `db/changelog/modules/<its-module>/`.
- Changeset IDs are prefixed by module and zero-padded per module, e.g. `employee-001`, `employee-002`, `interaction-001`. No two modules share an ID prefix → no ID collisions.
- **No splice edits `master.yaml` or another module's changelog folder.**

### 2.4 Frontend routes & config (append-only coordination points)

- `routes.ts` (Phase 0) lists one `loadChildren` line per feature, ordered by phase. A splice **appends one line** for its feature. This is the only shared file a frontend splice touches; append-only conflicts are trivial.
- `app.config.ts` providers: append-only. Phase 0 registers base providers; a splice appends its state-service provider if needed. Prefer feature-level providers over editing `app.config.ts`.
- State: each feature owns its root **State Service** (Angular Signals, per `frontend-state.yaml`). No cross-feature signal sharing except through a Phase 0 shared service.

### 2.5 Dependencies (locked in Phase 0)

Phase 0 fixes the dependency set (Spring Boot starter web/data-jpa/security,
Liquibase, Lombok, PostgreSQL driver, ArchUnit, PITest, JaCoCo; Angular, RxJS,
PrimeIcons, Jest, Stryker). **Splices must not add dependencies.** If a splice
genuinely needs one, it raises a coordination PR against `pom.xml` /
`package.json` — these are shared files and the main real conflict risk, hence
the lock.

### 2.6 Shared-files register (off-limits to splices unless appending)

| File | Owner | Splice interaction |
|------|-------|--------------------|
| `backend/pom.xml` | Phase 0 / coordination | Locked — no splice edits |
| `backend/.../shared/**` | Phase 0 | Frozen — no splice edits |
| `backend/.../resources/db/changelog/master.yaml` | Phase 0 | Frozen — no splice edits |
| `backend/.../Application.java`, `application.yml` | Phase 0 | Frozen — no splice edits |
| `frontend/.../app/shell/**`, `app/shared/**` | Phase 0 | Frozen — no splice edits |
| `frontend/.../app/routes.ts` | Phase 0 | Append one line per feature |
| `frontend/.../app/app.config.ts` | Phase 0 | Append-only providers |
| `frontend/package.json` | Phase 0 / coordination | Locked — no splice edits |

### 2.7 Post-Phase-6 carve-outs (additive only)

The Phase 6 PRs (rounded profile) merged without leaving room in the
road map for the follow-up UX-walkthrough-fixes cluster. The carve-outs
below amend the layout and the front-end routes for that cluster and
**only for that cluster**; later post-Phase-6 work must open its own
amendment.

| Carve-out | Owner | Detail |
|-----------|-------|--------|
| `frontend/.../app/your-details/` | Post-Phase 6 / ATSE1-32 | New feature folder — self-service /profile page. Reuses `features/employee/` DTOs and form components. Sibling of `features/<x>/`, not a child. See §2.1 (frontend block). |
| `frontend/.../app/routes.ts → { path: 'profile', … }` | Post-Phase 6 / ATSE1-32 | Appended line. The existing `employees/:id/profile` route is unchanged. |
| `frontend/.../app/shell/shell.html → <a routerLink="/profile">` | Post-Phase 6 / ATSE1-32 | The Phase 0 shell exposes the authenticated user's identity as a clickable link. Read-only wiring — no new layout, no new nav items. |
| Auth-state persistence (localStorage carve-out) | Post-Phase 6 / ATSE1-25 | `AuthState` reads/writes the JWT under `staff-engagement.auth.jwt` and a denormalised username under `staff-engagement.auth.username` via the `AUTH_STORAGE` injection token. **Single carve-out** from the "no persistence" rule in `frontend-state.yaml -> persistence`. The Phase 0 `AuthStorage` interface (in `shared/auth/`) is the only allowed read/write surface. |
| `InteractionContract.verifyEditable` (additive) | Post-Phase 6 / ATSE1-28 | Additive default method on the frozen interaction port. Returns `boolean`; default `true`. No change to the existing methods. |
| `TaskSummaryWithItems` (additive) | Post-Phase 6 / ATSE1-34 | A new additive wrapper record `{ ...TaskSummary, items: List<TaskItemSummary> }` is used by the new `/tasks/{id}/items` endpoints. `TaskSummary` itself is **not** modified — additive-only, no breaking change to existing callers. |

---

## 3. Phase 0 — Foundation  *(serial prerequisite)*

**Goal:** stand up the modular-monolith skeleton so every later splice can
branch and run in parallel without touching shared files.

**Owner:** one developer (or pair). Must merge before any splice branches.

### Backend
- Spring Boot app bootstrap (Java 21, Maven).
- Base package `com.staffengagement` + per-module subpackage convention.
- `shared/` kernel: ID types (`EmployeeId`, `InteractionId`, `TaskId`, `PortfolioId`), the `InteractionType` enum (controlled vocabulary frozen here: `check-in`, `mentoring`, `catch-up`, `performance`, `other`), and base entity classes (Lombok).
- `shared/` error: uniform error envelope (`@RestControllerAdvice` per `api-standards.yaml`).
- `shared/security/`: JWT + Spring Security + RBAC `@PreAuthorize` stub (one in-memory user, roles `EMPLOYEE`, `MANAGER`).
- **Frozen contracts** in `shared/api/` (all port interfaces from §2.2, empty/stub methods, with DTOs).
- Liquibase wired with `master.yaml` `includeAll` over `db/changelog/modules/`; one baseline changeset.
- ArchUnit boundary test (Phase 0 baseline): modules must not import another module's `repository`/`domain`; `controller` must not touch `repository` directly.
- Postgres via Docker Compose; `docker-compose.yml` at repo root.
- One **example stub module** (`shared`-only health endpoint) proving the layout compiles and CI is green.

### Frontend
- Angular 22 shell: `app.config.ts`, `main.ts`, router, layout + nav, auth gate (login stub).
- `shared/`: HTTP client with uniform error handling, base state service pattern (Signals + `toSignal()`), PrimeIcons wired.
- `routes.ts` with the append-per-feature convention and one stub lazy route.
- Jest + JSDOM + Stryker configured; one trivial passing test proving the setup.

### CI
- Ensure the existing CI (`.github/workflows/ci.yml`) runs backend build/test/PITest + frontend lint/build/test against this skeleton and is green. *(CI lives on its own branch/PR — reference it, do not duplicate.)*

### Exit criteria
- [ ] `docker compose up` starts Postgres + backend + frontend.
- [ ] `GET /api/v1/health` returns 200.
- [ ] Login stub issues a JWT; a protected endpoint enforces it.
- [ ] ArchUnit test passes; the frozen contracts compile.
- [ ] CI green (backend PITest + frontend Stryker).
- [ ] This roadmap's §2 conventions are demonstrably enforceable (the stub module follows them).

---

## 4. Phase 1 — Employee  *(splice A, parallel)*

**Goal:** the central record everything hangs off.

**Owns:** `backend/.../employee/**`, `db/changelog/modules/employee/**`, `frontend/.../features/employee/**`.

### Backend
- Entity + repository + service (`EmployeeService implements EmployeeContract`) + controller.
- REST: `GET/POST /api/v1/employees`, `GET /api/v1/employees/{id}`, `PUT /api/v1/employees/{id}` (kebab-case, camelCase JSON, unwrapped, error envelope, offset pagination on list).
- Liquibase `employee` table.
- Unit tests (BDD Given-When-Then, JUnit5 + Mockito), PITest mutation, JaCoCo ≥ 80%.

### Frontend
- `EmployeeList` + `EmployeeDetail` components, `EmployeeStateService` (Signals), lazy route appended to `routes.ts`.

### Exit criteria
- [ ] CRUD an employee end-to-end.
- [ ] `EmployeeContract` implemented; ArchUnit green; CI green.

---

## 5. Phase 2 — Interaction  *(splice B, parallel)*

**Goal:** record a typed engagement with an employee — capturing its **type**, **subject** (who it was for), and **facilitator** (who facilitated, defaulting to the logged-in user). Many interactions per subject; many facilitators allowed. An interaction may optionally spawn tasks.

**Depends on:** frozen `EmployeeContract` (Phase 0) — codes against it; does **not** import `employee/` impl.

**Owns:** `backend/.../interaction/**`, `db/changelog/modules/interaction/**`, `frontend/.../features/interaction/**`.

### Backend
- Entity with: `type` (`InteractionType`), `subject` (`EmployeeId` — who it was for; many interactions per subject), `facilitator` (`EmployeeId` — who facilitated; **defaults to the authenticated user, overridable**), note, timestamps. repository, `InteractionService implements InteractionContract`, controller.
- REST: `POST /api/v1/interactions` (body: `type`, `subject`, `note`, optional `facilitator` defaulting to the logged-in user), `GET /api/v1/employees/{id}/interactions` (paginated, by subject), `GET /api/v1/interactions/{id}`.
- Validation: `subject` must be an existing employee (via `EmployeeContract.exists`); `type` must be a valid `InteractionType`.
- Liquibase `interaction` table (`type`, `subject_id` FK, `facilitator_id` FK, `note`, timestamps).
- Unit tests + PITest + JaCoCo.

### Frontend
- Log-interaction form (type selector, subject, facilitator defaulting to the current user, note), interaction history list per employee, `InteractionStateService`, lazy route.

### Exit criteria
- [ ] Log an interaction against an employee capturing **type**, **subject**, and **facilitator**; list per employee.
- [ ] Multiple facilitators can record against the same subject; facilitator defaults to the logged-in user and is overridable.
- [ ] Depends only on `EmployeeContract`; ArchUnit green; CI green.

---

## 6. Phase 3 — Task  *(splice C, parallel)*

**Goal:** follow-up tasks are **person-level** — the logged-in user sees tasks relating to them regardless of creator. A task has two origins: **spawned from an interaction** (traced to a source `InteractionId`) or **created standalone** (no interaction); the link is optional in both cases. Any authenticated user may create a task.

**Depends on:** frozen `EmployeeContract` (always — for the task's subject) + `InteractionContract` (Phase 0 — only for the optional create-from-interaction path).

**Owns:** `backend/.../task/**`, `db/changelog/modules/task/**`, `frontend/.../features/task/**`.

### Backend
- Entity (person-level; optional link to source `InteractionId` — **nullable for standalone tasks**), repository, `TaskService implements TaskContract`, controller.
- REST: `POST /api/v1/employees/{id}/tasks` (or `POST /api/v1/tasks` with a body carrying an optional `sourceInteractionId`), `GET /api/v1/employees/{id}/tasks`, **`GET /api/v1/me/tasks`** (tasks for the authenticated user, any creator). Any authenticated user may create a task (from an interaction or standalone).
- "Create task from interaction" path uses `InteractionContract` to validate the source interaction; the standalone path omits the link.
- Liquibase `task` table (`source_interaction_id` nullable FK).
- Unit tests + PITest + JaCoCo.

### Frontend
- "My tasks" view (driven by `/api/v1/me/tasks`), create-task-from-interaction action **and** standalone create-task action, `TaskStateService`, lazy route.

### Exit criteria
- [ ] Create a task from an interaction **and** create a standalone task; the relevant person sees both in "My tasks" regardless of who created them.
- [ ] Depends only on `EmployeeContract` + `InteractionContract`; ArchUnit green; CI green.

---

## 7. Phase 4 — Portfolio  *(splice D, parallel)*

**Goal:** per-employee portfolio — skills (with years + project count), education history, projects worked on, public links.

**Depends on:** frozen `EmployeeContract` (Phase 0).

**Owns:** `backend/.../portfolio/**`, `db/changelog/modules/portfolio/**`, `frontend/.../features/portfolio/**`.

### Backend
- Entities: `Portfolio` (per employee) containing skill entries (skill name, years, project count), education entries, project entries, public links.
- `PortfolioService implements PortfolioContract`, controller.
- REST: `GET/PUT /api/v1/employees/{id}/portfolio`, plus sub-resource CRUD (skills, education, projects, links) as needed (kebab-case).
- Liquibase `portfolio_*` tables.
- Unit tests + PITest + JaCoCo.

### Frontend
- Portfolio editor (skills with years + project count, education, projects, links), `PortfolioStateService`, lazy route.

### Exit criteria
- [ ] Capture and edit a person's portfolio incl. skill years + project counts.
- [ ] `PortfolioContract` implemented; ArchUnit green; CI green.

---

## 8. Phase 5 — Skills register  *(splice E, parallel — the centrepiece)*

**Goal:** quantify experience per skill across employees and answer **"Who's strong on Angular?"** with names, years, and project counts.

**Depends on:** frozen `PortfolioContract` (Phase 0). Develops against the contract in parallel; full real-data behaviour needs Phase 4 merged.

**Owns:** `backend/.../skills/**`, `db/changelog/modules/skills/**`, `frontend/.../features/skills/**`.

### Backend
- A **read-oriented** module: `SkillsService implements SkillsContract` aggregates skill strength across employees via `PortfolioContract`.
- REST: `GET /api/v1/skills` with filtering `?name=angular&minYears=3&sort=years,desc` (offset pagination per `api-standards.yaml`). Response: employee name, years, project count per skill, ranked.
- If the portfolio read-model is insufficient for efficient aggregation, Phase 5 may introduce a skills projection maintained via the portfolio contract (not by importing portfolio internals).
- Unit tests + PITest + JaCoCo.

### Frontend
- Skills search page: pick a skill → ranked list of people with years + project counts, `SkillsStateService`, lazy route.

### Exit criteria
- [ ] **"Who's strong on Angular?"** returns names, years, and project counts, ranked and paginated.
- [ ] Depends only on `PortfolioContract`; ArchUnit green; CI green.

---

## 9. Phase 6 — Integration: rounded person view  *(serial, merges all)*

**Goal:** deliver capability #3 from `MISSION.md` — one rounded view of a person combining profile, interactions, tasks, portfolio, and skills.

**Runs after** Phases 1–5 have merged. It is its own integration feature that
**consumes the frozen contracts**, so it adds files without re-editing the
modules.

**Owns:** `backend/.../profile/**` (new integration module), `db/changelog/modules/profile/**` (if any read-model), `frontend/.../app/profile/**`.

### Backend
- `ProfileService` orchestrates `EmployeeContract` + `InteractionContract` + `TaskContract` + `PortfolioContract` (+ optional `SkillsContract`) into a composite `PersonProfile` read model. Cross-module calls go through Service interfaces only (cross-module `@Transactional` allowed per `backend-architecture.yaml`).
- REST: `GET /api/v1/employees/{id}/profile` → composite payload.
- Unit tests (mock the contracts) + PITest + JaCoCo.

### Frontend
- Person profile page: header (employee), interactions history, outstanding tasks, portfolio, skills — composed from each feature's state service (read-only consumption).

### Exit criteria
- [ ] Open one person → see interactions, tasks, portfolio, and skills in a single rounded view.
- [ ] All §5 guiding questions in `MISSION.md` answered end-to-end.
- [ ] ArchUnit green; CI green; no module boundary violations in the integration layer.

---

## 10. Suggested sequencing for a small team

- **Sprint 1:** Phase 0 (one dev/pair). Block everything else until merged.
- **Sprint 2–3:** Phases 1–5 in parallel (one dev per splice). Daily contract check: any additive contract change goes through a tiny coordination PR.
- **Sprint 4:** Phase 6 integration (whoever finishes first, or a designated dev).

If the team is smaller than five, prioritise the dependency path
**0 → 1 (Employee) → 2 (Interaction) → 3 (Task)** and **0 → 4 (Portfolio) → 5 (Skills)**
so that Phase 6 has data to integrate.

## 11. Amending this roadmap

This is a constitution document. Changes to phase scope, ownership boundaries,
or the frozen contracts require a PR that updates this file and is reviewed like
any architecture decision. Additive contract changes (new methods, new optional
fields) are allowed within a splice; breaking changes require bumping the
contract version and a note here.