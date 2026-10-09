import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { normalizeError } from '../../../core/models/problem-details';
import { fieldErrorMessage } from '../../../core/utils/validators';
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

  readonly busy = signal(false);
  readonly showPassword = signal(false);
  readonly formError = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

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
