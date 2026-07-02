## Why

The interaction list currently displays full notes as the row subject, causing visual clutter and making it difficult to scan interactions quickly. This change improves UX by showing concise `interactionListNote` values in the list, with full details available in a detail modal.

## What Changes

- Interaction list rows will render `interactionListNote` as the clickable subject instead of full notes
- Clicking an interaction row opens a detail modal showing full notes and interaction details
- UX pattern mirrors the existing task details modal for consistency
- No breaking changes - this is a UI enhancement only

## Capabilities

### New Capabilities

- `interaction-detail-modal`: Modal/panel component for displaying full interaction details including notes, triggered from the interaction list row

### Modified Capabilities

- `interaction-list`: Update list rendering to use `interactionListNote` as row subject and add click handler to open detail modal

## Impact

- Frontend: Angular components for interaction list and new detail modal
- State: Interaction state services need to support selected interaction for modal display
- No backend changes required - uses existing interaction API
