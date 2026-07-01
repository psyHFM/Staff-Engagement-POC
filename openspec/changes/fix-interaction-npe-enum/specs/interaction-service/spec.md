# interaction-service Specification (Delta)

## MODIFIED Requirements

### Requirement: Type validation against the frozen vocabulary

The system SHALL only accept an `InteractionType` from the frozen `InteractionType` enum (`check-in`, `mentoring`, `catch-up`, `performance`, `other`). Jackson SHALL properly deserialize kebab-case values from JSON to enum constants via `@JsonProperty` annotations. An invalid or null type SHALL be rejected with a 400 Bad Request error.

#### Scenario: Valid type "catch-up" is accepted
- **WHEN** an interaction update is sent with `type` equal to `"catch-up"`
- **THEN** Jackson deserializes it to `InteractionType.CATCH_UP` and the update proceeds

#### Scenario: Valid type "check-in" is accepted
- **WHEN** an interaction update is sent with `type` equal to `"check-in"`
- **THEN** Jackson deserializes it to `InteractionType.CHECK_IN` and the update proceeds

#### Scenario: Invalid type value is rejected
- **WHEN** an interaction update is sent with a `type` not in the frozen vocabulary (e.g., `"unknown-type"`)
- **THEN** Jackson throws `HttpMessageNotReadableException`, caught by `@RestControllerAdvice`, returning 400 Bad Request

#### Scenario: Null type is rejected with 400
- **WHEN** an interaction update is sent with `type` equal to `null` or missing
- **THEN** the controller validates and returns 400 Bad Request with error message "type is required"

### Requirement: InteractionService.update() null-safe validation

The system SHALL validate that `type` is non-null in `InteractionService.update()` method. A null `type` SHALL throw `IllegalArgumentException` with message "type is required", which the controller layer SHALL catch and convert to 400 Bad Request.

#### Scenario: Service receives null type
- **WHEN** `InteractionService.update()` is called with `type == null`
- **THEN** it throws `IllegalArgumentException` with message "type is required"

#### Scenario: Service receives valid type
- **WHEN** `InteractionService.update()` is called with a valid `InteractionType`
- **THEN** it proceeds to update the interaction's type and note fields
