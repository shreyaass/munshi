import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { AmountPad } from '../components/AmountPad';
import { AccountForm, EMPTY_ACCOUNT, type AccountDraft } from '../components/AccountForm';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import { CustomDatePicker } from '../components/CustomDatePicker';
import {
  addAccount,
  addCategory,
  addContribution,
  addTransaction,
  moveCategory,
  setCategoryPinned,
  updateTransaction,
  useMetaValue,
  useTabRows,
  useTransactions,
} from '../lib/repo';
import { asBool, asNumber, asString, categoriesFor, rowDate } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';
import { sound } from '../lib/sound';

type Direction = 'expense' | 'income';
type Tab = 'Expenses' | 'Income';

const EMOJI_SUGGESTIONS = [
  '🍜',
  '🛒',
  '🚌',
  '⚡',
  '🛍️',
  '💊',
  '🎬',
  '✈️',
  '🏠',
  '📚',
  '🎁',
  '☕',
  '🍺',
  '🎮',
  '🐾',
  '💡',
];

const USAGE_WINDOW_DAYS = 60;

/** Keypad-friendly amount: no grouping commas, trailing paise only when used. */
function prefillAmount(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const fraction = paise % 100;
  return fraction === 0 ? String(rupees) : `${rupees}.${String(fraction).padStart(2, '0')}`;
}

export function Add() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { syncNow } = useSync();
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');

  // `?edit=Expenses:tx-1` reopens an existing row; `?repeat=tx-1&tab=Expenses`
  // copies one into a fresh entry. Both seed the form once, then behave normally.
  const editParam = params.get('edit') ?? '';
  const repeatId = params.get('repeat') ?? '';
  const repeatTab: Tab = params.get('tab') === 'Income' ? 'Income' : 'Expenses';
  const editTarget = useMemo(() => {
    if (!editParam) return null;
    const [tab, id] = editParam.split(':');
    if (!id || (tab !== 'Expenses' && tab !== 'Income')) return null;
    return { tab: tab as Tab, id };
  }, [editParam]);
  const [seedDone, setSeedDone] = useState(!editParam && !repeatId);
  const [repeating, setRepeating] = useState(Boolean(repeatId) && !editParam);

  const [direction, setDirection] = useState<Direction>(
    params.get('type') === 'income' ? 'income' : 'expense',
  );
  const [raw, setRaw] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(todayISO());
  const [payee, setPayee] = useState('');
  const [notes, setNotes] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newCat, setNewCat] = useState<{ name: string; emoji: string } | null>(null);
  const [accountDraft, setAccountDraft] = useState<AccountDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const categoryRows = useTabRows('Categories');
  const accountRows = useTabRows('Accounts');
  const goalRows = useTabRows('Goals');
  const contributionRows = useTabRows('Contributions');
  const transactions = useTransactions();

  const [putTowardsGoal, setPutTowardsGoal] = useState(false);
  const [goalAllocations, setGoalAllocations] = useState<Record<string, number>>({});

  const currentMonth = currentMonthKey();

  const accounts = useMemo(
    () => (accountRows ?? []).filter((a) => !a.deleted && a.active !== false),
    [accountRows],
  );

  const categoriesLoading = categoryRows === undefined;
  const categories = useMemo(() => categoriesFor(categoryRows ?? [], direction), [categoryRows, direction]);

  const savingsAccounts = useMemo(() => {
    return (accountRows ?? []).filter((a) => !asBool(a.deleted) && asBool(a.is_savings));
  }, [accountRows]);
  const defaultSavingsAccount = savingsAccounts[0] ?? accounts[0];

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
        const needPaise = goalMonthlyNeed(targetPaise, savedPaise, recurrence, deadline, todayISO());

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
  }, [goalRows, contributionRows, currentMonth]);

  // Quick chips: pinned first, then whatever the last 60 days of usage says.
  const usage = useMemo(() => {
    const relevant = (transactions ?? []).filter((t) => t.kind === direction).map((t) => t.row);
    return categoryUsage(relevant, daysAgoISO(USAGE_WINDOW_DAYS));
  }, [transactions, direction]);

  const quick = useMemo(() => {
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

  // An edited or repeated row may use a category outside the six quick picks.
  // Show it first so the selection is never invisible.
  const displayQuick = useMemo(() => {
    if (!categoryId || quick.some((c) => asString(c.id) === categoryId)) return quick;
    const selected = categories.find((c) => asString(c.id) === categoryId);
    return selected ? [selected, ...quick] : quick;
  }, [quick, categoryId, categories]);

  // Pinned first in their real order, so moving one up/down is visible here.
  const manageList = useMemo(() => {
    const pinned = categories
      .filter((c) => c.pinned === true)
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    const rest = categories.filter((c) => c.pinned !== true);
    return [...pinned, ...rest];
  }, [categories]);

  // Seed edit/repeat once the cached rows arrive. Gate the defaults below until
  // then, otherwise they would overwrite the row's category and account.
  useEffect(() => {
    if (seedDone) return;
    if (transactions === undefined) return;

    const tab: Tab = editTarget ? editTarget.tab : repeatTab;
    const id = editTarget ? editTarget.id : repeatId;
    const source = transactions.find(
      (tx) =>
        asString(tx.row.id) === id &&
        (tab === 'Expenses' ? tx.kind === 'expense' : tx.kind === 'income'),
    );

    if (!source) {
      setRepeating(false);
      setSeedDone(true);
      return;
    }

    const amount = asNumber(source.row.amount_paise);
    setDirection(tab === 'Expenses' ? 'expense' : 'income');
    setRaw(prefillAmount(amount));
    setCategoryId(asString(source.row.category_id));
    setAccountId(asString(source.row.account_id));
    setDate(editTarget ? rowDate(source.row) : todayISO());
    setPayee(asString(source.row.payee));
    setNotes(asString(source.row.notes));
    setSeedDone(true);
  }, [seedDone, transactions, editTarget, repeatId, repeatTab]);

  // Sensible defaults so Save always works with two taps.
  useEffect(() => {
    if (!seedDone) return;
    if (categories.length === 0) return;
    if (categories.some((c) => asString(c.id) === categoryId)) return;
    setCategoryId(asString((quick[0] ?? categories[0]).id));
  }, [categories, quick, categoryId, seedDone]);

  useEffect(() => {
    if (!seedDone) return;
    if (accounts.length === 0) return;
    if (!accounts.some((a) => asString(a.id) === accountId)) {
      setAccountId(asString(accounts[0].id));
    }
  }, [accounts, accountId, seedDone]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const paise = parseToPaise(raw) ?? 0;
  const canSave = paise > 0 && categoryId !== '' && !categoriesLoading && !saving;

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
    setSaving(true);
    try {
      if (editTarget) {
        await updateTransaction(editTarget.tab, editTarget.id, {
          amount_paise: paise,
          category_id: categoryId,
          account_id: accountId,
          date,
          payee: payee.trim(),
          notes: notes.trim(),
        });
        sound.play('click');
        void syncNow();
        navigate('/history');
        return;
      }

      await addTransaction({
        direction,
        amountPaise: paise,
        categoryId,
        accountId,
        date,
        payee: payee.trim(),
        notes: notes.trim(),
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
              notes: `Allocated from income${payee ? ` (${payee})` : ''}`,
            });
          }
        }
      }

      navigator.vibrate?.(12);
      setToast(`${direction === 'expense' ? 'Spent' : 'Received'} ${formatPaise(paise, locale, currency)}`);
      setRaw('');
      setPayee('');
      setNotes('');
      setRepeating(false);
      setDetailsOpen(false);
      setGoalAllocations({});
      setPutTowardsGoal(false);

      void syncNow();
    } finally {
      setSaving(false);
    }
  }

  async function createCategory() {
    if (!newCat || !newCat.name.trim()) return;
    const id = await addCategory({
      name: newCat.name,
      emoji: newCat.emoji || '📦',
      type: direction,
    });
    setCategoryId(id);
    setNewCat(null);
    setManageOpen(false);
    void syncNow();
  }

  async function togglePin(id: string, pinned: boolean) {
    await setCategoryPinned(id, pinned);
    void syncNow();
  }

  async function createAccount() {
    if (!accountDraft || !accountDraft.name.trim()) return;
    const id = await addAccount({
      name: accountDraft.name,
      type: accountDraft.type,
      openingBalancePaise: parseToPaise(accountDraft.opening) ?? 0,
    });
    setAccountId(id);
    setAccountDraft(null);
    void syncNow();
  }

  async function reorder(id: string, dir: -1 | 1) {
    await moveCategory(id, dir);
    void syncNow();
  }

  const accountName = asString(accounts.find((a) => asString(a.id) === accountId)?.name) || 'Account';
  const isToday = date === todayISO();

  // Subtitle: show payee/note when set, else "TAP TO EDIT NOTE"
  const subtitleContent = repeating
    ? null
    : payee || notes
      ? [payee, notes].filter(Boolean).join(' · ')
      : paise > 0
        ? formatPaise(paise, locale, currency)
        : null;

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Direction toggle */}
        <div className="grid shrink-0 grid-cols-2 gap-1 rounded-[12px] bg-raised p-1">
          {(['expense', 'income'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              disabled={editTarget !== null}
              title={editTarget ? 'Type is fixed while editing an entry' : undefined}
              className={`rounded-[10px] py-1.5 text-[13px] font-semibold capitalize transition disabled:cursor-not-allowed disabled:opacity-60 ${
                direction === d ? 'bg-accent text-on-accent shadow-sm' : 'text-muted'
              }`}
            >
              {d === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        {/* Amount display */}
        <div className="flex shrink-0 flex-col items-center justify-center pb-1 pt-2.5">
          <div
            className={`money max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[3rem] font-medium leading-none ${
              raw ? (direction === 'expense' ? 'text-accent' : 'text-income') : 'text-muted/50'
            }`}
          >
            ₹{raw || '0'}
          </div>

          {/* Subtitle — clickable to open details */}
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="mt-1 flex h-5 items-center justify-center text-[11px] text-muted"
          >
            {repeating ? (
              <span
                onClick={(e) => { e.stopPropagation(); setRepeating(false); }}
                className="flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-accent"
              >
                <Icon name="replay" size={12} />
                Repeating{payee ? ` · ${payee}` : ''}
                <Icon name="close" size={12} />
              </span>
            ) : subtitleContent ? (
              <span className="uppercase tracking-[0.08em]">{subtitleContent}</span>
            ) : (
              <span className="uppercase tracking-[0.08em]">Tap to edit note</span>
            )}
          </button>
        </div>

        {/* Quick categories */}
        <div className="shrink-0 pt-1.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Category</span>
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="text-[11px] font-medium text-accent"
            >
              Edit
            </button>
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {categoriesLoading &&
              [64, 80, 72, 88].map((w, i) => (
                <span
                  key={i}
                  className="h-[34px] shrink-0 animate-pulse rounded-full bg-raised"
                  style={{ width: w }}
                />
              ))}

            {!categoriesLoading &&
              displayQuick.map((c) => {
                const id = asString(c.id);
                const selected = id === categoryId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategoryId(id)}
                    className={`flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      selected
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-transparent bg-raised text-text'
                    }`}
                  >
                    <span>{asString(c.icon) || '•'}</span>
                    <span className="max-w-[5.5rem] truncate">{asString(c.name)}</span>
                  </button>
                );
              })}

            {!categoriesLoading && (
              <button
                type="button"
                onClick={() => setNewCat({ name: '', emoji: '' })}
                className="flex h-[34px] shrink-0 items-center gap-1 rounded-full border border-dashed border-line px-3 text-xs font-medium text-muted"
              >
                <Icon name="add" size={14} />
                New
              </button>
            )}

            {!categoriesLoading && categories.length === 0 && (
              <p className="py-1.5 text-[11px] text-muted">No categories yet.</p>
            )}
          </div>
        </div>

        {/* Account + date row */}
        <div className="no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto pt-2">
          {accounts.map((a) => {
            const id = asString(a.id);
            const selected = id === accountId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAccountId(id)}
                className={`h-7 shrink-0 rounded-[8px] px-2.5 py-1 text-[11px] font-medium text-text transition ${
                  selected ? 'bg-accent/15 text-accent' : 'bg-raised'
                }`}
              >
                {asString(a.name)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setAccountDraft({ ...EMPTY_ACCOUNT })}
            aria-label="Add account"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-dashed border-line text-muted transition active:bg-raised"
          >
            <Icon name="add" size={14} />
          </button>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="ml-auto flex h-7 shrink-0 items-center gap-1 rounded-[8px] border border-line bg-raised px-2.5 text-[11px] font-medium text-text"
          >
            <Icon name="edit" size={12} />
            {isToday ? 'Today' : date.slice(5)}
            {(payee || notes) && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
          </button>
        </div>

        {/* Income Mode: Put towards a goal card */}
        {direction === 'income' && savingGoals.length > 0 && (
          <div className="shrink-0 my-2 rounded-[16px] border border-line bg-raised/50 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text">Put towards a goal</p>
                <p className="text-[10px] text-muted">Moves it to the goal's savings account</p>
              </div>
              <button
                type="button"
                onClick={() => setPutTowardsGoal(!putTowardsGoal)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  putTowardsGoal ? 'bg-accent' : 'bg-line'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                    putTowardsGoal ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {putTowardsGoal && (
              <div className="space-y-2 pt-2 border-t border-line/40">
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {savingGoals.map((g) => {
                    const currentVal = goalAllocations[g.id] ?? 0;
                    return (
                      <div key={g.id} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-text">
                          <span className="font-mono text-muted mr-1">#{g.priority}</span>
                          {g.name}
                        </span>
                        <div className="flex items-center gap-1 bg-surface border border-line rounded-lg px-2 py-0.5">
                          <span className="font-mono text-muted text-[10px]">₹</span>
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
                            className="w-14 bg-transparent font-mono text-right text-xs text-text outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleSplitByPriority}
                    className="rounded-full border border-accent/60 bg-accent/10 px-2.5 py-0.5 text-[10px] font-semibold text-accent hover:bg-accent/20 transition"
                  >
                    Split the rest by priority
                  </button>
                </div>

                <div className="rounded-lg bg-surface p-2 text-[11px] space-y-1 border border-line/40 font-mono">
                  <div className="flex items-center justify-between text-muted">
                    <span>To {defaultSavingsAccount ? asString(defaultSavingsAccount.name) : 'Savings'}</span>
                    <span className="text-text font-medium tabular">
                      {formatPaise(totalAllocatedPaise, locale, currency, { decimals: false })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted">
                    <span>Stays in {asString(accounts.find((a) => asString(a.id) === accountId)?.name) || 'Account'}</span>
                    <span className="text-text font-medium tabular">
                      {formatPaise(staysInAccountPaise, locale, currency, { decimals: false })}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Keypad takes every remaining pixel */}
        <div className="min-h-0 flex-1 pt-2">
          <AmountPad value={raw} onChange={setRaw} />
        </div>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`mt-2 flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-btn)] py-3.5 text-sm font-semibold transition active:scale-[0.99] ${
            canSave ? 'bg-accent text-on-accent' : 'bg-raised text-muted'
          }`}
        >
          {saving
            ? 'Saving…'
            : editTarget
              ? 'Save changes'
              : direction === 'expense'
                ? 'Save expense'
                : 'Save income'}
          {!saving && <Icon name="check" size={16} />}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="animate-pop fixed inset-x-0 bottom-24 z-30 mx-auto w-fit rounded-full bg-accent px-4 py-2 text-xs font-medium text-on-accent shadow-lg">
          {toast}
        </div>
      )}

      {/* Details: payee, date, note */}
      <Sheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Details"
        footer={
          <button
            type="button"
            onClick={() => setDetailsOpen(false)}
            className="w-full rounded-[var(--radius-btn)] bg-accent py-3 text-sm font-semibold text-on-accent"
          >
            Done
          </button>
        }
      >
        <div className="space-y-2.5 pt-1">
          <input
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="Paid to / received from"
            className="w-full rounded-xl bg-raised px-3.5 py-3 text-sm text-text outline-none ring-accent focus:ring-2"
          />
          <CustomDatePicker
            value={date}
            onChange={(d) => setDate(d || todayISO())}
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note"
            className="w-full rounded-xl bg-raised px-3.5 py-3 text-sm text-text outline-none ring-accent focus:ring-2"
          />
          <p className="px-1 text-[11px] text-muted">
            Saving to {accountName} · {date}
          </p>
        </div>
      </Sheet>

      {/* New category */}
      <Sheet
        open={newCat !== null}
        onClose={() => setNewCat(null)}
        title="New category"
        footer={
          <button
            type="button"
            onClick={createCategory}
            disabled={!newCat?.name.trim()}
            className={`w-full rounded-[var(--radius-btn)] py-3 text-sm font-semibold ${
              newCat?.name.trim() ? 'bg-accent text-on-accent' : 'bg-raised text-muted'
            }`}
          >
            Add category
          </button>
        }
      >
        {newCat && (
          <div className="space-y-3 pt-1">
            <div className="flex gap-2">
              <input
                value={newCat.emoji}
                onChange={(e) => setNewCat({ ...newCat, emoji: e.target.value })}
                placeholder="🙂"
                aria-label="Emoji"
                className="w-16 shrink-0 rounded-xl bg-raised px-2 py-3 text-center text-xl outline-none ring-accent focus:ring-2"
              />
              <input
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                placeholder="Category name"
                autoFocus
                className="min-w-0 flex-1 rounded-xl bg-raised px-3.5 py-3 text-sm text-text outline-none ring-accent focus:ring-2"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setNewCat({ ...newCat, emoji: e })}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                    newCat.emoji === e ? 'bg-accent/15 ring-2 ring-accent' : 'bg-raised'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <p className="px-1 text-[11px] leading-relaxed text-muted">
              Paste any emoji from your phone keyboard into the box on the left.
            </p>
          </div>
        )}
      </Sheet>

      {/* Manage quick chips */}
      <Sheet
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Edit quick categories"
        footer={
          <button
            type="button"
            onClick={() => {
              setManageOpen(false);
              setNewCat({ name: '', emoji: '' });
            }}
            className="w-full rounded-[var(--radius-btn)] border border-line py-3 text-sm font-semibold text-text"
          >
            + New category
          </button>
        }
      >
        <div className="space-y-1 pt-1">
          <p className="px-1 pb-1 text-[11px] leading-relaxed text-muted">
            Pinned categories come first on the Add screen, in this order. The rest fill the remaining slots
            by how often you use them.
          </p>

          {manageList.map((c) => {
            const id = asString(c.id);
            const pinned = c.pinned === true;
            return (
              <div key={id} className="flex items-center gap-2 rounded-xl px-1 py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId(id);
                    setManageOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-base">
                    {asString(c.icon) || '•'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-text">{asString(c.name)}</span>
                  {id === categoryId && <Icon name="check" size={16} className="shrink-0 text-accent" />}
                </button>

                {pinned && (
                  <span className="flex items-center shrink-0">
                    <button
                      type="button"
                      onClick={() => reorder(id, -1)}
                      aria-label="Move up"
                      className="flex h-7 w-7 items-center justify-center text-muted hover:text-text transition"
                    >
                      <Icon name="expand_less" size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorder(id, 1)}
                      aria-label="Move down"
                      className="flex h-7 w-7 items-center justify-center text-muted hover:text-text transition"
                    >
                      <Icon name="expand_more" size={18} />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => togglePin(id, !pinned)}
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    pinned ? 'bg-accent text-on-accent' : 'bg-raised text-muted'
                  }`}
                >
                  {pinned ? 'Pinned' : 'Pin'}
                </button>
              </div>
            );
          })}

          {categories.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-muted">No categories yet.</p>
          )}
        </div>
      </Sheet>

      {/* New account, created from the account row */}
      <Sheet
        open={accountDraft !== null}
        onClose={() => setAccountDraft(null)}
        title="New account"
        footer={
          <button
            type="button"
            onClick={createAccount}
            disabled={!accountDraft?.name.trim()}
            className={`w-full rounded-[var(--radius-btn)] py-3 text-sm font-semibold ${
              accountDraft?.name.trim() ? 'bg-accent text-on-accent' : 'bg-raised text-muted'
            }`}
          >
            Add account
          </button>
        }
      >
        {accountDraft && (
          <AccountForm
            draft={accountDraft}
            onChange={setAccountDraft}
            autoFocus
            hint="Added to your sheet right away and selected for this entry."
          />
        )}
      </Sheet>
    </>
  );
}
