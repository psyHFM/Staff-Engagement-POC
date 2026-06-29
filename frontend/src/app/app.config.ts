import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { bearerAuthInterceptor } from './shared/auth/bearer-auth.interceptor';
import { authErrorInterceptor } from './shared/auth/auth-error.interceptor';
import { AUTH_STORAGE, browserAuthStorage } from './shared/auth/auth-storage';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // withFetch: native fetch, matches the backend's unwrapped camelCase JSON
    // (api-standards.yaml). The auth-token carve-out (frontend-state.yaml ->
    // persistence.carve_outs) lives in AuthState + AuthStorage, not here.
    { provide: AUTH_STORAGE, useValue: browserAuthStorage },
    provideHttpClient(
      withFetch(),
      // Order matters: bearer attaches the Authorization header; authError
      // then clears the persisted token on a 401 response.
      withInterceptors([bearerAuthInterceptor, authErrorInterceptor])
    )
  ]
};