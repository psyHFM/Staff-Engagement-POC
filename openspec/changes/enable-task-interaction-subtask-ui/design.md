## Context

The task module backend already supports sub-tasks (`TaskItem`) and exposes them through the additive `TaskSummaryWithItems` read model and REST endpoints under `/api/v1/tasks/{id}/items`. The `TaskStateService` already contains CRUD methods for sub-tasks and the `TaskComponent` template already contains markup for a checklist.

What is missing is user-facing interactivity: task rows/cards are not clickable, there is no detail/edit view, and the existing checklist markup is not connected to state-driven actions. This change makes the existing backend/frontend plumbing usable.

## Goals / Non-Goals

**Goals:**
- Make a task clickable so it opens a detail view (modal or inline expansion).
- Allow editing of task `title` and `description`.
- Enable add/complete/edit/delete/reorder of sub-tasks from the detail view.
- Reuse the existing Signal-based state service patterns.
- Keep all verification unit-test based per project policy.

**Non-Goals:**
- Changing task assignment (`subjectId`) or source interaction.
- Adding notifications, audit logging, or bulk operations.
- New modules or database migrations (the `task_item` table already exists).

## Decisions

### Decision: Inline detail panel instead of a new route

**Choice:** Open the task detail as an inline expansion of the task card on the existing My Tasks page, reusing the checklist markup already in `task.ts`.

**Rationale:**
- The component already has expansion/collapse logic (`expandedTaskId` signal) and sub-task markup.
- Avoids route changes and keeps the change scoped to the task module.
- Consistent with the current card-based layout.

**Alternative considered:** A dedicated `/tasks/:id` route. Rejected because it would require new routing config and a separate detail component for a change that fits naturally in the list view.

### Decision: Extend `PUT /api/v1/tasks/{id}` to support title/description updates

**Choice:** Convert the existing completion-only `PUT /api/v1/tasks/{id}` into a full task update endpoint that accepts `title`, `description`, and `completed`. Null or absent fields leave existing values untouched.

**Rationale:**
- Reuses the existing endpoint and HTTP verb.
- Keeps the API surface small.
- `completed` remains supported without breaking the current frontend toggle.

**Alternative considered:** Add a new `PATCH /api/v1/tasks/{id}` endpoint. Rejected because `PUT` is already used for updates and the project favors explicit verbs over proliferation of partially-overlapping endpoints.

### Decision: Reuse `TaskStateService` for detail state

**Choice:** Continue using the `_itemsByTask` map keyed by task id and add a `_selectedTaskId` signal for the expanded card. Detail data is loaded lazily when a card is expanded for the first time.

**Rationale:**
- Matches the existing lazy-load pattern and Signal-based state design.
- Avoids duplicated state.
- Makes it easy to update the task list in place after an edit because the same `_tasks` signal is shared.

### Decision: Sub-task reordering uses simple up/down arrows

**Choice:** Provide up/down arrow buttons on each sub-task. Clicking swaps with the adjacent item locally, then calls the backend reorder endpoint with the full id list.

**Rationale:**
- Simple to implement and test.
- Accessible and mobile-friendly.
- The existing `reorderTaskItems` method already expects an ordered id list.

**Alternative considered:** Drag-and-drop. Rejected because it adds a dependency and is harder to unit test reliably.

## Risks / Trade-offs

- **[Risk] The existing checklist markup in `task.ts` may be partially dead code.** → Mitigation: remove any unreachable branches and consolidate around the expansion panel.
- **[Risk] Extending `PUT /api/v1/tasks/{id}` could affect the completion toggle if not done carefully.** → Mitigation: keep `completed` in the request body, default missing title/description to current values, and add/update controller tests.
- **[Trade-off] Inline expansion keeps the page simple but may not scale if tasks gain many fields later.** → Acceptable for the POC; a route-based detail can be introduced later without breaking this implementation.

## Migration Plan

No deployment or data migration is required. The `task_item` table is already in place. The change is purely code: backend endpoint extension and frontend wiring.

Rollback: revert the component/service/controller changes; existing task/sub-task data is unaffected.

## Open Questions

- Should the task detail view be a modal on smaller screens, or is inline expansion acceptable for all viewports?
- Should a task's own `completed` status automatically update when all sub-tasks are completed? (Currently `TaskService.isComplete` exists but is not called from the controller on item updates.)
