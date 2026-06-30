## 1. InteractionPicker Component

- [x] 1.1 Create `frontend/src/app/shared/forms/interaction-picker/interaction-picker.ts` - Signal-driven picker component with `value` input and `valueChange` output
- [x] 1.2 Create `frontend/src/app/shared/forms/interaction-picker/interaction-picker.html` - Template with select dropdown
- [x] 1.3 Create `frontend/src/app/shared/forms/interaction-picker/interaction-picker.scss` - Styles for interaction picker
- [x] 1.4 Create `frontend/src/app/shared/forms/interaction-picker/interaction-picker.spec.ts` - Unit tests for picker component

## 2. InteractionStateService Updates

- [x] 2.1 Add `interactionsBySubject(employeeId: number)` method to filter interactions by employee subject

## 3. TaskCreateForm Integration

- [x] 3.1 Import `InteractionPicker` into `TaskCreateForm`
- [x] 3.2 Add `interactionId` input to `TaskCreateForm` (for when opened from interaction row)
- [x] 3.3 Add InteractionPicker to template, bind to `request.sourceInteractionId`
- [x] 3.4 Add handler for interaction selection that sets `sourceInteractionId`

## 4. Cascading Filter Implementation (ATSE1-37)

- [x] 4.1 Modify `TaskCreateForm` to track both employee and interaction selections
- [x] 4.2 When employee selection changes, pass `subjectId` to InteractionPicker (triggers filtered load)
- [x] 4.3 When interaction is selected, extract subject id and pin EmployeePicker to that employee (read-only)
- [x] 4.4 Add clear button to reset both selections
- [x] 4.5 When cleared, re-enable EmployeePicker and reload all interactions

## 5. Testing

- [x] 5.1 Test EmployeePicker loads all employees on init
- [x] 5.2 Test InteractionPicker loads all interactions on init
- [x] 5.3 Test InteractionPicker filters when subjectId is provided
- [x] 5.4 Test cascading: selecting employee filters interactions
- [x] 5.5 Test cascading: selecting interaction pins employee
- [x] 5.6 Test clear button resets both dropdowns
- [x] 5.7 Test task creation with sourceInteractionId
