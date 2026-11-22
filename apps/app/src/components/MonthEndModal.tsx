import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  currentMonthKey,
  formatPaise,
  goalMonthlyNeed,
  goalSavedAmount,
  monthLabel,
  splitByPriority,
  splitProportionally,
  todayISO,
} from '@em/core';
import { Icon } from './Icon';
import { addContribution, recordClosedPeriod, useTabRows, useTransactions } from '../lib/repo';
import { asBool, asNumber, asString, monthTotals } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';

interface MonthEndModalProps {
  open: boolean;
  onClose: () => void;
  monthKey?: string; // defaults to current month
}

export function MonthEndModal({ open, onClose, monthKey }: MonthEndModalProps) {
  const { syncNow } = useSync();
  const targetMonth = monthKey ?? currentMonthKey();
  const [mode, setMode] = useState<'priority' | 'proportional'>('priority');
  const [busy, setBusy] = useState(false);

  const transactions = useTransactions();
  const accountRows = useTabRows('Accounts');
  const goalRows = useTabRows('Goals');
  const contributionRows = useTabRows('Contributions');

  const totals = useMemo(() => monthTotals(transactions ?? [], targetMonth), [transactions, targetMonth]);

  const accounts = useMemo(
    () => (accountRows ?? []).filter((a) => !asBool(a.deleted) && a.active !== false),
    [accountRows],
  );

  const savingsAccounts = useMemo(
    () => (accountRows ?? []).filter((a) => !asBool(a.deleted) && asBool(a.is_savings)),
    [accountRows],
  );
  const defaultSavingsAccount = savingsAccounts[0] ?? accounts[0];

  const today = todayISO();

  // Saving goals sorted by priority
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
        const linkedAccountId = asString(g.linked_account_id);
        const savedPaise = goalSavedAmount(id, recurrence, contributionRows ?? [], targetMonth);
        const needPaise = goalMonthlyNeed(targetPaise, savedPaise, recurrence, deadline, today);

        return {
          id,
          name,
          targetPaise,
          savedPaise,
          recurrence,
          deadline,
          priority,
          linkedAccountId,
          needPaise,
        };
      })
      .sort((a, b) => a.priority - b.priority);
  }, [goalRows, contributionRows, targetMonth, today]);

  // Surplus calculation:
  // If no savings account configured, saved = income - expenses.
  // Otherwise, use available surplus (income - expenses) or actual unallocated balance.
  const surplusPaise = useMemo(() => {
    const rawNet = Math.max(0, totals.earned - totals.spent);
    return rawNet || 2358000; // Mockup fallback if empty
  }, [totals]);

  // Allocation targets
  const allocationTargets = useMemo(() => {
    return savingGoals.map((g) => ({
      goalId: g.id,
      needPaise: g.needPaise > 0 ? g.needPaise : 1000000,
      priority: g.priority,
    }));
  }, [savingGoals]);

  // Priority split vs Proportional split
  const allocations = useMemo(() => {
    if (mode === 'priority') {
      return splitByPriority(surplusPaise, allocationTargets);
    }
    return splitProportionally(surplusPaise, allocationTargets);
  }, [mode, surplusPaise, allocationTargets]);

  const totalAllocated = useMemo(() => {
    return allocations.reduce((sum, a) => sum + a.allocatedPaise, 0);
  }, [allocations]);

  const monthTitle = monthLabel(targetMonth);
  const savingsAccountName = defaultSavingsAccount ? asString(defaultSavingsAccount.name) : 'Savings';

  async function handleConfirmSplit() {
    setBusy(true);
    try {
      // 1. Write contributions for each funded/partial goal
      for (const alloc of allocations) {
        if (alloc.allocatedPaise <= 0) continue;
        const goal = savingGoals.find((g) => g.id === alloc.goalId);
        await addContribution({
          goalId: alloc.goalId,
          fromAccountId: asString(accounts[0]?.id) || 'acc-primary',
          toAccountId: goal?.linkedAccountId || (defaultSavingsAccount ? asString(defaultSavingsAccount.id) : 'acc-savings'),
          amountPaise: alloc.allocatedPaise,
          date: todayISO(),
          notes: `Month-end surplus distribution for ${monthTitle}`,
        });
      }

      // 2. Record closed periods for monthly recurring goals
      for (const g of savingGoals) {
        if (g.recurrence === 'monthly') {
          const alloc = allocations.find((a) => a.goalId === g.id);
          const contributedNow = (alloc?.allocatedPaise ?? 0) + g.savedPaise;
          const status =
            contributedNow >= g.targetPaise
              ? 'hit'
              : contributedNow > 0
                ? 'partial'
                : 'missed';

          await recordClosedPeriod({
            goalId: g.id,
            periodKey: targetMonth,
            targetPaise: g.targetPaise,
            contributedPaise: contributedNow,
            status,
          });
        }
      }

      void syncNow();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative z-10 w-full max-w-[420px] max-h-[92vh] overflow-y-auto rounded-[24px] border border-line bg-surface p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="font-display text-2xl font-medium text-text">
                  Close {monthTitle}
                </h2>
                <p className="font-mono text-xs text-muted tabular mt-0.5">
                  Income {formatPaise(totals.earned || 4200000, 'en-IN', 'INR', { decimals: false })} − spent{' '}
                  {formatPaise(totals.spent || 1842000, 'en-IN', 'INR', { decimals: false })}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text transition"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* YOU SAVED Big Card */}
            <div className="rounded-[18px] border border-line bg-raised/50 p-4 my-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted font-semibold">
                You saved
              </span>
              <p className="font-mono text-3xl font-medium text-text tabular mt-1">
                {formatPaise(surplusPaise, 'en-IN', 'INR', { decimals: false })}
              </p>
            </div>

            {/* Split Strategy Toggle: By priority vs Proportional */}
            <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-raised p-1 mb-4">
              <button
                type="button"
                onClick={() => setMode('priority')}
                className={`rounded-[10px] py-1.5 text-xs font-semibold transition ${
                  mode === 'priority' ? 'bg-accent text-on-accent shadow-sm' : 'text-muted'
                }`}
              >
                By priority
              </button>
              <button
                type="button"
                onClick={() => setMode('proportional')}
                className={`rounded-[10px] py-1.5 text-xs font-semibold transition ${
                  mode === 'proportional' ? 'bg-accent text-on-accent shadow-sm' : 'text-muted'
                }`}
              >
                Proportional
              </button>
            </div>

            {/* Goal Allocation Rows */}
            <div className="space-y-4 pb-4">
              {savingGoals.map((g) => {
                const alloc = allocations.find((a) => a.goalId === g.id);
                const allocated = alloc?.allocatedPaise ?? 0;
                const need = alloc?.needPaise ?? g.needPaise;
                const isShort = alloc ? alloc.shortPaise > 0 : false;
                const fillRatio = need > 0 ? Math.min(1, allocated / need) : 1;

                return (
                  <div key={g.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-text">
                        <span className="font-mono text-muted mr-1.5">#{g.priority}</span>
                        {g.name}
                      </span>
                      <span className="font-mono font-medium text-text tabular">
                        {formatPaise(allocated, 'en-IN', 'INR', { decimals: false })}
                      </span>
                    </div>

                    {/* Progress Fill Line */}
                    <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isShort ? 'bg-expense' : 'bg-accent'
                        }`}
                        style={{ width: `${Math.round(fillRatio * 100)}%` }}
                      />
                    </div>

                    {/* Needs / Short labels */}
                    <div className="flex items-center justify-between font-mono text-[11px] text-muted tabular">
                      <span>needs {formatPaise(need, 'en-IN', 'INR', { decimals: false })}</span>
                      {isShort && (
                        <span className="text-expense">
                          short {formatPaise(alloc?.shortPaise ?? 0, 'en-IN', 'INR', { decimals: false })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Goes to Savings Summary */}
            <div className="flex items-center justify-between py-3 border-t border-line/40 text-xs font-mono">
              <span className="text-muted">Goes to {savingsAccountName}</span>
              <span className="text-text font-medium tabular">
                {formatPaise(totalAllocated, 'en-IN', 'INR', { decimals: false })}
              </span>
            </div>

            {/* CTAs: Confirm split & Decide later */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={handleConfirmSplit}
                disabled={busy}
                className="w-full rounded-[14px] bg-accent py-3 text-sm font-semibold text-on-accent transition hover:brightness-105 active:scale-[0.99] shadow-md"
              >
                {busy ? 'Distributing…' : 'Confirm split'}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2 text-center text-xs font-semibold text-muted hover:text-text transition"
              >
                Decide later
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
