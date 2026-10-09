import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { TokenStorageService } from '../services/token-storage.service';
import { UsersService } from '../services/users.service';

// Checks stored token + GET /users/me; populates AuthStore. Else /login?returnUrl=.
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
  return users.me().pipe(
    map((me) => {
      store.setUser(me);
      return true;
    }),
    catchError(() => of(router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }))),
  );
};

export const guestGuard: CanActivateFn = () => {
  const tokens = inject(TokenStorageService);
  const router = inject(Router);
  return tokens.accessToken ? router.createUrlTree(['/projects']) : true;
};
