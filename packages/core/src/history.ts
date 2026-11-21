/**
 * History filters, kept platform-free so the range math can be tested without a
 * browser. Dates are `YYYY-MM-DD` strings and compare correctly as strings.
 */

import { currentMonthKey, daysInMonth, monthKey, toISODate, todayISO } from './date.js';

export type DateRangePreset = 'month' | 'last-month' | 'last-30' | 'year' | 'all' | 'custom';

export interface DateRangeInput {
  /** `YYYY-MM`, used by the `month` preset. Defaults to the current month. */
  month?: string;
  /** `YYYY-MM-DD`, used by `custom`. */
  from?: string;
  /** `YYYY-MM-DD`, used by `custom`. */
  to?: string;
}

export interface DateRange {
  /** `''` means unbounded. */
  from: string;
  /** `''` means unbounded. */
  to: string;
}

export type AmountOp = 'any' | 'gt' | 'eq' | 'lt';

const pad2 = (n: number) => String(n).padStart(2, '0');
const isMonth = (value: string | undefined): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
const isDate = (value: string | undefined): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Inclusive first and last day of a `YYYY-MM` key. */
export function monthBounds(month: string): DateRange {
  return { from: `${month}-01`, to: `${month}-${pad2(daysInMonth(month))}` };
}

/**
 * Turn a preset into an inclusive date window.
 *
 * `month` covers the whole calendar month (future days included), `last-month`
 * steps back one calendar month, `last-30` is today plus the previous 29 days,
 * and `year` is the whole calendar year. Custom bounds may be one-sided, and
 * are swapped when they arrive reversed.
 */
export function resolveDateRange(
  preset: DateRangePreset,
  input: DateRangeInput = {},
  now = new Date(),
): DateRange {
  switch (preset) {
    case 'month':
      return monthBounds(isMonth(input.month) ? input.month : currentMonthKey(now));

    case 'last-month': {
      const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12);
      return monthBounds(monthKey(toISODate(previous)));
    }

    case 'last-30': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 12);
      return { from: toISODate(start), to: todayISO(now) };
    }

    case 'year': {
      const year = now.getFullYear();
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }

    case 'all':
      return { from: '', to: '' };

    case 'custom': {
      const from = isDate(input.from) ? input.from : '';
      const to = isDate(input.to) ? input.to : '';
      return from && to && from > to ? { from: to, to: from } : { from, to };
    }
  }
}

/** Inclusive on both ends; an empty bound does not filter. */
export function inDateRange(iso: string, range: DateRange): boolean {
  const date = iso.slice(0, 10);
  if (!date) return false;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

/**
 * Amount comparison. A non-positive threshold means "no amount filter", so an
 * operator with an empty field never hides everything.
 */
export function matchesAmount(paise: number, op: AmountOp, valuePaise: number): boolean {
  if (op === 'any') return true;
  if (!Number.isFinite(valuePaise) || valuePaise <= 0) return true;
  if (!Number.isFinite(paise)) return false;

  switch (op) {
    case 'gt':
      return paise > valuePaise;
    case 'eq':
      return paise === valuePaise;
    case 'lt':
      return paise < valuePaise;
  }
}
