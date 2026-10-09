import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { normalizeError } from '../../../core/models/problem-details';
import { fieldErrorMessage, passwordStrengthValidator } from '../../../core/utils/validators';
import { AppIconComponent } from '../../../shared/ui/icon/app-icon.component';
import { AuthFacade } from '../auth.facade';
import { AuthLayoutComponent } from '../auth-layout/auth-layout.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, AppIconComponent],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly facade = inject(AuthFacade);

  readonly busy = signal(false);
  readonly showPassword = signal(false);
  readonly pwValue = signal('');
  readonly formError = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(100)]],
    lastName: ['', [Validators.required, Validators.maxLength(100)]],
    userName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(256)]],
    password: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator()]],
  });

  readonly pwChecks = computed(() => {
    // NB: reads pwValue (a signal), NOT form.controls.password.value —
    // computed() only re-evaluates on signal reads, so reading the plain
    // FormControl property directly would freeze the checklist.
    const v = this.pwValue() ?? '';
    return [
      { label: '8+ characters', ok: v.length >= 8 },
      { label: 'Uppercase letter', ok: /[A-Z]/.test(v) },
      { label: 'Lowercase letter', ok: /[a-z]/.test(v) },
      { label: 'Digit', ok: /[0-9]/.test(v) },
      { label: 'Symbol', ok: /[^a-zA-Z0-9]/.test(v) },
    ];
  });

  constructor() {
    this.pwValue.set(this.form.controls.password.value ?? '');
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.pwValue.set(v ?? ''));
  }

  submit(): void {
    if (this.form.invalid || this.busy()) return;
    this.busy.set(true);
    this.formError.set(null);
    this.serverErrors.set({});
    this.facade.register(this.form.getRawValue()).subscribe({
      next: () => this.busy.set(false),
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        const n = normalizeError(err.status, err.error);
        if (err.status === 409) {
          this.formError.set('That email is already registered. Try signing in.');
          const emailMsg = fieldErrorMessage('email', n.fieldErrors);
          if (emailMsg) this.serverErrors.set({ email: emailMsg });
        } else {
          const mapped: Record<string, string> = {};
          for (const k of ['firstName', 'lastName', 'userName', 'email', 'password']) {
            const m = fieldErrorMessage(k, n.fieldErrors);
            if (m) mapped[k.toLowerCase()] = m;
          }
          this.serverErrors.set(mapped);
          this.formError.set(n.message);
        }
      },
    });
  }
}
