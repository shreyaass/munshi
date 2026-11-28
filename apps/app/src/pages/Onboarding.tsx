import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { formatPaise, parseToPaise } from '@em/core';
import { AccountForm, EMPTY_ACCOUNT, type AccountDraft } from '../components/AccountForm';
import { Icon } from '../components/Icon';
import { useConnectionState } from '../lib/connection';
import { serializeLimitAccountIds } from '../lib/analytics';
import { addAccount, setLocalMeta, setSpendingCap } from '../lib/repo';
import { useSync } from '../lib/SyncProvider';

interface ConfiguredAccount {
  id: string;
  name: string;
  type: string;
  kind?: string;
  openingPaise: number;
  isSavings: boolean;
  last4?: string;
  bankName?: string;
}

const PRESET_LIMITS = [1000000, 2000000, 3000000, 5000000]; // ₹10k, ₹20k, ₹30k, ₹50k

export function Onboarding() {
  const { conn } = useConnectionState();
  const { syncNow } = useSync();
  const navigate = useNavigate();

  const [step, setStep] = useState<'accounts' | 'limit'>('accounts');
  const [configuredList, setConfiguredList] = useState<ConfiguredAccount[]>([]);
  const [draft, setDraft] = useState<AccountDraft>({ ...EMPTY_ACCOUNT });

  // Monthly limit step state (suggests ₹20,000, lets user customize or skip)
  const [limitStr, setLimitStr] = useState('20000');
  const [selectedAccountIndices, setSelectedAccountIndices] = useState<number[] | null>(null); // null = All accounts
  const [busy, setBusy] = useState(false);

  const pendingAccounts = useMemo(() => {
    const list = [...configuredList];
    if (draft.name.trim()) {
      list.push({
        id: 'draft',
        name: draft.name.trim(),
        type: draft.type,
        kind: draft.kind ?? draft.type,
        openingPaise: parseToPaise(draft.opening) ?? 0,
        isSavings: Boolean(draft.isSavings),
        last4: draft.last4,
        bankName: draft.bankName,
      });
    }
    return list;
  }, [configuredList, draft]);

  const totalPendingBalance = useMemo(
    () => pendingAccounts.reduce((sum, acc) => sum + acc.openingPaise, 0),
    [pendingAccounts],
  );

  const selectedBalance = useMemo(() => {
    if (!selectedAccountIndices || selectedAccountIndices.length === 0) {
      return totalPendingBalance;
    }
    return selectedAccountIndices.reduce(
      (sum, idx) => sum + (pendingAccounts[idx]?.openingPaise ?? 0),
      0,
    );
  }, [selectedAccountIndices, pendingAccounts, totalPendingBalance]);

  const parsedLimitPaise = parseToPaise(limitStr) ?? 0;

  if (!conn) return <Navigate to="/tour?step=5" replace />;

  function commitDraftIntoList() {
    if (!draft.name.trim()) return;
    const openingPaise = parseToPaise(draft.opening) ?? 0;
    setConfiguredList((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        name: draft.name.trim(),
        type: draft.type,
        kind: draft.kind ?? draft.type,
        openingPaise,
        isSavings: Boolean(draft.isSavings),
        last4: draft.last4,
        bankName: draft.bankName,
      },
    ]);
    setDraft({ ...EMPTY_ACCOUNT });
  }

  function handleRemoveConfigured(id: string) {
    setConfiguredList((prev) => prev.filter((item) => item.id !== id));
    setSelectedAccountIndices(null);
  }

  function handleContinueToLimit() {
    if (pendingAccounts.length === 0) return;
    commitDraftIntoList();
    setSelectedAccountIndices(null);
    setStep('limit');
  }

  function toggleLimitAccount(idx: number) {
    if (selectedAccountIndices === null) {
      setSelectedAccountIndices([idx]);
      return;
    }
    const exists = selectedAccountIndices.includes(idx);
    const next = exists
      ? selectedAccountIndices.filter((i) => i !== idx)
      : [...selectedAccountIndices, idx];
    if (next.length === 0 || next.length === pendingAccounts.length) {
      setSelectedAccountIndices(null);
    } else {
      setSelectedAccountIndices(next);
    }
  }

  async function handleFinish(skipLimit: boolean) {
    setBusy(true);
    try {
      const accountsToSave = [...pendingAccounts];
      const createdIds: string[] = [];

      for (const acc of accountsToSave) {
        const createdId = await addAccount({
          name: acc.name,
          type: acc.type as Parameters<typeof addAccount>[0]['type'],
          kind: (acc.kind ?? acc.type) as Parameters<typeof addAccount>[0]['kind'],
          openingBalancePaise: acc.openingPaise,
          isSavings: acc.isSavings,
          last4: acc.last4,
          bankName: acc.bankName,
        });
        createdIds.push(createdId);
      }

      if (skipLimit || parsedLimitPaise <= 0) {
        await setSpendingCap({ categoryId: 'ALL', amountPaise: 0 });
        await setLocalMeta('monthly_limit_account_id', 'ALL');
      } else {
        await setSpendingCap({ categoryId: 'ALL', amountPaise: parsedLimitPaise });
        const trackedIds =
          selectedAccountIndices && selectedAccountIndices.length > 0
            ? selectedAccountIndices
                .map((idx) => createdIds[idx])
                .filter((id): id is string => Boolean(id))
            : null;
        await setLocalMeta('monthly_limit_account_id', serializeLimitAccountIds(trackedIds));
      }

      await setLocalMeta('onboarded', '1');
      await syncNow();
      navigate('/dashboard', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg px-5 pb-8 pt-6 text-text">
      {/* Step Indicator */}
      <div className="space-y-2 pb-6">
        <div className="flex items-center justify-between font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-muted">
          <span>{step === 'accounts' ? 'Step 1 of 2 · Accounts' : 'Step 2 of 2 · Monthly Limit'}</span>
          {step === 'limit' && (
            <button
              type="button"
              onClick={() => setStep('accounts')}
              className="text-accent hover:underline"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="h-1 w-full rounded-full bg-raised overflow-hidden">
          <div
            className={`h-full rounded-full bg-accent transition-all duration-300 ${
              step === 'accounts' ? 'w-1/2' : 'w-full'
            }`}
          />
        </div>
      </div>

      {step === 'accounts' ? (
        <>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-text">
            Set up your accounts
          </h1>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Start from a clean slate — add the bank accounts, cash, cards, or wallets you track. Use the field labels and hints below; no full account numbers needed.
          </p>

          {configuredList.length > 0 && (
            <div className="my-5 space-y-2">
              {configuredList.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-[16px] border border-line bg-surface p-3.5 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-income/15 text-income">
                      <Icon name="check" size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text truncate">{acc.name}</p>
                        {acc.isSavings && (
                          <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.2 text-[9px] font-semibold text-accent">
                            Savings
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted capitalize truncate">
                        {acc.type}
                        {acc.bankName ? ` · ${acc.bankName}` : ''}
                        {acc.last4 ? ` · •• ${acc.last4}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-sm font-medium tabular text-text">
                      {formatPaise(acc.openingPaise, 'en-IN', 'INR', { decimals: false })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveConfigured(acc.id)}
                      aria-label={`Remove ${acc.name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-expense transition"
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-[20px] border border-line bg-surface p-5 shadow-sm space-y-4 my-3">
            <div className="flex items-center justify-between pb-1 border-b border-line/40">
              <h2 className="font-semibold text-sm text-text">
                {configuredList.length === 0 ? 'Add your first account' : 'Add another account'}
              </h2>
              {draft.name.trim() && (
                <button
                  type="button"
                  onClick={commitDraftIntoList}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  + Save &amp; add another
                </button>
              )}
            </div>

            <AccountForm draft={draft} onChange={setDraft} />
          </div>

          <div className="mt-auto pt-6 space-y-3">
            <button
              type="button"
              onClick={handleContinueToLimit}
              disabled={pendingAccounts.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-on-accent transition hover:brightness-105 active:scale-[0.99] disabled:bg-raised disabled:text-muted shadow-md"
            >
              <span>Continue to monthly limit</span>
              <Icon name="arrow_forward" size={16} />
            </button>
            <p className="text-center text-[11px] text-muted">
              Two accounts at one bank are told apart by nickname and last 4.
            </p>
          </div>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl md:text-3xl font-medium text-text">
            Set a monthly limit
          </h1>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Munshi uses this to calculate your daily safe-to-spend pace on the Dashboard. We suggest ₹20,000 as a starting benchmark — customize it, choose which accounts it tracks against, or skip it for now.
          </p>

          <div className="rounded-[20px] border border-line bg-surface p-5 shadow-sm space-y-5 my-4">
            {/* Amount input */}
            <div className="py-1 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-2">
                Suggested monthly limit
              </p>
              <div className="relative inline-flex items-center justify-center">
                <span className="font-mono text-3xl font-medium text-muted mr-1.5">₹</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={limitStr}
                  onChange={(e) => setLimitStr(e.target.value.replace(/\D/g, ''))}
                  placeholder="20000"
                  className="money w-48 bg-transparent text-center font-mono text-4xl font-medium text-text outline-none"
                />
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {PRESET_LIMITS.map((preset) => {
                  const active = parsedLimitPaise === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setLimitStr(String(preset / 100))}
                      className={`rounded-full px-3 py-1.5 text-xs font-mono transition ${
                        active
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

            {/* Track against accounts (All or Multi-select) */}
            <div className="space-y-2 border-t border-line/50 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Track against accounts
                </span>
                <span className="font-mono text-[11px] text-muted tabular">
                  {formatPaise(selectedBalance, 'en-IN', 'INR', { decimals: false })} tracked
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountIndices(null)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    selectedAccountIndices === null
                      ? 'border border-accent bg-accent/15 text-accent'
                      : 'border border-line bg-raised text-muted hover:text-text'
                  }`}
                >
                  {selectedAccountIndices === null && <Icon name="check" size={14} />}
                  <span>All accounts</span>
                </button>
                {pendingAccounts.map((acc, idx) => {
                  const isSelected = selectedAccountIndices !== null && selectedAccountIndices.includes(idx);
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggleLimitAccount(idx)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border border-accent bg-accent/15 text-accent'
                          : 'border border-line bg-raised text-muted hover:text-text'
                      }`}
                    >
                      {isSelected && <Icon name="check" size={14} />}
                      <span>{acc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {parsedLimitPaise > selectedBalance && selectedBalance > 0 && (
              <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-[11px] leading-relaxed text-muted">
                <span className="font-semibold text-accent">Heads up: </span>
                This limit is above your current tracked opening balance (
                {formatPaise(selectedBalance, 'en-IN', 'INR', { decimals: false })}). You can adjust it anytime from the Dashboard.
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => void handleFinish(false)}
              disabled={busy || parsedLimitPaise <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-on-accent transition hover:brightness-105 active:scale-[0.99] disabled:bg-raised disabled:text-muted shadow-md"
            >
              <span>{busy ? 'Saving & syncing…' : 'Save limit & open Munshi'}</span>
              {!busy && <Icon name="arrow_forward" size={16} />}
            </button>
            <button
              type="button"
              onClick={() => void handleFinish(true)}
              disabled={busy}
              className="flex w-full items-center justify-center rounded-xl border border-line bg-surface py-3 text-sm font-medium text-muted transition hover:bg-raised hover:text-text disabled:opacity-50"
            >
              Skip for now
            </button>
          </div>
        </>
      )}
    </div>
  );
}
