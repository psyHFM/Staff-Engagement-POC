## Why

**ATSE1-37 & ATSE1-38**: The Create Task form currently allows users to pick an employee (subject) but cannot link a task to an existing interaction. This creates a disconnected workflow where users must manually reference interactions when creating follow-up tasks.

**Problem**: Without interaction linkage:
- Tasks created from interactions lack context about the original discussion
- Users cannot easily see which tasks were spawned from specific interactions
- The `sourceInteractionId` field exists in the data model but isn't surfaced in the UI

## What Changes

- Add an **Interaction dropdown** to the Create Task form that shows:
  - Interaction subject name (employee) + first 60 chars of note
  - Internal interaction ID wired for backend submission
- Implement **cascading filters** between Employee and Interaction dropdowns:
  - Selecting an Employee filters Interactions to that employee's interactions
  - Selecting an Interaction pins the Employee to that interaction's subject (read-only)
  - Clear button to reset both selections
- Update `CreateTaskRequest` to support `sourceInteractionId` field

## Capabilities

### New Capabilities
- `task-interaction-link`: New capability for linking tasks to interactions via the UI

### Modified Capabilities
- **task-creation**: Current task creation spec needs updates to include interaction dropdown and cascading behavior

## Impact

**Frontend**:
- `frontend/src/app/features/task/task-create-form.ts` - Add InteractionPicker, update request model
- `frontend/src/app/features/task/task-create-form.html` - Add interaction dropdown template
- `frontend/src/app/features/task/task-create-form.scss` - New styles for interaction picker
- `frontend/src/app/features/interaction/interaction-state.service.ts` - Add `interactionsBySubject()` helper
- `frontend/src/app/shared/forms/interaction-picker/` - New component (similar to EmployeePicker)

**Backend**:
- No changes required - `sourceInteractionId` field already exists in `CreateTaskRequest`

**API**:
- No new endpoints - uses existing `POST /api/v1/tasks` with optional `sourceInteractionId`
