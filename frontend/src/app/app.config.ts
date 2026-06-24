import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { bearerAuthInterceptor } from './shared/auth/bearer-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // withFetch: native fetch, matches the backend's unwrapped camelCase JSON
    // (api-standards.yaml). State is in-memory only — no interceptor persistence.
    provideHttpClient(withFetch(), withInterceptors([bearerAuthInterceptor]))
  ]
};