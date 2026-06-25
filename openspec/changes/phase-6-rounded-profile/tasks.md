## 1. Backend scaffold

- [ ] 1.1 Create package tree `com.staffengagement.profile/{controller,service}` under `backend/src/main/java/`
- [ ] 1.2 Create package tree `com.staffengagement.profile/{controller,service}` under `backend/src/test/java/`
- [ ] 1.3 Verify no edits to `master.yaml`, `application.yml`, `frontend/package.json`

## 2. Additive frozen-contract extensions

- [ ] 2.1 Extend `EmployeeSummary` with `jobTitle`, `department`, `level`
- [ ] 2.2 Extend `InteractionSummary` with `createdAt`
- [ ] 2.3 Extend `TaskSummary` with `description`
- [ ] 2.4 Extend `PortfolioSummary` with `education`, `projects`, `links`
- [ ] 2.5 Update producing modules to populate new fields from their own domain data:
  - `EmployeeService` mapper populates new `EmployeeSummary` fields
  - `InteractionService` mapper populates `createdAt`
  - `TaskService` mapper populates `description`
  - `PortfolioService` mapper populates `education`, `projects`, `links`

## 3. Backend profile read model

- [ ] 3.1 Create `PersonProfile` record in `profile/service/`:
  - `EmployeeSummary employee`
  - `List<InteractionSummary> interactions`
  - `List<TaskSummary> tasks`
  - `PortfolioSummary portfolio`
  - `List<SkillWithStrength> topSkills`
- [ ] 3.2 Create `SkillWithStrength` record (`skill`, `years`, `projectCount`)
- [ ] 3.3 Create `ProfileMapper` utility to assemble `PersonProfile` from contract outputs

## 4. Backend profile service

- [ ] 4.1 Create `ProfileService` constructor-injecting four frozen contracts (`EmployeeContract`, `InteractionContract`, `TaskContract`, `PortfolioContract`)
- [ ] 4.2 Annotate `profileFor(EmployeeId id)` with `@Transactional(readOnly = true)`
- [ ] 4.3 Implement `profileFor`:
  - Validate employee exists via `EmployeeContract.findById`; throw `ProfileNotFoundException` if absent
  - Load interactions via `InteractionContract.findBySubject(id)`
  - Load tasks via `TaskContract.tasksForEmployee(id)`
  - Load portfolio via `PortfolioContract.portfolioFor(id)`
  - Map portfolio skills to `SkillWithStrength`, sorted by years desc, projectCount desc
  - Return assembled `PersonProfile`
- [ ] 4.4 Add `ProfileNotFoundException` domain exception

## 5. Backend controller and error handling

- [ ] 5.1 Create `ProfileController` with `@PreAuthorize("isAuthenticated()")` at class level
- [ ] 5.2 Add `GET /api/v1/employees/{id}/profile` → `PersonProfile` or 404
- [ ] 5.3 Bind `{id}` as `Long` and wrap locally in `EmployeeId`
- [ ] 5.4 Create `ProfileErrorHandler` mapping `ProfileNotFoundException` to 404 `ErrorEnvelope`
- [ ] 5.5 Verify kebab-case URL, camelCase JSON, unwrapped response, `/api/v1` prefix

## 6. Backend unit tests

- [ ] 6.1 `ProfileServiceTest` — BDD Given-When-Then:
  - Given existing employee, returns assembled profile
  - Given missing employee, throws `ProfileNotFoundException`
  - Given no interactions/tasks/portfolio, returns empty collections
  - Given skills, returns them sorted by years desc
- [ ] 6.2 `ProfileControllerTest` — Mockito the service:
  - 200 with profile when found
  - 404 with uniform envelope when not found
  - Path variable bound correctly
- [ ] 6.3 `ProfileErrorHandlerTest` — assert error envelope shape

## 7. Frontend scaffold

- [ ] 7.1 Create `frontend/src/app/profile/` folder
- [ ] 7.2 Create `profile.types.ts` mirroring `PersonProfile` shape
- [ ] 7.3 Create `profile-state.service.ts` extending `StateService`

## 8. Frontend state service and API

- [ ] 8.1 `ProfileStateService` loads `GET /api/v1/employees/{id}/profile` via `ApiClient`
- [ ] 8.2 Expose `profile`, `loading`, `error` as computed signals
- [ ] 8.3 Add unit tests for `ProfileStateService` mocking `ApiClient`

## 9. Frontend page and routing

- [ ] 9.1 Create `profile-page.ts` component with sections: header, interactions, tasks, portfolio
- [ ] 9.2 Append `/employees/:id/profile` lazy route to `frontend/src/app/app.routes.ts`
- [ ] 9.3 Add "View profile" link in `EmployeeList` navigating to `/employees/${id.value}/profile`
- [ ] 9.4 Add unit tests for `ProfilePage` mocking `ProfileStateService`

## 10. Architecture and quality gates

- [ ] 10.1 Add `com.staffengagement.profile..` isolation rule to `ArchUnitTest.java`
- [ ] 10.2 Append `com.staffengagement.profile.*` to PITest `targetClasses` in `backend/pom.xml`
- [ ] 10.3 ArchUnit boundary tests green — no illegal imports
- [ ] 10.4 `mvn -f backend/pom.xml test` green
- [ ] 10.5 `npm --prefix frontend test` green
- [ ] 10.6 JaCoCo line/branch ≥ 80% on profile module (soft warning threshold)
- [ ] 10.7 PITest on `com.staffengagement.profile.*`

## 11. Commit and PR

- [ ] 11.1 Commit on `feature/phase-6-rounded-profile`
- [ ] 11.2 Push and open PR against `main`
- [ ] 11.3 Verify CI green
