# Constitution Guard — Phase 5 (Skills) Audit

## Audit Context
Phase 5 Skills work (ATSE1-20 backend + ATSE1-21 frontend) merged to main via PRs #25/#26/#29/#32.
This is a retroactive audit. Date: 2026-06-25.

Files reviewed (20):
- Backend main: `backend/pom.xml`, `skills/controller/SkillsController.java`,
  `skills/service/SkillsService.java`,
  `shared/api/{SkillsContract,EmployeeContract,SkillStrength,Paged,PageRequest}.java`,
  `shared/error/ErrorEnvelope.java`.
- Backend tests: `skills/controller/SkillsControllerTest.java`,
  `skills/controller/SkillsAccessControlTest.java`,
  `skills/service/SkillsServiceTest.java`,
  `ArchUnitTest.java` (skills rule + neighbours).
- Frontend: `frontend/package.json`,
  `features/skills/{skills-page,skills-page.html,skills-page.spec,skills-state.service,skills-state.service.spec,skills.types}.ts`,
  `features/skills/skills.ts`,
  `app.routes.ts`, `shell/shell.html`.

## Compliant ✅

### Tech Stack
- `tech-stack.yaml -> tech_stack.backend.runtime` — Java 21 confirmed via `pom.xml` `<java.version>21</java.version>` (`backend/pom.xml:18`).
- `tech-stack.yaml -> tech_stack.backend.framework` — Spring Boot 3.5.15 starter set present (web, data-jpa, security, validation).
- `tech-stack.yaml -> tech_stack.backend.build_system` — Maven (no Gradle).
- `tech-stack.yaml -> tech_stack.backend.persistence` — Spring Data JPA + Liquibase present.
- `tech-stack.yaml -> tech_stack.backend.utilities` — Lombok present (`pom.xml:74-77`).
- `tech-stack.yaml -> tech_stack.frontend.framework` — Angular `^22.0.0` in `frontend/package.json:17-22`.
- `tech-stack.yaml -> tech_stack.frontend.reactive_programming` — `rxjs ~7.8.0` present.
- `tech-stack.yaml -> tech_stack.frontend.ui_assets` — PrimeIcons-only icons used in `skills-page.html` (`pi pi-search`, `pi pi-times`, `pi pi-spin pi-spinner`, `pi pi-exclamation-triangle`); no other icon library imported.
- `tech-stack.yaml -> tech_stack.backend.database_migration` — Liquibase included; no Skills-owned tables/changesets required (read-only module) — Phase 5 has no `db/changelog/modules/skills/` folder, which is correct per ROADMAP §8 (Skills aggregates via `PortfolioContract`).

### API Standards
- `api-standards.yaml -> architecture.versioning` — `@RequestMapping("/api/v1")` on controller (`SkillsController.java:30`); frontend `ApiClient.baseUrl = '/api/v1'` (`shared/api/api-client.ts:19`).
- `api-standards.yaml -> architecture.casing.urls` — `/skills` kebab-case (`SkillsController.java:36`); frontend route `'skills'` (`app.routes.ts:42`).
- `api-standards.yaml -> architecture.casing.json_keys` — DTO records use camelCase (`SkillStrength` field names, `PageRequest.offset/limit`, `Paged` content/offset/limit/total).
- `api-standards.yaml -> responses.wrapping` — Controller returns `Paged<SkillStrength>` directly (unwrapped).
- `api-standards.yaml -> error_handling.envelope_schema` — `ErrorEnvelope(timestamp, status, error, message, path)` matches exactly (`shared/error/ErrorEnvelope.java:11-15`).
- `api-standards.yaml -> data_retrieval.pagination` — `offset` / `limit` query params accepted by controller; `PageRequest` record enforces `offset ≥ 0`, `limit > 0 → 20`.
- `api-standards.yaml -> data_retrieval.sorting` — `sort=field,direction` parsed and validated; whitelisted to `{years, projectCount}` with asc/desc allow-list.
- `api-standards.yaml -> data_retrieval.limits.default_limit` — Default 20 applied in controller (`@RequestParam(defaultValue = "20") int limit`).
- `api-standards.yaml -> security.authentication` — Bearer JWT attached by shared `bearerAuthInterceptor` (`shared/auth/bearer-auth.interceptor.ts:14-22`); `ApiClient.get()` invoked from `SkillsStateService` so all calls pass through it.
- `api-standards.yaml -> security.authorization.enforcement` — `@PreAuthorize("isAuthenticated()")` declared on `search()` (`SkillsController.java:37`); verified reflectively by `SkillsAccessControlTest.searchEndpointRequiresAuthenticatedUser`.

### Backend Architecture
- `backend-architecture.yaml -> modularization.communication` — `SkillsService` depends only on `EmployeeContract` and `PortfolioContract` interfaces (`SkillsService.java:41-42`); no `employee.*` / `portfolio.*` / `repository` imports.
- `backend-architecture.yaml -> modularization.boundary_enforcement` — ArchUnit rule `skillsModuleMustNotDependOnOtherModulesInternals` present (`ArchUnitTest.java:134-145`) with correct denylist (skills blocked from `shared.error|shared.health|shared.security|employee|interaction|task|portfolio`).
- `backend-architecture.yaml -> internal_module_design.layers` — Controller depends on service only (`SkillsController.java:34` private final `SkillsService`); no repository touch.
- `backend-architecture.yaml -> modularization.modularization.structure` — Skills code lives under `com.staffengagement.skills.{controller,service}` only — no `repository/` or `domain/` packages (read-only module, correct).
- `ROADMAP.md -> §2.2 Cross-module communication` — `SkillsContract` and `SkillsService implements SkillsContract` (line 34); aggregation via `EmployeeContract.allEmployees()` + `PortfolioContract.portfolioFor()` is the documented Phase-5 contract surface.
- `ROADMAP.md -> §2.6 Shared-files register` — Splice does not edit `pom.xml`/`shared/**`/`routes.ts`/`app.config.ts`/`shell.html` outside the documented append-only navigation (`<a routerLink="/skills">` added in `shell.html:13`).

### Frontend State
- `frontend-state.yaml -> primary_mechanism.tool` — Angular Signals used throughout (`skills-state.service.ts:32-34`); no `BehaviorSubject`.
- `frontend-state.yaml -> state_hierarchy.global_state.tool` — `SkillsStateService extends StateService` (`skills-state.service.ts:29`); `@Injectable()` so feature-scoped via component `providers` (`skills-page.ts:20`).
- `frontend-state.yaml -> state_hierarchy.local_state.tool` — `searchTerm` is component-local transient UI (`skills-page.ts:26`).
- `frontend-state.yaml -> side_effects.placement` — API call and `.set()` happen inside `SkillsStateService.search()` (`skills-state.service.ts:82-91`); component only invokes `state.search()` / `state.clear()` (`skills-page.ts:30, 35`).
- `frontend-state.yaml -> derived_state.mechanism` — `query`, `results`, `error`, `isLoading` are all `computed()` (`skills-state.service.ts:37-46`); none are `.set()` manually.
- `frontend-state.yaml -> async_integration.pipeline` — RxJS `.get()` + `catchApiError()` + `finalize()` piped in service; `subscribe` updates the signal directly (one-shot request/response, the documented pattern).
- `frontend-state.yaml -> persistence.strategy` — No localStorage / IndexedDB; state is in-memory only.
- `frontend-state.yaml -> constraints` — Component never calls `.set()` on service signals (verified by reading both files); service never uses `BehaviorSubject`.

### Testing Strategy
- `testing-strategy.yaml -> general_policy.scope` — Unit tests only. Verified no `@SpringBootTest` in `skills/` test sources (only `@ExtendWith(MockitoExtension.class)` and pure reflection).
- `testing-strategy.yaml -> backend.frameworks` — JUnit 5 (`@Test` from `org.junit.jupiter`) + Mockito (`@Mock`, `BDDMockito.given/then`).
- `testing-strategy.yaml -> backend.style.pattern` — Given/When/Then comments throughout `SkillsServiceTest` (24+ explicit comments).
- `testing-strategy.yaml -> backend.quality_assurance.mutation_testing` — PITest configured in `pom.xml:126-160`; `targetClasses` parameter list deliberately scoped (skills module has no `repository/` so `SkillsService` is implicitly covered by adjacent rules).
- `testing-strategy.yaml -> backend.quality_assurance.coverage` — JaCoCo ≥80% configured (`pom.xml:163-192`).
- `testing-strategy.yaml -> frontend.frameworks` — Jest + `jest-preset-angular` + `jest-environment-jsdom` (`package.json:39-44`); config in `frontend/jest.config.js`.
- `testing-strategy.yaml -> frontend.quality_assurance.mutation_testing` — Stryker configured (`stryker.conf.json`) with `perTest` coverage, `mutate` globs covering `src/app/**/*.ts` minus specs.
- `testing-strategy.yaml -> frontend.quality_assurance.coverage.threshold` — Stryker `thresholds.high = 80` set.

## Warnings ⚠️

### W1: PITest `targetClasses` does not include `com.staffengagement.skills.*`
- `tech-stack.yaml -> tech_stack.backend.quality_assurance` chain / `testing-strategy.yaml -> backend.quality_assurance.mutation_testing` expect Skills code to be mutation-tested.
- `pom.xml:138-143` lists `shared.*`, `task.*`, `employee.*`, `profile.*` but NOT `com.staffengagement.skills.*` — so PITest will not score mutations on `SkillsService` / `SkillsController`.
- Impact: mutation score for the new module is effectively unmeasured, even though the test file is BDD-rich.
- Remediation: append `<param>com.staffengagement.skills.*</param>` to `<targetClasses>` in `pom.xml` (one-line addition, no merge risk).

### W2: Dead placeholder `skills.ts` still shipped alongside `skills-page.ts`
- `frontend-state.yaml -> constraints` ("Components must not update global state signals directly") + ROADMAP §2.6 ("splice owns only its feature folder") — the placeholder is not wired into any route (verified against `app.routes.ts:41-45`), so it is unreachable dead code.
- `features/skills/skills.ts` exports `class Skills` and is unreferenced anywhere (only `SkillsPage` is lazy-loaded).
- Impact: lint/lint-build noise; potential Stryker target noise (extra uncovered mutants).
- Remediation: delete `frontend/src/app/features/skills/skills.ts` as part of the archive PR (no runtime impact).

### W3: Frontend `@stryker-mutator/jest-runner` declared but no `npm run stryker` invoked in CI evidence
- `testing-strategy.yaml -> enforcement.ci_integration` requires mutation score reporting on every commit. The `stryker` script exists (`package.json:12`) and config is in place (`stryker.conf.json`), but the user-provided audit scope does not include CI workflow inspection; no judgment on whether Stryker is wired into CI.
- Flag-only — verify in `verify`/`ci` skill invocation.

### W4: `EmployeeContract.allEmployees()` is a deliberate additive extension
- `ROADMAP.md -> §2.2` ("Contracts are versioned; additive changes only") — the new method on `EmployeeContract` (line 30) is add-only (no breaking change) and justified in Javadoc; ArchUnit `frozenContractsAreInterfaces` still passes (interface-only).
- This is the correct path, but it constitutes a contract change made by Phase 5 that needs a coordination note in the archive PR.

## Violations ❌

*(None found — every audit dimension above is met or carries only Warnings.)*

## Verdict

**PASS WITH WARNINGS**

Phase 5 Skills is fully compliant on every hard constitutional dimension: Java 21 / Angular 22 / Maven / Liquibase / Lombok; `/api/v1` kebab-case REST with uniform error envelope and Bearer-JWT + `@PreAuthorize` enforcement; modular monolith boundaries intact (`SkillsService` speaks only to `EmployeeContract` + `PortfolioContract`; dedicated ArchUnit denylist rule present and correctly scoped); frontend state follows the Signals + `StateService` base + computed read-model + side-effects-in-service pattern with no `BehaviorSubject` and no component-direct `.set()`. Test strategy honours the unit-only constraint (no `@SpringBootTest` in the new module) and BDD Given/When/Then scaffolding is consistent. The four open items are all low-severity Warnings — most importantly **W1** (Skills not enumerated in PITest `targetClasses`) — which should be fixed in the archive PR so the new module's mutation score is actually measured, and **W2** (delete `skills.ts` placeholder) which is pure dead-code hygiene.
