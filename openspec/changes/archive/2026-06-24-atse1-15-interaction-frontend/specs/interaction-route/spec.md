## Context

Register the Interaction feature in the Angular router so it is reachable at `/interactions` and protected by authentication.

## Requirements

- Add a lazy-loaded route at path `interactions`.
- Load the `InteractionPage` standalone component.
- Apply the existing `authGuard` so unauthenticated users are redirected to `/login`.
- Follow the append-only convention in `app.routes.ts` (do not edit existing route lines).

## API

- Edits `frontend/src/app/app.routes.ts` only.

## Tests

- The route configuration includes `/interactions` as a lazy-loaded, `canActivate: [authGuard]` entry.

## Boundaries

- This is an append-only shared-file edit permitted by `ROADMAP.md` §2.6.
