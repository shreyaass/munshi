/**
 * Dates are local calendar dates as `YYYY-MM-DD` strings, never Date objects
 * crossing a timezone boundary. This is the only way to stop an IST phone and a
 * UTC sheet from disagreeing about which day an expense belongs to.
 */

export function todayISO(now = new Date()): string {
  return toISODate(now);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** `2026-11-16` -> `2026-11` */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(now = new Date()): string {
  return monthKey(todayISO(now));
}

export function monthLabel(month: string, locale = 'en-IN'): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m ?? 1) - 1, 1);
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m ?? 1, 0).getDate();
}

export function daysLeftInMonth(month: string, now = new Date()): number {
  const total = daysInMonth(month);
  if (monthKey(todayISO(now)) !== month) return total;
  return Math.max(1, total - now.getDate() + 1);
}

/** Timestamp for `updated_at` / `created_at`: ISO 8601 UTC. */
export function nowISO(): string {
  return new Date().toISOString();
}

export function isISO8601Date(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromISODate(value).getTime());
}
