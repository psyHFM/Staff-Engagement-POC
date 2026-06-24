## Context

Part of the Phase 2 Interaction frontend. The list renders the paginated interaction history for the currently selected employee.

## Requirements

- Render the `Paged<InteractionSummary>` content or an empty state when there are no interactions.
- Show each interaction's type, subject, facilitator, and note.
- Provide **Previous** and **Next** pagination controls.
- Disable Previous when at offset 0; disable Next when `offset + content.length >= total`.
- Emit `(pageRequested)` with `{ offset, limit }` when the user changes pages.
- Reflect the parent-provided `loading` flag.

## API

- Inputs:
  - `history: Paged<InteractionSummary> | null`
  - `loading: boolean`
- Outputs:
  - `pageRequested: PageRequest` where `PageRequest = { offset: number; limit: number }`

## UI/UX

- Pure presentation component; no state mutations.
- Uses BEM classes (`interaction-list`, `interaction-list__item`, etc.).
- Responsive layout consistent with `interaction-page.scss`.

## Tests

- Given a populated page, the component renders the correct number of rows and interaction notes.
- Given an empty page, the component shows an empty-state message.
- Given the user is on the first page, the Previous button is disabled.
- Given the user is on the last page, the Next button is disabled.
- Clicking Next/Previous emits the expected `PageRequest`.

## Boundaries

- Only edits files inside `frontend/src/app/features/interaction/interaction-list/`.
