/**
 * Canonical sheet schema. Row 1 of every tab is a frozen header.
 *
 * v2: header matching is BY NAME, not by position, and extra columns are
 * allowed. A user can add their own column to a tab without breaking sync, and
 * future schema bumps only ever *append* columns.
 *
 * Amounts are ALWAYS integer paise. Never floats, never rupees-with-decimals.
 */

export const SCHEMA_VERSION = 3;

export type TabName =
  | 'Expenses'
  | 'Income'
  | 'Transfers'
  | 'Accounts'
  | 'Categories'
  | 'Budgets'
  | 'Recurring'
  | 'Goals'
  | 'Contributions'
  | 'GoalPeriods'
  | 'Meta';

/** Tabs that hold synced records (everything except the key/value Meta tab). */
export const DATA_TABS = [
  'Expenses',
  'Income',
  'Transfers',
  'Accounts',
  'Categories',
  'Budgets',
  'Recurring',
  'Goals',
  'Contributions',
  'GoalPeriods',
] as const satisfies readonly TabName[];

export type DataTab = (typeof DATA_TABS)[number];

const BASE = ['updated_at', 'device_id', 'deleted'] as const;

export const HEADERS: Record<TabName, readonly string[]> = {
  Expenses: [
    'id',
    'date',
    'amount_paise',
    'category_id',
    'account_id',
    'payee',
    'notes',
    'tags',
    'created_at',
    ...BASE,
  ],
  Income: [
    'id',
    'date',
    'amount_paise',
    'category_id',
    'account_id',
    'payee',
    'notes',
    'tags',
    'created_at',
    ...BASE,
  ],
  Transfers: [
    'id',
    'date',
    'amount_paise',
    'from_account_id',
    'to_account_id',
    'notes',
    'created_at',
    ...BASE,
  ],
  Accounts: [
    'id',
    'name',
    'type',
    'opening_balance_paise',
    'active',
    ...BASE,
    // v3 additions
    'kind',
    'is_savings',
    'last4',
    'bank_name',
  ],
  Categories: [
    'id',
    'name',
    'type',
    'parent_id',
    'icon',
    'color',
    'monthly_budget_paise',
    'active',
    ...BASE,
    // v2 — appended so migration is additive
    'pinned',
    'sort_order',
  ],
  Budgets: ['id', 'month', 'kind', 'category_id', 'amount_paise', ...BASE],
  Recurring: [
    'id',
    'amount_paise',
    'type',
    'category_id',
    'account_id',
    'payee',
    'rule',
    'next_date',
    'active',
    ...BASE,
  ],
  Goals: [
    'id',
    'name',
    'target_paise',
    'recurrence',
    'deadline',
    'start_date',
    'end_date',
    'priority',
    'linked_account_id',
    'icon',
    'status',
    'created_at',
    ...BASE,
  ],
  Contributions: [
    'id',
    'date',
    'amount_paise',
    'goal_id',
    'from_account_id',
    'to_account_id',
    'notes',
    'created_at',
    ...BASE,
  ],
  GoalPeriods: [
    'id',
    'goal_id',
    'period_key',
    'target_paise',
    'contributed_paise',
    'status',
    'created_at',
    ...BASE,
  ],
  Meta: ['key', 'value'],
};

export const META_DEFAULTS: Record<string, string> = {
  schema_version: String(SCHEMA_VERSION),
  currency: 'INR',
  locale: 'en-IN',
  week_start: '1',
};

export const ACCOUNT_TYPES = ['cash', 'bank', 'upi', 'credit', 'wallet'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** How many quick chips the Add screen shows. */
export const QUICK_PICKS = { expense: 6, income: 2 } as const;

/** What a Budgets row targets. `category` uses `category_id`; the others ignore it. */
export const BUDGET_KINDS = ['total', 'daily', 'category'] as const;
export type BudgetKind = (typeof BUDGET_KINDS)[number];

/** `month` value for the standing target that applies to every month. */
export const BUDGET_DEFAULT_MONTH = '*';

/**
 * Returns human-readable problems. Empty array means the tab is usable.
 * Matches by name, so column order and extra user columns are irrelevant.
 */
export function validateHeaders(tab: TabName, headerRow: readonly unknown[]): string[] {
  const expected = HEADERS[tab];
  const actual = headerRow.map((h) => String(h ?? '').trim().toLowerCase());
  const problems: string[] = [];

  if (actual.filter((h) => h !== '').length === 0) {
    problems.push(`Tab "${tab}" is empty — expected a header row.`);
    return problems;
  }

  const missing = expected.filter((h) => !actual.includes(h.toLowerCase()));
  if (missing.length > 0) {
    problems.push(`Tab "${tab}" is missing columns: ${missing.join(', ')}.`);
  }

  return problems;
}

/** name (lowercase) -> column index, for reading and writing by name. */
export function headerIndex(headers: readonly unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headers.forEach((h, i) => {
    const name = String(h ?? '').trim().toLowerCase();
    if (name) map.set(name, i);
  });
  return map;
}

/** Build a row object from a values array using the sheet's actual headers. */
export function rowFromValues(headers: readonly unknown[], values: readonly unknown[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  headers.forEach((header, i) => {
    const name = String(header ?? '').trim();
    if (name) row[name] = values[i] ?? '';
  });
  return row;
}

/**
 * Build a values array for a row using the sheet's actual headers, so extra
 * columns the user added are preserved instead of being shifted.
 */
export function valuesFromRow(headers: readonly unknown[], row: Record<string, unknown>): unknown[] {
  return headers.map((header) => {
    const name = String(header ?? '').trim();
    if (!name) return '';
    const value = row[name];
    return value === undefined || value === null ? '' : value;
  });
}
