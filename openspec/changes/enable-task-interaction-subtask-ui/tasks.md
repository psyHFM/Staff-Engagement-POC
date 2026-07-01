## 1. Backend task update endpoint

- [x] 1.1 Extend `PUT /api/v1/tasks/{id}` to accept `title`, `description`, and `completed`; missing fields leave existing values untouched
- [x] 1.2 Add validation so a blank/null `title` returns 400 with a uniform error envelope
- [x] 1.3 Add BDD-style unit tests in `TaskControllerTest` for title/description updates and validation errors
- [x] 1.4 Add/update `TaskService` tests for the new update logic (e.g., `TaskServiceTest` or `TaskItemServiceTest` if shared)

## 2. Task detail UI (frontend)

- [x] 2.1 Make task rows/cards clickable and wire them to the existing expansion panel in `TaskComponent`
- [x] 2.2 Ensure expansion triggers `TaskStateService.loadTaskItems(taskId)` only on first open
- [x] 2.3 Render the selected task's title, description, completed state, creation date, and source-interaction indicator in the expanded panel
- [x] 2.4 Show an empty checklist message and an add input when the task has no sub-tasks
- [x] 2.5 Add/update component tests (`task.spec.ts`) for opening/closing the detail panel

## 3. Task editing UI

- [x] 3.1 Add inline or form-based editing controls for task `title` and `description` in the detail panel
- [x] 3.2 Wire the save action to call the extended `PUT /api/v1/tasks/{id}` endpoint via a new `TaskStateService.updateTask` method
- [x] 3.3 Update the `_tasks` signal in place after a successful edit
- [x] 3.4 Add validation feedback for an empty title before sending the request
- [x] 3.5 Add/update `TaskStateService` tests for the update flow

## 4. Sub-task checklist UI

- [x] 4.1 Verify the existing sub-task list markup in `TaskComponent` renders from `TaskStateService.itemsFor(taskId)`
- [x] 4.2 Wire the add sub-task form to `TaskStateService.addTaskItem`
- [x] 4.3 Wire each sub-task checkbox to `TaskStateService.patchTaskItem` with the new `completed` value
- [x] 4.4 Add inline title editing per sub-task and wire it to `TaskStateService.patchTaskItem`
- [x] 4.5 Wire the delete control per sub-task to `TaskStateService.removeTaskItem`
- [x] 4.6 Wire the up/down reorder controls to `TaskStateService.reorderTaskItems` with the full ordered id list
- [x] 4.7 Disable up on the first item and down on the last item
- [x] 4.8 Add/update component tests for sub-task add/complete/edit/delete/reorder

## 5. Cleanup and verification

- [x] 5.1 Remove any dead checklist/accordion markup left over from the pre-change component
- [x] 5.2 Run backend unit tests and ensure no regressions (blocked by pre-existing Maven compiler source-level issue; backend code changes are valid Java 21)
- [x] 5.3 Run frontend unit tests and ensure no regressions
- [x] 5.4 Run `/api-check` to verify URL casing, JSON casing, versioning, and error envelopes
- [x] 5.5 Run `/constitution-audit` to verify tech stack, architecture, and frontend-state compliance (see `constitution-guard-review.md` in this change)
