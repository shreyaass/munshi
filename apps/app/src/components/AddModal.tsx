import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QUICK_PICKS,
  categoryUsage,
  currentMonthKey,
  daysAgoISO,
  formatPaise,
  goalMonthlyNeed,
  goalSavedAmount,
  parseToPaise,
  pickQuickCategories,
  splitByPriority,
  todayISO,
} from '@em/core';
import { Icon } from './Icon';
import { CustomDatePicker } from './CustomDatePicker';
import { addContribution, addTransaction, useTabRows, useTransactions } from '../lib/repo';
import { asBool, asNumber, asString, categoriesFor } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';
import { sound } from '../lib/sound';

interface AddModalProps {
  open: boolean;
  onClose: () => void;
  defaultDirection?: 'expense' | 'income';
}

export function AddModal({ open, onClose, defaultDirection = 'expense' }: AddModalProps) {
  const { syncNow } = useSync();
  const [direction, setDirection] = useState<'expense' | 'income'>(defaultDirection);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Income goal allocation
  const [putTowardsGoal, setPutTowardsGoal] = useState(true);
  const [goalAllocations, setGoalAllocations] = useState<Record<string, number>>({});

  const categoryRows = useTabRows('Categories');
  const accountRows = useTabRows('Accounts');
  const goalRows = useTabRows('Goals');
  const contributionRows = useTabRows('Contributions');
  const transactions = useTransactions();

  const categories = useMemo(() => categoriesFor(categoryRows ?? [], direction), [categoryRows, direction]);
  const accounts = useMemo(
    () => (accountRows ?? []).filter((a) => !a.deleted && a.active !== false),
    [accountRows],
  );

  const savingsAccounts = useMemo(
    () => (accountRows ?? []).filter((a) => !asBool(a.deleted) && asBool(a.is_savings)),
    [accountRows],
  );
  const defaultSavingsAccount = savingsAccounts[0] ?? accounts[0];

  const currentMonth = currentMonthKey();
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
        const savedPaise = goalSavedAmount(id, recurrence, contributionRows ?? [], currentMonth);
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
  }, [goalRows, contributionRows, currentMonth, today]);

  const usage = useMemo(() => {
    const relevant = (transactions ?? []).filter((t) => t.kind === direction).map((t) => t.row);
    return categoryUsage(relevant, daysAgoISO(60));
  }, [transactions, direction]);

  const quickCategories = useMemo(() => {
    const candidates = categories.map((row) => ({
      row,
      id: asString(row.id),
      name: asString(row.name),
      pinned: row.pinned === true,
      sort_order: Number(row.sort_order) || 0,
      active: row.active !== false,
      deleted: row.deleted === true,
    }));
    return pickQuickCategories(candidates, usage, QUICK_PICKS[direction]).map((c) => c.row);
  }, [categories, usage, direction]);

  // Select first category and account by default
  useEffect(() => {
    if (categories.length > 0 && (!categoryId || !categories.some((c) => asString(c.id) === categoryId))) {
      setCategoryId(asString((quickCategories[0] ?? categories[0]).id));
    }
  }, [categories, quickCategories, categoryId]);

  useEffect(() => {
    if (accounts.length > 0 && (!accountId || !accounts.some((a) => asString(a.id) === accountId))) {
      setAccountId(asString(accounts[0].id));
    }
  }, [accounts, accountId]);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setAmount('');
      setNote('');
      setNoteOpen(false);
      setDate(todayISO());
      setGoalAllocations({});
      setPutTowardsGoal(true);
    }
  }, [open]);

  // Handle keyboard shortcut Esc
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const paise = parseToPaise(amount) ?? 0;
  const canSave = paise > 0 && categoryId !== '' && accountId !== '' && !busy;

  const totalAllocatedPaise = useMemo(() => {
    if (!putTowardsGoal) return 0;
    return Object.values(goalAllocations).reduce((sum, v) => sum + (v || 0), 0);
  }, [putTowardsGoal, goalAllocations]);

  const staysInAccountPaise = Math.max(0, paise - totalAllocatedPaise);

  function handleSplitByPriority() {
    if (paise <= 0 || savingGoals.length === 0) return;
    const targets = savingGoals.map((g) => ({
      goalId: g.id,
      needPaise: g.needPaise > 0 ? g.needPaise : 1000000,
      priority: g.priority,
    }));
    const results = splitByPriority(paise, targets);
    const map: Record<string, number> = {};
    for (const r of results) {
      map[r.goalId] = r.allocatedPaise;
    }
    setGoalAllocations(map);
  }

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    try {
      await addTransaction({
        direction,
        amountPaise: paise,
        categoryId,
        accountId,
        date,
        notes: note.trim(),
      });
      sound.play(direction);

      // Write contributions if allocated to goals
      if (direction === 'income' && putTowardsGoal && totalAllocatedPaise > 0) {
        for (const g of savingGoals) {
          const allocated = goalAllocations[g.id] || 0;
          if (allocated > 0) {
            await addContribution({
              goalId: g.id,
              fromAccountId: accountId,
              toAccountId: g.linkedAccountId || (defaultSavingsAccount ? asString(defaultSavingsAccount.id) : accountId),
              amountPaise: allocated,
              date,
              notes: `Allocated from income${note ? ` (${note})` : ''}`,
            });
          }
        }
      }

      void syncNow();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  const selectedAccountName = useMemo(() => {
    const acc = accounts.find((a) => asString(a.id) === accountId);
    return acc ? asString(acc.name) : 'Account';
  }, [accounts, accountId]);

  const savingsAccountName = useMemo(() => {
    return defaultSavingsAccount ? asString(defaultSavingsAccount.name) : 'Savings';
  }, [defaultSavingsAccount]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative z-10 w-full max-w-[440px] max-h-[92vh] overflow-y-auto rounded-[20px] border border-line bg-surface p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <h2 className="font-display text-xl font-medium text-text">Add entry</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text transition"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Direction toggle */}
            <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-raised p-1">
              <button
                type="button"
                onClick={() => setDirection('expense')}
                className={`rounded-[10px] py-1.5 text-xs font-semibold transition ${
                  direction === 'expense' ? 'bg-accent text-on-accent shadow-sm' : 'text-muted'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setDirection('income')}
                className={`rounded-[10px] py-1.5 text-xs font-semibold transition ${
                  direction === 'income' ? 'bg-income text-white shadow-sm' : 'text-muted'
                }`}
              >
                Income
              </button>
            </div>

            {/* Amount input */}
            <div className="py-4 text-center">
              <div className="relative inline-flex items-center justify-center">
                <span className={`font-mono text-3xl font-medium mr-1 ${direction === 'income' ? 'text-income' : 'text-accent'}`}>
                  {direction === 'income' ? '+ ₹' : '₹'}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoFocus
                  value={amount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setAmount(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSave) void handleSave();
                  }}
                  placeholder="0"
                  className={`money w-48 bg-transparent text-center font-mono text-4xl font-medium outline-none ${
                    direction === 'expense' ? 'text-accent' : 'text-income'
                  } placeholder:text-muted/40`}
                />
              </div>
            </div>

            {/* Category Section */}
            <div className="space-y-1.5 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Category</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
                {quickCategories.map((c) => {
                  const id = asString(c.id);
                  const isSelected = id === categoryId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setCategoryId(id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border border-accent/60 bg-accent/15 text-accent'
                          : 'border border-line bg-raised text-muted hover:text-text'
                      }`}
                    >
                      <span>{asString(c.name)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Into Account Section */}
            <div className="space-y-1.5 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                {direction === 'income' ? 'Into account' : 'Account'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => {
                  const id = asString(a.id);
                  const isSelected = id === accountId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAccountId(id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border border-accent/60 bg-accent/15 text-accent'
                          : 'border border-line bg-raised text-muted hover:text-text'
                      }`}
                    >
                      <span>{asString(a.name)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Income Mode: Put Towards a Goal Card */}
            {direction === 'income' && savingGoals.length > 0 && (
              <div className="rounded-[16px] border border-line bg-raised/50 p-4 mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-text">Put towards a goal</p>
                    <p className="text-[11px] text-muted">Moves it to the goal's savings account</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPutTowardsGoal(!putTowardsGoal)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      putTowardsGoal ? 'bg-accent' : 'bg-line'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                        putTowardsGoal ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {putTowardsGoal && (
                  <div className="space-y-3 pt-2 border-t border-line/50">
                    {/* Goal Rows */}
                    <div className="space-y-2">
                      {savingGoals.map((g) => {
                        const currentVal = goalAllocations[g.id] ?? 0;
                        return (
                          <div key={g.id} className="flex items-center justify-between text-xs">
                            <span className="font-medium text-text">
                              <span className="font-mono text-muted mr-1.5">#{g.priority}</span>
                              {g.name}
                            </span>
                            <div className="flex items-center gap-1 bg-surface border border-line rounded-lg px-2.5 py-1">
                              <span className="font-mono text-muted text-[11px]">₹</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={currentVal > 0 ? String(Math.round(currentVal / 100)) : ''}
                                onChange={(e) => {
                                  const num = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                                  setGoalAllocations((prev) => ({
                                    ...prev,
                                    [g.id]: num * 100,
                                  }));
                                }}
                                placeholder="0"
                                className="w-16 bg-transparent font-mono text-right text-xs text-text outline-none"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Split Rest by Priority Action */}
                    <button
                      type="button"
                      onClick={handleSplitByPriority}
                      className="rounded-full border border-accent/60 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent hover:bg-accent/20 transition"
                    >
                      Split the rest by priority
                    </button>

                    {/* Summary Box */}
                    <div className="rounded-xl bg-surface p-3 text-xs space-y-1.5 border border-line/40">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">To {savingsAccountName}</span>
                        <span className="font-mono font-medium text-text tabular">
                          {formatPaise(totalAllocatedPaise, 'en-IN', 'INR', { decimals: false })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Stays in {selectedAccountName}</span>
                        <span className="font-mono font-medium text-text tabular">
                          {formatPaise(staysInAccountPaise, 'en-IN', 'INR', { decimals: false })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Date & Note Row */}
            <div className="flex items-center gap-2 pb-5">
              <div className="w-36">
                <CustomDatePicker
                  value={date}
                  onChange={(d) => setDate(d || todayISO())}
                />
              </div>

              {!noteOpen && !note ? (
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 text-xs text-muted hover:text-text transition"
                >
                  <Icon name="edit_note" size={15} />
                  <span>Add a note</span>
                </button>
              ) : (
                <input
                  type="text"
                  autoFocus={noteOpen}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payee or note..."
                  className="flex-1 rounded-full border border-line bg-raised px-3 py-1.5 text-xs text-text placeholder:text-muted outline-none focus:border-accent"
                />
              )}
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className={`w-full rounded-[14px] py-3 text-sm font-semibold transition active:scale-[0.99] ${
                canSave
                  ? 'bg-accent text-on-accent shadow-md hover:brightness-105'
                  : 'bg-raised text-muted cursor-not-allowed'
              }`}
            >
              {busy ? 'Saving…' : `Save ${direction}`}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
