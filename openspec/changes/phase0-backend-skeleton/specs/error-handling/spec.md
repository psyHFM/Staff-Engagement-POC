## ADDED Requirements

### Requirement: Uniform error envelope
The system SHALL return errors as a uniform envelope with fields `timestamp` (ISO 8601), `status` (integer HTTP status), `error` (standard HTTP error name), `message` (detailed description), and `path` (request URI), per `api-standards.yaml`.

#### Scenario: Unhandled exception produces envelope
- **WHEN** a request triggers an unhandled exception
- **THEN** the response body is a JSON object containing `timestamp`, `status`, `error`, `message`, and `path`
- **AND** `status` equals 500

#### Scenario: Not-found produces 404 envelope
- **WHEN** a request targets a non-existent resource
- **THEN** the response body is the error envelope with `status` equal to 404

### Requirement: Global exception handling
The system SHALL handle exceptions globally via `@RestControllerAdvice`, mapping them to the error envelope with strict semantic HTTP status codes, and excluding null envelope fields from the response.

#### Scenario: Null fields excluded
- **WHEN** an envelope field would be null
- **THEN** that field is omitted from the JSON response rather than serialized as `null`

#### Scenario: Content type
- **WHEN** any error response is produced
- **THEN** the `Content-Type` is `application/json`