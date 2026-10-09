import { HttpErrorResponse, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

let refreshInFlight: BehaviorSubject<string | null> | null = null;

function isAuthRoute(req: HttpRequest<unknown>): boolean {
  return req.url.includes('/api/auth/');
}

// Attach Bearer to /api/* except auth routes. On 401, refresh once (single-flight)
// then retry; on refresh failure clear storage and route to /login.
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const tokens = inject(TokenStorageService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const send = (request: HttpRequest<unknown>) => next(request);

  if (isAuthRoute(req) || !req.url.includes('/api/')) {
    return send(req);
  }

  const access = tokens.accessToken;
  const authed = access ? req.clone({ setHeaders: { Authorization: `Bearer ${access}` } }) : req;

  return send(authed).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }
      const refreshToken = tokens.refreshToken;
      if (!refreshToken) {
        tokens.clear();
        void router.navigate(['/login']);
        return throwError(() => err);
      }
      if (!refreshInFlight) {
        refreshInFlight = new BehaviorSubject<string | null>(null);
        auth.refresh({ refreshToken }).subscribe({
          next: (res) => {
            tokens.save(res.accessToken, res.refreshToken, res.accessTokenExpiresAtUtc);
            refreshInFlight?.next(res.accessToken);
            refreshInFlight?.complete();
            refreshInFlight = null;
          },
          error: () => {
            tokens.clear();
            refreshInFlight?.error(err);
            refreshInFlight = null;
            void router.navigate(['/login']);
          },
        });
      }
      return refreshInFlight.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap((newToken) =>
          send(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })).pipe(
            catchError((retryErr) => throwError(() => retryErr)),
          ),
        ),
        catchError(() => throwError(() => err)),
      );
    }),
  );
}
