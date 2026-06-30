## ADDED Requirements

### Requirement: Header username links to current user's profile
The shell header SHALL render the authenticated username as a focusable link that navigates to the current user's profile page.

#### Scenario: Authenticated user clicks username chip
- **WHEN** an authenticated user clicks the username chip in the shell header
- **THEN** the router navigates to `/employees/:id/profile` for the current user

#### Scenario: Username chip is accessible
- **WHEN** a screen-reader user focuses the username chip
- **THEN** the element has a role of `link` and an `aria-label` that describes opening the current user's profile

#### Scenario: No chip link when anonymous
- **WHEN** the user is not authenticated
- **THEN** the chip is not shown (only the Sign in link is present)
