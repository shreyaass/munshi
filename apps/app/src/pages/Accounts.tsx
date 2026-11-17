import { useMemo, useState } from 'react';
import { formatPaise, parseToPaise, todayISO } from '@em/core';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { AccountForm, EMPTY_ACCOUNT, TYPE_META, type AccountDraft } from '../components/AccountForm';
import { accountBalances, asBool, asNumber, asString } from '../lib/analytics';
import {
  addAccount,
  addTransfer,
  archiveAccount,
  updateAccount,
  useMetaValue,
  useTabRows,
  useTransactions,
} from '../lib/repo';
import { useSync } from '../lib/SyncProvider';

export function Accounts() {
  const { syncNow } = useSync();
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');

  const accountRows = useTabRows('Accounts');
  const transferRows = useTabRows('Transfers');
  const transactions = useTransactions();

  const accounts = useMemo(() => (accountRows ?? []).filter((a) => !asBool(a.deleted)), [accountRows]);

  const balances = useMemo(
    () => accountBalances(accounts, transactions ?? [], transferRows ?? []),
    [accounts, transactions, transferRows],
  );

  const total = useMemo(() => [...balances.values()].reduce((a, b) => a + b, 0), [balances]);

  const [draft, setDraft] = useState<AccountDraft | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [quickAccount, setQuickAccount] = useState<AccountDraft | null>(null);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [busy, setBusy] = useState(false);

  function openNew() {
    setDraft({ ...EMPTY_ACCOUNT });
  }

  function openEdit(id: string) {
    const row = accounts.find((a) => asString(a.id) === id);
    if (!row) return;
    setDraft({
      id,
      name: asString(row.name),
      type: (asString(row.type) || 'cash') as AccountDraft['type'],
      opening: row.opening_balance_paise ? String(asNumber(row.opening_balance_paise) / 100) : '',
    });
  }

  async function saveDraft() {
    if (!draft || !draft.name.trim() || busy) return;
    setBusy(true);
    try {
      const opening = parseToPaise(draft.opening) ?? 0;
      if (draft.id) {
        await updateAccount(draft.id, {
          name: draft.name.trim(),
          type: draft.type,
          opening_balance_paise: opening,
        });
      } else {
        await addAccount({ name: draft.name, type: draft.type, openingBalancePaise: opening });
      }
      setDraft(null);
      void syncNow();
    } finally {
      setBusy(false);
    }
  }

  /** Created from inside the transfer sheet: select it as the "from" account. */
  async function saveQuickAccount() {
    if (!quickAccount || !quickAccount.name.trim() || busy) return;
    setBusy(true);
    try {
      const id = await addAccount({
        name: quickAccount.name,
        type: quickAccount.type,
        openingBalancePaise: parseToPaise(quickAccount.opening) ?? 0,
      });
      setQuickAccount(null);
      if (!fromId) setFromId(id);
      void syncNow();
    } finally {
      setBusy(false);
    }
  }

  function openTransfer(from?: string) {
    const ids = accounts.map((a) => asString(a.id));
    setFromId(from ?? ids[0] ?? '');
    setToId(ids.find((id) => id !== (from ?? ids[0])) ?? '');
    setTransferAmount('');
    setTransferOpen(true);
  }

  async function saveTransfer() {
    const amount = parseToPaise(transferAmount);
    if (!amount || !fromId || !toId || fromId === toId || busy) return;
    setBusy(true);
    try {
      await addTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amountPaise: amount,
        date: todayISO(),
      });
      setTransferOpen(false);
      void syncNow();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-hero p-4 text-hero-ink">
        <p className="text-[11px] uppercase tracking-[0.12em] text-hero-muted">Total balance</p>
        <p className="money mt-1 text-3xl font-semibold">
          {formatPaise(total, locale, currency, { decimals: false })}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => openTransfer()}
            disabled={accounts.length < 2}
            className="flex items-center gap-1.5 rounded-lg bg-surface/10 px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40"
          >
            <Icon name="arrow-left-right" className="h-3.5 w-3.5" />
            Transfer
          </button>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-surface/10 px-2.5 py-1.5 text-[11px] font-medium"
          >
            <Icon name="add" className="h-3.5 w-3.5" />
            Account
          </button>
        </div>
      </div>

      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line/70 bg-surface">
        {accounts.map((a) => {
          const id = asString(a.id);
          const type = asString(a.type);
          const meta = TYPE_META[type] ?? { label: type, emoji: '•' };
          const balance = balances.get(id) ?? 0;

          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => openEdit(id)}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition active:bg-surface-muted/60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-muted text-base">
                  {meta.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{asString(a.name)}</span>
                  <span className="block text-[11px] text-muted">{meta.label}</span>
                </span>
                <span className={`money shrink-0 text-sm font-semibold ${balance < 0 ? 'text-danger' : ''}`}>
                  {formatPaise(balance, locale, currency, { decimals: false })}
                </span>
              </button>
            </li>
          );
        })}
        {accounts.length === 0 && (
          <li className="px-4 py-10 text-center text-xs text-muted">No accounts yet. Add your first one.</li>
        )}
      </ul>

      {/* Add / edit account */}
      <Sheet
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Edit account' : 'New account'}
        footer={
          <div className="flex gap-2">
            {draft?.id && (
              <button
                type="button"
                onClick={async () => {
                  if (!draft.id) return;
                  await archiveAccount(draft.id);
                  setDraft(null);
                  void syncNow();
                }}
                className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
              >
                Archive
              </button>
            )}
            <button
              type="button"
              onClick={saveDraft}
              disabled={!draft?.name.trim() || busy}
              className="flex-1 rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink disabled:bg-surface-muted disabled:text-muted"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        {draft && <AccountForm draft={draft} onChange={setDraft} autoFocus />}
      </Sheet>

      {/* Transfer */}
      <Sheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer between accounts"
        footer={
          <button
            type="button"
            onClick={saveTransfer}
            disabled={!parseToPaise(transferAmount) || fromId === toId || busy}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink disabled:bg-surface-muted disabled:text-muted"
          >
            {busy ? 'Saving…' : 'Transfer'}
          </button>
        }
      >
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-[11px] leading-relaxed text-muted">
              Transfers only move balance — never income or expense.
            </p>
            <button
              type="button"
              onClick={() => setQuickAccount({ ...EMPTY_ACCOUNT })}
              className="flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-brand"
            >
              <Icon name="add" className="h-3 w-3" />
              Account
            </button>
          </div>
          <input
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Amount"
            autoFocus
            className="money w-full rounded-xl bg-surface-muted px-3.5 py-4 text-center text-2xl font-semibold outline-none ring-brand focus:ring-2"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">From</span>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full rounded-xl bg-surface-muted px-3 py-2.5 text-sm outline-none"
              >
                {accounts.map((a) => (
                  <option key={asString(a.id)} value={asString(a.id)}>
                    {asString(a.name)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">To</span>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full rounded-xl bg-surface-muted px-3 py-2.5 text-sm outline-none"
              >
                {accounts
                  .filter((a) => asString(a.id) !== fromId)
                  .map((a) => (
                    <option key={asString(a.id)} value={asString(a.id)}>
                      {asString(a.name)}
                    </option>
                  ))}
              </select>
            </label>
          </div>
        </div>
      </Sheet>

      {/* Quick account, created from inside the transfer sheet */}
      <Sheet
        open={quickAccount !== null}
        onClose={() => setQuickAccount(null)}
        title="New account"
        footer={
          <button
            type="button"
            onClick={saveQuickAccount}
            disabled={!quickAccount?.name.trim() || busy}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink disabled:bg-surface-muted disabled:text-muted"
          >
            {busy ? 'Saving…' : 'Add account'}
          </button>
        }
      >
        {quickAccount && (
          <AccountForm
            draft={quickAccount}
            onChange={setQuickAccount}
            autoFocus
            hint="It appears in the From/To lists immediately."
          />
        )}
      </Sheet>
    </div>
  );
}
