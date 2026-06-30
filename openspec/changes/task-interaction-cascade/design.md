## Context

**Current state:**
- Task Create form has an `EmployeePicker` for subject selection
- `CreateTaskRequest` already has `sourceInteractionId` field (optional)
- Interaction data is loaded in `InteractionStateService`
- `InteractionSummary` has `id`, `subject`, `note`, `facilitatorName`, `type`, `createdAt`

**Constraints:**
- Frontend must follow unidirectional data flow (Signals only - no ngModel in shared components)
- Shared components must be reusable and not depend on feature modules
- Backend API contract already supports `sourceInteractionId` - no backend changes needed

## Goals / Non-Goals

**Goals:**
1. Add Interaction dropdown to Task Create form showing subject name + note preview
2. Implement cascading filters: Employee selection filters Interactions
3. Interaction selection pins Employee to read-only
4. Clear button resets both selections
5. Maintain Signal-driven architecture per frontend-state.yaml

**Non-Goals:**
- Not modifying backend API (already supports `sourceInteractionId`)
- Not implementing server-side filtering for interactions (client-side filter is sufficient for POC scale)
- Not adding new Interaction API endpoints

## Decisions

### Decision 1: Create `InteractionPicker` as shared component (like `EmployeePicker`)

**Rationale:**
- Reusability - other forms may need interaction selection
- Consistency - follows existing pattern for `EmployeePicker`
- Signal-driven - matches frontend-state.yaml requirements

**Alternative considered:** Inline dropdown in task-create-form only
**Rejected because:** Reduces reusability and duplicates picker pattern

### Decision 2: Filter interactions by subject on selection change

**Implementation:**
- `InteractionPicker` accepts optional `subjectId` input
- When `subjectId` changes, reload interactions filtered by that employee
- When `subjectId` is null, load all interactions (no filter)

**Alternative considered:** Load all interactions and filter client-side
**Rejected because:** More efficient - fetches only relevant data from backend

### Decision 3: Pin Employee when Interaction is selected

**Implementation:**
- When user selects an interaction, emit the subject id to parent
- Parent sets `request.subjectId` from interaction's subject
- Disable EmployeePicker when interaction is selected
- Provide clear button to reset both

**Rationale:** Ensures data consistency - interaction defines its subject, user cannot mismatch

### Decision 4: Clear button resets both fields

**Implementation:**
- Add explicit clear/refresh affordance in form
- Clears both `request.subjectId` and `request.sourceInteractionId`
- Re-enables EmployeePicker, reloads all interactions

## Risks / Trade-offs

### Risk: Performance with large interaction lists
**Mitigation:** Current spec uses wide pagination (100 rows) which is acceptable for POC scale (<50 employees * ~5 interactions each = ~250 interactions). For production, would need server-side search/filter.

### Risk: User confusion when Employee is pinned
**Mitigation:** Clear visual indicator (disabled state + label) that Employee cannot be changed when interaction is selected.

### Risk: Race condition on rapid selection changes
**Mitigation:** Use Angular Signals' automatic dependency tracking - only one re-render occurs per change detection cycle.

## Migration Plan

1. Create `InteractionPicker` component in `shared/forms/`
2. Update `InteractionStateService` with `interactionsBySubject()` helper
3. Update `TaskCreateForm` template and state
4. Test cascading behavior with various interaction counts
