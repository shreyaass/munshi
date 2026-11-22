import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { formatPaise, parseToPaise } from '@em/core';
import { AccountForm, EMPTY_ACCOUNT, type AccountDraft } from '../components/AccountForm';
import { Icon } from '../components/Icon';
import { useConnectionState } from '../lib/connection';
import { addAccount, setLocalMeta } from '../lib/repo';
import { useSync } from '../lib/SyncProvider';

interface ConfiguredAccount {
  name: string;
  type: string;
  kind?: string;
  openingPaise: number;
  isSavings: boolean;
  last4?: string;
  bankName?: string;
}

export function Onboarding() {
  const { conn } = useConnectionState();
  const { syncNow } = useSync();
  const navigate = useNavigate();

  const [configuredList, setConfiguredList] = useState<ConfiguredAccount[]>([
    {
      name: 'Kotak · Salary',
      type: 'bank',
      kind: 'bank',
      openingPaise: 2239700,
      isSavings: false,
      last4: '4821',
      bankName: 'Kotak',
    },
    {
      name: 'Cash',
      type: 'cash',
      kind: 'cash',
      openingPaise: 0,
      isSavings: false,
    },
  ]);

  const [draft, setDraft] = useState<AccountDraft>({
    ...EMPTY_ACCOUNT,
    name: 'HDFC · Savings',
    type: 'bank',
    bankName: 'HDFC Bank',
    opening: '34600',
    last4: '7310',
    isSavings: true,
  });

  const [busy, setBusy] = useState(false);

  if (!conn) return <Navigate to="/connect" replace />;

  function handleAddAccountToSetup() {
    if (!draft.name.trim()) return;
    const openingPaise = parseToPaise(draft.opening) ?? 0;
    setConfiguredList((prev) => [
      ...prev,
      {
        name: draft.name.trim(),
        type: draft.type,
        kind: draft.kind ?? draft.type,
        openingPaise,
        isSavings: Boolean(draft.isSavings),
        last4: draft.last4,
        bankName: draft.bankName,
      },
    ]);
    setDraft({ ...EMPTY_ACCOUNT, name: '', opening: '', last4: '', bankName: '', isSavings: false });
  }

  async function handleFinish() {
    setBusy(true);
    try {
      // If there's an active draft with a name, include it too
      const allToSave = [...configuredList];
      if (draft.name.trim()) {
        allToSave.push({
          name: draft.name.trim(),
          type: draft.type,
          kind: draft.kind ?? draft.type,
          openingPaise: parseToPaise(draft.opening) ?? 0,
          isSavings: Boolean(draft.isSavings),
          last4: draft.last4,
          bankName: draft.bankName,
        });
      }

      for (const acc of allToSave) {
        await addAccount({
          name: acc.name,
          type: acc.type as any,
          kind: (acc.kind ?? acc.type) as any,
          openingBalancePaise: acc.openingPaise,
          isSavings: acc.isSavings,
          last4: acc.last4,
          bankName: acc.bankName,
        });
      }

      await setLocalMeta('onboarded', '1');
      await syncNow();
      navigate('/dashboard', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-5 pb-8 pt-6 text-text">
      {/* Step Indicator */}
      <div className="space-y-2 pb-6">
        <div className="flex items-center justify-between font-mono text-[11px] font-medium tracking-[0.14em] uppercase text-muted">
          <span>Step 2 of 3</span>
        </div>
        <div className="h-1 w-full rounded-full bg-raised overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-accent" />
        </div>
      </div>

      {/* Title */}
      <h1 className="font-display text-2xl md:text-3xl font-medium text-text">
        Set up your accounts
      </h1>
      <p className="mt-1 text-xs text-muted leading-relaxed">
        Add every account you use. No full account numbers needed.
      </p>

      {/* Configured Accounts List */}
      {configuredList.length > 0 && (
        <div className="my-5 space-y-2">
          {configuredList.map((acc, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-[16px] border border-line bg-surface p-3.5 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-income/15 text-income">
                  <Icon name="check" size={16} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-text">{acc.name}</p>
                    {acc.isSavings && (
                      <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-0.2 text-[9px] font-semibold text-accent">
                        Savings
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted capitalize">
                    {acc.type}
                    {acc.last4 ? ` · •• ${acc.last4}` : ''}
                  </p>
                </div>
              </div>
              <span className="font-mono text-sm font-medium tabular text-text">
                {formatPaise(acc.openingPaise, 'en-IN', 'INR', { decimals: false })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Form Container */}
      <div className="rounded-[20px] border border-line bg-surface p-5 shadow-sm space-y-4 my-2">
        <div className="flex items-center justify-between pb-1 border-b border-line/40">
          <h2 className="font-semibold text-sm text-text">Add account</h2>
          {draft.name.trim() && (
            <button
              type="button"
              onClick={handleAddAccountToSetup}
              className="text-xs font-semibold text-accent hover:underline"
            >
              + Save & add another
            </button>
          )}
        </div>

        <AccountForm draft={draft} onChange={setDraft} />
      </div>

      {/* Bottom CTA */}
      <div className="mt-auto pt-6 space-y-3">
        <button
          type="button"
          onClick={handleFinish}
          disabled={busy || (configuredList.length === 0 && !draft.name.trim())}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-on-accent transition hover:brightness-105 active:scale-[0.99] disabled:bg-raised disabled:text-muted shadow-md"
        >
          {busy ? 'Setting up…' : 'Continue'}
          {!busy && <Icon name="arrow_forward" size={16} />}
        </button>
        <p className="text-center text-[11px] text-muted">
          Two accounts at one bank are told apart by nickname and last 4.
        </p>
      </div>
    </div>
  );
}
