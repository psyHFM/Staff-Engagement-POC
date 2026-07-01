## ADDED Requirements

### Requirement: Profile view mode
The system SHALL render `/employees/:id/profile` in View mode by default, showing an identity header (64px avatar, name, job title, role + level badges), a meta grid, Top skills chips, Interactions (type badge + note + date), Tasks (read-only), and a read-only Portfolio (Skills / Education / Projects / Links). On load the page SHALL also load the person's portfolio so view and edit share one signal.

#### Scenario: Default is view mode
- **WHEN** any authenticated user opens `/employees/:id/profile`
- **THEN** the page renders in View mode with the identity header, top skills, interactions, tasks, and a read-only portfolio
- **AND** no editable identity form or portfolio editor is mounted

#### Scenario: Portfolio loaded for view
- **WHEN** the profile page loads for employee `:id`
- **THEN** `PortfolioStateService.loadPortfolio(id)` is invoked and the portfolio sections are rendered read-only

### Requirement: Profile edit mode gated to owner or admin
The system SHALL show an "Edit profile" button only when the current user can edit the profile (owner or admin). Entering Edit mode SHALL reveal the identity edit form and the inline portfolio editor; a "Done" button SHALL return to View mode. Non-owner/non-admin users SHALL never see the Edit affordance, and the portfolio editor SHALL never mount for them, with RBAC `isReadOnly()` remaining as a backstop.

#### Scenario: Owner sees Edit
- **WHEN** the profile belongs to the current user (or the current user is admin)
- **THEN** an "Edit profile" button is shown

#### Scenario: Non-owner cannot edit
- **WHEN** a non-owner, non-admin user views another person's profile
- **THEN** no "Edit profile" button is shown
- **AND** the portfolio editor component is not mounted

#### Scenario: Entering and leaving edit mode
- **WHEN** an eligible user clicks "Edit profile"
- **THEN** the identity edit form and the inline portfolio editor appear
- **AND** clicking "Done" returns the page to View mode

### Requirement: Edit form gated on editing signal
The system SHALL gate the identity edit form on both edit-eligibility and an explicit editing state (`editMode` signal), so the form is shown only when the user can edit AND edit mode is active — not whenever the user merely can edit.

#### Scenario: Edit form hidden until edit mode
- **WHEN** an eligible user is in View mode
- **THEN** the identity edit form is not rendered even though the user can edit

### Requirement: Profile is the single self-service destination
The system SHALL make the Profile page the single self-service destination for the current user: navigating to the self-service Your-details entry point SHALL resolve to the current user's own Profile page (from the JWT subject), where identity editing happens in Edit mode.

#### Scenario: Self-service resolves to own profile
- **WHEN** the current user triggers the self-service "Your details" navigation
- **THEN** they land on their own Profile page resolved from the JWT subject
- **AND** they can enter Edit mode to change their identity fields

### Requirement: Capitalized labels and badge spacing on profile
The system SHALL render role and level via capitalized display-label lookups on the profile, and SHALL keep spacing between an interaction's type badge and its note text.

#### Scenario: Labels are human-readable
- **WHEN** the identity header and interactions render
- **THEN** role/level show capitalized labels and each interaction badge has spacing before its note
