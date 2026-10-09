// Local-date helpers for the date picker. All keys are `yyyy-MM-dd` built
// from LOCAL parts (never toISOString) to avoid UTC day-shifts.

export interface DateRange {
  from: string | null;
  to: string | null;
}

export interface CalendarDay {
  /** Local Date at noon (avoids DST edge cases). */
  date: Date;
  key: string;
  inMonth: boolean;
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string | null | undefined): Date | null {
  if (!key) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return Number.isNaN(d.getTime()) ||
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
    ? null
    : d;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function addMonths(d: Date, n: number): Date {
  const c = new Date(d.getFullYear(), d.getMonth() + n, 1, 12);
  const last = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate();
  c.setDate(Math.min(d.getDate(), last));
  return c;
}

export function todayKey(): string {
  return toKey(new Date());
}

/** Monday-first month matrix (6 rows max), padded with adjacent-month days. */
export function monthMatrix(year: number, month: number): CalendarDay[][] {
  const first = new Date(year, month, 1, 12);
  // Monday-first offset: Sun(0)->6, Mon(1)->0, ...
  const lead = (first.getDay() + 6) % 7;
  const start = addDays(first, -lead);
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(start, w * 7 + i);
      row.push({
        date,
        key: toKey(date),
        inMonth: date.getMonth() === month,
      });
    }
    weeks.push(row);
    // Stop early when the month is fully rendered + next row starts a new month.
    if (w > 0 && row.every((d) => !d.inMonth) && weeks[w - 1].every((d) => !d.inMonth)) break;
  }
  // Always render at least 4 rows; drop trailing all-next-month rows beyond 4.
  while (weeks.length > 4 && weeks[weeks.length - 1].every((d) => !d.inMonth)) weeks.pop();
  return weeks;
}

/** ISO-8601 week number (Monday-first). */
export function isoWeekNumber(d: Date): number {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const day = (t.getDay() + 6) % 7; // Mon=0..Sun=6
  t.setDate(t.getDate() - day + 3); // Thursday of this week
  const jan4 = new Date(t.getFullYear(), 0, 4, 12);
  const janDay = (jan4.getDay() + 6) % 7;
  jan4.setDate(jan4.getDate() - janDay + 3);
  return 1 + Math.round((t.getTime() - jan4.getTime()) / (7 * 86400000));
}

export function formatDisplay(key: string | null | undefined): string {
  const d = parseKey(key);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatRange(r: DateRange): string {
  if (r.from && r.to) return `${formatDisplay(r.from)} – ${formatDisplay(r.to)}`;
  if (r.from) return `From ${formatDisplay(r.from)}`;
  if (r.to) return `Until ${formatDisplay(r.to)}`;
  return '';
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const WEEKDAY_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
