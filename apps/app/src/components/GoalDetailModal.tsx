import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  formatPaise,
  fromISODate,
  goalMonthlyNeed,
  monthLabel,
  parseToPaise,
  todayISO,
} from '@em/core';
import { Icon } from './Icon';
import { resolveGoalIcon } from './GoalCard';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import { addContribution, deleteGoal, updateGoal, useMetaValue, useTabRows } from '../lib/repo';
import { asBool, asNumber, asString } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';
import { sound } from '../lib/sound';

interface GoalDetailModalProps {
  goalId: string | null;
  open: boolean;
  onClose: () => void;
}

const PRESET_GOAL_ICONS = [
  { name: 'flag', label: 'Goal' },
  { name: 'flight', label: 'Travel' },
  { name: 'smartphone', label: 'Phone' },
  { name: 'laptop', label: 'Laptop' },
  { name: 'two_wheeler', label: 'Bike' },
  { name: 'directions_car', label: 'Car' },
  { name: 'home', label: 'Home' },
  { name: 'shield', label: 'Fund' },
  { name: 'savings', label: 'Wealth' },
  { name: 'diamond', label: 'Jewelry' },
  { name: 'school', label: 'Education' },
  { name: 'beach_access', label: 'Vacation' },
  { name: 'watch', label: 'Watch' },
  { name: 'sports_esports', label: 'Gaming' },
];

export function GoalDetailModal({ goalId, open, onClose }: GoalDetailModalProps) {
  const { syncNow } = useSync();
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');

  const goalRows = useTabRows('Goals');
  const contributionRows = useTabRows('Contributions');
  const accountRows = useTabRows('Accounts');

  const goal = useMemo(() => {
    if (!goalId) return null;
    return (goalRows ?? []).find((g) => asString(g.id) === goalId && !asBool(g.deleted));
  }, [goalRows, goalId]);

  const [isEditing, setIsEditing] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeAmount, setContributeAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [busy, setBusy] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('🎯');
  const [editTargetStr, setEditTargetStr] = useState('');
  const [editRecurrence, setEditRecurrence] = useState<'once' | 'monthly' | 'yearly'>('once');
  const [editDeadline, setEditDeadline] = useState('');
  const [editPriority, setEditPriority] = useState(1);
  const [editLinkedAccountId, setEditLinkedAccountId] = useState('');

  // Accounts
  const accounts = useMemo(
    () => (accountRows ?? []).filter((a) => !asBool(a.deleted) && a.active !== false),
    [accountRows],
  );

  const savingsAccounts = useMemo(
    () => (accountRows ?? []).filter((a) => !asBool(a.deleted) && asBool(a.is_savings)),
    [accountRows],
  );

  useEffect(() => {
    if (goal && open) {
      setEditName(asString(goal.name));
      const resolvedIcon = resolveGoalIcon(asString(goal.name), asString(goal.icon));
      setEditEmoji(resolvedIcon.icon || '🎯');
      setEditTargetStr(String(asNumber(goal.target_paise) / 100));
      setEditRecurrence((asString(goal.recurrence) || 'once') as any);
      setEditDeadline(asString(goal.deadline));
      setEditPriority(asNumber(goal.priority) || 1);
      setEditLinkedAccountId(asString(goal.linked_account_id));
      setIsEditing(false);
      setContributeOpen(false);
      setContributeAmount('');
      if (accounts.length > 0) {
        setFromAccountId(asString(accounts[0].id));
      }
    }
  }, [goal, open, accounts]);

  const recurrence = (asString(goal?.recurrence) || 'once') as 'once' | 'monthly' | 'yearly';
  const targetPaise = asNumber(goal?.target_paise);

  // Contributions linked to this goal
  const goalContributions = useMemo(() => {
    if (!goalId) return [];
    return (contributionRows ?? [])
      .filter((c) => !asBool(c.deleted) && asString(c.goal_id) === goalId)
      .sort((a, b) => asString(b.date ?? '').localeCompare(asString(a.date ?? '')));
  }, [contributionRows, goalId]);

  const totalSavedPaise = useMemo(() => {
    return goalContributions.reduce((sum, c) => sum + asNumber(c.amount_paise), 0);
  }, [goalContributions]);

  const monthlyContributions = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of goalContributions) {
      const monthKey = asString(c.date ?? '').slice(0, 7);
      if (!monthKey) continue;
      map.set(monthKey, (map.get(monthKey) ?? 0) + asNumber(c.amount_paise));
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [goalContributions]);

  const percent = targetPaise > 0 ? Math.min(100, Math.round((totalSavedPaise / targetPaise) * 100)) : 0;
  const needPaise = goalMonthlyNeed(targetPaise, totalSavedPaise, recurrence, asString(goal?.deadline), todayISO());

  const linkedAccount = useMemo(() => {
    return (accountRows ?? []).find((a) => asString(a.id) === asString(goal?.linked_account_id));
  }, [accountRows, goal]);

  const goalIcon = resolveGoalIcon(asString(goal?.name), asString(goal?.icon));

  async function handleSaveEdit() {
    if (!goalId || !editName.trim() || busy) return;
    setBusy(true);
    try {
      const parsedTarget = parseToPaise(editTargetStr) ?? targetPaise;
      await updateGoal(goalId, {
        name: editName.trim(),
        icon: editEmoji,
        target_paise: parsedTarget,
        recurrence: editRecurrence,
        deadline: editRecurrence === 'once' ? editDeadline : '',
        priority: editPriority,
        linked_account_id: editLinkedAccountId,
      });
      void syncNow();
      setIsEditing(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteGoal() {
    if (!goalId || busy) return;
    if (!window.confirm(`Delete "${asString(goal?.name)}"? Past contributions will be preserved.`)) return;
    setBusy(true);
    try {
      await deleteGoal(goalId);
      void syncNow();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddContribution() {
    if (!goalId || busy) return;
    const amount = parseToPaise(contributeAmount);
    if (!amount || amount <= 0 || !fromAccountId) return;
    setBusy(true);
    try {
      await addContribution({
        goalId,
        fromAccountId,
        toAccountId: asString(goal?.linked_account_id) || fromAccountId,
        amountPaise: amount,
        date: todayISO(),
        notes: `Manual contribution to ${asString(goal?.name)}`,
      });
      sound.play('goal');
      setContributeAmount('');
      setContributeOpen(false);
      void syncNow();
    } finally {
      setBusy(false);
    }
  }

  if (!open || !goal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="relative z-10 w-full max-w-[460px] max-h-[92vh] overflow-y-auto rounded-[24px] border border-line bg-surface p-6 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-raised text-2xl shadow-inner">
                {goalIcon.isMaterial ? (
                  <Icon name={goalIcon.icon} size={22} className="text-accent" />
                ) : (
                  goalIcon.icon
                )}
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs text-muted">#{asNumber(goal.priority)}</span>
                  <h2 className="font-display text-xl font-medium text-text">{asString(goal.name)}</h2>
                </div>
                <p className="font-mono text-[11px] text-muted capitalize">
                  {recurrence === 'monthly' ? 'Monthly target' : recurrence === 'yearly' ? 'Yearly target' : 'One-time goal'}
                  {goal.deadline ? ` · Due ${asString(goal.deadline)}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                  isEditing ? 'bg-accent text-on-accent' : 'text-muted hover:bg-raised hover:text-text'
                }`}
                title={isEditing ? 'Cancel editing' : 'Edit goal'}
              >
                <Icon name="edit" size={16} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text transition"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </div>

          {!isEditing ? (
            <>
              {/* Progress Summary Card */}
              <div className="rounded-[20px] border border-line bg-raised/50 p-5 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Total Saved</span>
                    <p className="font-mono text-2xl font-medium text-text tabular mt-0.5">
                      {formatPaise(totalSavedPaise, locale, currency, { decimals: false })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Target</span>
                    <p className="font-mono text-sm font-medium text-muted tabular mt-0.5">
                      {formatPaise(targetPaise, locale, currency, { decimals: false })}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded-full bg-surface overflow-hidden border border-line/40">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted tabular">
                    <span>{percent}% reached</span>
                    <span>Needs ~{formatPaise(needPaise, locale, currency, { decimals: false })} / mo</span>
                  </div>
                </div>

                {linkedAccount && (
                  <div className="pt-2 border-t border-line/30 flex items-center justify-between text-xs">
                    <span className="text-muted">Linked Account:</span>
                    <span className="font-medium text-text flex items-center gap-1">
                      <Icon name="account_balance" size={14} className="text-accent" />
                      {asString(linkedAccount.name)}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Add Contribution Form */}
              {contributeOpen ? (
                <div className="rounded-[18px] border border-accent/40 bg-accent/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text">Add money towards this goal</span>
                    <button
                      type="button"
                      onClick={() => setContributeOpen(false)}
                      className="text-xs text-muted hover:text-text"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted font-medium">From Account</label>
                      <CustomSelect
                        value={fromAccountId}
                        onChange={setFromAccountId}
                        className="mt-1"
                        options={accounts.map((a) => ({
                          value: asString(a.id),
                          label: asString(a.name),
                        }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted font-medium">Amount (₹)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={contributeAmount}
                        onChange={(e) => setContributeAmount(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 5000"
                        className="w-full rounded-lg bg-surface border border-line px-2.5 py-1.5 text-xs font-mono text-text outline-none mt-1"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddContribution}
                    disabled={busy || !contributeAmount}
                    className="w-full rounded-xl bg-accent py-2 text-xs font-semibold text-on-accent transition active:scale-95 disabled:opacity-50"
                  >
                    {busy ? 'Saving…' : 'Record Contribution'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setContributeOpen(true)}
                  className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-line bg-raised py-2.5 text-xs font-semibold text-text hover:bg-line transition"
                >
                  <Icon name="add" size={15} />
                  <span>Contribute to this goal</span>
                </button>
              )}

              {/* Contributions History & Monthly Rollup */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium tracking-[0.12em] uppercase text-muted">
                    Contribution history ({goalContributions.length})
                  </span>
                </div>

                {/* Monthly breakdown pills */}
                {monthlyContributions.length > 0 && (
                  <div className="rounded-xl border border-line bg-raised/30 p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Contributed by month
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {monthlyContributions.map(([monthKey, mPaise]) => (
                        <div
                          key={monthKey}
                          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs"
                        >
                          <span className="font-medium text-text">{monthLabel(monthKey, locale)}:</span>
                          <span className="font-mono font-medium text-accent tabular">
                            {formatPaise(mPaise, locale, currency, { decimals: false })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {goalContributions.length === 0 ? (
                  <p className="text-center py-6 text-xs text-muted bg-raised/30 rounded-xl border border-dashed border-line">
                    No contributions yet. Allocate money when logging income or transferring.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {goalContributions.map((c) => {
                      const amount = asNumber(c.amount_paise);
                      const fromAcc = accounts.find((a) => asString(a.id) === asString(c.from_account_id));
                      const dateStr = asString(c.date ?? '');
                      let formattedDate = dateStr;
                      try {
                        formattedDate = fromISODate(dateStr).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        });
                      } catch {}

                      return (
                        <div
                          key={asString(c.id)}
                          className="flex items-center justify-between rounded-xl border border-line/60 bg-raised/40 px-3.5 py-2.5 text-xs"
                        >
                          <div>
                            <p className="font-medium text-text">
                              {asString(fromAcc?.name) || 'Account'} → {asString(linkedAccount?.name) || 'Savings'}
                            </p>
                            <p className="text-[11px] text-muted">{formattedDate}</p>
                          </div>
                          <span className="font-mono font-medium text-income tabular">
                            + {formatPaise(amount, locale, currency, { decimals: false })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Edit Goal Form */
            <div className="space-y-4 pt-1">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Goal Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl bg-raised border border-line px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent mt-1"
                />
              </div>

              {/* Emoji Input & Presets */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Icon / Emoji
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 border border-accent/40 text-accent shadow-sm">
                    <Icon name={editEmoji || 'flag'} size={24} />
                  </div>
                  <div className="flex-1 text-xs text-muted">
                    Clean theme vector icon
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {PRESET_GOAL_ICONS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setEditEmoji(item.name)}
                      title={item.label}
                      className={`h-9 w-9 rounded-xl flex items-center justify-center transition ${
                        editEmoji === item.name
                          ? 'bg-accent/25 border border-accent text-accent ring-1 ring-accent'
                          : 'bg-raised border border-line/60 text-muted hover:text-text hover:bg-line/40'
                      }`}
                    >
                      <Icon name={item.name} size={18} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Amount */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Target Amount (₹)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editTargetStr}
                  onChange={(e) => setEditTargetStr(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl bg-raised border border-line px-3.5 py-2.5 text-sm font-mono text-text outline-none focus:border-accent mt-1"
                />
              </div>

              {/* Recurrence & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Recurrence</label>
                  <CustomSelect
                    value={editRecurrence}
                    onChange={(v) => setEditRecurrence(v as any)}
                    className="mt-1"
                    options={[
                      { value: 'once', label: 'One-time' },
                      { value: 'monthly', label: 'Monthly' },
                      { value: 'yearly', label: 'Yearly' },
                    ]}
                  />
                </div>

                {editRecurrence === 'once' && (
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Deadline</label>
                    <CustomDatePicker
                      value={editDeadline}
                      onChange={setEditDeadline}
                      className="mt-1"
                    />
                  </div>
                )}
              </div>

              {/* Linked Account & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Priority</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editPriority}
                    onChange={(e) => setEditPriority(parseInt(e.target.value, 10) || 1)}
                    className="w-full rounded-xl bg-raised border border-line px-3 py-2 text-xs font-mono text-text outline-none mt-1"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Linked Account</label>
                  <CustomSelect
                    value={editLinkedAccountId}
                    onChange={setEditLinkedAccountId}
                    className="mt-1"
                    options={
                      savingsAccounts.length > 0
                        ? savingsAccounts.map((a) => ({
                            value: asString(a.id),
                            label: asString(a.name),
                            sublabel: a.last4 ? `•• ${a.last4}` : undefined,
                          }))
                        : accounts.map((a) => ({
                            value: asString(a.id),
                            label: asString(a.name),
                          }))
                    }
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleDeleteGoal}
                  disabled={busy}
                  className="rounded-xl border border-expense/50 px-4 py-2.5 text-xs font-semibold text-expense hover:bg-expense/10 transition"
                >
                  Delete goal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={busy || !editName.trim()}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-xs font-semibold text-on-accent transition active:scale-95 disabled:opacity-50"
                >
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
