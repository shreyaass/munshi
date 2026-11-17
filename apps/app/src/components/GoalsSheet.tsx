import { useEffect, useMemo, useState } from 'react';
import { formatPaise, goalProgress, resolveBudgets } from '@em/core';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { GoalSheet } from './GoalSheet';
import { asNumber, asString, categoriesFor, rowMonth } from '../lib/analytics';
import { useMetaValue, useTabRows, useTransactions } from '../lib/repo';

interface GoalsSheetProps {
  open: boolean;
  onClose: () => void;
  /** The month the dashboard is showing. */
  month: string;
}

/**
 * Goals manager: the only place goals are created, edited or removed.
 *
 * A goal is a category limit in the Budgets tab — there is no separate table.
 * The picker only offers categories that don't already have a goal, so a goal
 * can never be created twice for the same category and scope.
 */
export function GoalsSheet({ open, onClose, month }: GoalsSheetProps) {
  const budgetRows = useTabRows('Budgets');
  const categoryRows = useTabRows('Categories');
  const transactions = useTransactions();
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');

  const [mode, setMode] = useState<'list' | 'pick'>('list');
  const [selected, setSelected] = useState('');

  const budget = useMemo(() => resolveBudgets(budgetRows ?? [], month), [budgetRows, month]);
  const expenseCategories = useMemo(
    () => categoriesFor(categoryRows ?? [], 'expense'),
    [categoryRows],
  );

  const spentByCategory = useMemo(() => {
    const totals = new Map<string, number>();
    for (const { row, kind } of transactions ?? []) {
      if (kind !== 'expense' || rowMonth(row) !== month) continue;
      const id = asString(row.category_id);
      totals.set(id, (totals.get(id) ?? 0) + asNumber(row.amount_paise));
    }
    return totals;
  }, [transactions, month]);

  const goals = useMemo(
    () =>
      [...budget.byCategory.entries()]
        .map(([categoryId, target]) => {
          const category = expenseCategories.find((c) => asString(c.id) === categoryId);
          return {
            categoryId,
            name: asString(category?.name) || 'Goal',
            emoji: asString(category?.icon) || '🎯',
            target,
            spent: spentByCategory.get(categoryId) ?? 0,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [budget, expenseCategories, spentByCategory],
  );

  const available = useMemo(
    () => expenseCategories.filter((c) => !budget.byCategory.has(asString(c.id))),
    [expenseCategories, budget],
  );

  useEffect(() => {
    if (!open) return;
    setMode('list');
    setSelected('');
  }, [open]);

  function pick(categoryId: string) {
    setSelected(categoryId);
  }

  function finishGoal() {
    setSelected('');
    setMode('list');
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title="Goals"
        footer={
          mode === 'list' ? (
            <button
              type="button"
              onClick={() => setMode('pick')}
              disabled={available.length === 0}
              className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink disabled:bg-surface-muted disabled:text-muted"
            >
              {available.length === 0 ? 'All categories have a goal' : 'New goal'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('list')}
              className="w-full rounded-xl bg-surface-muted py-3 text-sm font-semibold text-ink"
            >
              Back to goals
            </button>
          )
        }
      >
        {mode === 'list' ? (
          <div className="space-y-3 pt-1">
            <p className="text-[11px] leading-relaxed text-muted">
              A goal is a category limit. The water on the dashboard shows how much of it is
              still unspent this month.
            </p>

            {goals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
                <p className="text-[13px] font-medium">No goals yet</p>
                <p className="mt-1 text-[11px] text-muted">
                  Pick a category and set what you want to keep it under.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {goals.map((goal) => {
                  const progress = goalProgress(goal.target, goal.spent);
                  const tone =
                    progress.status === 'over'
                      ? 'text-danger'
                      : progress.status === 'low'
                        ? 'text-goal-low'
                        : progress.status === 'warn'
                          ? 'text-goal-warn'
                          : 'text-goal-ok';
                  return (
                    <li key={goal.categoryId}>
                      <button
                        type="button"
                        onClick={() => pick(goal.categoryId)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-surface-muted/60"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-base">
                          {goal.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium">
                            {goal.name}
                          </span>
                          <span className="block text-[11px] text-muted">
                            <span className="money">
                              {formatPaise(progress.remaining, locale, currency, {
                                decimals: false,
                              })}
                            </span>{' '}
                            left of{' '}
                            <span className="money">
                              {formatPaise(goal.target, locale, currency, { decimals: false })}
                            </span>
                          </span>
                        </span>
                        <span className={`money shrink-0 text-[12px] font-semibold ${tone}`}>
                          {progress.status === 'over'
                            ? 'Over'
                            : progress.status === 'met'
                              ? 'Met'
                              : `${Math.round(progress.fill * 100)}%`}
                        </span>
                        <Icon name="back" className="h-4 w-4 shrink-0 rotate-180 text-muted" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-[11px] leading-relaxed text-muted">
              Pick a category to set a goal for. Categories that already have one are not shown.
            </p>
            {available.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
                <p className="text-[13px] font-medium">Every category has a goal</p>
                <p className="mt-1 text-[11px] text-muted">
                  Adjust an existing goal, or add a category on the Add screen first.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                {available.map((category) => {
                  const id = asString(category.id);
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => pick(id)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-surface-muted/60"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-base">
                          {asString(category.icon) || '📦'}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                          {asString(category.name) || 'Category'}
                        </span>
                        <Icon name="add" className="h-4 w-4 shrink-0 text-muted" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Sheet>

      <GoalSheet
        open={Boolean(selected)}
        onClose={finishGoal}
        categoryId={selected}
        month={month}
      />
    </>
  );
}
