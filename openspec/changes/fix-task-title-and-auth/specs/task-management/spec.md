## MODIFIED Requirements

### Requirement: Create Standalone Task
The system SHALL allow any authenticated user to create a task for any employee without linking it to a source interaction.

#### Scenario: Successful standalone task creation
- **WHEN** a user sends a POST request to `/api/v1/tasks` with a valid `title`, `subject` (EmployeeId), and `description`, but no `sourceInteractionId`
- **THEN** the system creates the task, assigns it to the subject, and returns 201 Created with the Task record

#### Scenario: Creation failure due to invalid subject
- **WHEN** a user sends a POST request to `/api/v1/tasks` with a non-existent `subject` EmployeeId
- **THEN** the system returns 400 Bad Request with a uniform error envelope stating the employee does not exist

### Requirement: Create Task from Interaction
The system SHALL allow any authenticated user to create a task that is linked to a specific interaction.

#### Scenario: Successful linked task creation
- **WHEN** a user sends a POST request to `/api/v1/tasks` with a valid `title`, `subject`, `description`, and a valid `sourceInteractionId`
- **THEN** the system creates the task, links it to the interaction, and returns 201 Created

#### Scenario: Creation failure due to invalid interaction
- **WHEN** a user sends a POST request to `/api/v1/tasks` with a `sourceInteractionId` that does not exist
- **THEN** the system returns 400 Bad Request with an error stating the source interaction was not found

### Requirement: My Tasks View
The system SHALL provide an endpoint for authenticated users to see all tasks that relate to them, regardless of who created the task.

#### Scenario: Successful retrieval of my tasks
- **WHEN** an authenticated user (including those with `ADMIN` role) sends a GET request to `/api/v1/me/tasks`
- **THEN** the system identifies the user's EmployeeId from the security context and returns a paginated list of all tasks where the subject is the current user

## ADDED Requirements

### Requirement: Task Title Constraints
The system SHALL enforce constraints on the `title` field of a task.

#### Scenario: Valid title
- **WHEN** a task is created with a `title` between 1 and 120 characters
- **THEN** the system accepts the title and persists it

#### Scenario: Missing or empty title
- **WHEN** a task is created with a missing or empty `title`
- **THEN** the system returns 400 Bad Request with a validation error for the title field

### Requirement: Administrative Task Access
The system SHALL allow users with the `ADMIN` role to create tasks.

#### Scenario: Admin task creation
- **WHEN** a user with `ADMIN` role sends a POST request to `/api/v1/tasks`
- **THEN** the system allows the request to proceed if the payload is valid, returning 201 Created

#### Scenario: Unauthorized access
- **WHEN** an unauthenticated user or a user without required permissions attempts to access task endpoints
- **THEN** the system returns 403 Forbidden
