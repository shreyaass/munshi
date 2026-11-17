import { useEffect, useMemo, useState } from 'react';
import {
  BUDGET_DEFAULT_MONTH,
  daysInMonth,
  formatAmountPlain,
  formatPaise,
  monthLabel,
  parseToPaise,
  resolveBudgets,
} from '@em/core';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { categoriesFor, asNumber, asString } from '../lib/analytics';
import { saveBudget, softDelete, useMetaValue, useTabRows } from '../lib/repo';
import { useSync } from '../lib/SyncProvider';

type Scope = 'standing' | 'month';

interface BudgetSheetProps {
  open: boolean;
  onClose: () => void;
  /** The month the dashboard is showing. */
  month: string;
}

const rupees = (paise: number) => (paise > 0 ? formatAmountPlain(paise, false) : '');

/**
 * Budget editor. Opens from the dashboard card and from Settings.
 *
 * Total and daily are independent: the total is the monthly ceiling, the daily
 * is a pace target of its own. Category limits are informational and never roll
 * into the ceiling. `Every month` writes the standing `*` row; the other tab
 * writes a row for this month only, which shadows the standing target.
 */
export function BudgetSheet({ open, onClose, month }: BudgetSheetProps) {
  const budgetRows = useTabRows('Budgets');
  const categoryRows = useTabRows('Categories');
  const locale = useMetaValue('locale', 'en-IN');
  const currency = useMetaValue('currency', 'INR');
  const { syncNow } = useSync();

  const expenseCategories = useMemo(
    () => categoriesFor(categoryRows ?? [], 'expense'),
    [categoryRows],
  );

  const [scope, setScope] = useState<Scope>('standing');
  const [total, setTotal] = useState('');
  const [daily, setDaily] = useState('');
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  function amountFor(targetMonth: string, kind: string, categoryId = ''): number {
    const row = (budgetRows ?? []).find(
      (r) =>
        asString(r.kind) === kind &&
        asString(r.month) === targetMonth &&
        asString(r.category_id) === categoryId,
    );
    return row ? asNumber(row.amount_paise) : 0;
  }

  function loadScope(next: Scope, rows: typeof budgetRows = budgetRows) {
    const targetMonth = next === 'month' ? month : BUDGET_DEFAULT_MONTH;
    const pick = (kind: string, categoryId = '') => {
      const row = (rows ?? []).find(
        (r) =>
          asString(r.kind) === kind &&
          asString(r.month) === targetMonth &&
          asString(r.category_id) === categoryId,
      );
      return row ? asNumber(row.amount_paise) : 0;
    };

    setScope(next);
    setTotal(rupees(pick('total')));
    setDaily(rupees(pick('daily')));
    const nextLimits: Record<string, string> = {};
    for (const category of categoriesFor(categoryRows ?? [], 'expense')) {
      const id = asString(category.id);
      const amount = pick('category', id);
      if (amount > 0) nextLimits[id] = rupees(amount);
    }
    setLimits(nextLimits);
  }

  // Opening starts on the scope that is actually in force for this month.
  useEffect(() => {
    if (!open) return;
    const hasMonthRows = (budgetRows ?? []).some((r) => asString(r.month) === month);
    loadScope(hasMonthRows ? 'month' : 'standing');
    setBusy(false);
    // Only re-seed when the sheet opens; edits are local until Save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalPaise = parseToPaise(total) ?? 0;
  const dailyPaise = parseToPaise(daily) ?? 0;
  const monthDays = daysInMonth(month);
  const resolved = useMemo(() => resolveBudgets(budgetRows ?? [], month), [budgetRows, month]);

  async function save() {
    if (busy) return;
    setBusy(true);
    const targetMonth = scope === 'month' ? month : BUDGET_DEFAULT_MONTH;

    try {
      if (totalPaise !== amountFor(targetMonth, 'total')) {
        await saveBudget({ kind: 'total', month: targetMonth, amountPaise: totalPaise });
      }
      if (dailyPaise !== amountFor(targetMonth, 'daily')) {
        await saveBudget({ kind: 'daily', month: targetMonth, amountPaise: dailyPaise });
      }

      for (const category of expenseCategories) {
        const id = asString(category.id);
        const amount = parseToPaise(limits[id] ?? '') ?? 0;
        if (amount !== amountFor(targetMonth, 'category', id)) {
          await saveBudget({
            kind: 'category',
            month: targetMonth,
            categoryId: id,
            amountPaise: amount,
          });
        }
      }

      await syncNow();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  /** Drop this month's rows so the standing targets apply again. */
  async function clearMonthOverride() {
    if (busy) return;
    setBusy(true);
    try {
      for (const id of resolved.monthRowIds) await softDelete('Budgets', id);
      await syncNow();
      loadScope('standing');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Budgets"
      footer={
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink disabled:bg-surface-muted disabled:text-muted"
        >
          {busy ? 'Saving…' : 'Save budgets'}
        </button>
      }
    >
      <div className="space-y-4 pt-1">
        <p className="text-[11px] leading-relaxed text-muted">
          A total caps the month. A daily figure is a pace target of its own. Category limits are
          just for reference — they never add up to the total.
        </p>

        <div className="flex rounded-lg bg-surface-muted p-0.5 text-[12px] font-medium">
          {(
            [
              ['standing', 'Every month'],
              ['month', monthLabel(month, locale)],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => loadScope(value)}
              className={`flex-1 rounded-md px-2 py-1.5 transition ${
                scope === value ? 'bg-surface text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {resolved.monthSpecific && scope === 'standing' && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2">
            <p className="text-[11px] leading-relaxed text-warning">
              {monthLabel(month, locale)} has its own budget, which overrides the every-month one.
            </p>
            <button
              type="button"
              onClick={clearMonthOverride}
              className="shrink-0 text-[11px] font-semibold text-warning underline"
            >
              Remove
            </button>
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Monthly total
          </span>
          <div className="flex items-center rounded-xl bg-surface-muted px-3.5 focus-within:ring-2 focus-within:ring-brand">
            <span className="money text-sm text-muted">₹</span>
            <input
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              aria-label="Monthly total budget in rupees"
              className="money min-w-0 flex-1 bg-transparent py-3 pl-1.5 text-sm outline-none"
            />
          </div>
          <span className="mt-1 block text-[11px] text-muted">
            {totalPaise > 0
              ? `${formatPaise(Math.round(totalPaise / monthDays), locale, currency, { decimals: false })} a day across ${monthDays} days`
              : 'No monthly ceiling'}
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Daily pace
          </span>
          <div className="flex items-center rounded-xl bg-surface-muted px-3.5 focus-within:ring-2 focus-within:ring-brand">
            <span className="money text-sm text-muted">₹</span>
            <input
              value={daily}
              onChange={(e) => setDaily(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              aria-label="Daily budget in rupees"
              className="money min-w-0 flex-1 bg-transparent py-3 pl-1.5 text-sm outline-none"
            />
          </div>
          <span className="mt-1 block text-[11px] text-muted">
            {dailyPaise > 0
              ? `≈ ${formatPaise(dailyPaise * monthDays, locale, currency, { decimals: false })} this month`
              : 'No daily target'}
          </span>
        </label>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Category limits
          </p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {expenseCategories.map((category) => {
              const id = asString(category.id);
              return (
                <li key={id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-5 shrink-0 text-center text-sm">
                    {asString(category.icon) || '•'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">{asString(category.name)}</span>
                  <div className="flex w-28 shrink-0 items-center rounded-lg bg-surface-muted px-2">
                    <span className="money text-[11px] text-muted">₹</span>
                    <input
                      value={limits[id] ?? ''}
                      onChange={(e) => setLimits((prev) => ({ ...prev, [id]: e.target.value }))}
                      inputMode="decimal"
                      placeholder="—"
                      aria-label={`Budget for ${asString(category.name)}`}
                      className="money min-w-0 flex-1 bg-transparent py-1.5 pl-1 text-right text-[13px] outline-none"
                    />
                  </div>
                </li>
              );
            })}
            {expenseCategories.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted">No expense categories yet.</li>
            )}
          </ul>
        </div>

        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
          <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Budgets live in the Budgets tab of your sheet, so they sync like everything else.
        </p>
      </div>
    </Sheet>
  );
}
