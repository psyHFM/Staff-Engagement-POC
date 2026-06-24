## Context

The root state service for the Interaction feature. Owns all side effects and signal-based state per `frontend-state.yaml`.

## Requirements

- Hold private signals for:
  - selected subject (`EmployeeId | null`)
  - paginated interaction history (`Paged<InteractionSummary> | null`)
  - last created interaction (`InteractionSummary | null`)
  - last API error (`ApiError | null`)
  - loading flag (inherited from base `StateService`)
- Expose public read-only `computed()` signals.
- Provide `selectSubject(employeeId)` to set the current subject and clear errors.
- Provide `loadSubjects()` (stub today; switches to real API later).
- Provide `loadHistory(offset, limit)` calling `GET /api/v1/employees/{subject.value}/interactions` with `offset`, `limit`, and `sort=createdAt,desc`.
- Provide `createInteraction(type, subject, facilitator, note)` calling `POST /api/v1/interactions`.
- On successful creation, update the `created` signal and refresh history if the created subject matches the currently selected subject.
- On any API failure, store the error in the `error` signal and clear `loading`.
- Provide `defaultFacilitator()` that maps the current `AuthState` username to a stub `EmployeeId`.
- Provide `clearTransient()` to reset `error` and `created`.

## API

- Consumes `ApiClient` and `AuthState`.
- Uses `catchApiError()` and `finalize()` operators.

## Tests

- `loadHistory()` calls the correct GET URL and exposes the returned page via `history()`.
- `createInteraction()` POSTs the correct body, updates `created()`, and refreshes history for the current subject.
- `createInteraction()` does **not** refresh history if the created subject differs from the selected subject.
- API failures set `error()` and clear `loading()`.
- `selectSubject()` updates `subject()` and clears `error()`.
- `defaultFacilitator()` returns the expected stub id for known usernames.

## Boundaries

- Only edits `frontend/src/app/features/interaction/interaction-state.service.ts` and its test file.
