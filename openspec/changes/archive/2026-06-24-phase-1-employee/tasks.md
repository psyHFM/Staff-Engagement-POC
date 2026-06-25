## 0. Branch plan (read first)

- **Group 1 = shared-kernel coordination PR** (ROADMAP §2.2): `shared/**` is "Frozen — no splice edits", so the Model B expansion lands as its own branch/PR, merged to `main` **before** the splice.
- **Groups 2–7 = employee splice**, each its own branch off updated `main` (one task group per branch, per the per-task-branch workflow).
- **Group 8 = OpenSpec finalize** after all splice groups merge.

## 1. Shared-kernel coordination (Model B expansion — own branch/PR, lands first)

- [x] 1.1 Add `EmployeeRole` enum (`EMPLOYEE`, `ADMIN`) to `shared/kernel` with a BDD test
- [x] 1.2 Additively amend `EmployeeSummary` to carry `role` → `(id, fullName, email, role)`; update any references (none produce it yet — verify)
- [x] 1.3 Additively amend `EmployeeContract` with `Optional<EmployeeSummary> findByEmail(String email)` (keep `findById`/`exists` unchanged)
- [x] 1.4 Rename stub `MANAGER`→`ADMIN`, user `manager`→`admin` in `StubUserStore` (+ its test); make usernames email-shaped (`admin@staff.eng`, `employee@staff.eng`); demote the stub role list to fallback-only
- [x] 1.5 Update `JwtTokenProvider`/`AuthController` to resolve the JWT role from `EmployeeContract.findByEmail(principal.name)` at login, falling back to `ROLE_EMPLOYEE` when no employee record exists; update security BDD tests
- [x] 1.6 Run `/constitution-audit` (Constitution Guard) on the shared-kernel change and record the verdict here
- [x] 1.7 `./mvnw test` green (Java 21 inline `JAVA_HOME`); ArchUnit green; `openspec validate --changes phase-1-employee` clean; PR + merge to `main`

### 1.6 Constitution Guard verdict (2026-06-24, branch `chore/phase-1-shared-kernel-model-b`)

Scope: shared-kernel coordination PR only — `shared/kernel/EmployeeRole`, `shared/api/EmployeeSummary` (+`role`), `shared/api/EmployeeContract` (+`findByEmail`), `shared/security/StubUserStore` (rename/email-shaping), `shared/security/AuthController` (role resolution).

- **Tech Stack** ✅ Compliant — Java 21 / Spring Boot; no frontend in this PR.
- **API Standards** ✅ Compliant — no new endpoints; `/api/v1/auth/login` unchanged (kebab-case); `EmployeeRole` JSON form is lowercase via `@JsonProperty`, consistent with the `InteractionType` precedent; camelCase field keys.
- **Testing Strategy** ✅ Compliant — new tests are BDD Given-When-Then (JUnit 5 + Mockito), unit-only (integration disabled). ⚠️ Soft: PITest mutation report not run for this coordination PR (no business logic to mutate); deferred to splice Group 5.4.
- **Backend Arch** ✅ Compliant — ArchUnit green (4/4 rules). `shared` depends only on `shared/api` + `shared/kernel` (no `..repository..`/`..domain..` import). `EmployeeContract` remains an interface (`frozenContractsAreInterfaces`). Role crosses the module boundary via the frozen Service-interface seam, per `communication: Service interfaces`.
- **Frontend State** ⚪ N/A — no frontend changes in this PR.
- **Frozen-contract amendment (ROADMAP §2.2)** ✅ Compliant — strictly additive (no method/field removed or renamed); delivered as a coordination PR ahead of the splice. Record canonical-ctor change is source-breaking for producers, but `grep` confirms no `EmployeeSummary` producer existed in Phase 0; documented in `design.md` Risk #2.

**Verdict: Compliant ✅** (one soft PITest deferral, frontend N/A). No remediation required for this coordination PR.

## 2. Backend employee domain & persistence (splice branch)

- [x] 2.1 Create `employee/domain/Employee` anemic entity (fields per record model incl. `role`; no `active`)
- [x] 2.2 Reference `shared/kernel.EmployeeRole` for the role column; add `EmployeeLevel` enum (`JUNIOR`, `INTERMEDIATE`, `SENIOR`) in `employee/domain`
- [x] 2.3 Create `employee/repository/EmployeeRepository` (lookup by id; `findByEmail`; `existsByEmail`; pagination/sort support)
- [x] 2.4 Create Liquibase changeset under `db/changelog/modules/employee/` — `employee` table (columns incl. `role`, unique `email`, identity/sequence for `id`) + seed exactly one `admin@staff.eng` row with `role = ADMIN`

## 3. Backend employee service & contract (splice branch)

- [x] 3.1 Create `employee/service/EmployeeService implements EmployeeContract` — `findById`→`Optional<EmployeeSummary>`, `exists`, `findByEmail` (all returning the 4-field summary)
- [x] 3.2 Add module-local `EmployeeResponse` DTO (full field set) + request DTOs + `EmployeeMapper` (entity↔summary/response)
- [x] 3.3 Create logic: bind `email` to `principal.name`; force `role = EMPLOYEE`; reject an already-bound email with 409; persist; server-set timestamps and sequence `id`
- [x] 3.4 Update logic: owner (`email==principal.name`) or ADMIN only; full replace of `fullName/jobTitle/department/level`; ADMIN may also replace `role`; non-admin `role` change → 403; `email` immutable (differing → 400); refresh `updatedAt`
- [x] 3.5 List logic: `offset`/`limit` (default 20, max 100) + `sort` whitelist (`fullName,email,department,level,createdAt`, default `createdAt,desc`); no filters

## 4. Backend employee controller & validation (splice branch)

- [x] 4.1 Create `employee/controller/EmployeeController` with `POST/GET/GET-by-id/PUT /api/v1/employees` (kebab-case, camelCase JSON, unwrapped, uniform `ErrorEnvelope`)
- [x] 4.2 Bean Validation on request DTOs (`fullName` non-blank + max length, `level` enum, `jobTitle`/`department` max length, `role` enum when supplied); map violations → 400 envelope
- [x] 4.3 Enforce RBAC: create any-authenticated (own only); update owner-or-admin; role change admin-only; map 403/401 via `AuthErrorHandlers`; 404 not found; 409 dup email
- [x] 4.4 Return HTTP 201 on create, 200 on update/get/list; response DTO includes `role`

## 5. Backend tests & boundaries (splice branch)

- [x] 5.1 BDD unit tests (JUnit5 + Mockito) for `EmployeeService`: create (email-bound, forced EMPLOYEE, 409 dup), update (owner ok, admin ok incl. role, 403 other, 403 non-admin role change, 400 email change), findByEmail, list (default/sort/limit), findById/exists — **done in Group 3** (testing-first; 21 tests in `EmployeeServiceTest`)
- [x] 5.2 BDD unit tests for `EmployeeController` (mock the service): status codes, envelope shape, RBAC enforcement incl. role-change rules
- [x] 5.3 Confirm ArchUnit green: employee module follows `controller/→service/→repository`, imports `shared/api` only
- [x] 5.4 `./mvnw test` green; PITest mutation report (soft); JaCoCo ≥80%

### 5.4 Quality-gate verdict (2026-06-24, branch `chore/phase-1-employee-finalize`, Java 21.0.10)

- **`./mvnw test`:** BUILD SUCCESS — 204 tests, 0 failures / 0 errors / 0 skipped (incl. ArchUnit).
- **JaCoCo (employee package, line+branch):** LINE **100.0%**, BRANCH **83.7%** — both ≥80% ✅.
- **PITest (employee, mutation score):** 70 mutations, 67 killed → **96%** ✅ (test strength 96%, 0 no-coverage).
- **Build-config hygiene (`backend/pom.xml`):** Spring Data JPA repository interfaces excluded from both JaCoCo (`<excludes> com/staffengagement/**/repository/**`) and PITest (`<excludedClasses> com.staffengagement.*.repository.*`). Rationale: derived query methods are declarative infrastructure, untestable under the constitution's unit-only / integration-disabled rule (`testing-strategy.yaml`); their synthetic bytecode branches/mutations are noise, not a test-quality signal. Excluding them makes both metrics measure testable business logic. `com.staffengagement.employee.*` also added to PITest `targetClasses` (was absent — a gap from PR #22).
- **PITest survivors (3 — edge-case follow-ups, not blockers):**
  - `EmployeeService.java:151` `list()` — `ConditionalsBoundaryMutator` (offset/limit boundary conditional; the test exercises the same boundary as the code).
  - `EmployeeService.java:192` `parseSort()` — `ConditionalsBoundaryMutator` (sort-whitelist boundary).
  - `EmployeeController.java:104` `callerOf` lambda — `BooleanTrueReturnValsMutator` (boolean return not asserted).
- **Verdict: Compliant ✅** — all soft gates met (≥80% line, branch, mutation). Three low-risk survivors documented for optional hardening.

## 6. Frontend employee feature (splice branch)

- [x] 6.1 Create `features/employee/EmployeeStateService` (Signals, in-memory) wrapping `ApiClient` for the four endpoints
- [x] 6.2 Create `EmployeeList` component (paginated directory, visible to all authenticated; sort controls)
- [x] 6.3 Create `EmployeeDetail` component; gate edit + role control by RBAC (admin edits any + role; non-admin edits own only, no role control)
- [x] 6.4 Create the create form (fields `fullName/jobTitle/department/level` only — no email, no role); wire to `POST`
- [x] 6.5 Append exactly one lazy-route line to `routes.ts` (append-per-feature convention)
- [x] 6.6 Jest BDD tests for `EmployeeStateService` (HttpTestingController); `npm run lint`, `npm run build`, `npm test` green; Stryker runs locally

## 7. End-to-end verification (splice branch)

- [x] 7.1 `docker compose build && docker compose up` — all three services healthy
- [x] 7.2 Verify the role flow: admin login → `ROLE_ADMIN` (from seeded record); employee login (no record yet) → `ROLE_EMPLOYEE` → self-creates → still EMPLOYEE; admin PUTs employee@ `role=ADMIN` → employee's next login yields `ROLE_ADMIN`; non-admin role change → 403; 404/400/409/403 envelopes; nginx proxies `/api/v1/employees/*`
- [x] 7.3 Frontend: list loads, create form has no email/role, edit + role control gated by RBAC

### 7.x End-to-end verification (2026-06-24, branch `feature/employee-frontend`, Docker 28.1.1)

All three containers up (`docker compose ps`): `postgres` healthy, `backend` serving (8080), `frontend` via nginx (4200). Verified via `curl` against the running stack:

- **7.1** `docker compose build` (exit 0) + `docker compose up -d` → all services Running; `postgres` `(healthy)`.
- **7.2 Role flow + envelopes** (`/api/v1`, decoded JWT `roles` claim):
  - admin login → `{"roles":["ADMIN"]}` (resolved from the seeded `admin@staff.eng` Employee record) ✅
  - employee login (no profile yet) → `{"roles":["EMPLOYEE"]}` (StubUserStore fallback) ✅
  - employee self-create `POST /employees` → `201`, `role:"employee"` (forced, id=2) ✅
  - non-admin role change `PUT /employees/2 {role:"admin"}` → `403` envelope ✅
  - owner update without role change → `200` (full-name replace) ✅
  - admin promotes `PUT /employees/2 {role:"admin"}` → `200`, `role:"admin"` ✅
  - employee re-login → `{"roles":["ADMIN"]}` (now resolved from the promoted record) ✅
  - `GET /employees/99999` → `404` envelope; differing-email `PUT` → `400` (`email is immutable`); duplicate-email `POST` → `409` ✅
  - nginx proxies `localhost:4200/api/v1/employees` → backend → `200` (same-origin) ✅
- **7.3 Frontend**: SPA fallback serves `index.html` for the `/employees` client route (`<app-root>`); nginx `/api/` reverse-proxy confirmed. The create-form-has-no-email/role and RBAC-gated edit/role affordances are covered by the passing component specs (`employee-create-form.spec`, `employee-detail.spec`, `employee.spec`) + the production build emitting the `employee` lazy chunk. Final visual browser click-through remains a user eyes-on step.

## 8. OpenSpec finalize

- [x] 8.1 Track/tick tasks through implementation (this file)
- [x] 8.2 After all groups merge, run `openspec-archive-change` (sync the `employee-management` + `backend-foundation` deltas into `openspec/specs/`, then archive)