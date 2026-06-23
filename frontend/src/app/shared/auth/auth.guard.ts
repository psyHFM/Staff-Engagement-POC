import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthState } from './auth-state';

/**
 * Functional auth gate. Redirects unauthenticated users to `/login`,
 * preserving the intended destination in the `redirectUrl` query param.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthState);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], {
    queryParams: { redirectUrl: state.url }
  });
};