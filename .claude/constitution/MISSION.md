# Mission — Staff Engagement POC

> Constitution document. Primary source of truth for *why* this project exists and *what* domain it models.
> Pair with `ROADMAP.md` (how/when) and the YAML specs in `.claude/constitution/` (how it must be built).

- **Version:** 1.2.0
- **Last updated:** 2026-06-25
- **Status:** POC — exploratory, not a committed product

---

## 1. The problem we're modelling

Across the company, many people hold interactions with staff — check-ins,
mentoring chats, catch-ups — and capture them as **personal notes scattered
across individuals**, shared only loosely. There is:

- **No single place to record an interaction** with a person.
- **No way to turn an interaction into follow-up actions** that survive the
  conversation.
- **No rounded view of a person** — you can't see, in one place, who someone is,
  what people have discussed with them, what's outstanding, and what they're
  skilled at.

This POC models a small domain that explores solving those three gaps.

## 2. Objective

Build a minimal, working model of a **staff engagement system** that proves the
domain fits together: record interactions → spawn follow-up tasks → assemble a
rounded profile per person, anchored on a quantified skills register.

The POC is **exploratory**. Its job is to validate the domain shape and the
modular-monolith architecture, not to ship a production product. Scope is
deliberately bounded (see §6).

## 3. Domain — core entities and how they relate

```
                ┌──────────┐
                │ Employee │   ← the central record; everything hangs off a person
                └────┬─────┘
                     │ 1
        ┌────────────┼────────────┬─────────────┐
        │ many       │ many        │ 1           │ 1
        ▼            ▼             ▼             ▼
  ┌──────────┐ ┌──────────┐  ┌───────────┐ ┌──────────┐
  │Interaction│ │  Task   │  │ Portfolio │ │  Skills  │
  │          │ │          │  │           │ │ Register │
  └──────────┘ └──────────┘  └───────────┘ └──────────┘
```

- **Employee** — the central record. Everything hangs off a person.
- **Interaction** — a typed record of an engagement with an employee. Every
  interaction records three things:
  - **`type`** — a constrained set of interaction kinds (controlled vocabulary,
    frozen in the constitution: `check-in`, `mentoring`, `catch-up`,
    `performance`, `other`). Free-text type is not allowed; the note body
    carries the free-form detail.
  - **`subject`** — the employee the interaction was *for* (who it was about).
    Many interactions belong to one employee.
  - **`facilitator`** — the employee who *facilitated* the interaction. This is a
    named `EmployeeId` reference that **defaults to the logged-in user** recording
    the interaction but may be set to someone else. Many people can record
    interactions against the same subject (e.g. you record notes after chatting
    to someone).
  - **Optionally spawns tasks** — an interaction *may* spawn follow-up tasks but
    is not required to (see Task).
- **Task** — a person-level follow-up. A task has **two possible origins**:
  - **Spawned from an interaction** — traced back to the source `InteractionId`
    (optional link).
  - **Created independently** — a task may be created with no interaction at all.
    The link to a source interaction is **optional in both cases**.
  - Regardless of origin, every task is **person-level**: it targets a specific
    employee, and when someone logs in they see the tasks relating to *them*,
    regardless of who created them. Any authenticated user may create a task
    (from an interaction or standalone).
- **Portfolio** — per employee: skills, education history, projects worked on,
  and public links (GitHub or anything they want to showcase).
- **Skills register (the centrepiece)** — quantifies experience per skill:
  **years** and **project count** on Angular, Java, etc.
  - Should answer questions like **"Who's strong on Angular?"** with names,
    years, and number of projects.

## 4. The three capabilities the domain must deliver

1. **Record** — log an interaction against an employee, capturing its type,
   subject, and facilitator.
2. **Follow up** — turn an interaction into a person-level task, **or** create a
   standalone task, either way visible to the person it relates to.
3. **See the whole person** — a rounded view combining profile, interactions,
   outstanding tasks, portfolio, and quantified skills.

## 5. Guiding questions (success criteria for the POC)

The POC is successful if it can answer, end-to-end through the UI:

- [ ] Can I record an interaction with a person (type, subject, facilitator)?
- [ ] Can an interaction optionally spawn a task the relevant person can see,
      and can I also create a standalone task without an interaction?
- [ ] Can I open one person and see their interactions, tasks, portfolio, and
      skills in one rounded view?
- [ ] **Who's strong on Angular?** → returns names, years of experience, and
      number of projects.
- [ ] Do the module boundaries hold (ArchUnit green, no illegal cross-module
      imports)?

## 6. Scope and boundaries

**In scope (POC):**
- The five domain areas above (Employee, Interaction, Task, Portfolio, Skills).
- A modular-monolith implementation. The component → module → layer nesting is
  specified in §7.
- Unit tests + mutation testing only (integration testing is **disabled** per
  `testing-strategy.yaml`).
- In-memory frontend state (no persistence across refresh, per
  `frontend-state.yaml`).
- Bearer JWT auth + RBAC (stubbed/minimal for the POC).

**Out of scope (POC):**
- Production auth/identity provider integration.
- Notifications, email, scheduling.
- Mobile clients.
- Data migration from existing note systems.
- Persistence of frontend state across refreshes, **except** the
  authentication token (JWT) which is persisted to `localStorage` to
  preserve session continuity on reload / direct navigation. See
  `frontend-state.yaml -> persistence.carve_outs` for the rationale and
  the explicit key.
- Integration / end-to-end tests.

## 7. Architectural alignment

### 7.1 Structural nesting

The system is a strict three-level nesting of **components → modules → layers**.
Top level is the Project; it splits into three runtime components; each
component is divided into domain modules; each module is internally layered.

```
Project (Staff-Engagement-POC)
│
├── backend/                 ← Spring Boot, Java 21 (one app)
│   └── com/staffengagement/
│       ├── employee/         ─┐
│       ├── interaction/        │  modular monolith — package-based modules,
│       ├── task/               │  ArchUnit-enforced boundaries between them
│       ├── portfolio/          │
│       └── skills/            ─┘
│           each module is layered:  controller → service → repository  (+ anemic domain)
│
├── frontend/                ← Angular 22 (one app)
│   └── src/app/features/
│       ├── employee/         ─┐
│       ├── interaction/        │  one lazy feature folder per domain module,
│       ├── task/               │  each self-contained (state service + components)
│       ├── portfolio/          │
│       └── skills/            ─┘
│           each module is layered:  state service → components (unidirectional flow)
│
└── postgres/                ← single relational DB (Liquibase-migrated)
    └── one schema shared by all backend modules (no per-module databases)
```

- **Project → components:** the repository splits into three runtime components —
  `backend`, `frontend`, `postgres` — orchestrated together via Docker Compose.
- **Components → modules:** inside each component, work is divided into
  **modules** that mirror the domain — Employee, Interaction, Task, Portfolio,
  Skills — plus a `shared`/`shell` foundation.
- **Modules → layers:** inside each module, a **layered architecture** applies.
  Backend modules follow **`controller/` → `service/` → `repository/`** (plus an
  anemic domain model); frontend modules follow **state service → components**.
  Cross-module access is via frozen Service-interface contracts only (never
  another module's `repository`/`domain`); see `backend-architecture.yaml` and
  `ROADMAP.md` §2.2.

### 7.2 Constitution specs

This mission is realised under the constraints in the rest of the constitution:

- **`tech-stack.yaml`** — Java 21 / Spring Boot / Angular 22 / Postgres / Liquibase / Docker Compose.
- **`backend-architecture.yaml`** — Modular Monolith, package-based modules, ArchUnit-enforced boundaries, layered (`controller/` → `service/` → `repository/`), anemic domain model, cross-module communication **only via Service interfaces**.
- **`api-standards.yaml`** — REST under `/api/v1`, kebab-case URLs, camelCase JSON, uniform error envelope, offset pagination, Bearer JWT + RBAC.
- **`frontend-state.yaml`** — Angular Signals, service-based state, unidirectional flow, in-memory only.
- **`testing-strategy.yaml`** — Unit tests only (BDD Given-When-Then), PITest (backend) + Stryker (frontend), JaCoCo/Istanbul ≥ 80% (soft warning).

The roadmap for delivering this mission in parallel-safe slices lives in
`ROADMAP.md`.