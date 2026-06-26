## Context

The `Task` model is currently incomplete, lacking a `title` field that is required for proper task identification and sorting. This inconsistency extends from the database layer through the API to the frontend UI. Simultaneously, a security regression has introduced a 500 Internal Server Error for users with the `ADMIN` role when interacting with task endpoints, and the frontend fails to reflect new tasks immediately after creation.

## Goals / Non-Goals

**Goals:**
- Implement the `title` field throughout the full stack (DB $\rightarrow$ Entity $\rightarrow$ DTO $\rightarrow$ UI).
- Ensure administrative users have full access to task management endpoints.
- Correct the error response for authorization failures to `403 Forbidden`.
- Ensure the task list UI updates instantly upon successful task creation.
- Implement sorting by task title in the UI.

**Non-Goals:**
- Adding complex task categorization or tagging systems beyond the requested `title` field.
- Implementing a full role-based access control (RBAC) overhaul (only fixing the specific admin access issue).

## Decisions

### 1. Database Alignment
- **Decision**: Utilize the existing `title` column added in migration `002-add-task-title.yaml`.
- **Rationale**: The schema already supports the required field; no further migration is needed. Focus remains on correct entity mapping and API validation.

### 2. API Validation
- **Decision**: Add `@NotBlank` and `@Size(max = 120)` annotations to the `title` field in `TaskRequestDto`.
- **Rationale**: Ensures data integrity at the entry point and provides consistent 400 Bad Request responses via standard Spring validation.

### 3. Security Configuration
- **Decision**: Update `SecurityConfig` to explicitly permit `ADMIN` roles or use `.authenticated()` for the target task endpoints.
- **Rationale**: The current 500 error suggests a failure in the security predicate evaluation or a missing role mapping. Ensuring the `ADMIN` role is recognized as a valid authorized entity resolves the issue.

### 4. Frontend State Management
- **Decision**: Modify `TaskStateService` to update the task signal/state array immediately after a successful POST request.
- **Rationale**: Eliminates the need for a full page refresh and improves perceived performance by providing immediate visual feedback.

## Risks / Trade-offs

- **[Risk]** Migration might cause brief downtime on very large tables $\rightarrow$ **Mitigation**: Standard `ALTER TABLE` is fast for adding columns with defaults in modern Postgres versions.
- **[Risk]** Relaxing security predicates might accidentally expose endpoints $\rightarrow$ **Mitigation**: Apply changes specifically to the task-related paths and verify with targeted tests.
