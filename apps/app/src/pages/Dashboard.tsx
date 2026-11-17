import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { currentMonthKey, daysLeftInMonth, formatPaise, monthLabel } from '@em/core';
import { useMetaValue, useTabRows, useTransactions } from '../lib/repo';
import {
  accountBalances,
  asNumber,
  asString,
  averageDays,
  averagePerDay,
  categoryTotals,
  chartColor,
  monthTotals,
  safeToSpend,
  topPayees,
} from '../lib/analytics';

export function Dashboard() {
  const [month, setMonth] = useState(currentMonthKey());
  const transactions = useTransactions();
  const categories = useTabRows('Categories');
  const accounts = useTabRows('Accounts');
  const transfers = useTabRows('Transfers');
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

  const budget = useMemo(
    () =>
      (categories ?? [])
        .filter((c) => asString(c.type) === 'expense' && !c.deleted)
        .reduce((sum, c) => sum + asNumber(c.monthly_budget_paise), 0),
    [categories],
  );

  const perDay = safeToSpend(totals.spent, budget, daysLeftInMonth(month));
  const avgPerDay = averagePerDay(totals.spent, month);
  const avgDays = averageDays(month);
  const chartData = breakdown.slice(0, 6).map((c, i) => ({ name: c.name, value: c.amount, color: chartColor(i) }));
  const overBudget = budget > 0 && totals.spent > budget;
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

      {budget > 0 && (
        <div
          className={`rounded-xl border p-3.5 ${
            overBudget
              ? 'border-danger/25 bg-danger-soft'
              : 'border-brand/20 bg-brand/[0.06]'
          }`}
        >
          <div className="flex items-baseline justify-between">
            <p className={`text-[11px] font-medium uppercase tracking-wide ${overBudget ? 'text-danger' : 'text-brand'}`}>
              Safe to spend today
            </p>
            <p className={`money text-[11px] ${overBudget ? 'text-danger' : 'text-muted'}`}>
              {overBudget
                ? `${formatPaise(totals.spent - budget, locale, currency, { decimals: false })} over`
                : `${formatPaise(Math.max(0, budget - totals.spent), locale, currency, { decimals: false })} left`}
            </p>
          </div>
          <p className={`money mt-1 text-2xl font-semibold ${overBudget ? 'text-danger' : 'text-brand'}`}>
            {formatPaise(perDay, locale, currency, { decimals: false })}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className={`h-full rounded-full ${overBudget ? 'bg-danger' : 'bg-brand'}`}
              style={{ width: `${Math.min(100, (totals.spent / budget) * 100)}%` }}
            />
          </div>
        </div>
      )}

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
              {breakdown.slice(0, 6).map((c, i) => (
                <li key={c.categoryId} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: chartColor(i) }} />
                  <span className="truncate text-muted ">{c.name}</span>
                  <span className="ml-auto shrink-0 font-medium text-muted">
                    {Math.round(c.share * 100)}%
                  </span>
                </li>
              ))}
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
    </div>
  );
}
