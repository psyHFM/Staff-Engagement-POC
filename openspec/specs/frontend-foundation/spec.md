# frontend-foundation Specification

## Purpose
TBD - created by archiving change phase-0-foundation. Update Purpose after archive.
## Requirements
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

#### Scenario: Authenticated user navigates to their profile from the shell
- **WHEN** an authenticated user with a linked employee id is shown the shell header
- **THEN** their username chip is a keyboard-focusable link to `/employees/{employeeId}/profile` with an accessible label
- **AND** when no employee id is linked the chip remains a non-interactive span

### Requirement: Shared frontend utilities
The system SHALL provide `shared/` with an HTTP client that applies uniform error
handling matching the `api-standards.yaml` envelope, and a base state service pattern
using Angular Signals and `toSignal()`. General application state SHALL remain in-memory only (no persistence
across refresh). Authentication tokens, usernames, and the current user's employee id managed by `AuthState` are the explicit exception and MAY be persisted to `sessionStorage` for the lifetime of the JWT.

#### Scenario: HTTP errors surface uniformly
- **WHEN** the HTTP client receives an error envelope from the backend
- **THEN** it is parsed and surfaced through the shared error handling

#### Scenario: State resets on refresh
- **WHEN** the page is refreshed
- **THEN** all in-memory signal state is reset
- **AND** any previously persisted authentication token, username, and current employee id are rehydrated into `AuthState`

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

### Requirement: Resilient PrimeIcons rendering
The system SHALL load the PrimeIcons font through a verifiable, build-managed
mechanism, and icon rendering SHALL degrade gracefully so that the layout is never
broken when the font or an individual glyph is unavailable.

The `primeicons` package SHALL be declared as a dependency in `frontend/package.json`,
and its stylesheet (`node_modules/primeicons/primeicons.css`) SHALL be included in the
`angular.json` build `styles` array so the font is bundled and served by the build.

A layout-preserving fallback SHALL be defined in `frontend/src/styles.scss` for the
base `.pi` icon class so that an icon slot reserves its space and remains visually
inert (rather than collapsing the layout or rendering tofu/garbled fallback text) when
the PrimeIcons font fails to load.

#### Scenario: PrimeIcons dependency and stylesheet are wired
- **WHEN** the frontend build configuration is inspected
- **THEN** `primeicons` is present in `frontend/package.json` dependencies
- **AND** `node_modules/primeicons/primeicons.css` is listed in the `angular.json` build `styles` array

#### Scenario: Brand icon and spinner render when the font loads
- **WHEN** the app is rendered with the PrimeIcons font available
- **THEN** the shell brand icon (`pi-th-large`) and the loading spinner (`pi-spinner`) display their glyphs

#### Scenario: Layout is preserved when the font fails to load
- **WHEN** the PrimeIcons font fails to load or a glyph is missing
- **THEN** each `.pi` icon slot reserves its layout space and renders nothing visible
- **AND** surrounding content (header brand, spinners, buttons) keeps its position and is not broken

