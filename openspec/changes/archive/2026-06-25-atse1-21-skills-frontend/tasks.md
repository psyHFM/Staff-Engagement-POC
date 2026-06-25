## Implementation Tasks

### Proposal & Review
- [x] Create `openspec/changes/atse1-21-skills-frontend/` structure.
- [x] Write `proposal.md`, `design.md`, `tasks.md`.
- [x] Run Constitution Guard persona review.
- [x] Run Angular State Architect persona review.
- [x] Run BDD Test Engineer persona review.
- [x] Capture review outcomes and adjust plan if needed.

### Feature Implementation
- [x] Create `frontend/src/app/features/skills/skills.model.ts` (implemented as `skills.types.ts` with `SkillStrength` + `Paged<T>` + `SkillSearch`).
- [x] Create `frontend/src/app/features/skills/skills-state.service.ts` (extending `StateService`; signals + computed read models; `ApiClient.get('skills', params)`).
- [x] Create `frontend/src/app/features/skills/skills.ts`, `skills.html`, `skills.scss` (implemented as `skills-page.ts` / `.html` / `.scss`; the legacy `skills.ts` placeholder was retired and deleted during the 2026-06-25 archive).
- [x] Append `/skills` lazy route to `frontend/src/app/app.routes.ts` (`app.routes.ts:42-45`).
- [x] Append "Skills" nav link to `frontend/src/app/shell/shell.html` (`shell.html:13`).

### Testing
- [x] Create `frontend/src/app/features/skills/skills-state.service.spec.ts` (BDD Given-When-Then, 10 scenarios).
- [x] Create `frontend/src/app/features/skills/skills.spec.ts` (implemented as `skills-page.spec.ts`, 6 scenarios).
- [x] Run `npm test` (frontend unit tests) — green per PR #26/#29 verification.
- [x] Verify Playwright against running Docker stack — `e2e/tests/skills.spec.ts` covers `/skills` search end-to-end.

### Delivery
- [x] Commit all changes on branch `feature/ATSE1-21-skills-frontend` — `0b0df00` `feat(skills): ATSE1-21 skills search page + state + route + tests`.
- [x] Push branch and open PR #26 — merged 2026-06-24 to `feature/ATSE1-20-skills-backend`; the work reached `main` via PR #29 (squashed `eaccfd8`) and the nav link via PR #32.
- [x] Run `/constitution-audit` and `/api-check` if available — superseded by the explicit Constitution Guard persona review (see `.claude/plans/atse1-skills-persona-reviews/`).

### Archive Closeout (2026-06-25)
- [x] Retroactive persona review by Constitution Guard, Angular State Architect, BDD Test Engineer (verdict: PASS WITH WARNINGS; zero blocking Violations).
- [x] Dead-code cleanup: removed `frontend/src/app/features/skills/skills.ts` (Phase-5 placeholder, zero importers; Angular State Architect Violation V1).
- [x] Non-blocking follow-ups logged in `.claude/plans/atse1-skills-persona-reviews/reconciliation.md`:
  - W1 — Extract `Paged<T>` + `EmployeeId` to `frontend/src/app/shared/api/` (cross-cutting refactor; out of scope for this archive).
  - W2 — `SkillsStateService._query.set(name)` runs before blank-check (single tick inconsistency; out of scope).
  - W3 — "Loading in flight" tests use synchronous `of(...)`; harden with `Subject` (test refactor; out of scope).
  - W4 — Add `com.staffengagement.skills.*` to PITest `targetClasses` in `backend/pom.xml` (coordination-level config change; out of scope).
  - W5 — Stryker CI invocation not inspected (flag-only; verify in `verify` skill).
- [x] Archived to `openspec/changes/archive/2026-06-25-atse1-21-skills-frontend/`. Canonical spec lives at `openspec/specs/skills-frontend/spec.md`.
