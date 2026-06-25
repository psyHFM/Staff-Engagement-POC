## MODIFIED Requirements

### Requirement: Shared frontend utilities
The system SHALL provide `shared/` with an HTTP client that applies uniform error handling matching the `api-standards.yaml` envelope, and a base state service pattern using Angular Signals and `toSignal()`. General application state SHALL remain in-memory only (no persistence across refresh). Authentication tokens and usernames managed by `AuthState` are the explicit exception and MAY be persisted to `sessionStorage` for the lifetime of the JWT.

#### Scenario: HTTP errors surface uniformly
- **WHEN** the HTTP client receives an error envelope from the backend
- **THEN** it is parsed and surfaced through the shared error handling

#### Scenario: State resets on refresh
- **WHEN** the page is refreshed
- **THEN** all in-memory signal state is reset
- **AND** any previously persisted authentication token and username are rehydrated into `AuthState`
