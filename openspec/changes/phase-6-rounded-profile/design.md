## Context

All five domain modules are now on `main`. The frozen cross-module contracts live in `backend/src/main/java/com/staffengagement/shared/api/`:

- `EmployeeContract` — `findById`, `exists`, `findByEmail`, `allEmployees` → `EmployeeSummary(id, fullName, email, role, jobTitle, department, level)`
- `InteractionContract` — `findBySubject(EmployeeId)` → `List<InteractionSummary>` with `createdAt`
- `TaskContract` — `tasksForEmployee(EmployeeId)`, `myTasks(EmployeeId)` → `List<TaskSummary>` with `description`
- `PortfolioContract` — `portfolioFor(EmployeeId)` → `PortfolioSummary(skills, education, projects, links)`
- `SkillsContract` — `strongIn(skill, minYears, pageRequest)` → `Paged<SkillStrength>`

`ROADMAP.md` §9 defines Phase 6 as a serial integration phase that owns `backend/.../profile/**` and `frontend/src/app/profile/**`. It must add files without re-editing existing modules, and cross-module calls must go through the frozen contracts only.

## Goals / Non-Goals

**Goals:**
- Implement a read-only `profile` backend module that composes a `PersonProfile` from the five frozen contracts.
- Expose `GET /api/v1/employees/{id}/profile` per `api-standards.yaml` (unwrapped, camelCase, uniform error envelope).
- Return 404 when the employee does not exist.
- Implement an Angular profile page that loads the rounded view and renders it in sections.
- Wire the route `/employees/:id/profile` lazily in `routes.ts` and add a link from the employee directory.
- Unit tests with mocked contracts; ArchUnit green; CI green.

**Non-Goals:**
- No persistence layer for the profile module (no `profile` DB table).
- No mutations from the profile page; editing continues to happen in the existing feature modules.
- No changes to existing module internals (domain/service/controller/repository).
- No new dependencies.
- No breaking changes to frozen contracts; only additive field additions.

## Decisions

### D1 — Backend package layout: `profile/{controller, service}` only
```
com.staffengagement.profile/
  controller/ProfileController.java
  controller/ProfileErrorHandler.java
  service/ProfileService.java
  service/PersonProfile.java
  service/ProfileMapper.java
```
**Why:** the module is pure read orchestration, so it has no domain/repository layers. This still satisfies `backend-architecture.yaml` layering because the controller depends only on the service, and the service depends only on the frozen contracts.

### D2 — `ProfileService` injects the four consumed frozen contracts
Constructor injection of `EmployeeContract`, `InteractionContract`, `TaskContract`, and `PortfolioContract`. The method `profileFor(EmployeeId id)` is annotated with `@Transactional(readOnly = true)` so cross-module reads are wrapped in a single read-only transaction as permitted by `backend-architecture.yaml`.

**Why:** this is exactly the integration pattern `ROADMAP.md` §9 prescribes. `SkillsContract` is intentionally not consumed here because the personal rounded view derives skill strength from the employee's own portfolio; the global skills ranking remains the responsibility of the `/skills` page.

### D3 — `PersonProfile` record shape
```java
public record PersonProfile(
    EmployeeSummary employee,
    List<InteractionSummary> interactions,
    List<TaskSummary> tasks,
    PortfolioSummary portfolio,
    List<SkillWithStrength> topSkills) {}
```
`SkillWithStrength` carries `skill`, `years`, `projectCount` for the employee's own top skills, resolved from the `PortfolioSummary` skills list.

**Why:** this answers the mission capability "open one person and see their interactions, tasks, portfolio, and skills". The profile uses the employee's own portfolio data rather than `SkillsContract.strongIn`, which aggregates across the whole workforce.

### D4 — Controller path: `GET /api/v1/employees/{id}/profile`
Path variable `{id}` is bound as `Long` and wrapped in `EmployeeId` locally. If `employeeContract.findById(id)` is empty, return 404 with the uniform `ErrorEnvelope`.

**Why:** matches the route convention already used by `PortfolioController` (`/api/v1/employees/{id}/portfolio`) and the contract in `ROADMAP.md` §9.

### D5 — Module-local error handler
`ProfileErrorHandler` is a small `@RestControllerAdvice(basePackages = "com.staffengagement.profile.controller")` that maps `ProfileNotFoundException` to a 404 `ErrorEnvelope`. General exceptions fall through to the existing `shared/error/GlobalExceptionHandler`.

**Why:** keeps `shared/**` untouched while giving module-specific not-found behavior.

### D6 — Frontend route and nav integration
- Append one route to `frontend/src/app/app.routes.ts`:
  ```ts
  {
    path: 'employees/:id/profile',
    loadComponent: () => import('./profile/profile-page').then(m => m.ProfilePage),
    canActivate: [authGuard]
  }
  ```
- Add a "Profile" button/link in `EmployeeList` that navigates to `/employees/${id.value}/profile`.
- Do **not** add a top-level nav item; the profile is contextually reached from the directory.

**Why:** follows the append-only route convention and keeps the shell nav uncluttered. The employee directory is the natural entry point.

### D7 — Frontend state service pattern
`ProfileStateService` extends the shared `StateService`, holds a private `signal<PersonProfile | null>`, and exposes `profile`, `loading`, `error` as `computed()`. It calls `ApiClient.get<PersonProfile>(`employees/${id}/profile`)` and updates the signal in the subscription.

**Why:** consistent with `frontend-state.yaml` (Signals, unidirectional flow, service-based state) and sibling feature state services.

### D8 — Component sections
`ProfilePage` renders:
1. Header: employee full name, email, role, job title, department, level.
2. Interactions: list of interaction cards (type, facilitator, note, timestamp).
3. Tasks: outstanding tasks with checkbox/completed state (read-only display).
4. Portfolio: skills with years/project count, education, projects, links.

**Why:** directly satisfies `MISSION.md` capability #3 and the success criteria.

## Risks / Trade-offs

- **N+1 orchestration** — `ProfileService` makes one call per contract; for a single profile load this is acceptable for a POC. A future projection table could be added, but that would require persistence and is out of scope.
- **Contract availability** — all contracts now have implementations on `main`, so runtime integration is possible for the first time.
- **Skills display** — we show the employee's own portfolio skills, not the global ranking. This is correct for a personal rounded view; the global "Who's strong on Angular?" view remains on `/skills`.

## Migration Plan

1. Branch `feature/phase-6-rounded-profile` from `main`.
2. Apply additive extensions to frozen `shared/api/` DTOs (`EmployeeSummary`, `InteractionSummary`, `TaskSummary`, `PortfolioSummary`) so the profile can consume the data it needs.
3. Update each producing module's mapper/service to populate the new fields from its own domain data.
4. Implement backend `profile/**` + tests.
5. Add `com.staffengagement.profile..` isolation rule to `ArchUnitTest.java` and append `com.staffengagement.profile.*` to PITest `targetClasses` in `backend/pom.xml`.
6. Implement frontend `profile/**` + update `app.routes.ts` and `EmployeeList` link + tests.
7. Run `mvn -f backend/pom.xml test` and `npm --prefix frontend test`.
8. PR against `main`.
9. Rollback: revert PR; no DB migration to roll back.

## Open Questions

- **Top skills ordering:** Should the profile surface portfolio skills sorted by years descending, or preserve portfolio order? Decision: sort by `years` descending with `projectCount` as tie-breaker; easily changed if UX prefers portfolio order.
- **Task display scope:** Show all tasks for the employee or only incomplete ones? Decision: show all tasks with completed status; this gives the fullest rounded view.
