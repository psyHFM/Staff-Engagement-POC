## ADDED Requirements

> **Persona mandate — required:** The REST contract is designed and audited by the **Constitution Guard** (`.claude/personas/constitution-guard.md`) against `api-standards.yaml` (kebab-case URLs, camelCase JSON, `/api/v1`, uniform error envelope, offset pagination) and verified via the `/api-check` skill. The controller layer is checked by the **Modular Monolith Architect** for layer adherence (`controller/ → service/`, never `controller/ → repository/`).

### Requirement: Get portfolio by employee endpoint
The system SHALL expose `GET /api/v1/employees/{id}/portfolio` returning the employee's portfolio as an unwrapped, camelCase JSON object (skills, education, projects, links). When the employee exists but has no portfolio, the system SHALL return an empty portfolio (zero entries); when the employee does not exist, it SHALL return 404 with the uniform error envelope.

#### Scenario: Existing employee with a portfolio
- **WHEN** `GET /api/v1/employees/{id}/portfolio` is called for an existing employee that has a portfolio
- **THEN** the response is 200 with the portfolio body containing the skills, education, projects, and links collections

#### Scenario: Existing employee with no portfolio yet
- **WHEN** `GET /api/v1/employees/{id}/portfolio` is called for an existing employee that has never edited a portfolio
- **THEN** the response is 200 with an empty portfolio (each collection empty)

#### Scenario: Unknown employee returns 404
- **WHEN** `GET /api/v1/employees/{id}/portfolio` is called for a non-existent employee
- **THEN** the response is 404 with the uniform `ErrorEnvelope` (timestamp, status, error, message, path)

### Requirement: Replace whole portfolio endpoint
The system SHALL expose `PUT /api/v1/employees/{id}/portfolio` accepting the full portfolio body and replacing the stored portfolio (delete + reinsert child rows) for an existing employee, returning 200 with the replaced portfolio.

#### Scenario: Successful bulk replace
- **WHEN** a valid full portfolio body is PUT to `/api/v1/employees/{id}/portfolio` for an existing employee
- **THEN** the system replaces the stored skills/education/projects/links and returns 200 with the resulting portfolio

#### Scenario: Replace fails for unknown employee
- **WHEN** a portfolio body is PUT for a non-existent employee
- **THEN** the system returns 404 with the uniform `ErrorEnvelope`

### Requirement: Skill sub-resource CRUD endpoint
The system SHALL expose `POST /api/v1/employees/{id}/portfolio/skills` to add a skill entry, `PUT /api/v1/employees/{id}/portfolio/skills/{entryId}` to update one, and `DELETE /api/v1/employees/{id}/portfolio/skills/{entryId}` to remove one. Each accepts/returns camelCase JSON (`skill`, `years`, `projectCount`) and uses the uniform error envelope on failure.

#### Scenario: Add a skill entry
- **WHEN** a valid skill body (`skill`, `years`, `projectCount`) is POSTed to `/api/v1/employees/{id}/portfolio/skills` for an existing employee
- **THEN** the system appends the skill entry and returns 201 with the created entry (camelCase, unwrapped)

#### Scenario: Update a skill entry
- **WHEN** a valid skill body is PUT to `/api/v1/employees/{id}/portfolio/skills/{entryId}` for an existing entry
- **THEN** the system updates the entry and returns 200 with the updated entry

#### Scenario: Delete a skill entry
- **WHEN** `DELETE /api/v1/employees/{id}/portfolio/skills/{entryId}` is called for an existing entry
- **THEN** the system removes the entry and returns 204

#### Scenario: Unknown entry returns 404
- **WHEN** a skill sub-resource request targets an `entryId` that does not exist
- **THEN** the system returns 404 with the uniform `ErrorEnvelope`

### Requirement: Education, project, and link sub-resource CRUD endpoints
The system SHALL expose the same add/update/delete sub-resource pattern for `education`, `projects`, and `links` under `/api/v1/employees/{id}/portfolio/{education|projects|links}` and `.../{sub-resource}/{entryId}`, using camelCase JSON, unwrapped responses, and the uniform error envelope.

#### Scenario: CRUD works for each non-skill collection
- **WHEN** a body is POSTed/PUT/DELETEd against `education`, `projects`, or `links`
- **THEN** the system applies the operation and returns 201/200/204 respectively, or 404 with the uniform `ErrorEnvelope` when the employee or entry is unknown

### Requirement: API casing and versioning
The system SHALL use the `/api/v1` prefix, kebab-case URL paths, camelCase JSON keys, unwrapped responses, `application/json` content type, and ISO-8601 timestamps, per `api-standards.yaml`.

#### Scenario: URL paths are kebab-case and versioned
- **WHEN** the portfolio endpoints are enumerated
- **THEN** every path is under `/api/v1/` and uses kebab-case segments (`/api/v1/employees/{id}/portfolio`, `/api/v1/employees/{id}/portfolio/skills`)

#### Scenario: JSON keys are camelCase and nulls are excluded
- **WHEN** a portfolio response is serialized
- **THEN** keys are camelCase (e.g. `projectCount`, `employeeId`) and any null field is omitted from the JSON