# portfolio-ui Specification

## Purpose
TBD - created by syncing change phase-4-portfolio. Update Purpose after archive.
## Requirements

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
The system SHALL provide a reusable `portfolio-editor` component (extracted from the former standalone `features/portfolio/portfolio.ts` body) that accepts `@Input() employeeId` and `@Input() readOnly`, and renders the four portfolio sections — skills (skill name, years, project count), education, projects, and links — each able to add, edit, and remove entries through `PortfolioStateService`. The component SHALL NOT contain any "Employee ID" picker; the employee is supplied by its host (the Profile page). When `readOnly` is true the editor SHALL render the sections without add/edit/remove affordances.

#### Scenario: Editor is driven by inputs, not an id picker
- **WHEN** the `portfolio-editor` is mounted on the Profile page
- **THEN** it uses the `employeeId` input for all reads/writes
- **AND** it presents no free-text "Employee ID" input

#### Scenario: Editing a skill updates the portfolio
- **WHEN** the user edits a skill's `years` or `projectCount` and saves
- **THEN** the component calls the state service, which PUTs the entry and the UI reflects the updated value

#### Scenario: Removing an entry updates the UI
- **WHEN** the user removes a project or link
- **THEN** the component calls the state service, which DELETEs the entry and the UI removes it from the computed view

#### Scenario: Read-only mode hides edit affordances
- **WHEN** the editor is mounted with `readOnly` true (profile View mode or a non-owner viewer)
- **THEN** the four sections render without add, edit, or remove controls