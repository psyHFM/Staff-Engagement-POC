import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthState } from './auth-state';

/**
 * Functional error interceptor that wipes the persisted JWT when the backend
 * rejects a request with {@code 401 Unauthorized}.
 *
 * <p>Without this, a stale token in {@code localStorage} would keep
 * {@link AuthState#isAuthenticated} returning {@code true} long after the
 * server stopped honouring the JWT — the auth guard would never fire and
 * protected pages would render behind a token the API rejects. Clearing on
 * 401 makes the next navigation fall back to {@code /login} via
 * {@link authGuard}.
 *
 * <p>Registered alongside {@link bearerAuthInterceptor} in
 * {@code app.config.ts}; Angular runs interceptors in registration order,
 * so this one fires only on the response path of an already-attached Bearer
 * request.
 *
 * <p>403 (forbidden) is intentionally left alone: the user IS
 * authenticated, they just can't do that thing.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthState);
  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        auth.clearOnUnauthorized();
      }
      return throwError(() => error);
    })
  );
};
