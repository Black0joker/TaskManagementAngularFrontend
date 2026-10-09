import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, switchMap, tap, throwError } from 'rxjs';
import type { LoginCommand, RegisterCommand } from '../../core/models/api-requests';
import { AuthService } from '../../core/services/auth.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { ToastService } from '../../core/services/toast.service';
import { UsersService } from '../../core/services/users.service';
import { AuthStore } from '../../core/stores/auth.store';

/** Orchestrates login/register/refresh/logout + AuthStore population. */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly auth = inject(AuthService);
  private readonly users = inject(UsersService);
  private readonly tokens = inject(TokenStorageService);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  login(body: LoginCommand, returnUrl = '/projects'): Observable<void> {
    return this.auth.login(body).pipe(
      tap((res) => this.tokens.save(res.accessToken, res.refreshToken, res.accessTokenExpiresAtUtc)),
      switchMap(() => this.users.me()),
      tap((me) => {
        this.store.setUser(me);
        void this.router.navigateByUrl(returnUrl);
      }),
      map(() => undefined),
      catchError((err) => {
        if (err?.status === 429) {
          this.toast.error('Too many login attempts. Try again in a minute.');
        }
        return throwError(() => err);
      }),
    );
  }

  register(body: RegisterCommand): Observable<void> {
    return this.auth.register(body).pipe(
      switchMap(() => this.login({ email: body.email, password: body.password })),
      map(() => undefined),
    );
  }

  logout(): void {
    const refreshToken = this.tokens.refreshToken;
    const done = () => {
      this.tokens.clear();
      this.store.clear();
      void this.router.navigate(['/login']);
    };
    if (!refreshToken) {
      done();
      return;
    }
    this.auth.logout({ refreshToken }).subscribe({ next: done, error: done });
  }
}
