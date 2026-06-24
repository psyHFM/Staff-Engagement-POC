import { HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Provider, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthState } from './auth-state';

/**
 * Attaches the in-memory JWT to outgoing API calls as {@code Authorization: Bearer <token>}.
 *
 * <p>Reads the token from {@link AuthState#bearerToken} (Phase 0 global state). The
 * interceptor is registered via the legacy {@link HTTP_INTERCEPTORS} multi-provider so
 * {@code app.config.ts} can stay append-only per the ROADMAP §2.6 shared-files register.
 */
@Injectable()
export class BearerAuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthState);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.bearerToken();
    if (token && !req.headers.has('Authorization')) {
      req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    return next.handle(req);
  }
}

/**
 * Append-only provider for {@code app.config.ts}.
 */
export const bearerAuthInterceptorProvider: Provider = {
  provide: HTTP_INTERCEPTORS,
  useClass: BearerAuthInterceptor,
  multi: true
};
