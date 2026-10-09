import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export const MAX_SEARCH_LENGTH = 200;

export function passwordStrengthValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = String(control.value ?? '');
    if (!v) return null;
    const missing: string[] = [];
    if (v.length < 8) missing.push('at least 8 characters');
    if (!/[A-Z]/.test(v)) missing.push('an uppercase letter');
    if (!/[a-z]/.test(v)) missing.push('a lowercase letter');
    if (!/[0-9]/.test(v)) missing.push('a digit');
    if (!/[^a-zA-Z0-9]/.test(v)) missing.push('a non-alphanumeric character');
    return missing.length ? { passwordStrength: { missing } } : null;
  };
}

export function dueDateNotPastValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const v = control.value;
    if (v === null || v === undefined || v === '') return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return { invalidDate: true };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cmp = new Date(d);
    cmp.setHours(0, 0, 0, 0);
    return cmp < today ? { dueDatePast: true } : null;
  };
}

export function hexColorValidator(): ValidatorFn {
  return Validators.pattern(/^#[0-9A-Fa-f]{6}$/);
}

export function searchMaxLengthValidator(max = MAX_SEARCH_LENGTH): ValidatorFn {
  return Validators.maxLength(max);
}

export function fieldErrorMessage(field: string, errors: Record<string, string[]>): string | null {
  // Backend uses PascalCase keys (e.g. "Id", "Email"); match case-insensitively.
  const key = Object.keys(errors).find((k) => k.toLowerCase() === field.toLowerCase());
  return key ? errors[key].join(' ') : null;
}
