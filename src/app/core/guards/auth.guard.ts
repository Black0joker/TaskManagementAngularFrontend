import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { TokenStorageService } from '../services/token-storage.service';
import { UsersService } from '../services/users.service';

// Checks stored token + GET /users/me (single-flight); populates AuthStore.
// A dead/erroring backend (status 0/5xx) is NOT bad credentials: redirect
// with ?reason=offline so the login page shows a banner instead of
// bouncing back here forever (each bounce would fire another /users/me).
export const authGuard: CanActivateFn = (route, state) => {
  const tokens = inject(TokenStorageService);
  const users = inject(UsersService);
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!tokens.accessToken) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  if (store.user()) {
    return true;
  }
  return users.meShared().pipe(
    map((me) => {
      store.setUser(me);
      return true;
    }),
    catchError((err: unknown) => {
      const status = err instanceof HttpErrorResponse ? err.status : 0;
      const queryParams: Record<string, string> = { returnUrl: state.url };
      if (status === 0 || status >= 500) {
        queryParams['reason'] = 'offline';
      }
      return of(router.createUrlTree(['/login'], { queryParams }));
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const tokens = inject(TokenStorageService);
  const store = inject(AuthStore);
  const router = inject(Router);
  // Only bounce with a PROVEN session. A stale token alone must render the
  // login page — otherwise authGuard ⇄ guestGuard ping-pong forever, firing
  // GET /users/me on every cycle whenever the API is unreachable.
  if (tokens.accessToken && store.user()) {
    return router.createUrlTree(['/projects']);
  }
  return true;
};
