## Design Decisions

### D1: Mirror the `interaction` feature pattern
The `interaction` feature (`frontend/src/app/features/interaction/`) already has a `StateService` subclass, an API-backed search/list, and append-only route/nav integration. ATSE1-21 mirrors that structure so the skills page stays idiomatic and consistent.

**Rationale:** reduces cognitive load, follows existing conventions, and simplifies code review.

### D2: `SkillsStateService` owns the search debounce and API call
The component only calls `state.search(name)`. The service holds a `query` signal and exposes `loading`, `error`, and `results`. It calls `apiClient.get('skills', params)` and maps the response into a signal.

**Rationale:** keeps components thin and preserves unidirectional data flow per `frontend-state.yaml`.

### D3: Search input is immediate (no external debounce library)
For the POC, each keystroke triggers a search. If volume becomes a concern a future story can add `debounceTime` in the service. No new dependency is added.

**Rationale:** the project constitution locks `package.json`; adding RxJS operators is fine because RxJS is already available.

### D4: Default sort and pagination reuse the API defaults
The UI does not override `sort`, `offset`, or `limit` on first load. The service passes user-provided values straight through to the backend. A follow-up story can add a sort toggle.

**Rationale:** minimal UI scope; the endpoint already handles ranking.

### D5: Empty/blank search clears results
If the user clears the search input, the service clears `results` and `error` without calling the API.

**Rationale:** avoids a 400 from the backend (which rejects blank `name`) and gives immediate feedback.

### D6: Append-only coordination points
`app.routes.ts` and `shell.html` are edited by appending one line each, matching the `ROADMAP.md` §2.4 convention.

**Rationale:** keeps merge-conflict surface minimal.

## Deferred / Out of Scope

- Sort direction UI toggle (endpoint already supports it).
- Pagination controls beyond the first page (endpoint already supports `offset`/`limit`).
- "My skills" or employee-detail skills view (Phase 6 responsibility).
- Playwright end-to-end tests are used for manual verification only; the constitution targets unit tests + mutation testing.
