# interaction-row-edit Specification

## Purpose
TBD - created by archiving change atse1-25-35-ux-walkthrough-fixes. Update Purpose after archive.
## Requirements
### Requirement: Each interaction history row is editable

The interaction history list MUST render an Edit affordance on every
row. Clicking Edit MUST open an inline editor (or side drawer) that
exposes the `type` and `note` fields for the row. The row's
`createdAt` timestamp is immutable.

#### Scenario: User opens the row editor

- **WHEN** the user clicks Edit on a row in the interaction
  history list
- **THEN** the editor MUST open with the current `type` and `note`
  values pre-filled
- **AND** `createdAt` MUST NOT be present in the editor

#### Scenario: User saves an edit

- **WHEN** the user submits the editor
- **THEN** the system MUST call `PATCH /api/v1/interactions/{id}` with
  the new `type` and `note`
- **AND** on success the row MUST reflect the new values
- **AND** on failure the editor MUST display the server error and
  the row MUST roll back to its prior state

### Requirement: PATCH /api/v1/interactions/{id}

The interaction controller MUST expose a
`PATCH /api/v1/interactions/{id}` endpoint that updates the
interaction's `type` and `note`. The endpoint MUST enforce
admin-any / non-admin-own RBAC. Non-admins attempting to edit an
interaction they did not facilitate MUST receive a 404 response
(no existence leak).

#### Scenario: Admin updates any interaction

- **WHEN** an admin sends a `PATCH /api/v1/interactions/{id}` with
  a valid body
- **THEN** the system MUST persist the new `type` and `note`
- **AND** return the updated `InteractionSummary` with HTTP 200

#### Scenario: Non-admin updates own interaction

- **WHEN** an authenticated non-admin user sends a
  `PATCH /api/v1/interactions/{id}` for an interaction whose
  `facilitatorId` matches their own employee id
- **THEN** the system MUST persist the new `type` and `note`
- **AND** return the updated `InteractionSummary` with HTTP 200

#### Scenario: Non-admin attempts to update someone else's interaction

- **WHEN** an authenticated non-admin user sends a
  `PATCH /api/v1/interactions/{id}` for an interaction whose
  `facilitatorId` does NOT match their own employee id
- **THEN** the system MUST return HTTP 404

#### Scenario: Update with empty body

- **WHEN** a client sends `PATCH /api/v1/interactions/{id}` with an
  empty body or a body missing both `type` and `note`
- **THEN** the system MUST return HTTP 400 with the uniform error
  envelope

