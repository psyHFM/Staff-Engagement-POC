## ADDED Requirements

> **Persona mandate — required:** The frontend portfolio feature is designed and audited by the **Angular State Architect** (`.claude/personas/angular-state-architect.md`) against `frontend-state.yaml` and `.claude/angular-style-guide.md` — Signals-only state, `toSignal()` RxJS→Signal bridge, `computed()` for derived views, no `BehaviorSubject`, unidirectional flow (components call service methods, never `.set()` global signals directly). The frontend unit tests are authored and verified by the **BDD Test Engineer** (`.claude/personas/bdd-test-engineer.md`) in Jest Given-When-Then form, designed to survive Stryker mutation. The **Constitution Guard** (`.claude/personas/constitution-guard.md`) confirms the append-only `routes.ts` touch and kebab-case route path.

### Requirement: PortfolioStateService using Angular Signals
The system SHALL provide a `PortfolioStateService` in `features/portfolio/` that holds the active portfolio as a Signal, exposes per-section derived views via `computed()`, and co-locates all HTTP calls and side effects. Components SHALL obtain state by reading the service's signals and trigger changes by calling service methods — never by mutating global signals directly.

#### Scenario: Active portfolio is a signal
- **WHEN** the portfolio feature is initialised
- **THEN** `PortfolioStateService` exposes the active portfolio via a `signal()` and per-section `computed()` views (skills, education, projects, links)

#### Scenario: RxJS fetch is bridged to signals
- **WHEN** the portfolio is loaded from `GET /api/v1/employees/{id}/portfolio`
- **THEN** the RxJS HTTP observable is converted to a Signal via `toSignal()` and the UI reactively reflects the result

#### Scenario: Components dispatch, not mutate
- **WHEN** a component adds a skill entry
- **THEN** it calls a method on `PortfolioStateService`, which performs the HTTP call and updates the portfolio signal; the component does not call `.set()` on a global state signal

### Requirement: Portfolio editor components
The system SHALL provide components to view and edit the portfolio: a skill section (skill name, years, project count), an education section, a projects section, and a links section — each able to add, edit, and remove entries through the state service.

#### Scenario: Editing a skill updates the portfolio
- **WHEN** the user edits a skill's `years` or `projectCount` and saves
- **THEN** the component calls the state service, which PUTs the entry and the UI reflects the updated value

#### Scenario: Removing an entry updates the UI
- **WHEN** the user removes a project or link
- **THEN** the component calls the state service, which DELETEs the entry and the UI removes it from the computed view

### Requirement: Lazy-loaded portfolio route
The system SHALL register the portfolio feature as a lazy-loaded route by appending exactly one `loadChildren` line to `routes.ts`, using a kebab-case route path. No other shared file SHALL be edited by this feature.

#### Scenario: Route is appended, not inserted
- **WHEN** the portfolio feature is wired
- **THEN** `routes.ts` gains one new `loadChildren` line for the portfolio feature path and no existing line is modified