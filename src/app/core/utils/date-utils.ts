// Dates are ISO 8601 UTC over the wire. Display consistently in local time
// via DatePipe; send via toISOString(). DueDate comparisons use UtcNow.Date.

export function toWireDate(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateInputValue(value: string | null | undefined): string | null {
  if (!value) return null;
  // Serialize at END of the local day (23:59:59), not midnight: the backend
  // compares dueDate.Date against DateTime.UtcNow.Date, and local midnight
  // converts to the PREVIOUS UTC day in any UTC+X timezone — which the API
  // rejects with 400 "Due date cannot be in the past." even for today.
  // End-of-day local time always lands on the same (or a later, never an
  // earlier) UTC calendar day, in every timezone from UTC-12 to UTC+14.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59);
  if (
    Number.isNaN(d.getTime()) ||
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  ) {
    return null;
  }
  return d.toISOString();
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}
