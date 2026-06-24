## ADDED Requirements

### Requirement: GET /api/v1/skills returns a paginated, ranked skill search
The system SHALL expose `GET /api/v1/skills` for any authenticated user, accepting query parameters:
- `name` (required, non-blank) — skill name to search, case-insensitive
- `minYears` (optional, default 0) — minimum years of experience
- `sort` (optional, default `years,desc`) — whitelist: `years` or `projectCount`
- `offset` (optional, default 0)
- `limit` (optional, default 20)

The response SHALL be an unwrapped `Paged<SkillStrength>` with camelCase JSON keys, per `api-standards.yaml`.

#### Scenario: Valid skill search returns results
- **GIVEN** employees have matching skill entries
- **WHEN** `GET /api/v1/skills?name=angular` is called with a valid JWT
- **THEN** it returns 200 and a `Paged` payload of `SkillStrength` entries

#### Scenario: Blank skill name is rejected
- **WHEN** `GET /api/v1/skills?name=` is called
- **THEN** it returns 400 with the uniform error envelope

#### Scenario: Unknown sort field is rejected
- **WHEN** `GET /api/v1/skills?name=angular&sort=foo,asc` is called
- **THEN** it returns 400 with the uniform error envelope

#### Scenario: Negative minYears is treated as 0
- **WHEN** `GET /api/v1/skills?name=java&minYears=-1` is called
- **THEN** it behaves as if `minYears` were 0

### Requirement: RBAC on skills search
The system SHALL require an authenticated caller for `GET /api/v1/skills`.

#### Scenario: Unauthenticated request is rejected
- **GIVEN** no JWT is provided
- **WHEN** `GET /api/v1/skills?name=angular` is called
- **THEN** it returns 401/403
