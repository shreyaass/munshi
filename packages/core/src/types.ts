import type { DataTab, TabName } from './schema.js';

export type CellValue = string | number | boolean | null;

/** A single row as stored in the sheet and mirrored locally. */
export type Row = Record<string, CellValue>;

export interface BaseRecord {
  id: string;
  updated_at: string;
  device_id: string;
  deleted: boolean;
}

export interface Transaction extends BaseRecord {
  date: string;
  amount_paise: number;
  category_id: string;
  account_id: string;
  payee: string;
  notes: string;
  tags: string;
  created_at: string;
}

export interface Transfer extends BaseRecord {
  date: string;
  amount_paise: number;
  from_account_id: string;
  to_account_id: string;
  notes: string;
  created_at: string;
}

export interface Account extends BaseRecord {
  name: string;
  type: import('./schema.js').AccountType;
  opening_balance_paise: number;
  active: boolean;
}

export interface Category extends BaseRecord {
  name: string;
  type: 'expense' | 'income';
  parent_id: string;
  icon: string;
  color: string;
  monthly_budget_paise: number;
  active: boolean;
}

export interface Budget extends BaseRecord {
  month: string;
  category_id: string;
  amount_paise: number;
}

export interface SyncResult {
  ok: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  at: string;
  error?: string;
}

/** Row as held in the local Dexie table. `key` is `${tab}:${id}`. */
export interface LocalRow {
  key: string;
  tab: DataTab;
  id: string;
  updated_at: string;
  deleted: boolean;
  dirty: 0 | 1;
  data: Row;
}

export type { DataTab, TabName };
