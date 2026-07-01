## ADDED Requirements

### Requirement: Dashboard landing page replaces the stub
The system SHALL replace the Phase-0 dashboard stub at `/dashboard` with a real landing page consisting of a greeting header ("Good morning, {firstName}" + date) and a responsive card grid (2×2 on desktop, stacked on mobile).

#### Scenario: Greeting header
- **WHEN** an authenticated user opens `/dashboard`
- **THEN** a greeting header shows "Good morning, {firstName}" and the current date
- **AND** the placeholder stub text is no longer shown

### Requirement: Dashboard widget cards
The system SHALL render four dashboard cards: My open tasks (count + next few, each linking to `/tasks`), Recent interactions (latest few about/by the user with type badge, name, snippet, date), Top skills (most common skills across the org with holder count, linking to `/skills`), and Quick actions ("Log interaction", "New task", "Edit my portfolio" deep-linking to the user's Profile in edit mode). Each data-driven card SHALL show loading, empty, and error+retry states.

#### Scenario: Open tasks card
- **WHEN** the dashboard loads
- **THEN** the "My open tasks" card shows a count and the next few tasks, each linking to `/tasks`

#### Scenario: Quick action deep-links
- **WHEN** the user clicks "Edit my portfolio" in Quick actions
- **THEN** they are taken to their own Profile page in edit mode

#### Scenario: Card states
- **WHEN** a dashboard data card is loading, empty, or errored
- **THEN** it shows the standard loading, empty, or error+retry state respectively
