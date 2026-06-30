## 1. Update auth-error.interceptor.ts to append reason parameter

- [x] 1.1 Inject the Angular `Router` service into `authErrorInterceptor`
- [x] 1.2 Replace `auth.clearOnUnauthorized()` call with logic that redirects to `/login?reason=session_expired`
- [x] 1.3 Ensure the redirect happens AFTER clearing the token (preserve existing `clearOnUnauthorized()` call)
- [x] 1.4 Verify the interceptor still returns `throwError(() => error)` to propagate the error

## 2. Update login.ts to read reason query parameter

- [x] 2.1 Import `toSignal` from `@angular/core` and `map` from `rxjs`
- [x] 2.2 Create a `reason$` observable from `ActivatedRoute.queryParams` that maps to the `reason` param
- [x] 2.3 Convert `reason$` to a signal using `toSignal()` with an initial value of `null`
- [x] 2.4 Create a computed signal `showSessionExpiredBanner` that returns `true` when `reason() === 'session_expired'`
- [x] 2.5 Create a computed signal `showUnauthorisedBanner` that returns `true` when `reason() === 'unauthorised'`

## 3. Update login.html to render info banners

- [x] 3.1 Add an `@if` block for session-expired banner that displays when `showSessionExpiredBanner()` is true
- [x] 3.2 Use PrimeNG info banner styling with `pi-info-circle` icon and text "Your session has ended — please sign in again."
- [x] 3.3 Add an `@if` block for unauthorised banner with appropriate message
- [x] 3.4 Position banners above the existing error alert (`login__error`)
- [x] 3.5 Add SCSS styling for banner classes (`.login__banner--info`, `.login__banner--warning`)

## 4. Testing and verification

- [x] 4.1 Run `npm run lint` to verify code quality (used `ngc` due to Node.js version; see memory)
- [x] 4.2 Run `npm run build` to ensure AOT compilation succeeds (`ngc -p tsconfig.app.json --noEmit` passed)
- [ ] 4.3 Manually test: expire JWT (or manually clear sessionStorage) and trigger an API call
- [ ] 4.4 Verify redirect URL contains `?reason=session_expired`
- [ ] 4.5 Verify the info banner displays on the login page
- [ ] 4.6 Test direct navigation to `/login?reason=session_expired` shows the banner
- [ ] 4.7 Test navigation to `/login` without reason param shows no banner
