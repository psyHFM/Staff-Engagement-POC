## ADDED Requirements

### Requirement: Bearer JWT authentication stub
The system SHALL implement a Spring Security stub that authenticates requests carrying a Bearer JWT in the `Authorization` header. The stub is clearly marked as POC-only and does not integrate a real identity provider.

#### Scenario: Request without token is rejected
- **WHEN** a protected endpoint receives a request with no `Authorization` header
- **THEN** the response status is 401

#### Scenario: Request with valid stub token is accepted
- **WHEN** a protected endpoint receives a request with a valid stub Bearer token
- **THEN** the request is authenticated and proceeds

### Requirement: In-memory user and roles
The system SHALL provide one in-memory user usable for POC login, with roles `EMPLOYEE` and `MANAGER` available for authorization.

#### Scenario: Employee role exists
- **WHEN** the security context is populated for the in-memory employee user
- **THEN** the authority `ROLE_EMPLOYEE` is present

#### Scenario: Manager role exists
- **WHEN** the in-memory manager user authenticates
- **THEN** the authority `ROLE_MANAGER` is present

### Requirement: RBAC enforcement via @PreAuthorize
The system SHALL enforce role-based access using `@PreAuthorize` annotations, per `api-standards.yaml`.

#### Scenario: Forbidden role is denied
- **WHEN** an authenticated user without the required role calls a `@PreAuthorize`-protected endpoint
- **THEN** the response status is 403