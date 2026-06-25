## ADDED Requirements

### Requirement: Backend Maven project layout
The system SHALL provide a Spring Boot backend under `backend/` built with Maven and Java 21, using base package `com.staffengagement` with the package layout defined in `ROADMAP.md` §2.1 (`shared/{kernel,error,security,api}` plus per-domain packages each layered `controller/service/repository/domain`).

#### Scenario: Project compiles
- **WHEN** `mvn -q -pl backend compile` is run
- **THEN** the build succeeds with no compile errors

#### Scenario: Per-domain packages exist
- **WHEN** the source tree is inspected
- **THEN** packages `com.staffengagement.employee`, `.interaction`, `.task`, `.portfolio`, `.skills` each exist (empty until their splice) alongside `com.staffengagement.shared`

### Requirement: Application configuration
The system SHALL provide `application.yml` configuring the Postgres datasource, JPA/Hibernate, Liquibase, and JWT stub settings, with connection details externalised via environment variables.

#### Scenario: Externalised Postgres config
- **WHEN** the application starts with `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` set
- **THEN** the datasource binds to those values

### Requirement: Stub health endpoint
The system SHALL expose `GET /api/v1/health` returning HTTP 200 with an unwrapped camelCase JSON body `{ "status": "UP" }`.

#### Scenario: Health check returns UP
- **WHEN** a client calls `GET /api/v1/health`
- **THEN** the response status is 200
- **AND** the body is `{ "status": "UP" }`

### Requirement: JSON casing and null handling
All JSON responses SHALL use camelCase keys, be unwrapped, and exclude null fields, per `api-standards.yaml`.

#### Scenario: Null fields are omitted
- **WHEN** a response object has a null field
- **THEN** that field is absent from the JSON body (not serialized as `null`)