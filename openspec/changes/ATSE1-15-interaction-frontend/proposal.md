## Why

Phase 2 of the roadmap delivers the **Interaction** module: the ability to record a typed engagement with an employee and review the history of engagements per employee. The backend Interaction splice is already in place (ATSE1-14); ATSE1-15 completes the matching Angular frontend so managers can log interactions and browse per-employee history through the UI.

Without this frontend change, the Interaction REST endpoints have no consumer in the application shell, and the Phase 2 exit criterion — *log an interaction against an employee and list per employee* — cannot be demonstrated end-to-end.

## What Changes

- Complete the `frontend/src/app/features/interaction/` feature:
  - Add the missing `interaction-list` template and styles.
  - Add `InteractionStateService` tests and component tests.
- Register the feature in the application shell via **append-only** edits:
  - Append `/interactions` lazy route to `app.routes.ts`.
  - Append `bearerAuthInterceptorProvider` to `app.config.ts` so authenticated API calls carry the JWT.

All work stays inside the Phase 2 frontend splice plus the two shared files that the constitution explicitly allows a splice to append to.

## Capabilities

### New Capabilities
- `log-interaction-form`: a form to log an interaction with type selector, subject selector, facilitator selector (defaulting to the logged-in user), and note.
- `interaction-history-list`: a paginated, read-only list of interactions for a selected employee, sorted newest-first.
- `interaction-state-service`: Signal-based state service that owns subject selection, history loading, interaction creation, and API error state.
- `interaction-route`: lazy-loaded `/interactions` route protected by the existing `authGuard`.

### Modified Capabilities
- `app-routes`: append one `interactions` lazy-load entry.
- `app-config`: append the bearer-auth interceptor provider so outgoing API requests include the JWT.

## Impact

- **Code**: adds/completes files under `frontend/src/app/features/interaction/`; append-only edits to `frontend/src/app/app.routes.ts` and `frontend/src/app/app.config.ts`.
- **APIs consumed**:
  - `POST /api/v1/interactions`
  - `GET /api/v1/employees/{id}/interactions`
- **Dependencies**: no new npm dependencies; uses existing Angular 22, RxJS, Jest, PrimeIcons.
- **Contracts**: relies on the frozen `InteractionType` enum and `InteractionSummary` DTO from Phase 0; no contract changes.
- **Testing**: BDD-style Jest unit tests for the state service and components; Stryker mutation testing applies.
- **Out of scope**: backend changes, shell navigation changes, integration/E2E tests (disabled per `testing-strategy.yaml`), real employee API integration (Phase 1 controller not yet present).
