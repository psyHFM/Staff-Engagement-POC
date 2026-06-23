## ADDED Requirements

### Requirement: Angular 22 workspace shell
The system SHALL provide an Angular 22 standalone workspace under `frontend/` with
`app.config.ts`, `main.ts`, and a router. It SHALL use Angular Signals, `inject()` DI,
and kebab-case file names per the Angular style guide. PrimeIcons SHALL be wired.

#### Scenario: Workspace builds
- **WHEN** `npm run build` is run in `frontend/`
- **THEN** the Angular app type-checks and AOT-compiles successfully

### Requirement: Append-per-feature routing
The system SHALL provide a `routes.ts` using `loadChildren` where each feature appends
exactly one line. Phase 0 SHALL include one stub lazy route proving the convention.

#### Scenario: Stub lazy route loads
- **WHEN** the stub lazy route is navigated to
- **THEN** its standalone component loads on demand

### Requirement: Application shell with auth gate
The system SHALL provide a `shell/` with layout and navigation and an auth gate (login
stub) that obtains a JWT from the backend security stub. Unauthenticated access to
protected areas SHALL be blocked by the gate.

#### Scenario: Auth gate blocks unauthenticated access
- **WHEN** an unauthenticated user opens a protected area
- **THEN** the shell routes them to the login stub

### Requirement: Shared frontend utilities
The system SHALL provide `shared/` with an HTTP client that applies uniform error
handling matching the `api-standards.yaml` envelope, and a base state service pattern
using Angular Signals and `toSignal()`. State SHALL be in-memory only (no persistence
across refresh).

#### Scenario: HTTP errors surface uniformly
- **WHEN** the HTTP client receives an error envelope from the backend
- **THEN** it is parsed and surfaced through the shared error handling

#### Scenario: State resets on refresh
- **WHEN** the page is refreshed
- **THEN** all in-memory signal state is reset

### Requirement: Feature folder convention
The system SHALL establish a `features/` directory with reserved per-domain folders
(`employee/`, `interaction/`, `task/`, `portfolio/`, `skills/`) that later phases
populate. Phase 0 SHALL create the convention only, not feature logic.

#### Scenario: Feature folders reserved
- **WHEN** the frontend scaffold is inspected
- **THEN** `features/{employee,interaction,task,portfolio,skills}/` directories exist

### Requirement: Frontend testing and lint tooling
The system SHALL configure Jest + JSDOM (`jest-preset-angular`) and Stryker for the
frontend, plus `angular-eslint` with a `lint` npm script. Phase 0 SHALL include one
trivial passing Jest test. npm scripts `lint`, `build`, and `test` SHALL exist.

#### Scenario: Lint runs
- **WHEN** `npm run lint` is run
- **THEN** ESLint executes over the workspace

#### Scenario: Tests run
- **WHEN** `npm test -- --no-watch --no-progress` is run
- **THEN** Jest executes and the trivial Phase 0 test passes