## Why

Two critical bugs block the interaction edit flow (ATSE1-78, ATSE1-81): (1) saving interaction changes throws a NullPointerException, and (2) the `InteractionType` enum fails to deserialize the kebab-case value `'catch-up'` on PATCH requests. Both are backend-only fixes in the interaction module.

## What Changes

- **ATSE1-78**: Add null-safe handling in `InteractionService.update()` and `InteractionController.update()` to prevent NPE when request body fields are missing or null.
- **ATSE1-81**: Ensure Jackson properly deserializes kebab-case `InteractionType` values (`'catch-up'`, `'check-in'`) by verifying `@JsonProperty` annotations are correctly processed on the record-based DTO.
- No frontend changes required — the existing `interaction.types.ts` and badge component already use kebab-case correctly.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `interaction-service`: Add null-validation for `type` field in update path; ensure Jackson deserialization handles kebab-case enum values on PATCH requests.

## Impact

- **Backend**: `InteractionService.java`, `InteractionController.java`, `UpdateInteractionRequest.java`
- **Frontend**: No changes (existing `edit-interaction.ts` and `interaction.types.ts` already send kebab-case values)
- **API**: No contract changes — fixes are internal to the existing PATCH `/api/v1/interactions/{id}` endpoint
- **Database**: No schema changes
