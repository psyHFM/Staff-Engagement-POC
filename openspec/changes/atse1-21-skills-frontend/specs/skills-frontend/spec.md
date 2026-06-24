## ADDED Requirements

### Requirement: Skills search page
The system SHALL provide a `/skills` page accessible to authenticated users. The page SHALL contain:
- A search input for the skill name.
- A ranked list of people matching the skill, showing employee name, years of experience, and project count.
- Loading and error indicators driven by the `SkillsStateService`.

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

### Requirement: `SkillsStateService`
The system SHALL provide a `SkillsStateService` extending the shared `StateService` base class. It SHALL expose:
- `query` signal for the current skill name.
- `results` signal for `Paged<SkillStrength>`.
- `error` signal for API errors.
- `isLoading()` derived/computed flag.
- `search(name: string)` method to trigger a search.
- `clear()` method to reset transient state.

#### Scenario: Search updates results
- **GIVEN** a mocked `ApiClient` returns a page of skill strengths
- **WHEN** `search('Angular')` is called
- **THEN** `results()` equals the mocked page and `isLoading()` is false

#### Scenario: Search with blank name clears results
- **GIVEN** results are populated
- **WHEN** `search('')` is called
- **THEN** `results()` is null and no API call is made

#### Scenario: Search error is captured
- **GIVEN** a mocked `ApiClient` returns an error
- **WHEN** `search('Angular')` is called
- **THEN** `error()` equals the error and `isLoading()` is false

### Requirement: Route and navigation
The system SHALL lazy-load the skills feature on `/skills` and append a "Skills" link to the shell navigation.

#### Scenario: Authenticated user navigates to Skills
- **GIVEN** the user is authenticated
- **WHEN** the user clicks the "Skills" link
- **THEN** the browser navigates to `/skills` and the skills page is rendered

#### Scenario: Unauthenticated user is blocked
- **GIVEN** the user is not authenticated
- **WHEN** the user navigates directly to `/skills`
- **THEN** the `authGuard` redirects to `/login`
