## Context

This is the Angular frontend slice of Phase 2 (Interaction) for the Staff-Engagement POC. The project constitution (`frontend-state.yaml`, `api-standards.yaml`, `angular-style-guide.md`) mandates:

- Angular 22 standalone components, `inject()` DI.
- Signal-based state in root/feature-level State Services with unidirectional data flow.
- `kebab-case` URLs and `camelCase` JSON under `/api/v1`.
- BDD-style Jest unit tests; integration tests disabled.
- Splice ownership: Phase 2 owns `frontend/src/app/features/interaction/**`; shared files (`app.routes.ts`, `app.config.ts`) are append-only.

The backend Interaction module is already implemented and exposes:
- `POST /api/v1/interactions` (MANAGER role)
- `GET /api/v1/employees/{id}/interactions` (MANAGER role, offset pagination)
- `GET /api/v1/interactions/{id}`

The existing frontend branch has partial Interaction code; this change completes it and adds tests.

## Goals / Non-Goals

**Goals:**
- Render the interaction history list (missing template + styles).
- Lazy-load and auth-guard the `/interactions` route.
- Attach the bearer JWT to outgoing API calls.
- Provide BDD unit tests for the state service and all Interaction components.
- Stay constitution-compliant (Signals, `inject()`, append-only shared files).

**Non-Goals:**
- Modifying the backend Interaction module.
- Adding an `/interactions` link to `shell.html` (frozen Phase 0 file).
- Consuming a real `/api/v1/employees` endpoint until Phase 1 exposes it.
- Integration / end-to-end tests (disabled per `testing-strategy.yaml`).

## Decisions

### D1 — State-service scope
**Choice:** `InteractionStateService` is provided at the `InteractionPage` component level (`providers: [InteractionStateService]`).
**Why:** Interaction state is feature-local. A root-level provider is unnecessary and would keep interaction data in memory after the user leaves the feature. Phase 6 integration will orchestrate its own read model.

### D2 — Employee list source
**Choice:** Keep the stub employee list in `InteractionStateService` and expose a `loadSubjects()` method that is currently a no-op / stub resolver.
**Why:** The backend `EmployeeController` is not present in the current repository (only the entity/repository/migration landed). Once `GET /api/v1/employees` is available, switching to real data is a one-line change inside `loadSubjects()` without touching components.

### D3 — Facilitator default
**Choice:** Map the current username from `AuthState` to a stub `EmployeeId` (`admin@staff.eng` → 1, `employee@staff.eng` → 2), overridable in the form.
**Why:** The backend requires a `facilitator` value on `POST /api/v1/interactions` but the Phase 0 principal is only a username with no `EmployeeId` mapping. This preserves the form's default-facilitator UX until a real identity bridge exists.

### D4 — Error handling
**Choice:** API errors are captured via `catchApiError()`, stored in the `error` signal, and rendered by `InteractionPage`.
**Why:** Matches `frontend-state.yaml` (side effects and error state live in the State Service) and gives the user visible feedback instead of silently logging to the console.

### D5 — Shared files
**Choice:** Only append to `app.routes.ts` and `app.config.ts`.
**Why:** `ROADMAP.md` §2.6 lists these as append-only coordination points. We do not edit `shell.html`, `shared/**`, or `package.json`.

## Risks / Trade-offs

- **Stub employee list drifts** → if Phase 1 employee REST changes shape, the `loadSubjects()` mapping must be updated. *Mitigation:* the mapping is isolated in the state service; components only see `EmployeeOption`.
- **Bearer interceptor is untracked** → `bearer-auth.interceptor.ts` exists on the branch but is not yet committed. Wiring it in `app.config.ts` requires the file to be part of the PR. *Mitigation:* include it in the change scope.
- **MANAGER-only backend endpoints** → the stub login must issue tokens for a user with `MANAGER` role. The Phase 0 auth stub already supports this; the frontend simply forwards the token.
- **Pagination sort fixed to `createdAt,desc`** → matches the backend `InteractionController` default. Future enhancements can expose UI sort controls via the existing `PageRequest` shape.

## Migration Plan

1. Create missing `interaction-list.html` + `.scss`.
2. Adjust `InteractionStateService` to expose `loadSubjects()` and keep the stub list.
3. Update `InteractionPage` to call `loadSubjects()` on init.
4. Append `/interactions` route to `app.routes.ts`.
5. Append `bearerAuthInterceptorProvider` to `app.config.ts`.
6. Add Jest unit tests for service + components.
7. Run `npm test -- interaction` and the `/constitution-audit` / `/api-check` skills.
8. PR review; merge into Phase 2 branch.

## Open Questions

- Should `shell.html` gain an `/interactions` nav link now, or should navigation remain URL/dashboard-driven until Phase 6?  
  *Recommendation:* defer; `shell.html` is a frozen Phase 0 file.
- Should we proactively define a shared `EmployeeOption` type in `shared/` once Phase 1 REST lands?  
  *Recommendation:* yes, but in the Phase 1/6 coordination PR, not this splice.
