## Why

ATSE1-20 delivered the backend slice of Phase 5, exposing `GET /api/v1/skills` so the system can answer **"Who's strong on Angular?"**. ATSE1-21 is the frontend slice: a Skills search page where the user picks a skill and sees a ranked list of people with years of experience and project counts.

This story is frontend-only. It consumes the frozen `GET /api/v1/skills` endpoint, adds no backend files, and follows the Phase 5 ownership boundary for `frontend/src/app/features/skills/**`.

## What Changes

- **New `skills` Angular feature** under `frontend/src/app/features/skills/`:
  - `SkillsStateService` — service-based state with Angular Signals, extending the shared `StateService` base class. Handles search input, API call, paging/sorting, and error state.
  - `Skills` component + template + styles — search input, result list, loading/error indicators.
  - `skills.model.ts` — feature-level DTO types (`SkillStrength`, `Paged<SkillStrength>`, `SkillSearch`).
  - Unit tests in BDD Given-When-Then style for the state service and component.
- **Route registration** — append one lazy-loaded line to `frontend/src/app/app.routes.ts`.
- **Navigation link** — append a "Skills" link to `frontend/src/app/shell/shell.html`.

## Capabilities

### New Capabilities

- `skills-state`: `SkillsStateService` with signals for `query`, `results`, `loading`, and `error`. Encapsulates the call to `GET /api/v1/skills` via the shared `ApiClient`.
- `skills-page`: `Skills` component that renders a search input and a ranked list of people matching the selected skill, including years and project count.
- `skills-route`: lazy-loaded `/skills` route, gated by `authGuard`.
- `skills-nav`: append-only link in the shell navigation.
- `skills-tests`: BDD unit tests for `SkillsStateService` and the `Skills` component.

### Modified Capabilities

- `routes`: append-only addition of `/skills`.
- `shell-nav`: append-only addition of a "Skills" anchor.

## Impact

- **New code:** `frontend/src/app/features/skills/**`.
- **Modified code (append-only):** `frontend/src/app/app.routes.ts`, `frontend/src/app/shell/shell.html`.
- **No backend files changed.**
- **No shared files changed** except the two append-only coordination points above.
- **ArchUnit / modular monolith:** not affected (frontend-only).
