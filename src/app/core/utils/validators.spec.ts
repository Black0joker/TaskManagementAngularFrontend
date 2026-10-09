import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import {
  dueDateNotPastValidator,
  hexColorValidator,
  passwordStrengthValidator,
} from './validators';

describe('backend-mirroring validators', () => {
  it('rejects weak passwords (min 8 + upper/lower/digit/symbol)', () => {
    const v = passwordStrengthValidator();
    expect(v(new FormControl('short1!'))).toBeTruthy();
    expect(v(new FormControl('alllowercase1!'))).toBeTruthy();
    expect(v(new FormControl('ALLUPPERCASE1!'))).toBeTruthy();
    expect(v(new FormControl('NoDigits!x'))).toBeTruthy();
    expect(v(new FormControl('NoSymbol1x'))).toBeTruthy();
    expect(v(new FormControl('Valid1!Pass'))).toBeNull();
  });

  it('rejects past due dates, allows today/future/null', () => {
    const v = dueDateNotPastValidator();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(v(new FormControl(yesterday.toISOString()))).toEqual({ dueDatePast: true });
    expect(v(new FormControl(new Date().toISOString()))).toBeNull();
    expect(v(new FormControl(null))).toBeNull();
  });

  it('enforces #RRGGBB label colors', () => {
    const v = hexColorValidator();
    expect(v(new FormControl('#4F46E5'))).toBeNull();
    expect(v(new FormControl('red'))).toBeTruthy();
    expect(v(new FormControl('#FFF'))).toBeTruthy();
  });
});
