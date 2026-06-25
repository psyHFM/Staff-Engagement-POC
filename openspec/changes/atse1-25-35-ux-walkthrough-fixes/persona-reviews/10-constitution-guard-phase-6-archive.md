# Constitution Guard — §10 ATSE1-26 openSpec reconciliation + archive phase-6-rounded-profile

## Summary
**PASS** — the §10 commit (8b62f5d) correctly archives the `phase-6-rounded-profile/` openSpec change to the standard `archive/YYYY-MM-DD-<change>/` location, ticks all 11 task sections `[x]`, and the closing note correctly cites PR #33 (`97cf119`) and PR #34 (`7c06d78`). All spot-checked code in `main` matches the archived task descriptions; no accidental deletions; the archive operation is constitutionally permitted.

## Compliant ✅

### §1 Backend scaffold
- `backend/src/main/java/com/staffengagement/profile/{controller,service}/` exists on `main` (verified via `ls`). Files: `controller/ProfileController.java`, `controller/ProfileErrorHandler.java`, `service/ProfileService.java`, `service/PersonProfile.java`, `service/ProfileMapper.java`, `service/ProfileNotFoundException.java`, `service/SkillWithStrength.java`. Matches `tasks.md` §1.1.

### §5 Backend controller + error handling
- `ProfileController.java` at `backend/src/main/java/com/staffengagement/profile/controller/ProfileController.java:24` carries class-level `@PreAuthorize("isAuthenticated()")`. Matches `tasks.md` §5.1, `api-standards.yaml -> security.authorization.enforcement`.
- Endpoint at line 33: `@GetMapping("/employees/{id}/profile")` — kebab-case path, `/api/v1` prefix (`@RequestMapping("/api/v1")` line 23). Matches `tasks.md` §5.2 + §5.5, `api-standards.yaml -> architecture.casing.urls` and `versioning.prefix`.
- `{id}` bound as `Long` (line 34) and wrapped in `EmployeeId` at line 35. Matches `tasks.md` §5.3.
- `ProfileErrorHandler.java:23-30` returns uniform `ErrorEnvelope` (timestamp, status, error, message, path) on 404. Matches `tasks.md` §5.4, `api-standards.yaml -> error_handling.envelope_schema`.

### §7-§9 Frontend scaffold + state service + page
- `frontend/src/app/profile/` exists with `profile-page.ts`, `profile-page.html`, `profile-page.scss`, `profile-page.spec.ts`, `profile-state.service.ts`, `profile-state.service.spec.ts`, `profile.types.ts`. Matches `tasks.md` §7.1.
- `profile-state.service.ts:20-30` uses Signals + `computed()` for `profile`, `error`, `isLoading`; line 42 calls `ApiClient.get` and `subscribe` updates the signal. Matches `tasks.md` §8.1-§8.2, `frontend-state.yaml -> primary_mechanism` + `derived_state.mechanism`.
- `profile-page.ts:25-26` injects `ProfileStateService` and `ActivatedRoute` via `inject()`; `ngOnInit` (line 28) triggers `state.loadProfile(id)`. Matches `tasks.md` §9.1.

### §10.1 ArchUnit isolation rule
- `backend/src/test/java/com/staffengagement/ArchUnitTest.java:113-122` defines `profileModuleMustNotDependOnOtherModulesInternals` enforcing `com.staffengagement.profile..` isolation from `shared.security..`, `shared.health..`, `employee..`, `interaction..`, `task..`, `skills..`. Matches `tasks.md` §10.1, `backend-architecture.yaml -> modularization.boundary_enforcement.policy`.

### §10.2 PITest targetClasses
- `backend/pom.xml:138-143` includes `<param>com.staffengagement.profile.*</param>` in `targetClasses`. Matches `tasks.md` §10.2, `testing-strategy.yaml -> backend.quality_assurance.mutation_testing.tool`.

### Archive convention
- New directory: `openspec/changes/archive/2026-06-25-phase-6-rounded-profile/` — exactly matches the established `YYYY-MM-DD-<change-name>/` pattern used by `2026-06-23-phase-0-foundation/`, `2026-06-24-phase-3-task/`, `2026-06-25-atse1-20-skills-backend/`, etc.
- Contents: `design.md`, `proposal.md`, `specs/`, `tasks.md` — identical layout to existing archives.

### tasks.md content correctness
- All 11 sections (`§1` through `§11`) have every checkbox `[x]` — no stragglers.
- Closing verification block (lines 100-105) correctly references:
  - PR #33 `feat(profile): phase 6 rounded profile backend` (commit `97cf119`) — verified to exist via `git log --oneline -1 97cf119`.
  - PR #34 `feat(profile): Phase 6 rounded profile frontend` (commit `7c06d78`) — verified to exist via `git log --oneline -1 7c06d78`.

### No accidental deletions
- `git show --name-status 8b62f5d` shows only 4 line-level operations:
  - 6 renames (R100): `.openspec.yaml`, `design.md`, `proposal.md`, `specs/profile-api/spec.md`, `specs/profile-service/spec.md`, `specs/profile-ui/spec.md` (all unchanged content moved to archive)
  - 1 addition (A): `archive/2026-06-25-phase-6-rounded-profile/tasks.md` (ticked version)
  - 1 deletion (D): `phase-6-rounded-profile/tasks.md` (the original unticked version)
- `git status` shows `phase-6-rounded-profile/` is gone; the other active changes (`phase0-backend-skeleton/`, `phase2-interaction/`) remain untouched.

### Constitutional compliance of archive operation
- `ROADMAP.md` defines phase ordering and merge checkpoints but does not prohibit archiving a fully-merged openSpec change. Archiving is the documented closeout step for completed changes. No rule in `MISSION.md` or the YAMLs is violated.

### tasks.md ↔ proposal/design coverage
- `proposal.md` and `design.md` declare 5 additive frozen-contract extensions (`EmployeeSummary`, `InteractionSummary`, `TaskSummary`, `PortfolioSummary`) and explicitly state `SkillsContract` is intentionally not consumed (D2 rationale, line 44). `tasks.md` §2.1-§2.4 covers the 4 extensions actually consumed, matching the design rationale.
- `design.md` D1 layout (`profile/{controller, service}` only) matches `tasks.md` §1 and the actual file tree on `main`.
- `design.md` D3 `PersonProfile` record shape (5 fields: `employee`, `interactions`, `tasks`, `portfolio`, `topSkills`) matches `tasks.md` §3.1 and `PersonProfile.java:16-22`.
- `design.md` D6 route `/employees/:id/profile` + `EmployeeList` link matches `tasks.md` §9.2-§9.3.
- `design.md` D7 `ProfileStateService` extends `StateService`, exposes `profile`/`loading`/`error` as `computed()` — matches `tasks.md` §8.1-§8.2 and `profile-state.service.ts:17-30`.

### Commit hygiene
- Commit message: `chore(openspec): archive phase-6-rounded-profile (ATSE1-26)` — correctly identifies the Jira ticket.
- Body explains what was done (copy + tick + delete) and why (PRs already merged, change was left active), and references both merged PRs.
- Conventional Commits format (`chore(openspec):`) is appropriate for housekeeping/archive.

## Warnings ⚠️

- **W1 — Archive naming drift:** the new archive uses `<date>-phase-6-rounded-profile/` whereas existing archives use `<date>-phase-N-<module>/` (e.g. `2026-06-24-phase-3-task/`, `2026-06-24-phase-1-employee/`). The new entry is internally consistent and the openSpec change's own name was `phase-6-rounded-profile`, so this is faithful to the source change name — but it diverges from the phase-numbered convention. **Not a violation** (the archived directory mirrors the openSpec change's own name, which is the canonical identifier); just noting the cosmetic inconsistency.

- **W2 — Closing note format inconsistency with other archives:** none of the previously archived changes (`2026-06-23-phase-0-foundation/`, `2026-06-24-phase-3-task/`) include a trailing `**Verified by merged PRs:**` block. This is a new convention introduced by this commit. **Not a violation** — it's an improvement (more traceability) and the format is clear and useful. Consider standardising this across future archives.

## Violations ❌

None.

## Recommendations

1. **(low priority)** If archiving becomes a recurring ceremony, consider codifying the closing-note format (PR# + commit hash + final disposition) in the openSpec workflow docs so every archive carries the same provenance.
2. **(informational)** The `SkillsContract` extension referenced in `proposal.md` "Modified Capabilities" is correctly excluded from `tasks.md` §2 because Phase 6 design D2 explicitly defers it. No action required.
3. **(informational)** Suggest linking `openspec/changes/archive/2026-06-25-phase-6-rounded-profile/tasks.md` from the PR #33 and PR #34 descriptions (or from this commit's body) so the verification trail is discoverable from GitHub as well as the repo history.