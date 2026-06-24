import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptorsFromDi } from '@angular/common/http';

import { routes } from './app.routes';
import { bearerAuthInterceptor } from './shared/auth/bearer-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // withFetch: native fetch, matches the backend's unwrapped camelCase JSON
    // (api-standards.yaml). State is in-memory only — no interceptor persistence.
    // withInterceptorsFromDi: activates DI-based interceptors (the BearerAuthInterceptor
    // registered via HTTP_INTERCEPTORS). Without it, provideHttpClient() does not wire
    // legacy DI interceptors, so authenticated calls would go out with no Authorization
    // header and 401.
    provideHttpClient(withFetch(), withInterceptorsFromDi()),
    bearerAuthInterceptorProvider
  ]
};