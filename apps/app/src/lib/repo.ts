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
  patch: Partial<
    Pick<Transaction, 'amount_paise' | 'category_id' | 'account_id' | 'date' | 'payee' | 'notes'>
  >,
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
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

function maxSortOrder(rows: Row[]): number {
  return rows.reduce((max, r) => Math.max(max, Number(r.sort_order) || 0), 0);
}

export async function addCategory(input: {
  name: string;
  emoji: string;
  type: 'expense' | 'income';
  color?: string;
}): Promise<string> {
  const existing = await db.rows.where('tab').equals('Categories').toArray();
  const rows = existing.filter((r) => !r.deleted).map((r) => r.data);

  const id = newId();
  const ts = nowISO();

  const row: Row = {
    id,
    name: input.name.trim(),
    type: input.type,
    parent_id: '',
    icon: input.emoji || '📦',
    color: input.color ?? '#6366f1',
    monthly_budget_paise: 0,
    active: true,
    pinned: true,
    sort_order: maxSortOrder(rows) + 1,
    updated_at: ts,
    device_id: getDeviceId(),
    deleted: false,
  };

  await db.rows.put(toLocalRow('Categories', row, true));
  return id;
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<CategoryRow, 'name' | 'icon' | 'color' | 'active'>>,
): Promise<void> {
  const existing = await db.rows.get(rowKey('Categories', id));
  if (!existing) return;

  const next: Row = {
    ...existing.data,
    ...(patch as Record<string, unknown>),
    updated_at: nowISO(),
    device_id: getDeviceId(),
  };
  await db.rows.put(toLocalRow('Categories', next, true));
}

export async function setCategoryPinned(id: string, pinned: boolean): Promise<void> {
  const all = await db.rows.where('tab').equals('Categories').toArray();
  const rows = all.filter((r) => !r.deleted).map((r) => r.data);
  const existing = all.find((r) => r.id === id);
  if (!existing) return;

  const next: Row = {
    ...existing.data,
    pinned,
    sort_order: pinned ? maxSortOrder(rows) + 1 : 0,
    updated_at: nowISO(),
    device_id: getDeviceId(),
  };
  await db.rows.put(toLocalRow('Categories', next, true));
}

/** Swap sort_order with the previous/next pinned category. */
export async function moveCategory(id: string, direction: -1 | 1): Promise<void> {
  const all = await db.rows.where('tab').equals('Categories').toArray();
  const pinned = all
    .filter((r) => !r.deleted && r.data.pinned === true)
    .map((r) => r.data)
    .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));

  const index = pinned.findIndex((r) => String(r.id) === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= pinned.length) return;

  const a = pinned[index];
  const b = pinned[target];
  const ts = nowISO();

  await db.rows.put(
    toLocalRow(
      'Categories',
      { ...a, sort_order: target + 1, updated_at: ts, device_id: getDeviceId() },
      true,
    ),
  );
  await db.rows.put(
    toLocalRow('Categories', { ...b, sort_order: index + 1, updated_at: ts, device_id: getDeviceId() }, true),
  );
}

type CategoryRow = {
  name: string;
  icon: string;
  color: string;
  active: boolean;
};

/* -------------------------------------------------------------------------- */
/* Accounts & transfers                                                        */
/* -------------------------------------------------------------------------- */

export interface AddAccountInput {
  name: string;
  type: AccountRow['type'];
  openingBalancePaise: number;
  kind?: 'bank' | 'cash' | 'wallet' | 'card';
  isSavings?: boolean;
  last4?: string;
  bankName?: string;
}

export async function addAccount(input: AddAccountInput): Promise<string> {
  const id = newId();
  const ts = nowISO();

  const row: Row = {
    id,
    name: input.name.trim(),
    type: input.type,
    opening_balance_paise: input.openingBalancePaise,
    active: true,
    kind: input.kind ?? input.type,
    is_savings: Boolean(input.isSavings),
    last4: input.last4 ? input.last4.slice(-4) : '',
    bank_name: input.bankName ?? '',
    updated_at: ts,
    device_id: getDeviceId(),
    deleted: false,
  };

  await db.rows.put(toLocalRow('Accounts', row, true));
  return id;
}

export async function updateAccount(
  id: string,
  patch: Partial<{
    name: string;
    type: AccountRow['type'];
    opening_balance_paise: number;
    active: boolean;
    kind: 'bank' | 'cash' | 'wallet' | 'card';
    is_savings: boolean;
    last4: string;
    bank_name: string;
  }>,
): Promise<void> {
  const existing = await db.rows.get(rowKey('Accounts', id));
  if (!existing) return;

  const next: Row = {
    ...existing.data,
    ...(patch as Record<string, unknown>),
    updated_at: nowISO(),
    device_id: getDeviceId(),
  };
  await db.rows.put(toLocalRow('Accounts', next, true));
}

export async function archiveAccount(id: string): Promise<void> {
  await softDelete('Accounts', id);
}

export async function addTransfer(input: {
  fromAccountId: string;
  toAccountId: string;
  amountPaise: number;
  date: string;
  notes?: string;
}): Promise<string> {
  const id = newId();
  const ts = nowISO();

  const row: Row = {
    id,
    date: input.date,
    amount_paise: input.amountPaise,
    from_account_id: input.fromAccountId,
    to_account_id: input.toAccountId,
    notes: input.notes ?? '',
    created_at: ts,
    updated_at: ts,
    device_id: getDeviceId(),
    deleted: false,
  };

  await db.rows.put(toLocalRow('Transfers', row, true));
  return id;
}

/* -------------------------------------------------------------------------- */
/* Goals & Contributions (v3)                                                 */
/* -------------------------------------------------------------------------- */

export interface AddGoalInput {
  name: string;
  targetPaise: number;
  recurrence: 'once' | 'monthly' | 'yearly';
  deadline?: string;
  startDate?: string;
  endDate?: string;
  priority?: number;
  linkedAccountId: string;
  icon?: string;
}

export async function addGoal(input: AddGoalInput): Promise<string> {
  const existing = await db.rows.where('tab').equals('Goals').toArray();
  const liveGoals = existing.filter((r) => !r.deleted).map((r) => r.data);
  const maxPriority = liveGoals.reduce((max, g) => Math.max(max, Number(g.priority) || 0), 0);

  const id = newId();
  const ts = nowISO();

  const row: Row = {
    id,
    name: input.name.trim(),
    target_paise: input.targetPaise,
    recurrence: input.recurrence,
    deadline: input.deadline ?? '',
    start_date: input.startDate ?? '',
    end_date: input.endDate ?? '',
    priority: input.priority ?? maxPriority + 1,
    linked_account_id: input.linkedAccountId,
    icon: input.icon ?? 'savings',
    status: 'active',
    created_at: ts,
    updated_at: ts,
    device_id: getDeviceId(),
    deleted: false,
  };

  await db.rows.put(toLocalRow('Goals', row, true));
  return id;
}

export async function updateGoal(
  id: string,
  patch: Partial<Row>,
): Promise<void> {
  const existing = await db.rows.get(rowKey('Goals', id));
  if (!existing) return;

  const next: Row = {
    ...existing.data,
    ...(patch as Record<string, unknown>),
    updated_at: nowISO(),
    device_id: getDeviceId(),
  };
  await db.rows.put(toLocalRow('Goals', next, true));
}

export async function deleteGoal(id: string): Promise<void> {
  await softDelete('Goals', id);
  // Re-number remaining goals sequentially 1, 2, 3...
  const existing = await db.rows.where('tab').equals('Goals').toArray();
  const live = existing
    .filter((r) => !r.deleted && r.id !== id)
    .map((r) => r.data)
    .sort((a, b) => (Number(a.priority) || 0) - (Number(b.priority) || 0));

  const ts = nowISO();
  for (let i = 0; i < live.length; i++) {
    const nextPriority = i + 1;
    if (Number(live[i].priority) !== nextPriority) {
      await db.rows.put(
        toLocalRow('Goals', { ...live[i], priority: nextPriority, updated_at: ts, device_id: getDeviceId() }, true),
      );
    }
  }
}

export async function reorderGoals(goalIds: string[]): Promise<void> {
  const ts = nowISO();
  for (let i = 0; i < goalIds.length; i++) {
    const id = goalIds[i];
    const existing = await db.rows.get(rowKey('Goals', id));
    if (existing && !existing.deleted) {
      await db.rows.put(
        toLocalRow('Goals', { ...existing.data, priority: i + 1, updated_at: ts, device_id: getDeviceId() }, true),
      );
    }
  }
}

export async function addContribution(input: {
  goalId: string;
  fromAccountId: string;
  toAccountId: string;
  amountPaise: number;
  date: string;
  notes?: string;
}): Promise<string> {
  const id = newId();
  const ts = nowISO();

  const row: Row = {
    id,
    date: input.date,
    amount_paise: input.amountPaise,
    goal_id: input.goalId,
    from_account_id: input.fromAccountId,
    to_account_id: input.toAccountId,
    notes: input.notes ?? '',
    created_at: ts,
    updated_at: ts,
    device_id: getDeviceId(),
    deleted: false,
  };

  await db.rows.put(toLocalRow('Contributions', row, true));
  return id;
}

export async function setSpendingCap(input: {
  categoryId: string; // 'ALL' for overall limit, or category_id
  amountPaise: number;
  month?: string;
}): Promise<void> {
  const month = input.month ?? '*';
  const kind = input.categoryId === 'ALL' ? 'total' : 'category';
  const categoryId = input.categoryId;

  const existing = (await db.rows.where('tab').equals('Budgets').toArray()).find(
    (r) =>
      !r.deleted &&
      String(r.data.kind) === kind &&
      String(r.data.month) === month &&
      String(r.data.category_id ?? '') === categoryId,
  );

  const ts = nowISO();
  const row: Row = existing
    ? {
        ...existing.data,
        amount_paise: input.amountPaise,
        updated_at: ts,
        device_id: getDeviceId(),
        deleted: false,
      }
    : {
        id: newId(),
        month,
        kind,
        category_id: categoryId,
        amount_paise: input.amountPaise,
        updated_at: ts,
        device_id: getDeviceId(),
        deleted: false,
      };

  await db.rows.put(toLocalRow('Budgets', row, true));
}

export async function recordClosedPeriod(input: {
  goalId: string;
  periodKey: string;
  targetPaise: number;
  contributedPaise: number;
  status: 'hit' | 'partial' | 'missed';
}): Promise<string> {
  const id = newId();
  const ts = nowISO();

  const row: Row = {
    id,
    goal_id: input.goalId,
    period_key: input.periodKey,
    target_paise: input.targetPaise,
    contributed_paise: input.contributedPaise,
    status: input.status,
    created_at: ts,
    updated_at: ts,
    device_id: getDeviceId(),
    deleted: false,
  };

  await db.rows.put(toLocalRow('GoalPeriods', row, true));
  return id;
}

type AccountRow = { name: string; type: import('@em/core').AccountType };

/* -------------------------------------------------------------------------- */
/* Budgets                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Upserts one budget target. The natural key is `(month, kind, category_id)`,
 * so saving twice edits the same row instead of piling up duplicates. A zero
 * amount means "unset", but the row is kept so it can shadow a standing target
 * for that one month.
 */
export async function saveBudget(input: {
  kind: import('@em/core').BudgetKind;
  month: string;
  categoryId?: string;
  amountPaise: number;
}): Promise<void> {
  const categoryId = input.kind === 'category' ? (input.categoryId ?? '') : '';
  const existing = (await db.rows.where('tab').equals('Budgets').toArray()).find(
    (r) =>
      !r.deleted &&
      String(r.data.kind) === input.kind &&
      String(r.data.month) === input.month &&
      String(r.data.category_id ?? '') === categoryId,
  );

  const ts = nowISO();
  const row: Row = existing
    ? {
        ...existing.data,
        amount_paise: input.amountPaise,
        updated_at: ts,
        device_id: getDeviceId(),
        deleted: false,
      }
    : {
        id: newId(),
        month: input.month,
        kind: input.kind,
        category_id: categoryId,
        amount_paise: input.amountPaise,
        updated_at: ts,
        device_id: getDeviceId(),
        deleted: false,
      };

  await db.rows.put(toLocalRow('Budgets', row, true));
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

/** Local-only settings (device, onboarding). Never travels to the sheet. */
export async function setLocalMeta(key: string, value: string): Promise<void> {
  await db.meta.put({ key, value });
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
  const lines = [headers.join(','), ...visible.map((r) => headers.map((h) => csvCell(r[h])).join(','))];
  return lines.join('\n');
}
