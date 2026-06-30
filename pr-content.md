## What changed

Implemented the task-interaction cascade feature (ATSE1-37/ATSE1-38) which allows users to create tasks from interactions. This includes:

1. Backend changes:
   - Updated TaskController to use consistent `/api/v1` base path and SecurityContextHolder for authentication
   - Fixed `/me/tasks` endpoint to properly resolve employee from JWT claims
   - Added employee-based interaction filtering endpoint (`/api/v1/employees/{id}/interactions`)

2. Frontend changes:
   - Created new InteractionPicker component for selecting interactions
   - Updated TaskCreateForm to support cascading behavior between employee and interaction pickers
   - Added cascading logic where selecting an employee filters interactions, and selecting an interaction pins the employee

## Why

To enable users to create tasks directly from interactions, improving workflow efficiency. The cascading behavior ensures data consistency between employee and interaction selections while providing a smooth user experience.

This addresses issues where users were seeing "Request method 'GET' is not supported" errors and empty interaction dropdowns when creating tasks.

## How

Key implementation details:

- Refactored TaskController to use class-level `@RequestMapping("/api/v1")` for consistent URL paths
- Changed method-level mappings to relative paths
- Updated `getMyTasks()` to use `SecurityContextHolder` instead of `@AuthenticationPrincipal`
- Created `InteractionPicker` component that filters interactions by selected employee
- Implemented bidirectional cascading in TaskCreateForm:
  - Employee selection filters available interactions
  - Interaction selection pins the employee (read-only)
- Added clear functionality to reset both selections

Files modified:
- backend/src/main/java/com/staffengagement/task/web/TaskController.java
- backend/src/main/java/com/staffengagement/shared/security/AuthController.java
- frontend/src/app/features/task/task-create-form.ts
- frontend/src/app/shared/forms/interaction-picker/interaction-picker.ts
- And various related test and template files

## Type of change

- [x] feat: new feature
- [ ] fix: bug fix
- [ ] chore: tooling/deps/refactor
- [ ] docs: documentation
- [ ] breaking: breaking change

## Checklist

- [x] Branch is named per convention (`feature/`, `bugfix/`, `hotfix/`, `chore/`, `docs/`)
- [x] Commit messages follow Conventional Commits (`feat:`, `fix:`, ...)
- [x] Tests added/updated for new behavior
- [x] Tested locally (backend `./mvnw test` and/or frontend `npm test -- --no-watch`)
- [ ] CI is passing
- [x] No secrets or `.env` files committed
- [ ] `main` is up to date before merging (no conflicts)

## Notes for reviewer

Please review the cascading behavior implementation in the TaskCreateForm and InteractionPicker components. The key functionality is:
1. When an employee is selected, the interaction dropdown filters to that employee's interactions
2. When an interaction is selected, the employee is automatically pinned to that interaction's subject
3. The clear button resets both selections

The backend authentication changes fix the "Request method 'GET' is not supported" error that was occurring due to incorrect endpoint mapping.