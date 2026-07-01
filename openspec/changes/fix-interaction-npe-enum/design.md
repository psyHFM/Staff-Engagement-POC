## Context

The interaction module's PATCH endpoint (`/api/v1/interactions/{id}`) has two latent bugs:

1. **ATSE1-78 (NPE)**: When the frontend sends a PATCH request with `type` and `note`, the backend's `InteractionService.update()` method receives null values in certain edge cases. The current null checks in the service throw `IllegalArgumentException` but this may not be reached if Jackson fails to deserialize first.

2. **ATSE1-81 (enum deserialization)**: The `InteractionType` enum uses `@JsonProperty("catch-up")` annotations, but Jackson on record-based DTOs may not properly map the kebab-case string to the enum constant during deserialization, especially when the value comes through a PATCH with partial content.

**Current state**:
- `InteractionType.java` has correct `@JsonProperty` annotations
- `UpdateInteractionRequest.java` is a record with `InteractionType type` field
- `InteractionService.update()` has null checks but they throw before the repository call
- `InteractionController.update()` passes the body directly to service

**Constraints**:
- Constitution requires Java 21, Spring Boot, Jackson for JSON
- API standards require camelCase JSON, kebab-case URLs
- No breaking changes to the API contract

## Goals / Non-Goals

**Goals:**
- PATCH `/api/v1/interactions/{id}` accepts `{"type": "catch-up", "note": "..."}` without NPE
- All five `InteractionType` values (`check-in`, `mentoring`, `catch-up`, `performance`, `other`) deserialize correctly
- Null/missing `type` returns 400 Bad Request with clear error message
- Backend-only fix — no frontend changes required

**Non-Goals:**
- No changes to InteractionType enum values (frozen in Phase 0)
- No changes to the API contract (same endpoints, same request/response shapes)
- No frontend modifications

## Decisions

### Decision 1: Keep `@JsonProperty` on enum, add explicit Jackson configuration

**Approach**: The `@JsonProperty` annotations on `InteractionType` are correct. The issue is likely Jackson's deserialization not honoring them on record components. Solution: ensure the DTO record's `type` field is properly typed and add `@JsonFormat` or explicit deserializer if needed.

**Rationale**: The enum is frozen (Phase 0 contract), so we cannot change the annotation approach. Record-based DTOs are the project standard.

**Alternative considered**: Switch to class-based DTO with explicit `@JsonProperty` on the field. Rejected because records are the project standard and switching would be inconsistent.

### Decision 2: Move null validation to controller layer, return 400

**Approach**: Add explicit null check in `InteractionController.update()` before calling service. If `type` is null, return 400 with a clear error message in the standard error envelope.

**Rationale**: Controller is the API boundary; it should validate incoming requests before passing to service. This provides clearer error messages than letting the service throw `IllegalArgumentException`.

**Alternative considered**: Keep validation in service only. Rejected because service-level validation produces less specific error messages and mixes business logic with request validation.

### Decision 3: Add unit tests for edge cases

**Approach**: Add tests to `InteractionControllerTest.java` and `InteractionServiceTest.java` covering:
- PATCH with valid `catch-up` type
- PATCH with null type
- PATCH with unknown type value
- PATCH with missing type field

**Rationale**: Constitution requires PITest >= 80% and BDD-style tests. These edge cases were not previously covered.

## Risks / Trade-offs

**Risk**: Jackson deserialization behavior may differ between Spring Boot versions.

**Mitigation**: Test with the actual Spring Boot version in use (3.x). If `@JsonProperty` on enum doesn't work, add a custom `JsonDeserializer` for `InteractionType`.

**Risk**: Changing null handling might affect existing clients.

**Mitigation**: The change is from 500 (NPE) to 400 (Bad Request), which is a fix, not a breaking change. Existing correct clients are unaffected.

**Trade-off**: Adding controller-level validation duplicates service-level checks.

**Mitigation**: Keep both layers — controller for API-specific validation (400), service for business rule enforcement (IllegalArgumentException). This is defense in depth.

## Migration Plan

1. Implement fixes on branch `fix/interaction-npe-enum`
2. Run backend unit tests (`mvn test -pl backend`)
3. Run PITest to verify mutation score >= 80%
4. Manual test: PATCH an interaction with `catch-up` type via curl/Postman
5. Merge to main

**Rollback**: Revert commit — no database migrations, no frontend changes.

## Open Questions

(none)
