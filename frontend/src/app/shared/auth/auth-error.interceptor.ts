import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthState } from './auth-state';
import { ToastService } from '../toast/toast.service';

/**
 * Functional error interceptor that maps HTTP error codes to user-friendly
 * toasts and handles 401 Unauthorized by clearing the persisted JWT and
 * redirecting to the login page.
 *
 * <p>Error code mapping (ATSE1-63):
 * <ul>
 *   <li>401 → Clear session, redirect to /login?reason=session_expired</li>
 *   <li>403 → Red toast: "You don't have permission to do that."</li>
 *   <li>404 → Warning toast: "We couldn't find that record."</li>
 *   <li>5xx → Red toast: "Something went wrong. Try again or contact support."</li>
 * </ul>
 *
 * <p>Registered alongside {@link bearerAuthInterceptor} in
 * {@code app.config.ts}; Angular runs interceptors in registration order,
 * so this one fires only on the response path of an already-attached Bearer
 * request.
 *
 * <p>The error is re-thrown after showing the toast so components can still
 * handle errors locally (e.g., profile page navigation on 404).
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthState);
  const router = inject(Router);
  const toast = inject(ToastService);

  return next(req).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse) {
        switch (error.status) {
          case 401:
            auth.clearOnUnauthorized();
            void router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
            break;
          case 403:
            toast.show('You don\'t have permission to do that.', { type: 'error' });
            break;
          case 404:
            toast.show('We couldn\'t find that record.', { type: 'warning' });
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            toast.show('Something went wrong. Try again or contact support.', { type: 'error' });
            break;
          default:
            // Fall through - let component handle other errors
            break;
        }
      }
      return throwError(() => error);
    })
  );
};
