## Context

The current interaction list component displays the full `notes` field as the row subject, leading to inconsistent row heights and visual clutter. The backend already provides an `interactionListNote` field (shorter, summary version) that should be used for the list view. The task details modal already exists as a reference UX pattern.

**Current State:**
- `InteractionListComponent` renders all interaction details inline
- Full `notes` text is displayed as the clickable subject
- No detail modal exists for interactions

**Constraints:**
- Must follow Angular Style Guide (Signals, `inject()` pattern)
- Must mirror task details modal UX for consistency
- Backend API already exposes `interactionListNote` - no backend changes needed

## Goals / Non-Goals

**Goals:**
- Display `interactionListNote` as the interaction row subject in the list
- Create a detail modal showing full interaction details including complete notes
- Maintain visual consistency with existing task details modal
- Preserve Signal-based state management pattern

**Non-Goals:**
- No changes to interaction data model or API
- No changes to how interactions are created or updated
- No backend modifications required

## Decisions

### 1. Modal Component Structure
**Decision:** Create a new `InteractionDetailModalComponent` that mirrors the `TaskDetailModalComponent` pattern.

**Rationale:** 
- Consistency with existing UX reduces cognitive load
- Reuses existing modal infrastructure (CDK Overlay or Angular Material dialog)
- Follows established component patterns in the codebase

**Alternatives Considered:**
- Expand existing task modal to handle both types → Too complex, violates single responsibility
- Side panel instead of modal → Inconsistent with task UX, more layout changes

### 2. State Management
**Decision:** Use a Signal-based `InteractionStateService` to manage selected interaction for modal display.

**Rationale:**
- Aligns with frontend-state.yaml requirement for Signals and unidirectional data flow
- Consistent with existing `TaskStateService` pattern
- Enables reactive updates without change detection issues

### 3. Trigger Mechanism
**Decision:** Make the entire interaction row clickable (not just the subject text) with a clear visual hover state.

**Rationale:**
- Improved usability - larger click target
- Consistent with task list behavior
- Better mobile/touch experience

## Risks / Trade-offs

**[Risk]** Modal may need to handle interactions with varying data completeness.
→ **Mitigation:** Defensive rendering with `@if` blocks and computed signals for empty states

**[Risk]** Existing interaction list tests may break with new click handlers.
→ **Mitigation:** Update unit tests to cover both list rendering and modal trigger scenarios

**[Trade-off]** Creating a new modal component adds code vs. reusing task modal with dynamic content.
→ **Mitigation:** Accept the duplication; interaction-specific fields justify separate component; extract shared modal logic only if pattern repeats

## Migration Plan

1. Create `InteractionDetailModalComponent` with Signal-based inputs
2. Add `selectedInteraction` signal to `InteractionStateService`
3. Update `InteractionListComponent` to:
   - Render `interactionListNote` as subject
   - Add click handler to open modal
   - Inject and call `InteractionStateService`
4. Write unit tests for modal component and updated list behavior
5. Manual QA: Verify modal opens, displays data, closes correctly

**Rollback:** Revert commit - no database migrations or API changes required.

## Open Questions

None - implementation approach is clear from existing patterns.
