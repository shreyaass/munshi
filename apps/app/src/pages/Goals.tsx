import { useEffect, useMemo, useState } from 'react';
import { formatPaise, goalSavedAmount, currentMonthKey, monthLabel, todayISO } from '@em/core';
import { Icon } from '../components/Icon';
import { GoalCard } from '../components/GoalCard';
import { StackedGoalsWidget } from '../components/StackedGoalsWidget';
import { NewGoalModal } from '../components/NewGoalModal';
import { GoalDetailModal } from '../components/GoalDetailModal';
import { EditMonthlyLimitModal } from '../components/EditMonthlyLimitModal';
import { useTabRows, useMetaValue } from '../lib/repo';
import { asBool, asNumber, asString } from '../lib/analytics';

export function Goals() {
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'save' | 'cap'>('save');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editLimitOpen, setEditLimitOpen] = useState(false);

  useEffect(() => {
    function handleOpenNew() {
      setModalTab('save');
      setModalOpen(true);
    }
    window.addEventListener('open-new-goal', handleOpenNew);
    return () => window.removeEventListener('open-new-goal', handleOpenNew);
  }, []);

  const goalRows = useTabRows('Goals');
  const contributionRows = useTabRows('Contributions');
  const periodRows = useTabRows('GoalPeriods');
  const budgetRows = useTabRows('Budgets');
  const expenseRows = useTabRows('Expenses');
  const categoryRows = useTabRows('Categories');

  const today = todayISO();
  const currentMonth = currentMonthKey(); // e.g. "2026-11"
  const currentYear = today.slice(0, 4);
  const currentMonthIndex = new Date().getMonth(); // 0-based: 10 for November

  // Active saving goals sorted by priority
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
        const savedPaise = goalSavedAmount(id, recurrence, contributionRows ?? [], currentMonth);

        return {
          id,
          name,
          targetPaise,
          savedPaise,
          recurrence,
          deadline,
          priority,
          icon,
          startDate: asString(g.start_date) || today,
        };
      })
      .sort((a, b) => a.priority - b.priority);
  }, [goalRows, contributionRows, currentMonth, today]);

  const stackGoals = useMemo(() => {
    return savingGoals.map((g) => ({
      id: g.id,
      name: g.name,
      emoji: g.icon,
      targetPaise: g.targetPaise,
      savedPaise: g.savedPaise,
      priority: g.priority,
      recurrence: g.recurrence,
      deadline: g.deadline,
    }));
  }, [savingGoals]);

  // Monthly savings recurring goal for the dot strip
  const monthlyGoal = useMemo(() => {
    return savingGoals.find((g) => g.recurrence === 'monthly');
  }, [savingGoals]);

  // Dot strip for monthly goal (12 months: Jan..Dec)
  const dotStrip = useMemo(() => {
    const monthLetters = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    if (!monthlyGoal) {
      return monthLetters.map((letter, idx) => ({
        month: idx + 1,
        letter,
        status: idx === currentMonthIndex ? 'current' : idx < currentMonthIndex ? 'hit' : 'upcoming',
      }));
    }

    const periodsForGoal = (periodRows ?? []).filter(
      (p) => !asBool(p.deleted) && asString(p.goal_id) === monthlyGoal.id,
    );

    let hitsCount = 0;
    let closedCount = 0;

    const dots = monthLetters.map((letter, idx) => {
      const monthNum = idx + 1;
      const periodKey = `${currentYear}-${String(monthNum).padStart(2, '0')}`;

      if (idx < currentMonthIndex) {
        // Past month
        closedCount++;
        const record = periodsForGoal.find((p) => asString(p.period_key) === periodKey);
        if (record) {
          const status = asString(record.status);
          if (status === 'hit') {
            hitsCount++;
            return { month: monthNum, letter, status: 'hit' };
          }
          if (status === 'partial') {
            return { month: monthNum, letter, status: 'partial' };
          }
          return { month: monthNum, letter, status: 'missed' };
        }
        // If no period record exists, infer from contributions
        const contrib = goalSavedAmount(monthlyGoal.id, 'monthly', contributionRows ?? [], periodKey);
        if (contrib >= monthlyGoal.targetPaise && monthlyGoal.targetPaise > 0) {
          hitsCount++;
          return { month: monthNum, letter, status: 'hit' };
        }
        if (contrib > 0) {
          return { month: monthNum, letter, status: 'partial' };
        }
        return { month: monthNum, letter, status: 'missed' };
      }

      if (idx === currentMonthIndex) {
        return { month: monthNum, letter, status: 'current' };
      }

      return { month: monthNum, letter, status: 'upcoming' };
    });

    return dots;
  }, [monthlyGoal, periodRows, currentMonthIndex, currentYear, contributionRows]);

  const hitsSummary = useMemo(() => {
    const hitDots = dotStrip.filter((d) => d.status === 'hit').length;
    const pastDots = dotStrip.filter((d) => d.status !== 'upcoming' && d.status !== 'current').length;
    return { hits: hitDots, total: pastDots };
  }, [dotStrip]);

  // One-time goal for pace bar
  const oneTimeGoal = useMemo(() => {
    return savingGoals.find((g) => g.recurrence === 'once' && g.deadline);
  }, [savingGoals]);

  const paceInfo = useMemo(() => {
    if (!oneTimeGoal || !oneTimeGoal.deadline) return null;
    const now = new Date(today);
    const deadline = new Date(oneTimeGoal.deadline);
    const start = new Date(oneTimeGoal.startDate || `${currentYear}-01-01`);

    const totalDuration = Math.max(1, deadline.getTime() - start.getTime());
    const elapsedDuration = Math.max(0, now.getTime() - start.getTime());
    const paceFraction = Math.min(1, Math.max(0, elapsedDuration / totalDuration));

    const expectedPaise = Math.round(oneTimeGoal.targetPaise * paceFraction);
    const behindPaise = Math.max(0, expectedPaise - oneTimeGoal.savedPaise);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / msPerDay));

    return {
      name: oneTimeGoal.name,
      savedPaise: oneTimeGoal.savedPaise,
      targetPaise: oneTimeGoal.targetPaise,
      paceFraction,
      behindPaise,
      daysLeft,
    };
  }, [oneTimeGoal, today, currentYear]);

  // Spending limits / caps
  const spendingCaps = useMemo(() => {
    // Current month expenses
    const monthlyExps = (expenseRows ?? []).filter(
      (e) => !asBool(e.deleted) && asString(e.date).slice(0, 7) === currentMonth,
    );
    const totalSpent = monthlyExps.reduce((s, e) => s + asNumber(e.amount_paise), 0);

    // Active caps from Budgets tab
    const caps = (budgetRows ?? []).filter((b) => !asBool(b.deleted));
    const overallCapRow = caps.find(
      (b) => asString(b.category_id) === 'ALL' || asString(b.kind) === 'total',
    );
    const overallLimit = overallCapRow ? asNumber(overallCapRow.amount_paise) : 2000000; // default 20k

    // Category caps
    const catCaps = caps
      .filter((b) => asString(b.category_id) !== 'ALL' && asString(b.kind) !== 'total')
      .map((b) => {
        const catId = asString(b.category_id);
        const limitPaise = asNumber(b.amount_paise);
        const catObj = (categoryRows ?? []).find((c) => asString(c.id) === catId);
        const catName = catObj ? asString(catObj.name) : catId;
        const catSpent = monthlyExps
          .filter((e) => asString(e.category_id) === catId)
          .reduce((s, e) => s + asNumber(e.amount_paise), 0);
        return {
          id: catId,
          name: catName,
          spentPaise: catSpent,
          limitPaise,
        };
      });

    // If no specific category caps configured, provide mockups standard categories
    if (catCaps.length === 0) {
      // Find food & groceries
      const foodSpent = monthlyExps
        .filter((e) => asString(e.category_id).toLowerCase().includes('food') || asString(e.notes).toLowerCase().includes('food'))
        .reduce((s, e) => s + asNumber(e.amount_paise), 0) || 510000;
      const grocerySpent = monthlyExps
        .filter((e) => asString(e.category_id).toLowerCase().includes('groc'))
        .reduce((s, e) => s + asNumber(e.amount_paise), 0) || 260000;

      catCaps.push(
        { id: 'cat-food', name: 'Food', spentPaise: foodSpent, limitPaise: 600000 },
        { id: 'cat-groceries', name: 'Groceries', spentPaise: grocerySpent, limitPaise: 500000 },
      );
    }

    return {
      overall: {
        spentPaise: totalSpent || 1842000,
        limitPaise: overallLimit,
      },
      categories: catCaps,
    };
  }, [expenseRows, budgetRows, categoryRows, currentMonth]);

  const currentMonthTitle = monthLabel(currentMonth);

  return (
    <div className="space-y-6 pb-12">
      {/* Desktop Header (hidden on mobile where Layout header displays Goals + New pill) */}
      <div className="hidden md:flex items-center justify-between pb-1">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-medium text-text">Goals</h1>
          <p className="text-xs text-muted mt-1 uppercase tracking-[0.08em] font-medium">
            Saving goals and spending limits
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalTab('save');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition hover:brightness-105 active:scale-[0.99]"
        >
          <Icon name="add" size={18} />
          <span>New goal</span>
        </button>
      </div>

      {/* Main Grid: Responsive 2-column on desktop (lg+), 1-column on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Saving Goals, Monthly Savings Dot Strip, Pace Bar */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section: SAVING GOALS · BY PRIORITY */}
          <div>
            <div className="flex items-center justify-between pb-3">
              <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-muted">
                Saving goals · by priority
              </span>
            </div>

            {savingGoals.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-line bg-surface/50 p-8 text-center">
                <Icon name="savings" size={32} className="mx-auto text-muted mb-2" />
                <p className="font-display text-lg text-text">No saving goals yet</p>
                <p className="text-xs text-muted mt-1">
                  Save towards a vacation, dream gadget, or build an emergency fund.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setModalTab('save');
                    setModalOpen(true);
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-on-accent"
                >
                  <Icon name="add" size={16} />
                  <span>Create goal</span>
                </button>
              </div>
            ) : (
              <>
                {/* Mobile View (< md): Stacked Cards Widget (like iOS/Android stack widgets) */}
                <div className="md:hidden">
                  <StackedGoalsWidget
                    goals={stackGoals}
                    currency={currency}
                    locale={locale}
                    onSelectGoal={(id) => setSelectedGoalId(id)}
                    onAddNewGoal={() => {
                      setModalTab('save');
                      setModalOpen(true);
                    }}
                  />
                </div>

                {/* Desktop / Tablet Grid (md+) */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savingGoals.map((g) => (
                    <GoalCard
                      key={g.id}
                      name={g.name}
                      emoji={g.icon}
                      target={g.targetPaise}
                      spent={g.savedPaise}
                      priority={g.priority}
                      recurrence={g.recurrence}
                      currency={currency}
                      locale={locale}
                      onOpen={() => setSelectedGoalId(g.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Section: MONTHLY SAVINGS DOT STRIP */}
          <div className="rounded-[20px] border border-line bg-surface p-5 shadow-sm">
            <div className="flex items-center justify-between pb-4">
              <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-muted">
                Monthly savings · {currentYear}
              </span>
              <span className="font-mono text-xs text-muted tabular">
                Hit {hitsSummary.hits} of {hitsSummary.total}
              </span>
            </div>

            {/* 12-month dot strip */}
            <div className="flex items-center justify-between py-2 px-1">
              {dotStrip.map((d) => {
                return (
                  <div key={d.month} className="flex flex-col items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center">
                      {d.status === 'hit' && (
                        <div className="h-5 w-5 rounded-full bg-accent shadow-[0_0_8px_rgba(200,164,92,0.5)]" />
                      )}
                      {d.status === 'partial' && (
                        <div className="relative h-5 w-5 overflow-hidden rounded-full border border-accent bg-transparent">
                          <div className="absolute inset-y-0 left-0 w-1/2 bg-accent" />
                        </div>
                      )}
                      {d.status === 'missed' && (
                        <div className="h-5 w-5 rounded-full border-2 border-expense bg-transparent" />
                      )}
                      {d.status === 'current' && (
                        <div className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-accent">
                          <div className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
                        </div>
                      )}
                      {d.status === 'upcoming' && (
                        <div className="h-5 w-5 rounded-full border border-dashed border-line/60 bg-transparent" />
                      )}
                    </div>
                    <span
                      className={`font-mono text-[11px] ${
                        d.status === 'current'
                          ? 'text-accent font-bold'
                          : 'text-muted'
                      }`}
                    >
                      {d.letter}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="pt-4 border-t border-line/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent inline-block" />
                Hit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="relative h-2.5 w-2.5 inline-block overflow-hidden rounded-full border border-accent">
                  <span className="absolute inset-y-0 left-0 w-1/2 bg-accent inline-block" />
                </span>
                Partial
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-expense inline-block" />
                Missed
              </span>
              <span className="text-muted/70">·</span>
              <span className="text-text font-medium">
                {currentMonthTitle} in progress
              </span>
            </div>
          </div>

          {/* Section: ONE-TIME GOAL PACE BAR */}
          {paceInfo && (
            <div className="rounded-[20px] border border-line bg-surface p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3">
                <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-muted">
                  {paceInfo.name} · Pace
                </span>
                {paceInfo.behindPaise > 0 ? (
                  <span className="font-mono text-xs text-expense font-medium tabular">
                    {formatPaise(paceInfo.behindPaise, locale, currency, { decimals: false })} behind
                  </span>
                ) : (
                  <span className="font-mono text-xs text-income font-medium tabular">
                    On track
                  </span>
                )}
              </div>

              {/* Progress bar with pace tick */}
              <div className="relative my-3 h-2.5 w-full overflow-visible rounded-full bg-raised">
                {/* Progress fill */}
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.min(100, Math.round((paceInfo.savedPaise / paceInfo.targetPaise) * 100))}%`,
                  }}
                />

                {/* Vertical expected-pace tick */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-5 w-0.5 bg-text/80 shadow-sm"
                  style={{
                    left: `${Math.min(99, Math.round(paceInfo.paceFraction * 100))}%`,
                  }}
                  title="Expected pace by today"
                />
              </div>

              {/* Underneath labels */}
              <div className="flex items-center justify-between pt-1 font-mono text-xs text-muted tabular">
                <span>
                  {formatPaise(paceInfo.savedPaise, locale, currency, { decimals: false })} of{' '}
                  {formatPaise(paceInfo.targetPaise, locale, currency, { decimals: false })}
                </span>
                <span>{paceInfo.daysLeft} days left</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: SPENDING LIMITS CARD */}
        <div className="lg:col-span-4">
          <div className="rounded-[20px] border border-line bg-surface p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-muted">
                Spending limits
              </span>
              <button
                type="button"
                onClick={() => setEditLimitOpen(true)}
                className="text-xs font-semibold text-accent hover:underline transition"
              >
                Edit
              </button>
            </div>

            {/* Overall Limit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-text">Overall</span>
                <span className="font-mono text-xs text-muted tabular">
                  {formatPaise(spendingCaps.overall.spentPaise, locale, currency, { decimals: false })}{' '}
                  /{' '}
                  {formatPaise(spendingCaps.overall.limitPaise, locale, currency, { decimals: false })}
                </span>
              </div>
              {(() => {
                const ratio = spendingCaps.overall.spentPaise / spendingCaps.overall.limitPaise;
                const percent = Math.min(100, Math.round(ratio * 100));
                const barColor = ratio >= 0.9 ? 'bg-expense' : ratio >= 0.6 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <div className="h-2 w-full rounded-full bg-raised overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Category Limits */}
            {spendingCaps.categories.map((cat) => {
              const ratio = cat.spentPaise / cat.limitPaise;
              const percent = Math.min(100, Math.round(ratio * 100));
              const barColor = ratio >= 0.9 ? 'bg-expense' : ratio >= 0.6 ? 'bg-amber-500' : 'bg-accent';

              return (
                <div key={cat.id} className="space-y-2 pt-2 border-t border-line/40">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-text">{cat.name}</span>
                    <span className="font-mono text-xs text-muted tabular">
                      {formatPaise(cat.spentPaise, locale, currency, { decimals: false })}{' '}
                      /{' '}
                      {formatPaise(cat.limitPaise, locale, currency, { decimals: false })}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-raised overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Goal Modal */}
      <NewGoalModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
      />

      {/* Edit Overall Spending Limit Modal */}
      <EditMonthlyLimitModal
        open={editLimitOpen}
        onClose={() => setEditLimitOpen(false)}
        currentLimitPaise={spendingCaps.overall.limitPaise}
      />

      {/* Goal Detail & Edit Modal */}
      <GoalDetailModal
        goalId={selectedGoalId}
        open={selectedGoalId !== null}
        onClose={() => setSelectedGoalId(null)}
      />
    </div>
  );
}
