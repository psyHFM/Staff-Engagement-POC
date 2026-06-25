# skills-frontend Specification

## Purpose
TBD - created by syncing change atse1-21-skills-frontend. Update Purpose after archive.
## Requirements

> **Persona mandate — required:** The frontend skills feature is designed and audited by the **Angular State Architect** (`.claude/personas/angular-state-architect.md`) against `frontend-state.yaml` and `.claude/angular-style-guide.md` — Signals-only state, `computed()` for derived views, no `BehaviorSubject`, unidirectional flow (components call service methods, never `.set()` global signals directly). The frontend unit tests are authored and verified by the **BDD Test Engineer** (`.claude/personas/bdd-test-engineer.md`) in Jest Given-When-Then form, designed to survive Stryker mutation. The **Constitution Guard** (`.claude/personas/constitution-guard.md`) confirms the append-only `routes.ts` and `shell.html` touches and the kebab-case `/skills` route path.

### Requirement: Skills search page
The system SHALL provide a `/skills` page accessible to authenticated users. The page SHALL contain:
- A search input for the skill name.
- A ranked list of people matching the skill, showing employee name, years of experience, and project count.
- Loading and error indicators driven by the `SkillsStateService`.
- An empty-state message when the result page has total 0.

#### Scenario: User searches for a skill and sees ranked results
- **GIVEN** the user is authenticated and on `/skills`
- **WHEN** the user enters "Angular" in the search input
- **THEN** the page calls `GET /api/v1/skills?name=angular` and displays the ranked results with years and project counts

#### Scenario: Empty search clears results
- **GIVEN** the user has searched for "Angular" and results are displayed
- **WHEN** the user clears the search input
- **THEN** the result list is empty and no API call with a blank name is made

#### Scenario: API error is surfaced
- **GIVEN** the backend returns a 500 for the search
- **WHEN** the user searches
- **THEN** the page shows an error message and hides the loading spinner

#### Scenario: Empty result page shows empty-state message
- **GIVEN** the backend returns a `Paged<SkillStrength>` with total 0
- **WHEN** the search completes
- **THEN** the page displays a "No one found with skill "<query>"." message

### Requirement: `SkillsStateService`
The system SHALL provide a `SkillsStateService` extending the shared `StateService` base class. It SHALL expose:
- `query` signal for the current skill name.
- `results` signal for `Paged<SkillStrength>`.
- `error` signal for API errors.
- `isLoading()` derived/computed flag.
- `search(name: string)` method to trigger a search.
- `clear()` method to reset transient state.

Internal state SHALL be private signals; only the computed read models and the handler methods SHALL be public. The component SHALL never call `.set()` on a service signal.

#### Scenario: Search updates results
- **GIVEN** a mocked `ApiClient` returns a page of skill strengths
- **WHEN** `search('Angular')` is called
- **THEN** `results()` equals the mocked page and `isLoading()` is false

#### Scenario: Search with blank name clears results and does not call the API
- **GIVEN** results are populated
- **WHEN** `search('')` is called
- **THEN** `results()` is null and no API call is made

#### Scenario: Whitespace-only name is treated as blank
- **GIVEN** results are populated
- **WHEN** `search('   ')` is called
- **THEN** `results()` is null and no API call is made

#### Scenario: Search options pass through to the API
- **WHEN** `search('Angular', { minYears: 2, sort: 'projectCount,asc', offset: 0, limit: 10 })` is called
- **THEN** `ApiClient.get('skills', { name: 'Angular', minYears: 2, sort: 'projectCount,asc', offset: 0, limit: 10 })` is called

#### Scenario: Blank sort option is dropped
- **WHEN** `search('Angular', { sort: '' })` is called
- **THEN** the `sort` key is omitted from the API params

#### Scenario: Search error is captured
- **GIVEN** a mocked `ApiClient` returns an error
- **WHEN** `search('Angular')` is called
- **THEN** `error()` equals the error and `isLoading()` is false

#### Scenario: Previous error is cleared on next search
- **GIVEN** an error from a previous search is present
- **WHEN** `search('Angular')` is called
- **THEN** `error()` is null at the start of the new request

#### Scenario: `clear()` resets all feature state
- **WHEN** `clear()` is called
- **THEN** `results()` is null, `error()` is null, `query()` is '', `isLoading()` is false

### Requirement: Route and navigation
The system SHALL lazy-load the skills feature on `/skills` and append a "Skills" link to the shell navigation. The route path SHALL be lowercase. The link SHALL be appended to the existing navigation block without altering other nav entries.

#### Scenario: Authenticated user navigates to Skills
- **GIVEN** the user is authenticated
- **WHEN** the user clicks the "Skills" link
- **THEN** the browser navigates to `/skills` and the skills page is rendered

#### Scenario: Unauthenticated user is blocked
- **GIVEN** the user is not authenticated
- **WHEN** the user navigates directly to `/skills`
- **THEN** the `authGuard` redirects to `/login`
