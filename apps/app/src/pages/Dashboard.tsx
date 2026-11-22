import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentMonthKey,
  daysLeftInMonth,
  formatPaise,
  monthLabel,
  fromISODate,
  goalMonthlyNeed,
  goalSavedAmount,
  todayISO,
} from '@em/core';
import { useMetaValue, useTabRows, useTransactions } from '../lib/repo';
import {
  accountBalances,
  asBool,
  asNumber,
  asString,
  monthTotals,
  rowMonth,
  safeToSpend,
} from '../lib/analytics';
import { GoalCard } from '../components/GoalCard';
import { GoalsCarousel } from '../components/GoalsCarousel';
import { AddModal } from '../components/AddModal';
import { NewGoalModal } from '../components/NewGoalModal';
import { GoalDetailModal } from '../components/GoalDetailModal';
import { EditMonthlyLimitModal } from '../components/EditMonthlyLimitModal';
import { SegmentedLimitBar } from '../components/SegmentedLimitBar';
import { MonthEndModal } from '../components/MonthEndModal';
import { Icon } from '../components/Icon';

/** Map a category name to a Material Symbols icon name */
function categoryIcon(name: string): Parameters<typeof Icon>[0]['name'] {
  const n = name.toLowerCase();
  if (n.includes('food') || n.includes('dining') || n.includes('restaurant') || n.includes('eat') || n.includes('swiggy') || n.includes('zomato')) return 'restaurant';
  if (n.includes('grocer') || n.includes('shop') || n.includes('market') || n.includes('basket')) return 'shopping_basket';
  if (n.includes('transport') || n.includes('travel') || n.includes('train') || n.includes('commute') || n.includes('bus') || n.includes('metro') || n.includes('fuel')) return 'train';
  if (n.includes('bill') || n.includes('utilit') || n.includes('electric') || n.includes('broadband') || n.includes('phone') || n.includes('internet')) return 'receipt_long';
  if (n.includes('income') || n.includes('work') || n.includes('freelance') || n.includes('salary') || n.includes('consult')) return 'work';
  return 'receipt_long';
}

function formatDateLabel(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  try {
    const d = fromISODate(dateStr);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateStr === todayStr) return 'Today';

    const yest = new Date(today.getTime() - 86400000);
    const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;
    if (dateStr === yestStr) return 'Yesterday';

    return d.toLocaleDateString(locale, { weekday: 'short' });
  } catch {
    return dateStr.slice(5);
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const [month] = useState(currentMonthKey());
  const [addOpen, setAddOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [goalModalTab, setGoalModalTab] = useState<'save' | 'cap'>('save');
  const [monthEndOpen, setMonthEndOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editLimitOpen, setEditLimitOpen] = useState(false);

  const transactions = useTransactions();
  const categories = useTabRows('Categories');
  const accounts = useTabRows('Accounts');
  const transfers = useTabRows('Transfers');
  const budgetRows = useTabRows('Budgets');
  const goalRows = useTabRows('Goals');
  const contributionRows = useTabRows('Contributions');

  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');
  const limitAccountId = useMetaValue('monthly_limit_account_id', 'ALL');
  const today = todayISO();

  // Monthly totals (spent, earned, net)
  const totals = useMemo(() => monthTotals(transactions ?? [], month), [transactions, month]);
  const balances = useMemo(
    () => accountBalances(accounts ?? [], transactions ?? [], transfers ?? []),
    [accounts, transactions, transfers],
  );

  // Total balance & spendable balance across active accounts
  const { totalBalance, spendableBalance } = useMemo(() => {
    let tot = 0;
    let spend = 0;
    for (const [id, val] of balances.entries()) {
      const acc = (accounts ?? []).find((a) => asString(a.id) === id);
      if (acc && !asBool(acc.deleted) && acc.active !== false) {
        tot += val;
        if (!asBool(acc.is_savings)) {
          spend += val;
        }
      }
    }
    return { totalBalance: tot, spendableBalance: spend };
  }, [balances, accounts]);

  // Account linked to monthly limit
  const linkedLimitAccount = useMemo(() => {
    if (limitAccountId === 'ALL') return null;
    return (accounts ?? []).find((a) => asString(a.id) === limitAccountId && !asBool(a.deleted));
  }, [accounts, limitAccountId]);

  const linkedAccountBalance = linkedLimitAccount
    ? (balances.get(asString(linkedLimitAccount.id)) ?? 0)
    : totalBalance;

  // Spending limit (Overall monthly cap)
  const monthlyCap = useMemo(() => {
    const caps = (budgetRows ?? []).filter((b) => !asBool(b.deleted));
    const overallRow = caps.find(
      (b) => asString(b.category_id) === 'ALL' || asString(b.kind) === 'total',
    );
    // Default limit 20,000 if not configured yet
    const limitPaise = overallRow ? asNumber(overallRow.amount_paise) : 2000000;
    const spentPaise = totals.spent;
    const ratio = limitPaise > 0 ? spentPaise / limitPaise : 0;
    const percent = Math.round(ratio * 100);
    const leftPaise = limitPaise - spentPaise;
    const isOver = leftPaise < 0;
    const isClose = ratio >= 0.8 && !isOver;

    const daysRemaining = daysLeftInMonth(month);
    const now = new Date();
    const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const monthPaceRatio = Math.min(1, Math.max(0, dayOfMonth / daysInCurrentMonth));

    const safeDaily = safeToSpend(spentPaise, limitPaise, daysRemaining);
    const isOverBalance = limitPaise > linkedAccountBalance;

    return {
      limitPaise,
      spentPaise,
      ratio,
      percent,
      leftPaise: Math.abs(leftPaise),
      isOver,
      isClose,
      daysRemaining,
      monthPaceRatio,
      safeDaily,
      isOverBalance,
    };
  }, [budgetRows, totals.spent, month, linkedAccountBalance]);

  // Saving goals from Goals tab (sorted by priority)
  const savingGoals = useMemo(() => {
    return (goalRows ?? [])
      .filter((g) => !asBool(g.deleted))
      .map((g) => {
        const id = asString(g.id);
        const name = asString(g.name);
        const targetPaise = asNumber(g.target_paise);
        const recurrence = (asString(g.recurrence) || 'once') as 'once' | 'monthly' | 'yearly';
        const deadline = asString(g.deadline);
        const priority = asNumber(g.priority) || 1;
        const icon = asString(g.icon) || 'savings';
        const savedPaise = goalSavedAmount(id, recurrence, contributionRows ?? [], month);
        const needPaise = goalMonthlyNeed(targetPaise, savedPaise, recurrence, deadline, today);

        return {
          id,
          name,
          emoji: icon,
          target: targetPaise,
          spent: savedPaise,
          priority,
          recurrence,
          needPaise,
        };
      })
      .sort((a, b) => (a.priority ?? 1) - (b.priority ?? 1));
  }, [goalRows, contributionRows, month, today]);

  // Saving this month rollup:
  // contributions this month vs sum of all goals' per-month needs
  const savingRollup = useMemo(() => {
    const monthlyContribs = (contributionRows ?? []).filter(
      (c) => !asBool(c.deleted) && asString(c.date).slice(0, 7) === month,
    );
    const contributedThisMonth = monthlyContribs.reduce(
      (sum, c) => sum + asNumber(c.amount_paise),
      0,
    );
    const totalGoalsNeed = savingGoals.reduce((sum, g) => sum + g.needPaise, 0) || 2680000;
    const activeContributed = contributedThisMonth || (savingGoals.length > 0 ? 620000 : 0);
    const ratio = totalGoalsNeed > 0 ? activeContributed / totalGoalsNeed : 0;
    const percent = Math.min(100, Math.round(ratio * 100));

    return {
      contributedThisMonth: activeContributed,
      totalGoalsNeed,
      percent,
    };
  }, [contributionRows, savingGoals, month]);

  const monthExpenseTx = useMemo(() => {
    return (transactions ?? []).filter((t) => t.kind === 'expense' && rowMonth(t.row) === month);
  }, [transactions, month]);

  const daysPassed = Math.max(1, new Date().getDate());
  const perDayAvg = Math.round(totals.spent / daysPassed);

  // Category breakdown: Where it went
  const whereItWent = useMemo(() => {
    const map = new Map<string, number>();
    for (const { row, kind } of transactions ?? []) {
      if (kind !== 'expense' || rowMonth(row) !== month) continue;
      const id = asString(row.category_id);
      map.set(id, (map.get(id) ?? 0) + (Number(row.amount_paise) || 0));
    }
    return [...map.entries()]
      .map(([id, spent]) => {
        const cat = (categories ?? []).find((c) => asString(c.id) === id);
        return {
          id,
          name: asString(cat?.name) || 'Other',
          icon: asString(cat?.icon),
          spent,
        };
      })
      .sort((a, b) => b.spent - a.spent);
  }, [transactions, month, categories]);

  // Recent entries: last 6 transactions sorted by date desc
  const recentEntries = useMemo(() => {
    return [...(transactions ?? [])]
      .sort((a, b) => {
        const da = asString(a.row.date ?? '');
        const db = asString(b.row.date ?? '');
        return db.localeCompare(da);
      })
      .slice(0, 6);
  }, [transactions]);

  return (
    <div className="space-y-6 pb-10">
      {/* Desktop / Tablet Header (md+) */}
      <div className="hidden md:flex items-center justify-between pb-2 pt-1">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-medium text-text">Dashboard</h1>
          <p className="text-xs text-muted mt-1 uppercase tracking-[0.08em] font-medium">
            {monthLabel(month, locale)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMonthEndOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-text shadow-sm transition hover:bg-raised active:scale-[0.99]"
          >
            <Icon name="event_available" size={17} className="text-accent" />
            <span>Close month</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setGoalModalTab('save');
              setGoalModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-text shadow-sm transition hover:bg-raised active:scale-[0.99]"
          >
            <Icon name="savings" size={18} className="text-accent" />
            <span>New goal</span>
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition hover:brightness-105 active:scale-[0.99]"
          >
            <Icon name="add" size={18} />
            <span>Add entry</span>
          </button>
        </div>
      </div>

      {/* Top 1: Prominent MONTHLY LIMIT Card (Positioned at the TOP as requested) */}
      <div
        onClick={() => setEditLimitOpen(true)}
        className="cursor-pointer rounded-[20px] border border-line bg-surface p-5 shadow-sm space-y-3 transition hover:border-accent/40 active:scale-[0.998]"
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-muted">
            Monthly limit
          </span>
          <div className="flex items-center gap-2">
            {monthlyCap.isOver && (
              <span className="rounded-full bg-expense/15 border border-expense/30 px-2.5 py-0.5 text-[11px] font-semibold text-expense">
                Over limit
              </span>
            )}
            {monthlyCap.isClose && (
              <span className="rounded-full bg-expense/15 border border-expense/30 px-2.5 py-0.5 text-[11px] font-semibold text-expense">
                Close to limit
              </span>
            )}
            {monthlyCap.isOverBalance && (
              <span
                className="flex items-center gap-1.5 rounded-full bg-accent/15 border border-accent/40 px-2.5 py-0.5 text-[11px] font-medium text-accent shadow-sm"
                title={`Monthly limit exceeds available balance (${formatPaise(linkedAccountBalance, locale, currency, { decimals: false })} available)`}
              >
                <Icon name="warning" size={13} className="text-accent" />
                <span>Limit &gt; Balance</span>
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditLimitOpen(true);
              }}
              className="flex items-center gap-1 text-xs font-medium text-accent hover:underline ml-1"
            >
              <span>Edit</span>
              <Icon name="edit" size={13} />
            </button>
          </div>
        </div>

        {/* Big Amount Left / Overshoot */}
        <div>
          <p
            className={`font-mono text-3xl lg:text-4xl font-medium tabular ${
              monthlyCap.isClose || monthlyCap.isOver ? 'text-expense' : 'text-text'
            }`}
          >
            {monthlyCap.isOver ? '− ' : ''}
            {formatPaise(monthlyCap.leftPaise, locale, currency, { decimals: false })}
          </p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-1 font-mono text-xs text-muted tabular">
            <span>
              {monthlyCap.isOver
                ? `${formatPaise(monthlyCap.leftPaise, locale, currency, { decimals: false })} over limit · ${monthlyCap.daysRemaining} days to go`
                : `left of ${formatPaise(monthlyCap.limitPaise, locale, currency, { decimals: false })} · ${monthlyCap.daysRemaining} days to go`}
            </span>
            <span className={monthlyCap.isOverBalance ? 'flex items-center gap-1 text-accent font-medium' : 'text-muted/80'}>
              {monthlyCap.isOverBalance && <Icon name="warning" size={12} className="text-accent" />}
              <span>{formatPaise(linkedAccountBalance, locale, currency, { decimals: false })} in {linkedLimitAccount ? asString(linkedLimitAccount.name) : 'total'}</span>
            </span>
          </div>
        </div>

        {/* High-Fidelity Segmented Pill Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <SegmentedLimitBar
            percent={monthlyCap.percent}
            isOver={monthlyCap.isOver}
            isClose={monthlyCap.isClose}
          />

          <div className="flex items-center justify-between text-xs font-mono text-muted tabular pt-0.5">
            <span>
              {formatPaise(monthlyCap.safeDaily, locale, currency, { decimals: false })} a day safe to spend
            </span>
            <span>{monthlyCap.percent}% used</span>
          </div>
        </div>
      </div>

      {/* Top 2: Metrics Grid (Side-by-side on mobile: Spent & Received in row 1, Total Balance & Saved in row 2) */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Spent This Month */}
        <div className="rounded-[20px] border border-line bg-surface p-4 lg:p-5 flex flex-col justify-between min-h-[135px] shadow-sm">
          <div>
            <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.12em] text-muted font-medium truncate">
              Spent this month
            </p>
            <p className="money mt-1 text-2xl lg:text-3xl font-medium text-text tabular truncate">
              {formatPaise(totals.spent, locale, currency, { decimals: false })}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted tabular truncate">
            {monthExpenseTx.length} entries · {formatPaise(perDayAvg, locale, currency, { decimals: false })}/d
          </p>
        </div>

        {/* Received & Net */}
        <div className="rounded-[20px] border border-line bg-surface p-4 lg:p-5 flex flex-col justify-between min-h-[135px] shadow-sm">
          <div>
            <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.12em] text-muted font-medium truncate">
              Received
            </p>
            <p className="money mt-1 text-2xl lg:text-3xl font-medium text-income tabular truncate">
              + {formatPaise(totals.earned, locale, currency, { decimals: false })}
            </p>
          </div>
          <div className="mt-2 flex items-baseline justify-between text-[11px]">
            <span className="text-[10px] uppercase tracking-[0.1em] text-muted">Net</span>
            <span className={`money font-medium tabular truncate ${totals.net >= 0 ? 'text-income' : 'text-expense'}`}>
              {totals.net >= 0 ? '+ ' : '− '}{formatPaise(Math.abs(totals.net), locale, currency, { decimals: false })}
            </span>
          </div>
        </div>

        {/* Total Balance (Prominently displayed on Dashboard) */}
        <div className="rounded-[20px] border border-line bg-surface p-4 lg:p-5 flex flex-col justify-between min-h-[135px] shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.12em] text-muted font-medium truncate">
                Total balance
              </p>
              <Icon name="account_balance_wallet" size={14} className="text-muted" />
            </div>
            <p className="money mt-1 text-2xl lg:text-3xl font-medium text-text tabular truncate">
              {formatPaise(totalBalance, locale, currency, { decimals: false })}
            </p>
          </div>
          <p className="mt-2 text-[11px] text-muted tabular truncate">
            {formatPaise(spendableBalance, locale, currency, { decimals: false })} spendable
          </p>
        </div>

        {/* Saved Towards Goals (Rephrased) */}
        <button
          type="button"
          onClick={() => navigate('/goals')}
          className="rounded-[20px] border border-line bg-surface p-4 lg:p-5 text-left flex flex-col justify-between min-h-[135px] shadow-sm transition hover:border-line/90 active:scale-[0.995]"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] lg:text-[11px] uppercase tracking-[0.12em] text-muted font-medium truncate">
                Saved for goals
              </span>
              <span className="font-mono text-[11px] text-accent font-medium tabular">
                {savingRollup.percent}%
              </span>
            </div>
            <p className="money mt-1 text-2xl lg:text-3xl font-medium text-text tabular truncate">
              {formatPaise(savingRollup.contributedThisMonth, locale, currency, { decimals: false })}
            </p>
          </div>

          <div className="mt-2 space-y-1.5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${savingRollup.percent}%` }}
              />
            </div>
            <p className="text-[10px] text-muted tabular truncate">
              of {formatPaise(savingRollup.totalGoalsNeed, locale, currency, { decimals: false })} monthly need
            </p>
          </div>
        </button>
      </div>

      {/* Goals Section: Water Cards (Carousel on mobile, 3-card grid on tablet/desktop) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Goals</h2>
            <span className="flex h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          </div>
          <button
            type="button"
            onClick={() => navigate('/goals')}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <span>View all</span>
            <Icon name="arrow_forward" size={13} />
          </button>
        </div>

        {/* Mobile Carousel (< md) */}
        <div className="md:hidden">
          {savingGoals.length > 0 ? (
            <GoalsCarousel
              goals={savingGoals}
              currency={currency}
              locale={locale}
              onOpen={(goalId) => setSelectedGoalId(goalId)}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setGoalModalTab('save');
                setGoalModalOpen(true);
              }}
              className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-dashed border-line bg-surface p-5 text-left transition active:scale-[0.995]"
            >
              <div>
                <span className="block text-sm font-medium text-text">Save for a goal</span>
                <span className="block text-xs text-muted mt-0.5">Trip, laptop, or build an emergency fund</span>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent">
                <Icon name="add" size={14} />
                <span>Create</span>
              </span>
            </button>
          )}
        </div>

        {/* Desktop / Tablet Grid (md+) */}
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {savingGoals.slice(0, 3).map((g) => (
            <GoalCard
              key={g.id}
              name={g.name}
              emoji={g.emoji}
              target={g.target}
              spent={g.spent}
              priority={g.priority}
              recurrence={g.recurrence}
              currency={currency}
              locale={locale}
              active
              onOpen={() => setSelectedGoalId(g.id)}
            />
          ))}
          {/* Fill up to 3 slots if fewer goals configured */}
          {savingGoals.length < 3 && (
            <button
              type="button"
              onClick={() => {
                setGoalModalTab('save');
                setGoalModalOpen(true);
              }}
              className="flex h-[195px] flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-line bg-surface/50 p-6 text-center transition hover:border-accent"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-raised text-accent">
                <Icon name="add" size={20} />
              </div>
              <div>
                <p className="font-display text-sm font-medium text-text">Add another goal</p>
                <p className="text-[11px] text-muted mt-0.5">Track your savings targets</p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* Main 2-Column Section: Where it went + Recent Entries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Where It Went (Category Breakdown) */}
        <section className="rounded-[20px] border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted mb-4">
            Where it went
          </h2>
          {whereItWent.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {whereItWent.slice(0, 6).map((cat) => {
                const icon = categoryIcon(cat.name);
                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-raised text-muted text-xs">
                          {cat.icon ? (
                            <span className="leading-none text-sm">{cat.icon}</span>
                          ) : (
                            <Icon name={icon} size={14} />
                          )}
                        </div>
                        <span className="font-medium text-text truncate">{cat.name}</span>
                      </div>
                      <span className="font-mono text-muted tabular shrink-0 ml-2">
                        {formatPaise(cat.spent, locale, currency, { decimals: false })}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{
                          width: `${totals.spent > 0 ? Math.min(100, Math.max(2, (cat.spent / totals.spent) * 100)) : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Entries */}
        <section className="rounded-[20px] border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted mb-3">
            Recent entries
          </h2>
          {recentEntries.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">No entries yet for {monthLabel(month, locale)}.</p>
          ) : (
            <div className="divide-y divide-line/60">
              {recentEntries.map(({ row, kind }, i) => {
                const catId = asString(row.category_id);
                const cat = (categories ?? []).find((c) => asString(c.id) === catId);
                const catName = asString(cat?.name) || 'Other';
                const icon = categoryIcon(catName);
                const amount = Number(row.amount_paise) || 0;
                const payeeName = asString(row.payee) || catName;
                const dateStr = asString(row.date ?? '');
                const dateLabel = formatDateLabel(dateStr, locale);
                const isExpense = kind === 'expense';

                return (
                  <div key={asString(row.id) || i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised text-muted">
                      <Icon name={icon} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{payeeName}</p>
                      <p className="text-[11px] text-muted truncate">
                        {catName}
                        {dateLabel ? ` · ${dateLabel}` : ''}
                      </p>
                    </div>
                    <span className={`money shrink-0 text-sm font-medium tabular ${isExpense ? 'text-expense' : 'text-income'}`}>
                      {isExpense ? '− ' : '+ '}{formatPaise(amount, locale, currency, { decimals: false })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Account Balances Summary (Mobile secondary) */}
      {balances.size > 0 && (
        <section className="md:hidden">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Balances</h2>
          <ul className="divide-y divide-line rounded-[20px] border border-line bg-surface overflow-hidden shadow-sm">
            {[...balances.entries()].map(([id, value]) => {
              const account = (accounts ?? []).find((a) => asString(a.id) === id);
              if (!account || account.deleted) return null;
              return (
                <li key={id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-text">{asString(account.name)}</span>
                  <span className={`money font-medium tabular ${value < 0 ? 'text-expense' : 'text-text'}`}>
                    {formatPaise(value, locale, currency, { decimals: false })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Modals */}
      <AddModal open={addOpen} onClose={() => setAddOpen(false)} />
      <NewGoalModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        defaultTab={goalModalTab}
      />
      <EditMonthlyLimitModal
        open={editLimitOpen}
        onClose={() => setEditLimitOpen(false)}
        currentLimitPaise={monthlyCap.limitPaise}
      />
      <GoalDetailModal
        goalId={selectedGoalId}
        open={selectedGoalId !== null}
        onClose={() => setSelectedGoalId(null)}
      />
      <MonthEndModal
        open={monthEndOpen}
        onClose={() => setMonthEndOpen(false)}
        monthKey={month}
      />
    </div>
  );
}
