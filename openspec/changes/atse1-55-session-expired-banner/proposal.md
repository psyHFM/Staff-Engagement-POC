## Why

When the JWT expires or becomes invalid, users are redirected to `/login` with no explanation—just a generic "Sign in" prompt. This creates confusion: users don't understand why they were logged out or what happened. This change adds a clear, friendly "session expired" banner to improve the UX during authentication timeouts.

## What Changes

- Users redirected to `/login` due to 401 responses will see an info banner: "Your session has ended — please sign in again."
- The login page reads a `reason` query parameter and displays context-appropriate messages.
- The auth interceptor appends `?reason=session_expired` to the redirect URL on 401.
- Future-proof: other reasons (e.g., `reason=unauthorised`) can show their own banners.

## Capabilities

### New Capabilities
- `session-expired-banner`: Displays a friendly session-expired message on the login page when redirected from an expired JWT.

### Modified Capabilities
- None (no existing spec requirements are changing; this is additive UX behavior).

## Impact

- **Frontend**: `auth.interceptor.ts` (401 handling), `login.html` (banner UI), `login.ts` (query param reading).
- **No backend changes**: The 401 response handling is already in place; this is purely a frontend UX improvement.
- **No API changes**: No new endpoints or DTOs required.
- **Dependencies**: None beyond existing Angular Signals and routing infrastructure.
