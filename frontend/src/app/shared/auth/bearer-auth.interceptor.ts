import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthState } from './auth-state';

/**
 * Functional interceptor that attaches the in-memory JWT to outgoing API calls
 * as {@code Authorization: Bearer <token>}.
 *
 * <p>Reads the token from {@link AuthState#bearerToken} (Phase 0 global state).
 * Registered with Angular's {@code withInterceptors([bearerAuthInterceptor])}
 * in {@code app.config.ts} so it works with the {@code withFetch()} backend.
 */
export const bearerAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthState).bearerToken();
  if (token && !req.headers.has('Authorization')) {
    const cloned: HttpRequest<unknown> = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }
  return next(req);
};
