## MODIFIED Requirements

### Requirement: Portfolio editor components
The system SHALL provide a reusable `portfolio-editor` component (extracted from the former standalone `features/portfolio/portfolio.ts` body) that accepts `@Input() employeeId` and `@Input() readOnly`, and renders the four portfolio sections — skills (skill name, years, project count), education, projects, and links — each able to add, edit, and remove entries through `PortfolioStateService`. The component SHALL NOT contain any "Employee ID" picker; the employee is supplied by its host (the Profile page). When `readOnly` is true the editor SHALL render the sections without add/edit/remove affordances.

#### Scenario: Editor is driven by inputs, not an id picker
- **WHEN** the `portfolio-editor` is mounted on the Profile page
- **THEN** it uses the `employeeId` input for all reads/writes
- **AND** it presents no free-text "Employee ID" input

#### Scenario: Editing a skill updates the portfolio
- **WHEN** the user edits a skill's `years` or `projectCount` and saves
- **THEN** the component calls the state service, which PUTs the entry and the UI reflects the updated value

#### Scenario: Removing an entry updates the UI
- **WHEN** the user removes a project or link
- **THEN** the component calls the state service, which DELETEs the entry and the UI removes it from the computed view

#### Scenario: Read-only mode hides edit affordances
- **WHEN** the editor is mounted with `readOnly` true (profile View mode or a non-owner viewer)
- **THEN** the four sections render without add, edit, or remove controls

## REMOVED Requirements

### Requirement: Lazy-loaded portfolio route
**Reason**: Portfolio editing now lives on the Profile page (`/employees/:id/profile`) behind Edit mode via the reusable `portfolio-editor` component; a standalone portfolio page is redundant and duplicated the identity/portfolio surface.
**Migration**: Remove the `/portfolio` route and `features/portfolio/portfolio.ts` component; redirect any old `/portfolio` links to the current user's own Profile page. `PortfolioStateService` and the portfolio API are unchanged.
