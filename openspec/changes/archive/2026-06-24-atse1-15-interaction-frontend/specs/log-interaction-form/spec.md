## Context

Part of the Phase 2 Interaction frontend. The form allows a manager to log a typed engagement with an employee.

## Requirements

- Display a dropdown of the frozen `InteractionType` values (`check-in`, `mentoring`, `catch-up`, `performance`, `other`) with human-readable labels.
- Display a subject dropdown populated from the state service's available employees.
- Display a facilitator dropdown populated from the same employee list, defaulting to the logged-in user but overridable.
- Display a multi-line note field (optional).
- Submit button is disabled until both subject and facilitator are selected.
- On submit, delegate to `InteractionStateService.createInteraction(...)`.
- On successful creation, reset the form and emit `(logged)` so the parent can refresh the history list.

## API

- Consumes `InteractionStateService.createInteraction(type, subject, facilitator, note)`.
- No direct HTTP calls from the component.

## UI/UX

- Uses Angular template-driven forms (`FormsModule`).
- Follows BEM-style CSS classes (`log-interaction`, `log-interaction__field`, etc.).
- PrimeIcons icon on the submit button.

## Tests

- Given the component is rendered with a subject list, when the user selects subject/facilitator and submits, then `InteractionStateService.createInteraction` is called with the expected payload and `(logged)` is emitted on success.
- Given required fields are missing, the submit button is disabled.
- Given the parent passes a pre-selected subject, the form defaults to that subject.

## Boundaries

- Only edits files inside `frontend/src/app/features/interaction/log-interaction/`.
