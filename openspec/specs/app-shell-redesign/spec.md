# app-shell-redesign Specification

## Purpose
TBD - created by syncing change frontend-redesign. Update Purpose after archive.

## Requirements

### Requirement: Light top-bar shell
The system SHALL render a light, sticky top bar using `--surface` background, a `1px --border` bottom, and `--shadow-sm`. The brand SHALL be an accent-soft icon chip plus wordmark. The main content region SHALL be centered at ~1120px max-width with 24px padding on every route.

#### Scenario: Top bar styling
- **WHEN** any authenticated route renders
- **THEN** the top bar is `--surface`, sticky, with a `1px --border` bottom and `--shadow-sm`
- **AND** the main content is centered at ~1120px with 24px padding

### Requirement: Primary navigation with active state
The system SHALL present primary nav items Dashboard, Employees, Interactions, Tasks, and Skills. The active item SHALL be styled as `--accent` text on an `--accent-soft` pill. The Portfolio nav item SHALL NOT appear (portfolio editing lives on the Profile page).

#### Scenario: Active nav is highlighted
- **WHEN** the user is on `/interactions`
- **THEN** the Interactions nav item shows the `--accent` text on `--accent-soft` pill styling

#### Scenario: No Portfolio nav item
- **WHEN** the nav renders
- **THEN** there is no "Portfolio" nav entry

### Requirement: Avatar user menu
The system SHALL show an avatar chip (initials + name + chevron) that opens a dropdown (`--radius-sm`, `--shadow-md`) containing "Your details", "Profile", and "Sign out". The username chip SHALL navigate to the current user's own Profile without requiring an id.

#### Scenario: User menu opens
- **WHEN** the user clicks the avatar chip
- **THEN** a dropdown appears with "Your details", "Profile", and "Sign out"

#### Scenario: Username navigates to own profile
- **WHEN** the user clicks the username chip
- **THEN** the app navigates to the current user's own Profile page (resolved from the JWT subject, no id typed)

### Requirement: Logged-out nav hidden
The system SHALL hide the primary nav links on `/login` so unauthenticated users are not shown links that bounce back to login.

#### Scenario: Login hides nav
- **WHEN** an unauthenticated user is on `/login`
- **THEN** the primary nav links are not rendered

### Requirement: Responsive shell
The system SHALL collapse the nav into a menu button below ~768px and render content in a single column.

#### Scenario: Narrow viewport collapses nav
- **WHEN** the viewport width is below ~768px
- **THEN** the nav collapses into a menu button and content is single-column
