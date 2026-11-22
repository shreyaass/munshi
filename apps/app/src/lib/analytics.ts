import type { Row } from '@em/core';

export interface Tx {
  row: Row;
  kind: 'expense' | 'income';
}

export function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function asString(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

export function asBool(value: unknown): boolean {
  return value === true || value === 'TRUE' || value === 'true' || value === 1 || value === '1';
}

export function rowDate(row: Row): string {
  return asString(row.date).slice(0, 10);
}

export function rowMonth(row: Row): string {
  return rowDate(row).slice(0, 7);
}

export function categoriesFor(categories: Row[], type: 'expense' | 'income'): Row[] {
  return categories
    .filter((c) => !asBool(c.deleted) && c.active !== false && asString(c.type) === type)
    .sort((a, b) => asString(a.name).localeCompare(asString(b.name)));
}

/** Opening balance + income - expenses + transfers in - transfers out + contributions in - out. */
export function accountBalances(
  accounts: Row[],
  transactions: Tx[],
  transfers: Row[],
  contributions: Row[] = [],
): Map<string, number> {
  const balances = new Map<string, number>();
  for (const a of accounts) {
    if (asBool(a.deleted)) continue;
    balances.set(asString(a.id), asNumber(a.opening_balance_paise));
  }

  for (const { row, kind } of transactions) {
    const id = asString(row.account_id);
    if (!balances.has(id)) continue;
    const amount = asNumber(row.amount_paise);
    balances.set(id, (balances.get(id) ?? 0) + (kind === 'income' ? amount : -amount));
  }

  for (const t of transfers) {
    if (asBool(t.deleted)) continue;
    const amount = asNumber(t.amount_paise);
    const from = asString(t.from_account_id);
    const to = asString(t.to_account_id);
    if (balances.has(from)) balances.set(from, (balances.get(from) ?? 0) - amount);
    if (balances.has(to)) balances.set(to, (balances.get(to) ?? 0) + amount);
  }

  for (const c of contributions) {
    if (asBool(c.deleted)) continue;
    const amount = asNumber(c.amount_paise);
    const from = asString(c.from_account_id);
    const to = asString(c.to_account_id);
    if (balances.has(from)) balances.set(from, (balances.get(from) ?? 0) - amount);
    if (balances.has(to)) balances.set(to, (balances.get(to) ?? 0) + amount);
  }

  return balances;
}

export function balanceBreakdown(
  accounts: Row[],
  balances: Map<string, number>,
): { total: number; spendable: number; saved: number } {
  let spendable = 0;
  let saved = 0;

  for (const a of accounts) {
    if (asBool(a.deleted)) continue;
    const id = asString(a.id);
    const bal = balances.get(id) ?? 0;
    if (asBool(a.is_savings)) {
      saved += bal;
    } else {
      spendable += bal;
    }
  }

  return {
    total: spendable + saved,
    spendable,
    saved,
  };
}

export interface MonthTotals {
  spent: number;
  earned: number;
  net: number;
  count: number;
}

export function monthTotals(transactions: Tx[], month: string): MonthTotals {
  let spent = 0;
  let earned = 0;
  let count = 0;
  for (const { row, kind } of transactions) {
    if (rowMonth(row) !== month) continue;
    const amount = asNumber(row.amount_paise);
    if (kind === 'expense') spent += amount;
    else earned += amount;
    count++;
  }
  return { spent, earned, net: earned - spent, count };
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  share: number;
}

export function categoryTotals(
  transactions: Tx[],
  categories: Row[],
  month: string,
  kind: 'expense' | 'income' = 'expense',
): CategoryTotal[] {
  const byId = new Map(categories.map((c) => [asString(c.id), c]));
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.kind !== kind) continue;
    if (rowMonth(tx.row) !== month) continue;
    const id = asString(tx.row.category_id) || 'unknown';
    totals.set(id, (totals.get(id) ?? 0) + asNumber(tx.row.amount_paise));
  }

  const grand = [...totals.values()].reduce((a, b) => a + b, 0) || 1;

  return [...totals.entries()]
    .map(([categoryId, amount]) => {
      const cat = byId.get(categoryId);
      return {
        categoryId,
        name: cat ? asString(cat.name) : 'Uncategorised',
        icon: cat ? asString(cat.icon) : '❓',
        color: (cat && asString(cat.color)) || '#64748b',
        amount,
        share: amount / grand,
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

export function topPayees(transactions: Tx[], month: string | null, limit = 5) {
  const map = new Map<string, { count: number; total: number }>();
  for (const { row, kind } of transactions) {
    if (kind !== 'expense') continue;
    if (month && rowMonth(row) !== month) continue;
    const name = asString(row.payee).trim();
    if (!name) continue;
    const entry = map.get(name) ?? { count: 0, total: 0 };
    entry.count++;
    entry.total += asNumber(row.amount_paise);
    map.set(name, entry);
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Budget remaining divided by days left in the month. */
export function safeToSpend(spentPaise: number, budgetPaise: number, daysLeft: number): number {
  if (budgetPaise <= 0) return 0;
  const remaining = Math.max(0, budgetPaise - spentPaise);
  return Math.round(remaining / Math.max(1, daysLeft));
}

/** Expense total for a single calendar day. */
export function spentOn(transactions: Tx[], date: string): number {
  let spent = 0;
  for (const { row, kind } of transactions) {
    if (kind !== 'expense' || rowDate(row) !== date) continue;
    spent += asNumber(row.amount_paise);
  }
  return spent;
}

/**
 * Days the average should divide by.
 *
 * The current month is still in progress, so dividing by 30 would understate
 * today's pace; use the days elapsed so far (today counts). A past month is
 * complete, so use its real length. Future months fall back to their length.
 */
export function averageDays(month: string, today = new Date()): number {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const nowMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  if (month > nowMonth) return daysInMonth;
  if (month === nowMonth) return Math.min(daysInMonth, today.getDate());
  return daysInMonth;
}

export function averagePerDay(spentPaise: number, month: string, today = new Date()): number {
  return Math.round(spentPaise / Math.max(1, averageDays(month, today)));
}

/**
 * Chart colours stay in the ledger family (forest, gold, terracotta, olive,
 * teal, rosewood) instead of a rainbow, so the donut reads as one palette.
 */
export const CHART_PALETTE = ['#0B4B34', '#D6A747', '#B65C3A', '#7C8C4A', '#3E6F68', '#8E4B4B'] as const;

export function chartColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
