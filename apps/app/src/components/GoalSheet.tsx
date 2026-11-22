import { useEffect, useMemo, useState } from 'react';
import {
  BUDGET_DEFAULT_MONTH,
  formatAmountPlain,
  formatPaise,
  goalProgress,
  monthLabel,
  parseToPaise,
  resolveBudgets,
} from '@em/core';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { resolveGoalIcon } from './GoalCard';
import { asNumber, asString, rowMonth } from '../lib/analytics';
import { saveBudget, softDelete, useMetaValue, useTabRows, useTransactions } from '../lib/repo';
import { useSync } from '../lib/SyncProvider';

type Scope = 'standing' | 'month';

interface GoalSheetProps {
  open: boolean;
  onClose: () => void;
  /** Category the goal belongs to. Empty means the sheet stays closed. */
  categoryId: string;
  month: string;
}

const rupees = (paise: number) => (paise > 0 ? formatAmountPlain(paise, false) : '');

/**
 * Editor for one category goal. Same Budgets row as the budget sheet's category
 * limits — "Goals" is just the friendlier name for them on the dashboard.
 */
export function GoalSheet({ open, onClose, categoryId, month }: GoalSheetProps) {
  const budgetRows = useTabRows('Budgets');
  const categoryRows = useTabRows('Categories');
  const transactions = useTransactions();
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');
  const { syncNow } = useSync();

  const [scope, setScope] = useState<Scope>('standing');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const category = useMemo(
    () => (categoryRows ?? []).find((c) => asString(c.id) === categoryId),
    [categoryRows, categoryId],
  );

  const spent = useMemo(() => {
    let total = 0;
    for (const { row, kind } of transactions ?? []) {
      if (kind !== 'expense') continue;
      if (asString(row.category_id) !== categoryId) continue;
      if (rowMonth(row) !== month) continue;
      total += asNumber(row.amount_paise);
    }
    return total;
  }, [transactions, categoryId, month]);

  function targetFor(targetMonth: string): number {
    const row = (budgetRows ?? []).find(
      (r) =>
        !r.deleted &&
        asString(r.kind) === 'category' &&
        asString(r.category_id) === categoryId &&
        asString(r.month) === targetMonth,
    );
    return row ? asNumber(row.amount_paise) : 0;
  }

  // Opening starts on the scope that is actually in force for this month.
  useEffect(() => {
    if (!open) return;
    const hasMonthRow = targetFor(month) > 0 || (budgetRows ?? []).some(
      (r) =>
        !r.deleted &&
        asString(r.kind) === 'category' &&
        asString(r.category_id) === categoryId &&
        asString(r.month) === month,
    );
    const nextScope: Scope = hasMonthRow ? 'month' : 'standing';
    setScope(nextScope);
    setAmount(rupees(targetFor(nextScope === 'month' ? month : BUDGET_DEFAULT_MONTH)));
    setBusy(false);
    // Seed only when the sheet opens or switches goal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, categoryId, month]);

  const resolved = useMemo(() => resolveBudgets(budgetRows ?? [], month), [budgetRows, month]);
  const inForce = resolved.byCategory.get(categoryId) ?? 0;
  const goal = goalProgress(inForce, spent);
  const amountPaise = parseToPaise(amount) ?? 0;
  const preview = goalProgress(amountPaise, spent);

  function switchScope(next: Scope) {
    setScope(next);
    setAmount(rupees(targetFor(next === 'month' ? month : BUDGET_DEFAULT_MONTH)));
  }

  async function save() {
    if (busy || !categoryId) return;
    setBusy(true);
    try {
      await saveBudget({
        kind: 'category',
        month: scope === 'month' ? month : BUDGET_DEFAULT_MONTH,
        categoryId,
        amountPaise,
      });
      await syncNow();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (busy || !categoryId) return;
    setBusy(true);
    try {
      const targetMonth = scope === 'month' ? month : BUDGET_DEFAULT_MONTH;
      for (const row of budgetRows ?? []) {
        if (
          asString(row.kind) === 'category' &&
          asString(row.category_id) === categoryId &&
          asString(row.month) === targetMonth
        ) {
          await softDelete('Budgets', asString(row.id));
        }
      }
      await syncNow();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const name = asString(category?.name) || 'Goal';
  const emoji = asString(category?.icon) || '🎯';

  return (
    <Sheet
      open={open && Boolean(categoryId)}
      onClose={onClose}
      title={name}
      footer={
        <div className="flex gap-2">
          {targetFor(scope === 'month' ? month : BUDGET_DEFAULT_MONTH) > 0 && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-expense/10 px-4 text-sm font-semibold text-expense disabled:opacity-60"
            >
              <Icon name="delete" className="h-4 w-4" />
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent disabled:bg-raised disabled:text-muted"
          >
            {busy ? 'Saving…' : 'Save goal'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-raised text-accent">
            {resolveGoalIcon(name, emoji).isMaterial ? (
              <Icon name={resolveGoalIcon(name, emoji).icon} size={22} />
            ) : (
              <span className="text-xl">{resolveGoalIcon(name, emoji).icon}</span>
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-medium">{name}</p>
            <p className="text-[11px] text-muted">
              {goal.status === 'none'
                ? 'No goal for this month yet'
                : `${formatPaise(goal.remaining, locale, currency, { decimals: false })} left of ${formatPaise(goal.target, locale, currency, { decimals: false })}`}
            </p>
          </div>
        </div>

        <div className="flex rounded-lg bg-raised p-0.5 text-[12px] font-medium">
          {(
            [
              ['standing', 'Every month'],
              ['month', monthLabel(month, locale)],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => switchScope(value)}
              className={`flex-1 rounded-md px-2 py-1.5 transition ${
                scope === value ? 'bg-surface text-text shadow-sm' : 'text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Goal amount
          </span>
          <div className="flex items-center rounded-xl bg-raised px-3.5 focus-within:ring-2 focus-within:ring-accent">
            <span className="money text-sm text-muted">₹</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              aria-label={`Goal amount for ${name} in rupees`}
              className="money min-w-0 flex-1 bg-transparent py-3 pl-1.5 text-sm outline-none"
            />
          </div>
          <span className="mt-1 block text-[11px] text-muted">
            {amountPaise > 0
              ? `${formatPaise(preview.remaining, locale, currency, { decimals: false })} of water — ${formatPaise(spent, locale, currency, { decimals: false })} spent so far`
              : 'No goal — the card disappears from the dashboard'}
          </span>
        </label>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
          <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          A goal is a category limit. The water shows how much of it is still unspent this month.
        </p>
      </div>
    </Sheet>
  );
}
