## 1. Backend: Fix InteractionType enum deserialization (ATSE1-81)

- [x] 1.1 Verify `InteractionType.java` has correct `@JsonProperty` annotations for all kebab-case values
- [x] 1.2 Add Jackson `@JsonFormat` or explicit deserializer if `@JsonProperty` alone doesn't work on records
- [x] 1.3 Add unit test: Jackson deserializes `"catch-up"` to `InteractionType.CATCH_UP`
- [x] 1.4 Add unit test: Jackson deserializes `"check-in"` to `InteractionType.CHECK_IN`
- [x] 1.5 Add unit test: Jackson rejects unknown type values with 400 error

## 2. Backend: Fix NullPointerException on save (ATSE1-78)

- [x] 2.1 Add null validation for `type` in `InteractionController.update()` before calling service
- [x] 2.2 Return 400 Bad Request with clear error message when `type` is null
- [x] 2.3 Verify `InteractionService.update()` null check produces clear error message
- [x] 2.4 Add unit test: PATCH with null type returns 400
- [x] 2.5 Add unit test: PATCH with missing type field returns 400
- [x] 2.6 Add unit test: PATCH with valid type and note succeeds

## 3. Verification

- [x] 3.1 Run backend unit tests (`mvn test -pl backend`)
- [x] 3.2 Run PITest mutation testing (`mvn pitest:mutationCoverage -pl backend`)
- [x] 3.3 Verify mutation score >= 80% (87% achieved)
- [x] 3.4 Manual test: PATCH interaction with `catch-up` type via curl/Postman
- [x] 3.5 Run `/api-check` skill to verify API compliance
- [x] 3.6 Run `/mutation-report` skill to verify coverage thresholds
