import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPaise, parseToPaise } from '@em/core';
import { Icon } from './Icon';
import { CustomSelect } from './CustomSelect';
import { setLocalMeta, setSpendingCap, useMetaValue, useTabRows, useTransactions } from '../lib/repo';
import { accountBalances, asBool, asString } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';

interface EditMonthlyLimitModalProps {
  open: boolean;
  onClose: () => void;
  currentLimitPaise: number;
}

const PRESET_LIMITS = [1500000, 2000000, 2500000, 3000000, 4000000, 5000000];

export function EditMonthlyLimitModal({
  open,
  onClose,
  currentLimitPaise,
}: EditMonthlyLimitModalProps) {
  const { syncNow } = useSync();
  const [amountStr, setAmountStr] = useState('');
  const [busy, setBusy] = useState(false);

  const savedAccountId = useMetaValue('monthly_limit_account_id', 'ALL');
  const [selectedAccountId, setSelectedAccountId] = useState('ALL');

  const accountRows = useTabRows('Accounts');
  const transactions = useTransactions();
  const transferRows = useTabRows('Transfers');

  const balances = useMemo(
    () => accountBalances(accountRows ?? [], transactions ?? [], transferRows ?? []),
    [accountRows, transactions, transferRows],
  );

  const activeAccounts = useMemo(() => {
    return (accountRows ?? []).filter((a) => !asBool(a.deleted) && a.active !== false);
  }, [accountRows]);

  const totalBalance = useMemo(() => {
    let sum = 0;
    for (const [id, val] of balances.entries()) {
      const acc = activeAccounts.find((a) => asString(a.id) === id);
      if (acc) sum += val;
    }
    return sum;
  }, [balances, activeAccounts]);

  useEffect(() => {
    if (open) {
      setAmountStr(currentLimitPaise > 0 ? String(Math.round(currentLimitPaise / 100)) : '20000');
      setSelectedAccountId(savedAccountId || 'ALL');
    }
  }, [open, currentLimitPaise, savedAccountId]);

  const parsedPaise = parseToPaise(amountStr) ?? 0;
  const now = new Date();
  const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDaily = parsedPaise > 0 ? Math.round(parsedPaise / daysInCurrentMonth) : 0;

  // Selected account balance & name
  const selectedAccountBalance = useMemo(() => {
    if (selectedAccountId === 'ALL') return totalBalance;
    return balances.get(selectedAccountId) ?? 0;
  }, [selectedAccountId, totalBalance, balances]);

  const selectedAccountName = useMemo(() => {
    if (selectedAccountId === 'ALL') return 'all accounts combined';
    const acc = activeAccounts.find((a) => asString(a.id) === selectedAccountId);
    return acc ? asString(acc.name) : 'this account';
  }, [selectedAccountId, activeAccounts]);

  const isOverBalance = parsedPaise > selectedAccountBalance;
  const canSave = parsedPaise > 0 && !busy && !isOverBalance;

  async function handleSave() {
    if (!canSave) return;
    setBusy(true);
    try {
      await setSpendingCap({
        categoryId: 'ALL',
        amountPaise: parsedPaise,
      });
      await setLocalMeta('monthly_limit_account_id', selectedAccountId);
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
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative z-10 w-full max-w-[440px] rounded-[24px] border border-line bg-surface p-6 shadow-2xl space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl font-medium text-text">Monthly limit</h2>
                <p className="text-xs text-muted mt-0.5">Overall spending ceiling for this month</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text transition"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Account Selector */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                Track against account
              </label>
              <CustomSelect
                value={selectedAccountId}
                onChange={setSelectedAccountId}
                className="mt-1.5"
                options={[
                  {
                    value: 'ALL',
                    label: 'All accounts',
                    sublabel: `Total: ${formatPaise(totalBalance, 'en-IN', 'INR', { decimals: false })}`,
                  },
                  ...activeAccounts.map((a) => {
                    const id = asString(a.id);
                    const bal = balances.get(id) ?? 0;
                    return {
                      value: id,
                      label: asString(a.name),
                      sublabel: `Bal: ${formatPaise(bal, 'en-IN', 'INR', { decimals: false })}`,
                    };
                  }),
                ]}
              />
            </div>

            {/* Amount input */}
            <div className="py-1 text-center">
              <div className="relative inline-flex items-center justify-center">
                <span className="font-mono text-3xl font-medium text-muted mr-1.5">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSave) void handleSave();
                  }}
                  placeholder="20000"
                  className="money w-52 bg-transparent text-center font-mono text-4xl font-medium text-text outline-none"
                />
              </div>
              <p className="font-mono text-xs text-muted mt-2 tabular">
                ~ {formatPaise(safeDaily, 'en-IN', 'INR', { decimals: false })} a day over {daysInCurrentMonth} days
              </p>
            </div>

            {/* Warning if limit exceeds account balance (Themed in plain brass/gold) */}
            {isOverBalance && parsedPaise > 0 && (
              <div className="rounded-xl border border-accent/40 bg-accent/10 p-3.5 text-xs text-text space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-accent">
                  <Icon name="warning" size={16} className="text-accent" />
                  <span>Limit exceeds available balance</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted">
                  Monthly limit ({formatPaise(parsedPaise, 'en-IN', 'INR', { decimals: false })}) is greater than the available balance ({formatPaise(selectedAccountBalance, 'en-IN', 'INR', { decimals: false })}) in {selectedAccountName}. You cannot set a limit greater than your available funds.
                </p>
              </div>
            )}

            {/* Quick Presets */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-2">Quick presets</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_LIMITS.map((preset) => {
                  const isSelected = parsedPaise === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountStr(String(preset / 100))}
                      className={`rounded-full px-3 py-1.5 text-xs font-mono transition ${
                        isSelected
                          ? 'border border-accent bg-accent text-on-accent font-semibold'
                          : 'border border-line bg-raised text-muted hover:text-text'
                      }`}
                    >
                      {formatPaise(preset, 'en-IN', 'INR', { decimals: false })}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={`w-full rounded-[14px] py-3 text-sm font-semibold transition active:scale-[0.99] shadow-md ${
                  canSave
                    ? 'bg-accent text-on-accent hover:brightness-105 cursor-pointer'
                    : 'bg-raised text-muted cursor-not-allowed border border-line opacity-60'
                }`}
              >
                {busy
                  ? 'Saving…'
                  : isOverBalance && parsedPaise > 0
                    ? 'Limit exceeds available balance'
                    : 'Save monthly limit'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
