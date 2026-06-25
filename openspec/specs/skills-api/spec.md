# skills-api Specification

## Purpose
TBD - created by syncing change atse1-20-skills-backend. Update Purpose after archive.
## Requirements

> **Persona mandate — required:** The `SkillsController` REST surface and its tests are authored and verified by the **BDD Test Engineer** (`.claude/personas/bdd-test-engineer.md`) using Mockito (no MockMvc, no Spring context → Unit-Tests-Only). The endpoint URL casing, versioning, error envelope, and pagination contract are audited by the **Constitution Guard** (`.claude/personas/constitution-guard.md`) against `api-standards.yaml`. The `@PreAuthorize` enforcement is verified reflectively by `SkillsAccessControlTest` to keep the test a pure unit (no `@SpringBootTest`).

### Requirement: GET /api/v1/skills returns a paginated, ranked skill search
The system SHALL expose `GET /api/v1/skills` for any authenticated user, accepting query parameters:
- `name` (required, non-blank) — skill name to search, case-insensitive, contains (not equals)
- `minYears` (optional, default 0) — minimum years of experience
- `sort` (optional, default `years,desc`) — whitelist: `years` or `projectCount`, with `asc` or `desc`
- `offset` (optional, default 0, clamped to ≥ 0)
- `limit` (optional, default 20, clamped to a positive maximum)

The response SHALL be an unwrapped `Paged<SkillStrength>` with camelCase JSON keys, per `api-standards.yaml`.

#### Scenario: Valid skill search returns results
- **GIVEN** employees have matching skill entries
- **WHEN** `GET /api/v1/skills?name=angular` is called with a valid JWT
- **THEN** it returns 200 and a `Paged` payload of `SkillStrength` entries

#### Scenario: Blank skill name is rejected
- **WHEN** `GET /api/v1/skills?name=` is called
- **THEN** it returns 400 with the uniform error envelope (and the service is never called)

#### Scenario: Null skill name is rejected
- **WHEN** `GET /api/v1/skills` is called without the `name` parameter
- **THEN** it returns 400 with the uniform error envelope (and the service is never called)

#### Scenario: Whitespace-only name is trimmed and rejected when blank
- **WHEN** `GET /api/v1/skills?name=%20%20` is called
- **THEN** it returns 400 with the uniform error envelope

#### Scenario: Unknown sort field is rejected
- **WHEN** `GET /api/v1/skills?name=angular&sort=foo,asc` is called
- **THEN** it returns 400 with the uniform error envelope

#### Scenario: Negative minYears is treated as 0
- **WHEN** `GET /api/v1/skills?name=java&minYears=-1` is called
- **THEN** it behaves as if `minYears` were 0

#### Scenario: Default limit is 20
- **WHEN** `GET /api/v1/skills?name=angular` is called without `limit`
- **THEN** the underlying `PageRequest` has limit 20

#### Scenario: Default sort is `years,desc`
- **WHEN** `GET /api/v1/skills?name=angular` is called without `sort`
- **THEN** the sort string "years,desc" is forwarded to the service (or its equivalent)

### Requirement: RBAC on skills search
The system SHALL require an authenticated caller for `GET /api/v1/skills`.

#### Scenario: Unauthenticated request is rejected
- **GIVEN** no JWT is provided
- **WHEN** `GET /api/v1/skills?name=angular` is called
- **THEN** it returns 401/403 (via the shared auth error handlers)
