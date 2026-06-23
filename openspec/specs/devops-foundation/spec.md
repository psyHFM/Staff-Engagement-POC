# devops-foundation Specification

## Purpose
TBD - created by archiving change phase-0-foundation. Update Purpose after archive.
## Requirements
### Requirement: Docker Compose orchestration
The system SHALL provide a root `docker-compose.yml` with three services — `postgres`
(Postgres, with a volume and healthcheck), `backend` (built from `backend/Dockerfile`,
exposing 8080, depending on Postgres), and `frontend` (built from
`frontend/Dockerfile`, served via nginx). `docker compose up` SHALL start all three.

#### Scenario: Full stack starts
- **WHEN** `docker compose up` is run
- **THEN** Postgres, backend, and frontend all reach a healthy/running state

#### Scenario: Health reachable through compose
- **WHEN** the backend service is up via Compose
- **THEN** `GET /api/v1/health` on the backend returns 200

### Requirement: Backend Dockerfile
The system SHALL provide `backend/Dockerfile` as a multi-stage Maven build that produces
a runnable Java 21 image of the backend.

#### Scenario: Backend image builds
- **WHEN** the backend Docker image is built
- **THEN** it compiles the Maven project and produces a container that runs the Spring Boot app

### Requirement: Frontend Dockerfile
The system SHALL provide `frontend/Dockerfile` that builds the Angular app and serves
the production bundle via nginx.

#### Scenario: Frontend image builds and serves
- **WHEN** the frontend Docker image is built and run
- **THEN** nginx serves the compiled Angular production bundle

### Requirement: Environment example
The system SHALL provide a `.env.example` documenting the configuration variables
(e.g. Postgres credentials) used by Compose, without committing real secrets.

#### Scenario: Example present, no real secrets
- **WHEN** the repo is inspected
- **THEN** `.env.example` exists and contains placeholder values only

### Requirement: CI pipeline
The system SHALL provide `.github/workflows/ci.yml` running on PRs and pushes to
`main`, with a backend job (Java 21 + Maven: build, test, PITest mutation coverage) and
a frontend job (Node 22: install, lint, build, test). A PR SHALL NOT be mergeable while
CI fails.

#### Scenario: Backend CI job
- **WHEN** CI runs on a PR
- **THEN** the backend job builds, tests, and runs PITest using Java 21 and `./mvnw`

#### Scenario: Frontend CI job
- **WHEN** CI runs on a PR
- **THEN** the frontend job runs `npm ci`, `npm run lint`, `npm run build`, and `npm test` on Node 22

### Requirement: PR template and contributing guide
The system SHALL provide `.github/pull_request_template.md` and `CONTRIBUTING.md`
describing the branch/PR workflow (Conventional Commits, squash-merge, branch naming).

#### Scenario: PR template loads
- **WHEN** a PR is opened
- **THEN** the PR template body is populated automatically

### Requirement: Merged gitignore
The system SHALL maintain a `.gitignore` covering IDE artifacts, Java/Maven build
output (`target/`, etc.), Node/frontend artifacts (`node_modules/`, `dist/`, etc.),
secrets (`.env`), and the Claude Code per-dev local state files
(`.claude/hooks/.log-prompts-state.json`, `.claude/settings.local.json`).

#### Scenario: Build artifacts ignored
- **WHEN** `target/` or `node_modules/` exist locally
- **THEN** they are ignored by git

#### Scenario: Per-dev local state ignored
- **WHEN** `.claude/hooks/.log-prompts-state.json` or `.claude/settings.local.json` exist
- **THEN** they are ignored by git

