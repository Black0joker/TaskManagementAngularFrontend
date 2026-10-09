import { describe, expect, it } from 'vitest';
import { fromDateInputValue, toDateInputValue } from './date-utils';

describe('fromDateInputValue (due-date wire format)', () => {
  it('returns null for empty/invalid input', () => {
    expect(fromDateInputValue(null)).toBeNull();
    expect(fromDateInputValue('')).toBeNull();
    expect(fromDateInputValue('not-a-date')).toBeNull();
    expect(fromDateInputValue('2026-02-30')).toBeNull();
  });

  it('preserves the picked local calendar day', () => {
    const iso = fromDateInputValue('2026-10-09')!;
    const back = new Date(iso);
    // Local parts must round-trip regardless of machine timezone.
    expect(`${back.getFullYear()}-${back.getMonth()}-${back.getDate()}`).toBe('2026-9-9');
    expect(toDateInputValue(iso)).toBe('2026-10-09');
  });

  it('never serializes to an earlier UTC calendar day (backend compares UtcNow.Date)', () => {
    // Regression: local-midnight serialization turned "today" into yesterday
    // in UTC+X zones, and the API rejected it with 400 "Due date cannot be
    // in the past." End-of-day local time must land on the same or a later
    // UTC day in every timezone.
    for (const key of ['2026-01-01', '2026-06-15', '2026-10-09', '2026-12-31']) {
      const utcDay = fromDateInputValue(key)!.slice(0, 10);
      expect(utcDay >= key).toBe(true);
    }
  });
});
