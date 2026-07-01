## MODIFIED Requirements

### Requirement: Complete Task

The system SHALL allow users to update a task, including its
`completed` status, `title`, and `description`.

#### Scenario: Successful task completion

- **WHEN** a user sends a PUT/PATCH request to update a task's
  `completed` status to `true`
- **THEN** the system updates the task record and returns 200 OK

#### Scenario: Successful task title and description update

- **WHEN** a user sends a request to update a task's `title` and/or
  `description`
- **THEN** the system validates that `title` is non-empty
- **AND** the system persists the supplied fields
- **AND** the system returns 200 OK with the updated `TaskSummary`

#### Scenario: Update failure due to missing title

- **WHEN** a user sends a request to update a task with a blank or
  null `title`
- **THEN** the system returns 400 Bad Request with a uniform error
  envelope stating that `title` is required
