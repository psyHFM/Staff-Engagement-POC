# interaction-api Specification

## Purpose
TBD - created by archiving change phase2-interaction. Update Purpose after archive.
## Requirements
### Requirement: Create interaction endpoint
The system SHALL expose `POST /api/v1/interactions` accepting a JSON body with camelCase keys `type`, `subject`, `facilitator`, and `note`, returning the created interaction as an `InteractionSummary` (unwrapped, camelCase JSON, nulls excluded) with HTTP 201.

#### Scenario: Successful create
- **WHEN** a valid body is POSTed to `/api/v1/interactions`
- **THEN** the response is 201 with the created `InteractionSummary` (`id`, `type`, `subject`, `facilitator`, `note`)

#### Scenario: Create returns the uniform error envelope on validation failure
- **WHEN** the body fails subject/facilitator/type validation
- **THEN** the response is the uniform `ErrorEnvelope` (timestamp, status, error, message, path) with the appropriate semantic status

### Requirement: List interactions by subject endpoint
The system SHALL expose `GET /api/v1/employees/{id}/interactions` returning an unwrapped, paginated `Paged<InteractionSummary>` of interactions recorded against the subject `{id}`, using offset pagination (`offset`, `limit` default 20) and optional `sort=createdAt,desc` (default).

#### Scenario: Paginated list by subject
- **WHEN** `GET /api/v1/employees/{id}/interactions?offset=0&limit=20` is called and interactions exist for `{id}`
- **THEN** the response is a `Paged<InteractionSummary>` containing those interactions, ordered by `createdAt` descending

#### Scenario: Empty list by subject
- **WHEN** `GET /api/v1/employees/{id}/interactions` is called and no interactions exist for `{id}`
- **THEN** the response is a `Paged<InteractionSummary>` with an empty items list and zero total

### Requirement: Get interaction by id endpoint
The system SHALL expose `GET /api/v1/interactions/{id}` returning the `InteractionSummary` for that interaction, or a 404 uniform error envelope when it does not exist.

#### Scenario: Existing interaction is returned
- **WHEN** `GET /api/v1/interactions/{id}` is called for an existing interaction
- **THEN** the response is 200 with the `InteractionSummary`

#### Scenario: Unknown interaction returns 404
- **WHEN** `GET /api/v1/interactions/{id}` is called for a non-existent interaction
- **THEN** the response is 404 with the uniform `ErrorEnvelope`

### Requirement: API casing and versioning
The system SHALL use the `/api/v1` prefix, kebab-case URL paths, camelCase JSON keys, unwrapped responses, `application/json` content type, and ISO-8601 timestamps, per `api-standards.yaml`.

#### Scenario: URL paths are kebab-case and versioned
- **WHEN** the interaction endpoints are enumerated
- **THEN** every path is under `/api/v1/` and uses kebab-case segments (`/api/v1/interactions`, `/api/v1/employees/{id}/interactions`)

#### Scenario: JSON keys are camelCase and nulls are excluded
- **WHEN** an interaction response is serialized
- **THEN** keys are camelCase and any null field is omitted from the JSON

