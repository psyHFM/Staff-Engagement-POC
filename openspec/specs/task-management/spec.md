# task-management Specification

## Purpose
TBD - created by archiving change phase-3-task. Update Purpose after archive.
## Requirements
### Requirement: Create Standalone Task
The system SHALL allow any authenticated user to create a task for any employee without linking it to a source interaction.

#### Scenario: Successful standalone task creation
- **WHEN** a user sends a POST request to `/api/v1/tasks` with a valid `subject` (EmployeeId) and `description`, but no `sourceInteractionId`
- **THEN** the system creates the task, assigns it to the subject, and returns 201 Created with the Task record

#### Scenario: Creation failure due to invalid subject
- **WHEN** a user sends a POST request to `/api/v1/tasks` with a non-existent `subject` EmployeeId
- **THEN** the system returns 400 Bad Request with a uniform error envelope stating the employee does not exist

### Requirement: Create Task from Interaction
The system SHALL allow any authenticated user to create a task that is linked to a specific interaction.

#### Scenario: Successful linked task creation
- **WHEN** a user sends a POST request to `/api/v1/tasks` with a valid `subject`, `description`, and a valid `sourceInteractionId`
- **THEN** the system creates the task, links it to the interaction, and returns 201 Created

#### Scenario: Creation failure due to invalid interaction
- **WHEN** a user sends a POST request to `/api/v1/tasks` with a `sourceInteractionId` that does not exist
- **THEN** the system returns 400 Bad Request with an error stating the source interaction was not found

### Requirement: List Tasks for Employee
The system SHALL allow users to retrieve all tasks associated with a specific employee.

#### Scenario: Successful retrieval of employee tasks
- **WHEN** a user sends a GET request to `/api/v1/employees/{id}/tasks` with a valid employee ID
- **THEN** the system returns a paginated list of all tasks where the subject is that employee

#### Scenario: Employee not found
- **WHEN** a user sends a GET request to `/api/v1/employees/{id}/tasks` for a non-existent employee ID
- **THEN** the system returns 404 Not Found

### Requirement: My Tasks View
The system SHALL provide an endpoint for authenticated users to see all tasks that relate to them, regardless of who created the task.

#### Scenario: Successful retrieval of my tasks
- **WHEN** an authenticated user sends a GET request to `/api/v1/me/tasks`
- **THEN** the system identifies the user's EmployeeId from the security context and returns a paginated list of all tasks where the subject is the current user

### Requirement: Complete Task
The system SHALL allow users to mark a task as completed.

#### Scenario: Successful task completion
- **WHEN** a user sends a PUT/PATCH request to update a task's `completed` status to `true`
- **THEN** the system updates the task record and returns 200 OK

