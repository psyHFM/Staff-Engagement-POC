# Constitution Guard Review: enable-task-interaction-subtask-ui

Self-audit of the implementation against `.claude/constitution/*.yaml`.

## Compliant ✅

- **Tech Stack**: Java 21 + Spring Boot backend, Angular 22 + Signals frontend. No new dependencies added.
- **API Standards**: Task endpoints remain under `/api/v1`; URLs are kebab-case; JSON request/response fields use camelCase; `TaskUpdateRequest` fields are `title`, `description`, `completed`.
- **Error Envelope**: Blank title validation throws `IllegalArgumentException`, mapped by the frozen `GlobalExceptionHandler` to the uniform `ErrorEnvelope`.
- **Backend Architecture**: Controller → Service → Repository flow preserved; no cross-module imports; controller only touches `TaskService`, `TaskRepository`, and frozen `shared/api` contracts.
- **Frontend State**: Task expansion, edit mode, and sub-task edit mode use component-level `signal()`; all global state mutations go through `TaskStateService` methods.
- **Testing Strategy**: BDD-style Given-When-Then tests added for `TaskServiceTest`, `TaskControllerTest`, `task.spec.ts`, and `task-state.service.spec.ts`. No integration tests introduced.

## Warnings ⚠️

- **Backend tests cannot run due to pre-existing compiler issue**: Maven rejects Java `record` and `switch` expressions across the whole backend, suggesting the effective compiler source/target is below 17 despite `pom.xml` declaring `<java.version>21`. This is pre-existing and unrelated to this change.
- **Empty-title UX**: The task edit form disables the save button rather than showing a visible validation message. Compliant but less accessible.

## Violations ❌

None identified for this change.
