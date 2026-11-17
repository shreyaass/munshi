import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import {
  currentMonthKey,
  daysLeftInMonth,
  formatPaise,
  goalProgress,
  monthLabel,
  resolveBudgets,
  todayISO,
} from '@em/core';
import { useMetaValue, useTabRows, useTransactions } from '../lib/repo';
import {
  accountBalances,
  asString,
  averageDays,
  averagePerDay,
  categoryTotals,
  chartColor,
  monthTotals,
  rowMonth,
  safeToSpend,
  spentOn,
  topPayees,
} from '../lib/analytics';
import { BudgetSheet } from '../components/BudgetSheet';
import { GoalSheet } from '../components/GoalSheet';
import { GoalsCarousel } from '../components/GoalsCarousel';
import { GoalsSheet } from '../components/GoalsSheet';
import { Icon } from '../components/Icon';

export function Dashboard() {
  const [month, setMonth] = useState(currentMonthKey());
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalId, setGoalId] = useState('');
  const transactions = useTransactions();
  const categories = useTabRows('Categories');
  const accounts = useTabRows('Accounts');
  const transfers = useTabRows('Transfers');
  const budgetRows = useTabRows('Budgets');
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');

  const totals = useMemo(() => monthTotals(transactions ?? [], month), [transactions, month]);
  const breakdown = useMemo(
    () => categoryTotals(transactions ?? [], categories ?? [], month, 'expense'),
    [transactions, categories, month],
  );
  const payees = useMemo(() => topPayees(transactions ?? [], month, 4), [transactions, month]);
  const balances = useMemo(
    () => accountBalances(accounts ?? [], transactions ?? [], transfers ?? []),
    [accounts, transactions, transfers],
  );

  const budget = useMemo(() => resolveBudgets(budgetRows ?? [], month), [budgetRows, month]);
  const goals = useMemo(() => {
    const spentByCategory = new Map<string, number>();
    for (const { row, kind } of transactions ?? []) {
      if (kind !== 'expense' || rowMonth(row) !== month) continue;
      const id = asString(row.category_id);
      spentByCategory.set(id, (spentByCategory.get(id) ?? 0) + (Number(row.amount_paise) || 0));
    }

    return [...budget.byCategory.entries()]
      .map(([categoryId, target]) => {
        const category = (categories ?? []).find((c) => asString(c.id) === categoryId);
        return {
          categoryId,
          name: asString(category?.name) || 'Goal',
          emoji: asString(category?.icon) || '🎯',
          target,
          spent: spentByCategory.get(categoryId) ?? 0,
        };
      })
      .sort((a, b) => goalProgress(a.target, a.spent).fill - goalProgress(b.target, b.spent).fill);
  }, [budget, transactions, categories, month]);
  const ceiling = budget.ceiling;
  const todaySpent = useMemo(() => spentOn(transactions ?? [], todayISO()), [transactions]);

  const perDay = safeToSpend(totals.spent, ceiling, daysLeftInMonth(month));
  const avgPerDay = averagePerDay(totals.spent, month);
  const avgDays = averageDays(month);
  const chartData = breakdown.slice(0, 6).map((c, i) => ({ name: c.name, value: c.amount, color: chartColor(i) }));
  const overBudget = ceiling > 0 && totals.spent > ceiling;
  const spentTone = overBudget || totals.net < 0 ? 'text-danger-bright' : 'text-accent';

  const prevMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, (m ?? 1) - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [month]);
  const prevTotals = useMemo(() => monthTotals(transactions ?? [], prevMonth), [transactions, prevMonth]);
  const delta = prevTotals.spent > 0 ? (totals.spent - prevTotals.spent) / prevTotals.spent : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value || currentMonthKey())}
          className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink outline-none "
        />
        <span className="text-xs text-muted">{monthLabel(month, locale)}</span>
      </div>

      <div className="rounded-2xl bg-hero p-4 text-hero-ink">
        <p className="text-[11px] uppercase tracking-[0.12em] text-hero-muted">Spent this month</p>
        <p className={`money mt-1 text-4xl font-semibold leading-none ${spentTone}`}>
          {formatPaise(totals.spent, locale, currency, { decimals: false })}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
          <span className="font-medium text-gold-on-hero">
            Received {formatPaise(totals.earned, locale, currency, { decimals: false })}
          </span>
          <span className={totals.net >= 0 ? 'font-medium text-hero-ink' : 'font-medium text-danger-bright'}>
            {totals.net >= 0 ? 'Net ' : 'Short by '}
            {formatPaise(Math.abs(totals.net), locale, currency, { decimals: false })}
          </span>
          {prevTotals.spent > 0 && (
            <span className={delta > 0 ? 'text-danger-bright' : 'text-success-bright'}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta * 100))}% vs last month
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted">Entries</p>
          <p className="money text-lg font-semibold">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted">Avg / day</p>
          <p className="money text-lg font-semibold">
            {formatPaise(avgPerDay, locale, currency, { decimals: false })}
          </p>
          <p className="text-[10px] text-muted">{avgDays} days</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setBudgetOpen(true)}
        className={`block w-full rounded-xl border p-3.5 text-left transition active:scale-[0.995] ${
          budget.source === 'none'
            ? 'border-dashed border-line bg-surface'
            : overBudget
              ? 'border-danger/25 bg-danger-soft'
              : 'border-brand/20 bg-brand/[0.06]'
        }`}
      >
        {budget.source === 'none' ? (
          <span className="flex items-center justify-between gap-3">
            <span className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-muted">
                Budget
              </span>
              <span className="mt-1 block text-[13px] font-medium">Add a monthly target</span>
              <span className="block text-[11px] text-muted">See what is safe to spend each day.</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-brand-ink">
              <Icon name="add" className="h-3 w-3" />
              Set up
            </span>
          </span>
        ) : (
          <>
            <span className="flex items-baseline justify-between gap-2">
              <span
                className={`text-[11px] font-medium uppercase tracking-wide ${
                  overBudget ? 'text-danger' : 'text-brand'
                }`}
              >
                Safe to spend today
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                <Icon name="edit" className="h-3 w-3" />
                Edit
              </span>
            </span>
            <span className="flex items-baseline justify-between gap-2">
              <span
                className={`money mt-1 text-2xl font-semibold ${overBudget ? 'text-danger' : 'text-brand'}`}
              >
                {formatPaise(perDay, locale, currency, { decimals: false })}
              </span>
              <span className={`money text-[11px] ${overBudget ? 'text-danger' : 'text-muted'}`}>
                {overBudget
                  ? `${formatPaise(totals.spent - ceiling, locale, currency, { decimals: false })} over`
                  : `${formatPaise(Math.max(0, ceiling - totals.spent), locale, currency, { decimals: false })} left`}
              </span>
            </span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-surface-muted">
              <span
                className={`block h-full rounded-full ${overBudget ? 'bg-danger' : 'bg-brand'}`}
                style={{ width: `${Math.min(100, (totals.spent / ceiling) * 100)}%` }}
              />
            </span>
            <span className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
              {budget.total > 0 && (
                <span>
                  <span className="money">
                    {formatPaise(budget.total, locale, currency, { decimals: false })}
                  </span>{' '}
                  total ·{' '}
                  <span className="money">
                    {Math.min(999, Math.round((totals.spent / budget.total) * 100))}%
                  </span>{' '}
                  used
                </span>
              )}
              {budget.daily > 0 && (
                <span>
                  <span className="money">
                    {formatPaise(budget.daily, locale, currency, { decimals: false })}
                  </span>
                  /day ·{' '}
                  <span className="money">
                    {formatPaise(todaySpent, locale, currency, { decimals: false })}
                  </span>{' '}
                  today
                </span>
              )}
              {budget.total === 0 && budget.daily > 0 && <span>Daily pace × this month&apos;s days</span>}
            </span>
          </>
        )}
      </button>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Goals</h2>
          <button
            type="button"
            onClick={() => setGoalsOpen(true)}
            className="flex items-center gap-1 text-[11px] font-medium text-muted"
          >
            <Icon name="edit" className="h-3 w-3" />
            Edit goals
          </button>
        </div>
        {goals.length > 0 ? (
          <GoalsCarousel
            goals={goals}
            currency={currency}
            locale={locale}
            onOpen={setGoalId}
          />
        ) : (
          <button
            type="button"
            onClick={() => setGoalsOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-line bg-surface p-3.5 text-left"
          >
            <span className="block">
              <span className="block text-[13px] font-medium">Set a goal per category</span>
              <span className="block text-[11px] text-muted">
                Watch the water drop as you spend.
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-semibold text-brand-ink">
              <Icon name="add" className="h-3 w-3" />
              Set up
            </span>
          </button>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Where it went</h2>
        {chartData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line py-10 text-center text-xs text-muted ">
            No expenses recorded for {monthLabel(month, locale)} yet.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-line p-3 ">
            <div className="h-32 w-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={34}
                    outerRadius={58}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {breakdown.slice(0, 6).map((c, i) => {
                const limit = budget.byCategory.get(c.categoryId) ?? 0;
                const over = limit > 0 && c.amount > limit;
                return (
                  <li key={c.categoryId} className="text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chartColor(i) }} />
                      <span className="truncate text-muted ">{c.name}</span>
                      <span className={`ml-auto shrink-0 font-medium ${over ? 'text-danger' : 'text-muted'}`}>
                        {Math.round(c.share * 100)}%
                      </span>
                    </div>
                    {limit > 0 && (
                      <div className="ml-4 mt-0.5 h-1 overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className={`h-full rounded-full ${over ? 'bg-danger' : 'bg-brand'}`}
                          style={{ width: `${Math.min(100, (c.amount / limit) * 100)}%` }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {payees.length > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Top payees</h2>
          <ul className="divide-y divide-line rounded-xl border border-line ">
            {payees.map((p) => (
              <li key={p.name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">{p.name}</span>
                <span className="money shrink-0 text-xs font-medium text-muted">
                  {formatPaise(p.total, locale, currency, { decimals: false })} · {p.count}×
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {balances.size > 0 && (
        <section>
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Balances</h2>
          <ul className="divide-y divide-line rounded-xl border border-line ">
            {[...balances.entries()].map(([id, value]) => {
              const account = (accounts ?? []).find((a) => asString(a.id) === id);
              if (!account || account.deleted) return null;
              return (
                <li key={id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{asString(account.name)}</span>
                  <span className={value < 0 ? 'money font-medium text-danger' : 'money font-medium'}>
                    {formatPaise(value, locale, currency, { decimals: false })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="pt-1 text-center text-[10px] text-muted">
        {transactions?.length ?? 0} entries synced from your sheet
      </p>

      <BudgetSheet open={budgetOpen} onClose={() => setBudgetOpen(false)} month={month} />
      <GoalsSheet open={goalsOpen} onClose={() => setGoalsOpen(false)} month={month} />
      <GoalSheet
        open={Boolean(goalId)}
        onClose={() => setGoalId('')}
        categoryId={goalId}
        month={month}
      />
    </div>
  );
}
