# Plan: ATSE1-15 — Interaction Frontend (OpenSpec-driven)

## Story
**ATSE1-15** (child of Epic ATSE1-3 "Phase 2 — Interaction")  
> Frontend: log-interaction form + history list + state + route

## Current state
The branch `feature/ATSE1-15-interaction-frontend` already contains a partial implementation under `frontend/src/app/features/interaction/`:
- `interaction.types.ts` — frozen `InteractionType` vocabulary, IDs, `InteractionSummary`, `Paged`, `EmployeeOption`.
- `interaction-state.service.ts` — Signal-based state service with history loading, create interaction, and a **stub** employee list.
- `interaction-page.{ts,html,scss}` — feature landing page with subject selector, error/success banners, form + list placeholders.
- `log-interaction.{ts,html,scss}` — form component for logging a new interaction.
- `interaction-list.ts` — pagination presenter, but **missing `.html` and `.scss`**.

Missing pieces that prevent the feature from being complete/testable:
1. `interaction-list/interaction-list.html` and `.scss`.
2. Lazy route entry in `app.routes.ts` (Phase 2 slot is still a comment).
3. `bearerAuthInterceptorProvider` not yet appended to `app.config.ts`.
4. No frontend unit tests for the Interaction feature.

## Approach

1. **OpenSpec-first**: create the OpenSpec change package under `openspec/changes/ATSE1-15-interaction-frontend/` mirroring the Phase 0 example, then implement against it.
2. **Splice-only edits**: only touch files owned by Phase 2 (`frontend/src/app/features/interaction/**`) plus the two constitutionally-allowed append-only shared files (`app.routes.ts`, `app.config.ts`).
3. **Keep the stub employee list** for now: Phase 1 employee REST endpoints are not present yet (only domain/repository/migration landed). Add a `loadSubjects()` hook so the switch to `GET /api/v1/employees` is a one-line change later.
4. **Constitution compliance**: verify Signals, unidirectional flow, `inject()`, kebab-case URLs, camelCase JSON, BDD tests, and append-only shared-file edits.

## OpenSpec deliverables

Create under `openspec/changes/ATSE1-15-interaction-frontend/`:

- `.openspec.yaml` — `schema: spec-driven`, `ticket: ATSE1-15`.
- `proposal.md` — Why / What Changes / Capabilities / Impact.
- `design.md` — Context, Goals/Non-Goals, decisions (D1–D5), risks, migration plan, open questions.
- `specs/log-interaction-form/spec.md`
- `specs/interaction-history-list/spec.md`
- `specs/interaction-state-service/spec.md`
- `specs/interaction-route/spec.md`
- `tasks.md` — numbered implementation tasks.

## Code changes

### Within `frontend/src/app/features/interaction/`
1. **Create `interaction-list/interaction-list.html`**
   - Render `history.content` or an empty state.
   - Show type badge, subject/facilitator IDs, note.
   - Previous / Next pagination buttons driven by `hasPrevious`/`hasNext` and `loading`.
2. **Create `interaction-list/interaction-list.scss`**
   - Match the visual language in `interaction-page.scss` / `log-interaction.scss`.
3. **Update `interaction-state.service.ts`**
   - Keep stub `availableSubjects` but expose `loadSubjects()` (no-op today, ready for real API).
   - Ensure `loadHistory()` and `createInteraction()` correctly clear/transient error state.
4. **Update `interaction-page.ts`**
   - Call `state.loadSubjects()` in `ngOnInit` before pre-selecting the first subject.

### Append-only shared files
5. **Update `frontend/src/app/app.routes.ts`**
   - Append the Phase 2 lazy route before the comment block:
     ```ts
     {
       path: 'interactions',
       loadComponent: () => import('./features/interaction/interaction-page/interaction-page').then((m) => m.InteractionPage),
       canActivate: [authGuard]
     }
     ```
6. **Update `frontend/src/app/app.config.ts`**
   - Append `bearerAuthInterceptorProvider` from `app/shared/auth/bearer-auth.interceptor` so `Interaction` API calls carry the JWT.

### Tests
7. **Create `interaction-state.service.spec.ts`** — BDD Given-When-Then:
   - loadHistory() fetches `GET /api/v1/employees/{id}/interactions` and exposes it via the history signal.
   - createInteraction() POSTs to `/api/v1/interactions`, updates `created`, and refreshes history for the current subject.
   - selectSubject() updates the selected subject.
   - API failures surface as the `error` signal and clear `loading`.
8. **Create `interaction-page.spec.ts`** — verifies subject pre-selection and delegation to `InteractionStateService`.
9. **Create `log-interaction.spec.ts`** — verifies form submit emits `logged` and calls `createInteraction` with correct payload.
10. **Create `interaction-list.spec.ts`** — verifies pagination buttons emit `pageRequested`.

## Decisions

- **D1 — State-service scope**: keep `InteractionStateService` provided at the `InteractionPage` component level. The state is feature-local; Phase 6 integration will compose via its own orchestration.
- **D2 — Employee list source**: remain on the stub list. The real `GET /api/v1/employees` endpoint does not exist yet (Phase 1 backend controller is not in the repo), but add `loadSubjects()` so the cut-over is trivial.
- **D3 — Facilitator default**: continue mapping `AuthState.currentUser()` to a stub employee id (`admin@staff.eng` → 1, `employee@staff.eng` → 2). The backend currently requires a `facilitator` value and has no principal→EmployeeId mapping.
- **D4 — Error handling**: expose API errors via the `error` signal and render them in `InteractionPage`; do not use `console.error` for feature-level failures.
- **D5 — Shared files**: only append to `app.routes.ts` and `app.config.ts`; do not edit `shell.html` (frozen Phase 0 file) even though a nav link would be convenient.

## Compliance checklist (pre-flight)

- [ ] Angular 22 standalone components, `inject()` DI.
- [ ] Signals + `computed()` for read models; side effects live in the state service.
- [ ] `kebab-case` URLs and `camelCase` JSON.
- [ ] `/api/v1` base path via `ApiClient`.
- [ ] BDD-style Jest tests, no integration tests.
- [ ] Append-only edits to `app.routes.ts` / `app.config.ts`.
- [ ] No edits to Phase 0 frozen folders (`shared/`, `shell/`).

## Risks / open questions

- **Risk**: `bearer-auth.interceptor.ts` is currently untracked on this branch. We will wire it, but it may need to be committed before the Interaction feature can make authenticated calls.
- **Open question**: should we add an `/interactions` link to `shell.html`? Plan says **no** to respect the frozen shared-files register; the route can be reached via `/interactions` directly (and the dashboard can be enhanced in Phase 6).
- **Open question**: should we switch the employee stub to a real API now? Plan says **no** because the backend `EmployeeController` is not present.

## Success criteria

- [ ] OpenSpec package created under `openspec/changes/ATSE1-15-interaction-frontend/`.
- [ ] `interaction-list.html` + `.scss` render paginated history.
- [ ] `/interactions` route is lazy-loaded and auth-guarded.
- [ ] `bearerAuthInterceptorProvider` appended to `app.config.ts`.
- [ ] Jest tests added and passing (`npm test -- interaction`).
- [ ] `/constitution-audit` and `/api-check` skills run against the diff and report green or only acceptable warnings.
