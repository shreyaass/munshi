import { useLiveQuery } from 'dexie-react-hooks';
import {
  newId,
  nowISO,
  rowKey,
  toLocalRow,
  type DataTab,
  type Row,
  type SyncStore,
  type Transaction,
} from '@em/core';
import { db } from './db';
import { getDeviceId } from './connection';
import type { Tx } from './analytics';

/** Dexie-backed implementation of the platform-free sync contract. */
export const store: SyncStore = {
  async getRow(tab, id) {
    return db.rows.get(rowKey(tab, id));
  },
  async allRows(tab) {
    return db.rows.where('tab').equals(tab).toArray();
  },
  async dirtyRows() {
    return db.rows.where('dirty').equals(1).toArray();
  },
  async putRow(row) {
    await db.rows.put(row);
  },
  async putRows(rows) {
    if (rows.length > 0) await db.rows.bulkPut(rows);
  },
  async markClean(keys) {
    if (keys.length === 0) return;
    await db.rows.where('key').anyOf(keys).modify({ dirty: 0 });
  },
  async getMeta(key) {
    const row = await db.meta.get(key);
    return row?.value;
  },
  async setMeta(key, value) {
    await db.meta.put({ key, value });
  },
};

/* -------------------------------------------------------------------------- */
/* Mutations                                                                   */
/* -------------------------------------------------------------------------- */

export interface NewTransactionInput {
  direction: 'expense' | 'income';
  amountPaise: number;
  categoryId: string;
  accountId: string;
  date: string;
  payee?: string;
  notes?: string;
}

export async function addTransaction(input: NewTransactionInput): Promise<string> {
  const id = newId();
  const ts = nowISO();

  const row: Transaction = {
    id,
    date: input.date,
    amount_paise: input.amountPaise,
    category_id: input.categoryId,
    account_id: input.accountId,
    payee: input.payee ?? '',
    notes: input.notes ?? '',
    tags: '',
    created_at: ts,
    updated_at: ts,
    device_id: getDeviceId(),
    deleted: false,
  };

  const tab: DataTab = input.direction === 'expense' ? 'Expenses' : 'Income';
  await db.rows.put(toLocalRow(tab, { ...row } as Row, true));
  return id;
}

export async function updateTransaction(
  tab: DataTab,
  id: string,
  patch: Partial<Pick<Transaction, 'amount_paise' | 'category_id' | 'account_id' | 'date' | 'payee' | 'notes'>>,
): Promise<void> {
  const existing = await db.rows.get(rowKey(tab, id));
  if (!existing) return;

  const next: Row = {
    ...existing.data,
    ...(patch as Record<string, unknown>),
    updated_at: nowISO(),
    device_id: getDeviceId(),
    deleted: false,
  };

  await db.rows.put(toLocalRow(tab, next, true));
}

/** Tombstone, so the delete can travel to other devices. */
export async function softDelete(tab: DataTab, id: string): Promise<void> {
  const existing = await db.rows.get(rowKey(tab, id));
  if (!existing) return;

  const next: Row = {
    ...existing.data,
    deleted: true,
    updated_at: nowISO(),
    device_id: getDeviceId(),
  };

  await db.rows.put(toLocalRow(tab, next, true));
}

export async function undoableLastChange(): Promise<void> {
  /* Reserved: the undo stack lands in Phase 3. */
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export function useTabRows(tab: DataTab): Row[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.rows.where('tab').equals(tab).toArray();
    return rows.filter((r) => !r.deleted).map((r) => r.data);
  }, [tab]);
}

export function useAllRows(tab: DataTab): Row[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.rows.where('tab').equals(tab).toArray();
    return rows.map((r) => r.data);
  }, [tab]);
}

export function useTransactions(): Tx[] | undefined {
  return useLiveQuery(async () => {
    const [expenses, income] = await Promise.all([
      db.rows.where('tab').equals('Expenses').toArray(),
      db.rows.where('tab').equals('Income').toArray(),
    ]);

    const out: Tx[] = [];
    for (const r of expenses) if (!r.deleted) out.push({ row: r.data, kind: 'expense' });
    for (const r of income) if (!r.deleted) out.push({ row: r.data, kind: 'income' });
    return out;
  }, []);
}

export function useMetaValue(key: string, fallback: string): string {
  const value = useLiveQuery(async () => (await db.meta.get(key))?.value, [key]);
  return value ?? fallback;
}

export function useDirtyCount(): number {
  const count = useLiveQuery(() => db.rows.where('dirty').equals(1).count(), []);
  return count ?? 0;
}

export function useSyncMeta(): { lastSync: string | null; conflicts: number } {
  const lastSync = useLiveQuery(async () => (await db.meta.get('last_sync'))?.value ?? null, []);
  const conflicts = Number(useMetaValue('sync_conflicts', '0')) || 0;
  return { lastSync: lastSync ?? null, conflicts };
}

/* -------------------------------------------------------------------------- */
/* Export                                                                      */
/* -------------------------------------------------------------------------- */

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportCsv(): Promise<string> {
  const rows = await db.rows.toArray();
  const visible = rows.filter((r) => !r.deleted).map((r) => r.data);
  if (visible.length === 0) return '';

  const headers = [...new Set(visible.flatMap((r) => Object.keys(r)))];
  const lines = [
    headers.join(','),
    ...visible.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
  ];
  return lines.join('\n');
}
