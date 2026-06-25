## Implementation Tasks

### Proposal & Review
- [x] Create `openspec/changes/atse1-21-skills-frontend/` structure.
- [x] Write `proposal.md`, `design.md`, `tasks.md`.
- [ ] Run Constitution Guard persona review.
- [ ] Run Angular State Architect persona review.
- [ ] Run BDD Test Engineer persona review.
- [ ] Capture review outcomes and adjust plan if needed.

### Feature Implementation
- [ ] Create `frontend/src/app/features/skills/skills.model.ts`.
- [ ] Create `frontend/src/app/features/skills/skills-state.service.ts`.
- [ ] Create `frontend/src/app/features/skills/skills.ts`, `skills.html`, `skills.scss`.
- [ ] Append `/skills` lazy route to `frontend/src/app/app.routes.ts`.
- [ ] Append "Skills" nav link to `frontend/src/app/shell/shell.html`.

### Testing
- [ ] Create `frontend/src/app/features/skills/skills-state.service.spec.ts` (BDD Given-When-Then).
- [ ] Create `frontend/src/app/features/skills/skills.spec.ts`.
- [ ] Run `npm test` (frontend unit tests).
- [ ] Verify Playwright against running Docker stack.

### Delivery
- [ ] Commit all changes on branch `feature/ATSE1-21-skills-frontend`.
- [ ] Push branch and open PR #?.
- [ ] Run `/constitution-audit` and `/api-check` if available.
