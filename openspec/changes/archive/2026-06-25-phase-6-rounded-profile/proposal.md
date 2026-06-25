## Why

Phases 1–5 have merged the five domain modules (Employee, Interaction, Task, Portfolio, Skills register). Each module owns its own data and exposes a frozen cross-module contract in `shared/api/`. Phase 6 is the serial integration step from `ROADMAP.md` §9: it delivers the third mission capability — **a rounded view of one person** combining profile, interactions, outstanding tasks, portfolio, and quantified skills, end-to-end through the UI.

This change adds a read-only orchestration layer that consumes the existing frozen contracts without re-editing the modules underneath it. It proves that the modular-monolith boundaries and contract model hold together.

## What Changes

- Add a new `profile` backend module under `com.staffengagement.profile` (controller/service only; no repository/domain because the module is read-only orchestration).
- `ProfileService` orchestrates `EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`, and `SkillsContract` into a single `PersonProfile` read model.
- REST endpoint: `GET /api/v1/employees/{id}/profile` — unwrapped camelCase JSON, uniform error envelope on 404.
- Add a new `profile` frontend feature under `frontend/src/app/profile/` with `ProfileStateService` and `ProfilePage` component.
- Lazy route: `/employees/:id/profile`, appended to `routes.ts`; add a "View profile" affordance in the employee directory.
- Unit tests:
  - Backend: mock all five contracts, assert the orchestration shapes a correct composite.
  - Frontend: mock `ApiClient`, assert the state service assembles the page and the component renders the sections.
- ArchUnit must remain green; no illegal cross-module imports.

## Capabilities

### New Capabilities
- `profile-service`: Read-only orchestration of the five frozen contracts into `PersonProfile`.
- `profile-api`: `GET /api/v1/employees/{id}/profile` returning the rounded person view.
- `profile-ui`: Angular page that loads and displays the rounded view in sections.

### Modified Capabilities
- `employee-ui`: add a row-action/link in `EmployeeList` to open the rounded profile for an employee.
- `routes.ts`: append one lazy route entry for `/employees/:id/profile`.

## Impact

- **New code only:**
  - `backend/src/main/java/com/staffengagement/profile/**`
  - `backend/src/test/java/com/staffengagement/profile/**`
  - `frontend/src/app/profile/**`
- **Read-only consumption** of existing module implementations; no edits to `employee/`, `interaction/`, `task/`, `portfolio/`, `skills/` internals. Additive field additions to the frozen `shared/api/` DTO records only.
- **No new database table** — the profile is a transient read model.
- **Additive contract extensions** — `EmployeeSummary`, `InteractionSummary`, `TaskSummary`, and `PortfolioSummary` are extended with the read fields the rounded view needs. These are non-breaking, additive changes coordinated through `shared/api/` (per `ROADMAP.md` §2.2).
- **Locked files otherwise untouched:** `master.yaml`, `application.yml`, `frontend/package.json`.
- **Cross-module calls** go only through `shared/api` contracts.
- **ArchUnit:** boundary tests must stay green; the new module must not import sibling `repository`/`domain` packages.
