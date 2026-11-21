import {
  currentMonthKey,
  formatPaise,
  fromISODate,
  parseToPaise,
  monthLabel,
  type AmountOp,
  type DateRangePreset,
} from '@em/core';

export type HistorySort = 'newest' | 'oldest' | 'highest' | 'lowest';
export type HistoryType = 'all' | 'expense' | 'income';

/**
 * The whole filter state, including the month picker and the custom range.
 * It lives in component state on the History page, so it survives re-renders
 * and the filter sheet, but resets when you leave History.
 */
export interface HistoryFilters {
  range: DateRangePreset;
  /** `YYYY-MM`, used when `range` is `month`. */
  month: string;
  /** `YYYY-MM-DD`, used when `range` is `custom`. */
  from: string;
  to: string;
  type: HistoryType;
  amountOp: AmountOp;
  /** Rupee text from the filter sheet; parsed on use. */
  amount: string;
  categoryId: string;
  sort: HistorySort;
}

export function defaultFilters(month = currentMonthKey()): HistoryFilters {
  return {
    range: 'month',
    month,
    from: '',
    to: '',
    type: 'all',
    amountOp: 'any',
    amount: '',
    categoryId: '',
    sort: 'newest',
  };
}

/** Sort changes ordering, not membership, so it doesn't join the badge count. */
export function activeFilterCount(filters: HistoryFilters): number {
  let count = 0;

  if (filters.range !== 'month' || filters.month !== currentMonthKey()) count++;
  if (filters.type !== 'all') count++;
  if (filters.amountOp !== 'any' && (parseToPaise(filters.amount) ?? 0) > 0) count++;
  if (filters.categoryId) count++;

  return count;
}

const shortDate = (iso: string, locale: string) =>
  fromISODate(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

/** Human label for the current range, used in the page header and chips. */
export function rangeSummary(filters: HistoryFilters, locale = 'en-IN'): string {
  switch (filters.range) {
    case 'month':
      return monthLabel(filters.month, locale);
    case 'last-month':
      return 'Last month';
    case 'last-30':
      return 'Last 30 days';
    case 'year':
      return 'This year';
    case 'all':
      return 'All time';
    case 'custom':
      if (filters.from && filters.to) {
        return `${shortDate(filters.from, locale)} – ${shortDate(filters.to, locale)}`;
      }
      if (filters.from) return `From ${shortDate(filters.from, locale)}`;
      if (filters.to) return `Until ${shortDate(filters.to, locale)}`;
      return 'All time';
  }
}

export function amountSummary(
  filters: HistoryFilters,
  locale = 'en-IN',
  currency = 'INR',
): string {
  const paise = parseToPaise(filters.amount) ?? 0;
  if (filters.amountOp === 'any' || paise <= 0) return 'Any amount';

  const sign = filters.amountOp === 'gt' ? '>' : filters.amountOp === 'lt' ? '<' : '=';
  return `${sign} ${formatPaise(paise, locale, currency, { decimals: paise % 100 !== 0 })}`;
}

export const SORT_LABEL: Record<HistorySort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  highest: 'Highest first',
  lowest: 'Lowest first',
};
