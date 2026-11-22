import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPaise, goalMonthlyNeed, parseToPaise, todayISO } from '@em/core';
import { Icon } from './Icon';
import { resolveGoalIcon } from './GoalCard';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';
import { addGoal, setSpendingCap, useTabRows } from '../lib/repo';
import { asBool, asNumber, asString } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';

interface NewGoalModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'save' | 'cap';
}

const PRESET_EMOJIS = ['🎯', '📱', '💻', '🏍️', '🚗', '✈️', '🏖️', '🏠', '🛡️', '💍', '🎓', '⌚'];
const CAP_PRESETS = [15000, 20000, 25000, 30000, 50000];

function detectGoalEmoji(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('samsung') || n.includes('phone') || n.includes('iphone') || n.includes('pixel') || n.includes('mobile') || n.includes('galaxy') || n.includes('android')) return '📱';
  if (n.includes('laptop') || n.includes('macbook') || n.includes('computer') || n.includes('pc') || n.includes('ipad') || n.includes('tech')) return '💻';
  if (n.includes('bike') || n.includes('motorcycle') || n.includes('scooter') || n.includes('activa') || n.includes('bullet') || n.includes('pulsar') || n.includes('cycle')) return '🏍️';
  if (n.includes('car') || n.includes('auto') || n.includes('vehicle') || n.includes('thar') || n.includes('suv') || n.includes('sedan') || n.includes('drive')) return '🚗';
  if (n.includes('goa') || n.includes('trip') || n.includes('travel') || n.includes('flight') || n.includes('vacation') || n.includes('tour') || n.includes('holiday')) return '✈️';
  if (n.includes('safe') || n.includes('fund') || n.includes('emerg') || n.includes('security')) return '🛡️';
  if (n.includes('home') || n.includes('house') || n.includes('flat') || n.includes('rent') || n.includes('property')) return '🏠';
  if (n.includes('watch') || n.includes('apple watch') || n.includes('garmin')) return '⌚';
  if (n.includes('ring') || n.includes('gold') || n.includes('diamond') || n.includes('jewel')) return '💍';
  if (n.includes('study') || n.includes('exam') || n.includes('college') || n.includes('course') || n.includes('tuition')) return '🎓';
  if (n.includes('beach') || n.includes('resort')) return '🏖️';
  return null;
}

export function NewGoalModal({ open, onClose, defaultTab = 'save' }: NewGoalModalProps) {
  const { syncNow } = useSync();
  const [tab, setTab] = useState<'save' | 'cap'>(defaultTab);

  // Save for a goal fields
  const [name, setName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'monthly' | 'yearly'>('once');
  const [deadline, setDeadline] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [priority, setPriority] = useState(1);
  const [icon, setIcon] = useState('🎯');

  // Limit spending fields
  const [capCategory, setCapCategory] = useState('ALL');
  const [capLimitStr, setCapLimitStr] = useState('');

  const [busy, setBusy] = useState(false);

  const accountRows = useTabRows('Accounts');
  const categoryRows = useTabRows('Categories');
  const goalRows = useTabRows('Goals');
  const budgetRows = useTabRows('Budgets');

  const liveGoals = useMemo(() => {
    return (goalRows ?? []).filter((g) => !asBool(g.deleted));
  }, [goalRows]);

  // Savings accounts only
  const savingsAccounts = useMemo(() => {
    return (accountRows ?? []).filter((a) => !asBool(a.deleted) && asBool(a.is_savings));
  }, [accountRows]);

  // Categories for caps
  const categories = useMemo(() => {
    return (categoryRows ?? []).filter((c) => !asBool(c.deleted) && asString(c.type) === 'expense');
  }, [categoryRows]);

  useEffect(() => {
    if (open) {
      setName('');
      setTargetStr('');
      setRecurrence('once');
      const nextYear = new Date();
      nextYear.setMonth(nextYear.getMonth() + 2);
      setDeadline(nextYear.toISOString().slice(0, 10));
      setPriority(liveGoals.length + 1);
      setIcon('🎯');
      if (savingsAccounts.length > 0) {
        setLinkedAccountId(asString(savingsAccounts[0].id));
      } else if (accountRows && accountRows.length > 0) {
        setLinkedAccountId(asString(accountRows[0].id));
      }
      setCapCategory('ALL');

      // Prefill cap limit from existing overall cap if available
      const overallCap = (budgetRows ?? []).find(
        (b) => !asBool(b.deleted) && (asString(b.category_id) === 'ALL' || asString(b.kind) === 'total'),
      );
      if (overallCap) {
        setCapLimitStr(String(Math.round(asNumber(overallCap.amount_paise) / 100)));
      } else {
        setCapLimitStr('20000');
      }

      setTab(defaultTab);
    }
  }, [open, liveGoals.length, savingsAccounts, accountRows, defaultTab, budgetRows]);

  // Live per-month need calculation
  const targetPaise = parseToPaise(targetStr) ?? 0;
  const liveNeed = useMemo(() => {
    return goalMonthlyNeed(targetPaise, 0, recurrence, deadline, todayISO());
  }, [targetPaise, recurrence, deadline]);

  const canSaveGoal =
    name.trim() !== '' &&
    targetPaise > 0 &&
    linkedAccountId !== '' &&
    !busy;

  const capLimitPaise = parseToPaise(capLimitStr) ?? 0;
  const canSaveCap = capLimitPaise > 0 && !busy;

  async function handleCreateGoal() {
    if (!canSaveGoal) return;
    setBusy(true);
    try {
      await addGoal({
        name: name.trim(),
        targetPaise,
        recurrence,
        deadline: recurrence === 'once' ? deadline : undefined,
        priority,
        linkedAccountId,
        icon: icon.trim() || '🎯',
      });
      void syncNow();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCap() {
    if (!canSaveCap) return;
    setBusy(true);
    try {
      await setSpendingCap({
        categoryId: capCategory,
        amountPaise: capLimitPaise,
      });
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative z-10 w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-[20px] border border-line bg-surface p-6 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4">
              <h2 className="font-display text-2xl font-medium text-text">New goal</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text transition"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Top Choice Cards */}
            <div className="grid grid-cols-2 gap-3 pb-5">
              <button
                type="button"
                onClick={() => setTab('save')}
                className={`flex flex-col text-left p-3.5 rounded-2xl border transition ${
                  tab === 'save'
                    ? 'border-accent bg-accent/10 ring-1 ring-accent'
                    : 'border-line bg-raised/50 text-muted hover:border-line/80'
                }`}
              >
                <Icon name="savings" size={22} className={tab === 'save' ? 'text-accent' : 'text-muted'} />
                <p className="font-semibold text-xs text-text mt-2">Save for a goal</p>
                <p className="text-[10px] text-muted leading-tight mt-0.5">Trip, gadget or a monthly target</p>
              </button>

              <button
                type="button"
                onClick={() => setTab('cap')}
                className={`flex flex-col text-left p-3.5 rounded-2xl border transition ${
                  tab === 'cap'
                    ? 'border-accent bg-accent/10 ring-1 ring-accent'
                    : 'border-line bg-raised/50 text-muted hover:border-line/80'
                }`}
              >
                <Icon name="speed" size={22} className={tab === 'cap' ? 'text-accent' : 'text-muted'} />
                <p className="font-semibold text-xs text-text mt-2">Limit spending</p>
                <p className="text-[10px] text-muted leading-tight mt-0.5">Cap a category</p>
              </button>
            </div>

            {tab === 'save' ? (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setName(newName);
                      const detected = detectGoalEmoji(newName);
                      if (detected) {
                        setIcon(detected);
                      }
                    }}
                    placeholder="e.g. Samsung S25, Goa trip"
                    className="mt-1 w-full rounded-xl border border-line bg-raised px-4 py-2.5 text-sm text-text placeholder:text-muted outline-none focus:border-accent"
                  />
                </div>

                {/* Emoji Selection (Keyboard input + presets) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Goal Icon / Emoji
                    </label>
                    <span className="text-[10px] text-muted">Type or pick emoji</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <div className="flex h-11 w-12 shrink-0 items-center justify-center rounded-xl border border-accent/40 bg-accent/15 text-2xl shadow-sm">
                      {icon}
                    </div>
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => {
                        const val = e.target.value;
                        const detected = resolveGoalIcon(val, val);
                        setIcon(detected.icon || val);
                      }}
                      placeholder="Type or paste emoji from keyboard"
                      className="flex-1 rounded-xl bg-raised border border-line px-3.5 py-2.5 text-sm text-text outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {PRESET_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcon(em)}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center text-lg transition ${
                          icon === em
                            ? 'bg-accent/20 border border-accent ring-1 ring-accent'
                            : 'bg-raised hover:bg-line/50'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Target</label>
                  <div className="mt-1 flex items-center rounded-xl border border-line bg-raised px-4 py-2.5 focus-within:border-accent">
                    <span className="font-mono text-muted mr-1">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={targetStr}
                      onChange={(e) => setTargetStr(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                      className="money w-full bg-transparent font-mono text-base font-medium text-text outline-none"
                    />
                  </div>
                </div>

                {/* How often */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">How often</label>
                  <div className="mt-1 flex gap-2">
                    {(['once', 'monthly', 'yearly'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRecurrence(r)}
                        className={`flex-1 rounded-full border py-1.5 text-xs font-medium transition ${
                          recurrence === r
                            ? 'border-accent bg-accent text-on-accent font-semibold'
                            : 'border-line bg-raised text-muted hover:text-text'
                        }`}
                      >
                        {r === 'once' ? 'Once' : r === 'monthly' ? 'Every month' : 'Every year'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deadline (for once) */}
                {recurrence === 'once' && (
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Deadline</label>
                    <CustomDatePicker
                      value={deadline}
                      onChange={setDeadline}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Linked savings account */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Linked savings account
                  </label>
                  <CustomSelect
                    value={linkedAccountId}
                    onChange={setLinkedAccountId}
                    className="mt-1"
                    options={
                      savingsAccounts.length > 0
                        ? savingsAccounts.map((a) => ({
                            value: asString(a.id),
                            label: asString(a.name),
                            sublabel: a.last4 ? `•• ${a.last4}` : undefined,
                          }))
                        : (accountRows ?? []).map((a) => ({
                            value: asString(a.id),
                            label: asString(a.name),
                          }))
                    }
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Priority</label>
                  <div className="mt-1 flex items-center justify-between rounded-xl border border-line bg-raised px-4 py-2 text-sm">
                    <span className="font-medium text-text">
                      #{priority} · {name ? `${name} gets filled first` : 'Priority rank'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPriority((p) => Math.max(1, p - 1))}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted hover:text-text transition"
                      >
                        <Icon name="expand_less" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPriority((p) => p + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-muted hover:text-text transition"
                      >
                        <Icon name="expand_more" size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Need Line */}
                {liveNeed > 0 && (
                  <div className="rounded-xl border border-line bg-raised/70 p-3 text-center">
                    <p className="text-xs text-muted">
                      Needs about{' '}
                      <span className="font-mono font-medium text-accent">
                        {formatPaise(liveNeed, 'en-IN', 'INR', { decimals: false })}
                      </span>{' '}
                      a month
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="button"
                  onClick={handleCreateGoal}
                  disabled={!canSaveGoal}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition active:scale-[0.99] ${
                    canSaveGoal
                      ? 'bg-accent text-on-accent shadow-md hover:brightness-105'
                      : 'bg-raised text-muted cursor-not-allowed'
                  }`}
                >
                  {busy ? 'Creating…' : 'Create goal'}
                </button>
              </div>
            ) : (
              /* Limit spending form */
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Category</label>
                  <CustomSelect
                    value={capCategory}
                    onChange={setCapCategory}
                    className="mt-1"
                    options={[
                      { value: 'ALL', label: 'Overall (Total monthly spending limit)' },
                      ...categories.map((c) => ({
                        value: asString(c.id),
                        label: asString(c.name),
                        icon: asString(c.icon),
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                    Monthly limit
                  </label>
                  <div className="mt-1 flex items-center rounded-xl border border-line bg-raised px-4 py-2.5 focus-within:border-accent">
                    <span className="font-mono text-muted mr-1">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={capLimitStr}
                      onChange={(e) => setCapLimitStr(e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="0"
                      className="money w-full bg-transparent font-mono text-base font-medium text-text outline-none"
                    />
                  </div>
                </div>

                {/* Quick presets */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {CAP_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCapLimitStr(String(preset))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-mono transition ${
                        capLimitStr === String(preset)
                          ? 'border-accent bg-accent/20 text-accent font-semibold'
                          : 'border-line bg-raised text-muted hover:text-text'
                      }`}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCreateCap}
                  disabled={!canSaveCap}
                  className={`w-full rounded-xl py-3 text-sm font-semibold transition active:scale-[0.99] ${
                    canSaveCap
                      ? 'bg-accent text-on-accent shadow-md hover:brightness-105'
                      : 'bg-raised text-muted cursor-not-allowed'
                  }`}
                >
                  {busy ? 'Setting…' : 'Set spending limit'}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
