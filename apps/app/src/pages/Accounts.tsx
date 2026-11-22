import { useMemo, useState } from 'react';
import { currentMonthKey, formatPaise, fromISODate, goalSavedAmount, parseToPaise, todayISO } from '@em/core';
import { Icon, type IconName } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { CustomSelect } from '../components/CustomSelect';
import { AccountForm, EMPTY_ACCOUNT, TYPE_META, type AccountDraft } from '../components/AccountForm';
import { accountBalances, balanceBreakdown, asBool, asNumber, asString } from '../lib/analytics';
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

function accountIcon(type: string): IconName {
  if (type === 'bank') return 'account_balance';
  if (type === 'cash') return 'payments';
  return 'account_balance_wallet';
}

function formatTransferDate(dateStr: string, locale: string): string {
  if (!dateStr) return '';
  try {
    const d = fromISODate(dateStr);
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export function Accounts() {
  const { syncNow } = useSync();
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');

  const accountRows = useTabRows('Accounts');
  const transferRows = useTabRows('Transfers');
  const goalRows = useTabRows('Goals');
  const contributionRows = useTabRows('Contributions');
  const transactions = useTransactions();

  const accounts = useMemo(() => (accountRows ?? []).filter((a) => !asBool(a.deleted)), [accountRows]);

  const balances = useMemo(
    () => accountBalances(accounts, transactions ?? [], transferRows ?? []),
    [accounts, transactions, transferRows],
  );

  const breakdown = useMemo(
    () => balanceBreakdown(accounts, balances),
    [accounts, balances],
  );

  // Map each savings account to its linked saving goals and their allocated amounts
  const currentMonth = currentMonthKey();
  const accountGoalsMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; savedPaise: number }[]>();
    for (const g of goalRows ?? []) {
      if (asBool(g.deleted)) continue;
      const linkedAccId = asString(g.linked_account_id);
      if (!linkedAccId) continue;
      const gid = asString(g.id);
      const recurrence = (asString(g.recurrence) || 'once') as 'once' | 'monthly' | 'yearly';
      const saved = goalSavedAmount(gid, recurrence, contributionRows ?? [], currentMonth);
      if (saved > 0) {
        const list = map.get(linkedAccId) ?? [];
        list.push({ id: gid, name: asString(g.name), savedPaise: saved });
        map.set(linkedAccId, list);
      }
    }
    return map;
  }, [goalRows, contributionRows, currentMonth]);

  const [draft, setDraft] = useState<AccountDraft | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
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
      type: (asString(row.type) || 'bank') as AccountDraft['type'],
      opening: row.opening_balance_paise ? String(asNumber(row.opening_balance_paise) / 100) : '',
      isSavings: asBool(row.is_savings),
      last4: asString(row.last4),
      bankName: asString(row.bank_name),
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
          is_savings: Boolean(draft.isSavings),
          last4: draft.last4 ?? '',
          bank_name: draft.bankName ?? '',
        });
      } else {
        await addAccount({
          name: draft.name.trim(),
          type: draft.type,
          openingBalancePaise: opening,
          isSavings: Boolean(draft.isSavings),
          last4: draft.last4,
          bankName: draft.bankName,
        });
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

  // Transfers sorted by date desc
  const recentTransfers = useMemo(() => {
    return [...(transferRows ?? [])]
      .filter((t) => !asBool(t.deleted))
      .sort((a, b) => asString(b.date ?? '').localeCompare(asString(a.date ?? '')));
  }, [transferRows]);

  return (
    <div className="space-y-6 pb-12">
      {/* Desktop / Tablet Header (md+) */}
      <div className="hidden md:flex items-center justify-between pb-2 pt-1">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-medium text-text">Accounts</h1>
          <p className="text-xs text-muted mt-1 uppercase tracking-[0.08em] font-medium">All balances</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => openTransfer()}
            disabled={accounts.length < 2}
            className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-text transition hover:bg-raised active:scale-[0.99] disabled:opacity-40"
          >
            Transfer
          </button>
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent shadow-sm transition hover:brightness-105 active:scale-[0.99]"
          >
            <Icon name="add" size={18} />
            <span>Add account</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Row: Total Balance, Spendable, Saved */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
        {/* Total Balance */}
        <div className="rounded-[20px] border border-line bg-surface p-5 flex flex-col justify-between min-h-[145px] shadow-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-medium">Total Balance</p>
            <p className="money mt-1 text-3xl lg:text-4xl font-medium text-text tabular">
              {formatPaise(breakdown.total, locale, currency, { decimals: false })}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </span>
            {/* Mobile Actions (< md) */}
            <div className="flex md:hidden gap-2">
              <button
                type="button"
                onClick={() => openTransfer()}
                disabled={accounts.length < 2}
                className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-text active:bg-raised disabled:opacity-40"
              >
                <Icon name="swap_horiz" size={16} />
                <span>Transfer</span>
              </button>
              <button
                type="button"
                onClick={openNew}
                className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent"
              >
                <Icon name="add" size={16} />
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>

        {/* Spendable */}
        <div className="rounded-[20px] border border-line bg-surface p-5 flex flex-col justify-between min-h-[145px] shadow-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-medium">Spendable</p>
            <p className="money mt-1 text-2xl lg:text-3xl font-medium text-text tabular">
              {formatPaise(breakdown.spendable, locale, currency, { decimals: false })}
            </p>
          </div>
          <p className="text-xs text-muted">Day-to-day accounts</p>
        </div>

        {/* Saved */}
        <div className="rounded-[20px] border border-line bg-surface p-5 flex flex-col justify-between min-h-[145px] shadow-sm">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-medium">Saved</p>
            <p className="money mt-1 text-2xl lg:text-3xl font-medium text-accent tabular">
              {formatPaise(breakdown.saved, locale, currency, { decimals: false })}
            </p>
          </div>
          <p className="text-xs text-muted">In savings accounts</p>
        </div>
      </div>

      {/* Account Cards Grid (Desktop & Tablet: 3 columns) */}
      <section className="space-y-3">
        <h2 className="hidden md:block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Your Accounts
        </h2>

        {/* Mobile List (< md) */}
        <div className="md:hidden">
          <ul className="overflow-hidden rounded-[20px] border border-line bg-surface divide-y divide-line shadow-sm">
            {accounts.map((a) => {
              const id = asString(a.id);
              const type = asString(a.type);
              const meta = TYPE_META[type] ?? { label: type, emoji: '•' };
              const balance = balances.get(id) ?? 0;
              const isSavings = asBool(a.is_savings);
              const last4 = asString(a.last4);
              const linkedGoals = accountGoalsMap.get(id) ?? [];
              const allocatedTotal = linkedGoals.reduce((s, g) => s + g.savedPaise, 0);
              const unallocated = Math.max(0, balance - allocatedTotal);
              const totalForBar = Math.max(1, Math.max(balance, allocatedTotal));

              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => openEdit(id)}
                    className="flex flex-col w-full px-4 py-3.5 text-left transition active:bg-raised"
                  >
                    <div className="flex w-full items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-raised text-muted">
                        <Icon name={accountIcon(type)} size={20} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-text">{asString(a.name)}</span>
                          {isSavings && (
                            <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                              Savings
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-muted">
                          {meta.label}
                          {last4 ? ` · •• ${last4}` : ''}
                        </span>
                      </span>
                      <span className={`money shrink-0 text-sm font-medium tabular ${balance < 0 ? 'text-expense' : 'text-text'}`}>
                        {formatPaise(balance, locale, currency, { decimals: false })}
                      </span>
                    </div>

                    {/* Stacked Progress Bar for Savings Accounts */}
                    {isSavings && balance > 0 && (
                      <div className="mt-3 w-full pt-2 border-t border-line/30 space-y-1.5">
                        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-raised">
                          {linkedGoals.map((g, idx) => (
                            <div
                              key={g.id}
                              className={`h-full ${idx % 2 === 0 ? 'bg-accent' : 'bg-accent/70'}`}
                              style={{ width: `${(g.savedPaise / totalForBar) * 100}%` }}
                              title={`${g.name}: ${formatPaise(g.savedPaise, locale, currency, { decimals: false })}`}
                            />
                          ))}
                          {unallocated > 0 && (
                            <div
                              className="h-full bg-line"
                              style={{ width: `${(unallocated / totalForBar) * 100}%` }}
                              title={`Unallocated: ${formatPaise(unallocated, locale, currency, { decimals: false })}`}
                            />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-muted tabular">
                          <span>
                            {linkedGoals.length > 0
                              ? linkedGoals.map((g) => `${g.name} (${formatPaise(g.savedPaise, locale, currency, { decimals: false })})`).join(', ')
                              : 'No goals tagged'}
                          </span>
                          <span>Unallocated: {formatPaise(unallocated, locale, currency, { decimals: false })}</span>
                        </div>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
            {accounts.length === 0 && (
              <li className="px-4 py-10 text-center text-xs text-muted">No accounts yet. Add your first one.</li>
            )}
          </ul>
        </div>

        {/* Desktop / Tablet Grid (md+) */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((a) => {
            const id = asString(a.id);
            const type = asString(a.type);
            const balance = balances.get(id) ?? 0;
            const isSavings = asBool(a.is_savings);
            const last4 = asString(a.last4);
            const linkedGoals = accountGoalsMap.get(id) ?? [];
            const allocatedTotal = linkedGoals.reduce((s, g) => s + g.savedPaise, 0);
            const unallocated = Math.max(0, balance - allocatedTotal);
            const totalForBar = Math.max(1, Math.max(balance, allocatedTotal));

            return (
              <button
                key={id}
                type="button"
                onClick={() => openEdit(id)}
                className="flex flex-col justify-between rounded-[20px] border border-line bg-surface p-5 text-left transition hover:border-line/90 hover:bg-surface/80 active:scale-[0.995] min-h-[160px] shadow-sm"
              >
                {/* Top: Icon + Badge + Type */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Icon name={accountIcon(type)} size={22} className="text-muted" />
                    {isSavings && (
                      <span className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        Savings
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {last4 ? `•• ${last4}` : type}
                  </span>
                </div>

                {/* Middle: Big Balance */}
                <p className={`money text-2xl lg:text-3xl font-medium tabular my-2 ${balance < 0 ? 'text-expense' : 'text-text'}`}>
                  {formatPaise(balance, locale, currency, { decimals: false })}
                </p>

                {/* Bottom: Account Name & Stacked Bar */}
                <div className="w-full">
                  <p className="text-sm font-medium text-muted truncate">{asString(a.name)}</p>

                  {isSavings && balance > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-line/40 space-y-1">
                      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-raised">
                        {linkedGoals.map((g, idx) => (
                          <div
                            key={g.id}
                            className={`h-full ${idx % 2 === 0 ? 'bg-accent' : 'bg-accent/70'}`}
                            style={{ width: `${(g.savedPaise / totalForBar) * 100}%` }}
                            title={`${g.name}: ${formatPaise(g.savedPaise, locale, currency, { decimals: false })}`}
                          />
                        ))}
                        {unallocated > 0 && (
                          <div
                            className="h-full bg-line"
                            style={{ width: `${(unallocated / totalForBar) * 100}%` }}
                            title={`Unallocated: ${formatPaise(unallocated, locale, currency, { decimals: false })}`}
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-muted tabular">
                        <span className="truncate max-w-[60%]">
                          {linkedGoals.length > 0 ? `${linkedGoals.length} goals` : 'Unallocated'}
                        </span>
                        <span>{formatPaise(unallocated, locale, currency, { decimals: false })} free</span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Transfers Section */}
      <section className="rounded-[20px] border border-line bg-surface p-5 shadow-sm">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted mb-4">
          Transfers
        </h2>
        {recentTransfers.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted">No transfers recorded yet.</p>
        ) : (
          <div className="divide-y divide-line/60">
            {recentTransfers.slice(0, 5).map((t) => {
              const fromAcc = accounts.find((a) => asString(a.id) === asString(t.from_account_id));
              const toAcc = accounts.find((a) => asString(a.id) === asString(t.to_account_id));
              const amount = Number(t.amount_paise) || 0;
              const dateStr = asString(t.date ?? '');
              const dateLabel = formatTransferDate(dateStr, locale);

              return (
                <div key={asString(t.id)} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised text-muted">
                    <Icon name="swap_horiz" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">
                      {asString(fromAcc?.name) || 'Account'} → {asString(toAcc?.name) || 'Account'}
                    </p>
                    <p className="text-[11px] text-muted">
                      Transfer{dateLabel ? ` · ${dateLabel}` : ''}
                    </p>
                  </div>
                  <span className="money shrink-0 text-sm font-medium tabular text-text">
                    {formatPaise(amount, locale, currency, { decimals: false })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Add / edit account sheet */}
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
                className="rounded-xl border border-expense/50 px-4 py-3 text-sm font-semibold text-expense"
              >
                Archive
              </button>
            )}
            <button
              type="button"
              onClick={saveDraft}
              disabled={!draft?.name.trim() || busy}
              className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent disabled:bg-raised disabled:text-muted"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        }
      >
        {draft && <AccountForm draft={draft} onChange={setDraft} autoFocus />}
      </Sheet>

      {/* Transfer sheet */}
      <Sheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer between accounts"
        footer={
          <button
            type="button"
            onClick={saveTransfer}
            disabled={!parseToPaise(transferAmount) || !fromId || !toId || fromId === toId || busy}
            className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent disabled:bg-raised disabled:text-muted"
          >
            {busy ? 'Transferring…' : 'Transfer'}
          </button>
        }
      >
        <div className="space-y-4 pt-1">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">From</label>
            <CustomSelect
              value={fromId}
              onChange={setFromId}
              className="mt-1"
              options={accounts.map((a) => ({
                value: asString(a.id),
                label: asString(a.name),
              }))}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">To</label>
            <CustomSelect
              value={toId}
              onChange={setToId}
              className="mt-1"
              options={accounts.map((a) => ({
                value: asString(a.id),
                label: asString(a.name),
              }))}
            />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">Amount</label>
            <div className="flex items-center rounded-xl bg-raised border border-line px-3.5 focus-within:border-accent mt-1">
              <span className="font-mono text-sm text-muted mr-1.5">₹</span>
              <input
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0"
                className="money min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none font-mono text-text"
              />
            </div>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
