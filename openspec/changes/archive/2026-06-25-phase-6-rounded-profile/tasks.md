## 1. Backend scaffold

- [x] 1.1 Create package tree `com.staffengagement.profile/{controller,service}` under `backend/src/main/java/`
- [x] 1.2 Create package tree `com.staffengagement.profile/{controller,service}` under `backend/src/test/java/`
- [x] 1.3 Verify no edits to `master.yaml`, `application.yml`, `frontend/package.json`

## 2. Additive frozen-contract extensions

- [x] 2.1 Extend `EmployeeSummary` with `jobTitle`, `department`, `level`
- [x] 2.2 Extend `InteractionSummary` with `createdAt`
- [x] 2.3 Extend `TaskSummary` with `description`
- [x] 2.4 Extend `PortfolioSummary` with `education`, `projects`, `links`
- [x] 2.5 Update producing modules to populate new fields from their own domain data:
  - `EmployeeService` mapper populates new `EmployeeSummary` fields
  - `InteractionService` mapper populates `createdAt`
  - `TaskService` mapper populates `description`
  - `PortfolioService` mapper populates `education`, `projects`, `links`

## 3. Backend profile read model

- [x] 3.1 Create `PersonProfile` record in `profile/service/`:
  - `EmployeeSummary employee`
  - `List<InteractionSummary> interactions`
  - `List<TaskSummary> tasks`
  - `PortfolioSummary portfolio`
  - `List<SkillWithStrength> topSkills`
- [x] 3.2 Create `SkillWithStrength` record (`skill`, `years`, `projectCount`)
- [x] 3.3 Create `ProfileMapper` utility to assemble `PersonProfile` from contract outputs

## 4. Backend profile service

- [x] 4.1 Create `ProfileService` constructor-injecting four frozen contracts (`EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`)
- [x] 4.2 Annotate `profileFor(EmployeeId id)` with `@Transactional(readOnly = true)`
- [x] 4.3 Implement `profileFor`:
  - Validate employee exists via `EmployeeContract.findById`; throw `ProfileNotFoundException` if absent
  - Load interactions via `InteractionContract.findBySubject(id)`
  - Load tasks via `TaskContract.tasksForEmployee(id)`
  - Load portfolio via `PortfolioContract.portfolioFor(id)`
  - Map portfolio skills to `SkillWithStrength`, sorted by years desc, projectCount desc
  - Return assembled `PersonProfile`
- [x] 4.4 Add `ProfileNotFoundException` domain exception

## 5. Backend controller and error handling

- [x] 5.1 Create `ProfileController` with `@PreAuthorize("isAuthenticated()")` at class level
- [x] 5.2 Add `GET /api/v1/employees/{id}/profile` → `PersonProfile` or 404
- [x] 5.3 Bind `{id}` as `Long` and wrap locally in `EmployeeId`
- [x] 5.4 Create `ProfileErrorHandler` mapping `ProfileNotFoundException` to 404 `ErrorEnvelope`
- [x] 5.5 Verify kebab-case URL, camelCase JSON, unwrapped response, `/api/v1` prefix

## 6. Backend unit tests

- [x] 6.1 `ProfileServiceTest` — BDD Given-When-Then:
  - Given existing employee, returns assembled profile
  - Given missing employee, throws `ProfileNotFoundException`
  - Given no interactions/tasks/portfolio, returns empty collections
  - Given skills, returns them sorted by years desc
- [x] 6.2 `ProfileControllerTest` — Mockito the service:
  - 200 with profile when found
  - 404 with uniform envelope when not found
  - Path variable bound correctly
- [x] 6.3 `ProfileErrorHandlerTest` — assert error envelope shape

## 7. Frontend scaffold

- [x] 7.1 Create `frontend/src/app/profile/` folder
- [x] 7.2 Create `profile.types.ts` mirroring `PersonProfile` shape
- [x] 7.3 Create `profile-state.service.ts` extending `StateService`

## 8. Frontend state service and API

- [x] 8.1 `ProfileStateService` loads `GET /api/v1/employees/{id}/profile` via `ApiClient`
- [x] 8.2 Expose `profile`, `loading`, `error` as computed signals
- [x] 8.3 Add unit tests for `ProfileStateService` mocking `ApiClient`

## 9. Frontend page and routing

- [x] 9.1 Create `profile-page.ts` component with sections: header, interactions, tasks, portfolio
- [x] 9.2 Append `/employees/:id/profile` lazy route to `frontend/src/app/app.routes.ts`
- [x] 9.3 Add "View profile" link in `EmployeeList` navigating to `/employees/${id.value}/profile`
- [x] 9.4 Add unit tests for `ProfilePage` mocking `ProfileStateService`

## 10. Architecture and quality gates

- [x] 10.1 Add `com.staffengagement.profile..` isolation rule to `ArchUnitTest.java`
- [x] 10.2 Append `com.staffengagement.profile.*` to PITest `targetClasses` in `backend/pom.xml`
- [x] 10.3 ArchUnit boundary tests green — no illegal imports
- [x] 10.4 `mvn -f backend/pom.xml test` green
- [x] 10.5 `npm --prefix frontend test` green
- [x] 10.6 JaCoCo line/branch ≥ 80% on profile module (soft warning threshold)
- [x] 10.7 PITest on `com.staffengagement.profile.*`

## 11. Commit and PR

- [x] 11.1 Commit on `feature/phase-6-rounded-profile`
- [x] 11.2 Push and open PR against `main`
- [x] 11.3 Verify CI green

---

**Verified by merged PRs:**
- Backend: PR #33 `feat(profile): phase 6 rounded profile backend` (commit `97cf119`)
- Frontend: PR #34 `feat(profile): Phase 6 rounded profile frontend` (commit `7c06d78`)

All sections complete. Archived to `openspec/changes/archive/2026-06-25-phase-6-rounded-profile/` as part of the ATSE1-26 reconciliation in `atse1-25-35-ux-walkthrough-fixes`.