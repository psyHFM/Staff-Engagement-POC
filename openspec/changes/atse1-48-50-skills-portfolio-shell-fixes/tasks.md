## Implementation Tasks

### Proposal & Review
- [ ] Write `proposal.md`, `design.md`, `tasks.md`.
- [ ] Run Constitution Guard persona review.
- [ ] Run Angular State Architect persona review.
- [ ] Run BDD Test Engineer persona review.
- [ ] Capture review outcomes and adjust plan if needed.

### ATSE1-48: Skills Detail Navigation

- [x] Add `/skills/:name` route to `frontend/src/app/app.routes.ts` (lazy-load same `SkillsPage`).
- [x] Inject `Router` and `ActivatedRoute` in `SkillsPage`; read `:name` param and call `state.search(name)` on init.
- [x] Change `onTileClick()` to navigate via `router.navigate(['/skills', skill])` instead of just searching.
- [x] Add detail panel to `skills-page.html` that shows when a skill is selected (route param or result click).
- [x] Ensure deep-link works: direct `/skills/Angular` URL renders detail without search.
- [x] Add `onResultClick()` for search result row clicks.
- [x] Add SCSS styles for detail panel.

### ATSE1-49: Portfolio Employee ID Default

- [x] Default `employeeId` to `auth.currentEmployeeId()` in `ngOnInit()` (fallback to `'1'` if null).
- [x] Add `readonly` binding to employee ID input for non-admin users (mirror backend RBAC).

### ATSE1-50: Shell Sign In Link Visibility

- [x] Verify `@if (auth.isAuthenticated())` guard in `shell.html` is correct (already correct - no changes needed).

### Testing

- [ ] Update `frontend/src/app/features/skills/skills-page.spec.ts` — add navigation and route param scenarios.
- [ ] Update `frontend/src/app/features/portfolio/portfolio.spec.ts` — verify default employee ID.
- [ ] Verify `frontend/src/app/shell/shell.html` auth guard with a unit test.
- [ ] Run `npm test` (frontend unit tests) — all green.
- [ ] Update `e2e/tests/skills.spec.ts` — verify tile click opens detail view.
- [ ] Update `e2e/tests/portfolio.spec.ts` — verify correct employee loads on first load.
- [ ] Run Playwright against Docker stack — all e2e green.

### Delivery

- [x] Build passes (`npm run build`) — ✅ green with minor style budget warning (4.55kB vs 4kB).
- [ ] Commit all changes on branch `feature/ATSE1-48-50-shell-fixes`.
- [ ] Push branch and open PR.
- [ ] Run `/constitution-audit` and `/api-check` if available.
- [ ] Run `/arch-verify` to verify module boundaries.
- [ ] Run `/mutation-report` to verify test coverage.

### Archive Closeout

- [ ] After merge, archive to `openspec/changes/archive/2026-XX-XX-atse1-48-50-shell-fixes/`.
- [ ] Log any non-blocking follow-ups in `.claude/plans/atse1-48-50-reconciliation/`.
