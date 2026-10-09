import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { normalizeError } from '../../../core/models/problem-details';
import { fieldErrorMessage } from '../../../core/utils/validators';
import { TokenStorageService } from '../../../core/services/token-storage.service';
import { UsersService } from '../../../core/services/users.service';
import { AuthStore } from '../../../core/stores/auth.store';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';
import { AuthFacade } from '../auth.facade';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, AppIconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tokens = inject(TokenStorageService);
  private readonly users = inject(UsersService);
  private readonly store = inject(AuthStore);

  readonly busy = signal(false);
  readonly showPassword = signal(false);
  readonly formError = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});
  readonly offline = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    if (this.route.snapshot.queryParamMap.get('reason') === 'offline') {
      // Landed here because the API is unreachable — show the banner,
      // do NOT fire another request on init (that restarts the storm).
      this.offline.set(true);
      return;
    }
    // Stale token but no proven session (e.g. fresh reload on /login):
    // attempt exactly ONE restore; on failure stay on the form.
    if (this.tokens.accessToken && !this.store.user()) {
      this.users.meShared().subscribe({
        next: (me) => {
          this.store.setUser(me);
          void this.router.navigateByUrl(this.safeReturnUrl());
        },
        error: (err: HttpErrorResponse) => {
          if (err?.status === 401 || err?.status === 403) {
            this.tokens.clear(); // stale credentials, stay on the form
          } else {
            this.offline.set(true);
          }
        },
      });
    }
  }

  private safeReturnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/projects';
    return url.startsWith('/login') ? '/projects' : url;
  }

  retry(): void {
    // User-initiated: re-enter via the guard, which fires a single /users/me.
    this.offline.set(false);
    void this.router.navigateByUrl(this.safeReturnUrl());
  }

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.formError.set(null);
    this.serverErrors.set({});
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/projects';
    this.facade.login(this.form.getRawValue(), returnUrl).subscribe({
      next: () => this.busy.set(false),
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        const n = normalizeError(err.status, err.error);
        if (err.status === 401) {
          this.formError.set('Invalid email or password.');
        } else if (err.status === 429) {
          this.formError.set('Too many attempts. Try again in a minute.');
        } else if (Object.keys(n.fieldErrors).length) {
          const mapped: Record<string, string> = {};
          for (const k of ['email', 'password']) {
            const m = fieldErrorMessage(k, n.fieldErrors);
            if (m) mapped[k] = m;
          }
          this.serverErrors.set(mapped);
          this.formError.set(n.message);
        } else {
          this.formError.set(n.message);
        }
      },
    });
  }
}
