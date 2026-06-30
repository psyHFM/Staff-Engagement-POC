## Context

The current authentication flow redirects users to `/login` when a 401 response is received, but provides no explanation for why the redirect occurred. This happens when:
- The JWT has expired (15-minute timeout typical)
- The JWT is malformed or invalid
- The user's session was cleared server-side

Users report confusion: "Did something break? Was I logged out? What happened?"

The existing infrastructure includes:
- `auth.interceptor.ts` - intercepts HTTP responses and handles 401s
- `AuthState` service - manages authentication state with Signals
- `login.html` / `login.ts` - login page with form UI
- `sessionStorage` persistence for JWT (per `auth-session` spec)

## Goals / Non-Goals

**Goals:**
- Display a clear, friendly message when users are redirected due to session expiration
- Support multiple redirect reasons (session-expired, unauthorised, etc.) via query parameters
- Maintain existing 401 clearing behavior (token cleared from sessionStorage)
- Use Angular Signals for reactive banner state
- Keep changes localized to three files: interceptor, login component, login template

**Non-Goals:**
- No backend changes required
- No changes to JWT token lifecycle or expiration logic
- No new API endpoints or DTOs
- No changes to the auth guard or route protection logic
- No visual redesign of the login page (banner uses existing PrimeNG/PrimeIcons styling)

## Decisions

### D1: Query parameter approach for reason passing

**Decision:** Pass the reason via URL query parameter (`?reason=session_expired`) rather than:
- ~~LocalStorage/sessionStorage flag~~ (creates stale state issues)
- ~~Navigation state object~~ (lost on direct navigation/refresh)
- ~~AuthState signal~~ (cleared before redirect completes)

**Rationale:**
- URL survives page refresh and direct navigation
- Query params are standard Angular routing practice (`ActivatedRoute.queryParams`)
- No cleanup needed—URL is the source of truth
- Bookmarkable/debuggable (can see reason in browser URL bar)

### D2: Interceptor responsibility

**Decision:** The `authErrorInterceptor` handles 401s and appends the reason to the redirect URL.

**Rationale:**
- Already responsible for 401 handling and calling `AuthState.clearOnUnauthorized()`
- Single place to modify—no need to touch guards or other auth code paths
- Consistent with existing pattern: interceptor → redirect → login

### D3: Banner UI component

**Decision:** Use a PrimeNG-style info banner with `pi-info-circle` icon, positioned above the login form.

**Rationale:**
- Consistent with existing PrimeIcons usage in the app
- Info banner is the standard pattern for non-blocking notifications
- Does not interfere with form validation error display

### D4: Signal-based banner state

**Decision:** Login component uses a computed signal to derive banner visibility from the `reason` query param.

**Rationale:**
- Aligns with `frontend-state.yaml` requirement for Signals-based state
- `toSignal()` on `ActivatedRoute.queryParams` provides reactive updates
- Computed signal ensures banner auto-hides when reason changes (e.g., user navigates away and back)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| URL query params visible to users (might look like a hack) | Acceptable trade-off: params are user-visible by design, and this is standard Angular practice |
| Future reasons might need different messaging | Extensible design: `REASON_MESSAGES` map can grow; default case handles unknown reasons gracefully |
| Interceptor might redirect mid-request while user is actively working | Existing behavior unchanged—401 already clears session; banner just explains what happened |
| SSR/hydration mismatch if query params read differently on server vs client | Not applicable—POC is client-side only; `try/catch` around sessionStorage already handles SSR edge cases |

## Migration Plan

1. **Branch**: `feature/ATSE1-55-session-expired-banner` (already created off `main`)
2. **Implement in order**:
   - Update `auth.interceptor.ts` to append `?reason=session_expired` on 401 redirect
   - Update `login.ts` to read `reason` query param and compute banner signal
   - Update `login.html` to render banner conditionally
3. **Test manually**:
   - Expire JWT (wait 15 min or manually invalidate)
   - Trigger any API call → verify redirect shows banner
   - Test other reasons (e.g., `?reason=unauthorised`) show appropriate messages
4. **No database migration required**
5. **Rollback**: Revert three file changes; no data migration needed

## Open Questions

- None at this time. The change is well-scoped and uses existing infrastructure.
