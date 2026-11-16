import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import {
  currentMonthKey,
  daysLeftInMonth,
  formatPaise,
  monthLabel,
} from '@em/core';
import { useMetaValue, useTabRows, useTransactions } from '../lib/repo';
import {
  accountBalances,
  asNumber,
  asString,
  categoryTotals,
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
  const chartData = breakdown.slice(0, 6).map((c) => ({ name: c.name, value: c.amount, color: c.color }));

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
          className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none dark:bg-slate-800 dark:text-slate-200"
        />
        <span className="text-xs text-slate-400">{monthLabel(month, locale)}</span>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">Spent this month</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          {formatPaise(totals.spent, locale, currency, { decimals: false })}
        </p>
        <div className="mt-3 flex items-center gap-4 text-[11px]">
          <span className="text-emerald-300">+{formatPaise(totals.earned, locale, currency, { decimals: false })} in</span>
          <span className={totals.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
            {totals.net >= 0 ? 'Saved ' : 'Overspent '}
            {formatPaise(Math.abs(totals.net), locale, currency, { decimals: false })}
          </span>
          {prevTotals.spent > 0 && (
            <span className={delta > 0 ? 'text-rose-300' : 'text-emerald-300'}>
              {delta > 0 ? '↑' : '↓'} {Math.abs(Math.round(delta * 100))}% vs last month
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Entries</p>
          <p className="text-lg font-semibold">{totals.count}</p>
        </div>
        <div className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Daily average</p>
          <p className="text-lg font-semibold">
            {formatPaise(Math.round(totals.spent / Math.max(1, new Date().getDate())), locale, currency, { decimals: false })}
          </p>
        </div>
      </div>

      {budget > 0 && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-500">Safe to spend today</p>
            <p className="text-[11px] text-indigo-400">
              {formatPaise(Math.max(0, budget - totals.spent), locale, currency, { decimals: false })} left
            </p>
          </div>
          <p className="mt-1 text-2xl font-semibold text-indigo-700 dark:text-indigo-200">
            {formatPaise(perDay, locale, currency, { decimals: false })}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-indigo-100 dark:bg-indigo-900">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.min(100, (totals.spent / budget) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Where it went</h2>
        {chartData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400 dark:border-slate-800">
            No expenses recorded for {monthLabel(month, locale)} yet.
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
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
              {breakdown.slice(0, 6).map((c) => (
                <li key={c.categoryId} className="flex items-center gap-2 text-[11px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="truncate text-slate-600 dark:text-slate-300">{c.name}</span>
                  <span className="ml-auto shrink-0 font-medium text-slate-500">
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
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Top payees</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {payees.map((p) => (
              <li key={p.name} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="truncate">{p.name}</span>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {formatPaise(p.total, locale, currency, { decimals: false })} · {p.count}×
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {balances.size > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Balances</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {[...balances.entries()].map(([id, value]) => {
              const account = (accounts ?? []).find((a) => asString(a.id) === id);
              if (!account || account.deleted) return null;
              return (
                <li key={id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{asString(account.name)}</span>
                  <span className={value < 0 ? 'font-medium text-rose-600' : 'font-medium'}>
                    {formatPaise(value, locale, currency, { decimals: false })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="pt-1 text-center text-[10px] text-slate-400">
        {transactions?.length ?? 0} entries synced from your sheet
      </p>
    </div>
  );
}
