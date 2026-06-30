# session-expired-banner Specification

## Purpose

Defines the behavior for displaying a friendly session-expired message on the login page when users are redirected due to an expired or invalid JWT. This improves UX by explaining why the redirect occurred.

## ADDED Requirements

### Requirement: Auth interceptor redirects with session-expired reason on 401

When any HTTP request returns a 401 Unauthorized response, the auth error interceptor SHALL redirect the user to `/login?reason=session_expired` and clear the persisted authentication token from sessionStorage.

#### Scenario: 401 response triggers redirect with session-expired reason
- **WHEN** any HTTP request returns a 401 Unauthorized response
- **THEN** the auth error interceptor MUST redirect to `/login?reason=session_expired`
- **AND** the in-memory token signal MUST be cleared
- **AND** the `staff-engagement:token` key MUST be removed from sessionStorage
- **AND** the `staff-engagement:username` key MUST be removed from sessionStorage

#### Scenario: 401 during active navigation shows the banner
- **WHEN** the user is navigating the application and their JWT expires
- **AND** an API call returns 401
- **THEN** the user is redirected to `/login?reason=session_expired`
- **AND** the login page displays the session-expired banner

### Requirement: Login page displays session-expired banner

The login page SHALL read the `reason` query parameter and display an appropriate info banner when `reason=session_expired`.

#### Scenario: session-expired reason shows session-ended message
- **WHEN** the login page is loaded with `?reason=session_expired`
- **THEN** an info banner MUST be displayed above the login form
- **AND** the banner MUST contain the text "Your session has ended — please sign in again."
- **AND** the banner MUST include an info icon (`pi-info-circle`)
- **AND** the banner MUST use the PrimeNG info banner styling

#### Scenario: unauthorised reason shows unauthorised message
- **WHEN** the login page is loaded with `?reason=unauthorised`
- **THEN** an info banner MUST be displayed with an appropriate unauthorised message

#### Scenario: No reason parameter shows no banner
- **WHEN** the login page is loaded without a `reason` query parameter
- **THEN** no info banner MUST be displayed
- **AND** the login form MUST render in its default state

#### Scenario: Unknown reason parameter shows generic message
- **WHEN** the login page is loaded with an unrecognized `reason` value
- **THEN** no banner MUST be displayed (graceful degradation)

### Requirement: Login component uses Signals for reactive banner state

The login component SHALL use Angular Signals to reactively compute banner visibility based on the `reason` query parameter.

#### Scenario: Banner signal updates when query param changes
- **WHEN** the `reason` query parameter changes
- **THEN** the computed banner signal MUST update reactively
- **AND** the banner MUST show/hide without manual DOM manipulation

#### Scenario: Banner clears on navigation away from login
- **WHEN** the user navigates away from `/login` and returns without a `reason` parameter
- **THEN** the banner MUST not be displayed
