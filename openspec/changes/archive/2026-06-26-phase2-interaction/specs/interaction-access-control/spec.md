## ADDED Requirements

### Requirement: Manager-only interaction logging
The system SHALL enforce that only users with the `MANAGER` role may create interactions, via `@PreAuthorize("hasRole('MANAGER')")` on the create endpoint.

#### Scenario: Manager can create an interaction
- **WHEN** a request to `POST /api/v1/interactions` is made by an authenticated `MANAGER`
- **THEN** the request is authorized and proceeds

#### Scenario: Employee is forbidden from logging
- **WHEN** a request to `POST /api/v1/interactions` is made by an authenticated user without the `MANAGER` role
- **THEN** the response is 403

#### Scenario: Unauthenticated create is rejected
- **WHEN** a request to `POST /api/v1/interactions` is made with no Bearer JWT
- **THEN** the response is 401

### Requirement: Manager-scoped interaction reads
The system SHALL require the `MANAGER` role for `GET /api/v1/employees/{id}/interactions` and `GET /api/v1/interactions/{id}` in this splice, via `@PreAuthorize("hasRole('MANAGER')")`. (EMPLOYEE self-read is deferred pending a principal-to-EmployeeId mapping — see design D3/D7.)

#### Scenario: Manager can read interactions by subject
- **WHEN** a `MANAGER` requests `GET /api/v1/employees/{id}/interactions`
- **THEN** the request is authorized and returns the paginated list

#### Scenario: Employee read is forbidden in this splice
- **WHEN** a user without the `MANAGER` role requests `GET /api/v1/employees/{id}/interactions`
- **THEN** the response is 403

### Requirement: Deferred default-facilitator and self-read
The system SHALL document, in the design, that the "facilitator defaults to the logged-in user" behavior and the `EMPLOYEE` self-read rule are deferred to a follow-up additive change, because the Phase 0 auth principal is a username with no `EmployeeId` mapping and `shared/**` is frozen.

#### Scenario: Facilitator is supplied, not defaulted
- **WHEN** an interaction is created
- **THEN** the `facilitator` is taken from the request body (required), not derived from the authenticated principal