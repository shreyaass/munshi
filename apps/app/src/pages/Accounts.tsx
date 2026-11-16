import { useMemo, useState } from 'react';
import { ACCOUNT_TYPES, formatPaise, parseToPaise, todayISO, type AccountType } from '@em/core';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
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

const TYPE_META: Record<string, { label: string; emoji: string }> = {
  cash: { label: 'Cash', emoji: '💵' },
  bank: { label: 'Bank', emoji: '🏦' },
  upi: { label: 'UPI', emoji: '📱' },
  credit: { label: 'Credit card', emoji: '💳' },
  wallet: { label: 'Wallet', emoji: '👛' },
};

interface AccountDraft {
  id?: string;
  name: string;
  type: AccountType;
  opening: string;
}

const EMPTY_DRAFT: AccountDraft = { name: '', type: 'cash', opening: '' };

export function Accounts() {
  const { syncNow } = useSync();
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');

  const accountRows = useTabRows('Accounts');
  const transferRows = useTabRows('Transfers');
  const transactions = useTransactions();

  const accounts = useMemo(
    () => (accountRows ?? []).filter((a) => !asBool(a.deleted)),
    [accountRows],
  );

  const balances = useMemo(
    () => accountBalances(accounts, transactions ?? [], transferRows ?? []),
    [accounts, transactions, transferRows],
  );

  const total = useMemo(() => [...balances.values()].reduce((a, b) => a + b, 0), [balances]);

  const [draft, setDraft] = useState<AccountDraft | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [busy, setBusy] = useState(false);

  function openNew() {
    setDraft({ ...EMPTY_DRAFT });
  }

  function openEdit(id: string) {
    const row = accounts.find((a) => asString(a.id) === id);
    if (!row) return;
    setDraft({
      id,
      name: asString(row.name),
      type: (asString(row.type) || 'cash') as AccountType,
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
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
        <p className="text-[11px] uppercase tracking-wider text-slate-400">Total balance</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight">
          {formatPaise(total, locale, currency, { decimals: false })}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => openTransfer()}
            disabled={accounts.length < 2}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium disabled:opacity-40"
          >
            <Icon name="arrow-left-right" className="h-3.5 w-3.5" />
            Transfer
          </button>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium"
          >
            <Icon name="add" className="h-3.5 w-3.5" />
            Account
          </button>
        </div>
      </div>

      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/70 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
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
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition active:bg-slate-50 dark:active:bg-slate-800/60"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-base dark:bg-slate-800">
                  {meta.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{asString(a.name)}</span>
                  <span className="block text-[11px] text-slate-400">{meta.label}</span>
                </span>
                <span className={`shrink-0 text-sm font-semibold ${balance < 0 ? 'text-rose-600' : ''}`}>
                  {formatPaise(balance, locale, currency, { decimals: false })}
                </span>
              </button>
            </li>
          );
        })}
        {accounts.length === 0 && (
          <li className="px-4 py-10 text-center text-xs text-slate-400">No accounts yet. Add your first one.</li>
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
                className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:bg-rose-950/40"
              >
                Archive
              </button>
            )}
            <button
              type="button"
              onClick={saveDraft}
              disabled={!draft?.name.trim() || busy}
              className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-3 pt-1">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Account name"
              autoFocus
              className="w-full rounded-xl bg-slate-100 px-3.5 py-3 text-sm outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-800"
            />
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraft({ ...draft, type: t })}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    draft.type === t
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {TYPE_META[t]?.emoji} {TYPE_META[t]?.label ?? t}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Opening balance
              </span>
              <input
                value={draft.opening}
                onChange={(e) => setDraft({ ...draft, opening: e.target.value })}
                inputMode="decimal"
                placeholder="0"
                className="w-full rounded-xl bg-slate-100 px-3.5 py-3 text-sm outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-800"
              />
            </label>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Balance = opening balance + income − expenses + transfers in − transfers out.
            </p>
          </div>
        )}
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
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
          >
            {busy ? 'Saving…' : 'Transfer'}
          </button>
        }
      >
        <div className="space-y-3 pt-1">
          <input
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Amount"
            autoFocus
            className="w-full rounded-xl bg-slate-100 px-3.5 py-4 text-center text-2xl font-semibold outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-800"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">From</span>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none dark:bg-slate-800"
              >
                {accounts.map((a) => (
                  <option key={asString(a.id)} value={asString(a.id)}>
                    {asString(a.name)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">To</span>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="w-full rounded-xl bg-slate-100 px-3 py-2.5 text-sm outline-none dark:bg-slate-800"
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
          <p className="text-[11px] text-slate-400">
            Transfers never count as income or expense — they only move balance between accounts.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
