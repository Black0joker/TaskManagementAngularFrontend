import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  formatDisplay,
  formatRange,
  isoWeekNumber,
  monthMatrix,
  parseKey,
  toKey,
} from './date-picker.utils';

describe('date-picker utils', () => {
  it('round-trips yyyy-MM-dd keys without UTC shifts', () => {
    const d = new Date(2026, 9, 9, 12); // Oct 9 2026 local
    expect(toKey(d)).toBe('2026-10-09');
    expect(toKey(parseKey('2026-10-09')!)).toBe('2026-10-09');
  });

  it('rejects malformed keys', () => {
    expect(parseKey(null)).toBeNull();
    expect(parseKey('')).toBeNull();
    expect(parseKey('09/10/2026')).toBeNull();
    expect(parseKey('2026-02-30')).toBeNull();
    expect(parseKey('2026-13-01')).toBeNull();
  });

  it('adds days/months across boundaries', () => {
    expect(toKey(addDays(new Date(2026, 0, 31, 12), 1))).toBe('2026-02-01');
    expect(toKey(addMonths(new Date(2026, 0, 31, 12), 1))).toBe('2026-02-28');
    expect(toKey(addMonths(new Date(2026, 10, 15, 12), 2))).toBe('2027-01-15');
  });

  it('builds a Monday-first matrix covering the month', () => {
    const weeks = monthMatrix(2026, 9); // October 2026
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.length).toBeLessThanOrEqual(6);
    const flat = weeks.flat();
    expect(flat.filter((d) => d.inMonth).length).toBe(31);
    // Oct 1 2026 is a Thursday -> first row starts Mon Sep 28.
    expect(weeks[0][0].key).toBe('2026-09-28');
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('computes ISO week numbers', () => {
    // Jan 4 2026 is a Sunday -> ISO week 1 of 2026 runs Mon Dec 29 2025..Sun Jan 4 2026.
    expect(isoWeekNumber(new Date(2026, 0, 4, 12))).toBe(1);
    expect(isoWeekNumber(new Date(2025, 11, 29, 12))).toBe(1);
    expect(isoWeekNumber(new Date(2026, 9, 9, 12))).toBe(41);
  });

  it('formats display strings and ranges', () => {
    expect(formatDisplay('2026-10-09')).toBe('Oct 9, 2026');
    expect(formatDisplay(null)).toBe('');
    expect(formatRange({ from: '2026-10-01', to: '2026-10-09' })).toBe('Oct 1, 2026 – Oct 9, 2026');
    expect(formatRange({ from: null, to: null })).toBe('');
  });
});
