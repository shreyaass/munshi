/**
 * Canonical sheet schema. Row 1 of every tab is a frozen header.
 * Header order is part of the API contract: the Apps Script backend validates it
 * on every read, so the app and the script can never silently disagree.
 *
 * Amounts are ALWAYS integer paise. Never floats, never rupees-with-decimals.
 */

export const SCHEMA_VERSION = 1;

export type TabName =
  | 'Expenses'
  | 'Income'
  | 'Transfers'
  | 'Accounts'
  | 'Categories'
  | 'Budgets'
  | 'Recurring'
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
] as const satisfies readonly TabName[];

export type DataTab = (typeof DATA_TABS)[number];

const BASE = ['id', 'updated_at', 'device_id', 'deleted'] as const;

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
  Accounts: ['id', 'name', 'type', 'opening_balance_paise', 'active', ...BASE],
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
  ],
  Budgets: ['id', 'month', 'category_id', 'amount_paise', ...BASE],
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

/**
 * Returns a list of human-readable problems. Empty array means the tab is usable.
 * Called with the header row exactly as read from the sheet.
 */
export function validateHeaders(tab: TabName, headerRow: readonly unknown[]): string[] {
  const expected = HEADERS[tab];
  const actual = headerRow.map((h) => String(h ?? '').trim());
  const problems: string[] = [];

  if (actual.length === 0) {
    problems.push(`Tab "${tab}" is empty — expected a header row.`);
    return problems;
  }

  for (let i = 0; i < expected.length; i++) {
    const want = expected[i];
    const got = actual[i] ?? '';
    if (got.toLowerCase() !== want.toLowerCase()) {
      problems.push(`Tab "${tab}" column ${i + 1}: expected "${want}", found "${got || '(empty)'}".`);
    }
  }

  if (actual.length > expected.length) {
    const extra = actual.slice(expected.length).filter((h) => h !== '');
    if (extra.length > 0) {
      problems.push(`Tab "${tab}" has unexpected extra columns: ${extra.join(', ')}.`);
    }
  }

  return problems;
}
