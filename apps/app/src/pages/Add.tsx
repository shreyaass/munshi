import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  QUICK_PICKS,
  categoryUsage,
  daysAgoISO,
  formatPaise,
  parseToPaise,
  pickQuickCategories,
  todayISO,
} from '@em/core';
import { AmountPad } from '../components/AmountPad';
import { AccountForm, EMPTY_ACCOUNT, type AccountDraft } from '../components/AccountForm';
import { Icon } from '../components/Icon';
import { Sheet } from '../components/Sheet';
import {
  addAccount,
  addCategory,
  addTransaction,
  moveCategory,
  setCategoryPinned,
  useMetaValue,
  useTabRows,
  useTransactions,
} from '../lib/repo';
import { asString, categoriesFor } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';

type Direction = 'expense' | 'income';

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

export function Add() {
  const [params] = useSearchParams();
  const { syncNow } = useSync();
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');

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
  const transactions = useTransactions();

  // `undefined` means Dexie is still reading — not "you have no categories".
  const categoriesLoading = categoryRows === undefined;
  const categories = useMemo(() => categoriesFor(categoryRows ?? [], direction), [categoryRows, direction]);
  const accounts = useMemo(
    () => (accountRows ?? []).filter((a) => !a.deleted && a.active !== false),
    [accountRows],
  );

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

  // Pinned first in their real order, so moving one up/down is visible here.
  const manageList = useMemo(() => {
    const pinned = categories
      .filter((c) => c.pinned === true)
      .sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
    const rest = categories.filter((c) => c.pinned !== true);
    return [...pinned, ...rest];
  }, [categories]);

  // Sensible defaults so Save always works with two taps.
  useEffect(() => {
    if (categories.length === 0) return;
    if (categories.some((c) => asString(c.id) === categoryId)) return;
    setCategoryId(asString((quick[0] ?? categories[0]).id));
  }, [categories, quick, categoryId]);

  useEffect(() => {
    if (accounts.length === 0) return;
    if (!accounts.some((a) => asString(a.id) === accountId)) {
      setAccountId(asString(accounts[0].id));
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const paise = parseToPaise(raw) ?? 0;
  const canSave = paise > 0 && categoryId !== '' && !categoriesLoading && !saving;
  const accent = direction === 'expense' ? 'text-danger ' : 'text-success ';

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await addTransaction({
        direction,
        amountPaise: paise,
        categoryId,
        accountId,
        date,
        payee: payee.trim(),
        notes: notes.trim(),
      });

      navigator.vibrate?.(12);
      setToast(`${direction === 'expense' ? 'Spent' : 'Received'} ${formatPaise(paise, locale, currency)}`);
      setRaw('');
      setPayee('');
      setNotes('');
      setDetailsOpen(false);

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

  return (
    <>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Direction */}
        <div className="grid shrink-0 grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1 ">
          {(['expense', 'income'] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDirection(d)}
              className={`rounded-lg py-1.5 text-[13px] font-semibold capitalize transition ${
                direction === d ? 'bg-surface text-ink shadow-sm ' : 'text-muted'
              }`}
            >
              {d === 'expense' ? 'Expense' : 'Income'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div className="flex shrink-0 flex-col items-center justify-center pb-1 pt-2.5">
          <div
            className={`money max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[2.5rem] font-semibold leading-none ${
              raw ? accent : 'text-muted/60'
            }`}
          >
            ₹{raw || '0'}
          </div>
          <div className="mt-1 h-4 text-[11px] text-muted">
            {paise > 0 ? formatPaise(paise, locale, currency) : 'Type an amount'}
          </div>
        </div>

        {/* Quick categories */}
        <div className="shrink-0 pt-1.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Category</span>
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="text-[11px] font-medium text-brand "
            >
              Edit
            </button>
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {categoriesLoading &&
              [64, 80, 72, 88].map((w, i) => (
                <span
                  key={i}
                  className="h-[34px] shrink-0 animate-pulse rounded-full bg-surface-muted "
                  style={{ width: w }}
                />
              ))}

            {!categoriesLoading &&
              quick.map((c) => {
                const id = asString(c.id);
                const selected = id === categoryId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategoryId(id)}
                    className={`flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                      selected ? 'border-brand bg-brand/10 text-brand ' : 'border-line text-muted '
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
                className="flex h-[34px] shrink-0 items-center gap-1 rounded-full border border-dashed border-line px-3 text-xs font-medium text-muted "
              >
                <Icon name="add" className="h-3.5 w-3.5" />
                New
              </button>
            )}

            {!categoriesLoading && categories.length === 0 && (
              <p className="py-1.5 text-[11px] text-muted">No categories yet.</p>
            )}
          </div>
        </div>

        {/* Account + date/details, one compact line */}
        <div className="no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto pt-2">
          {accounts.map((a) => {
            const id = asString(a.id);
            const selected = id === accountId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAccountId(id)}
                className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-medium transition ${
                  selected ? 'bg-brand text-brand-ink ' : 'bg-surface-muted text-muted '
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
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-muted transition active:bg-surface-muted"
          >
            <Icon name="add" className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="ml-auto flex h-7 shrink-0 items-center gap-1 rounded-lg border border-line px-2.5 text-[11px] font-medium text-muted"
          >
            <Icon name="edit" className="h-3 w-3" />
            {isToday ? 'Today' : date.slice(5)}
            {(payee || notes) && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
          </button>
        </div>

        {/* Keypad takes every remaining pixel */}
        <div className="min-h-0 flex-1 pt-2">
          <AmountPad value={raw} onChange={setRaw} />
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="mt-2 flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-semibold text-brand-ink transition active:scale-[0.99] disabled:bg-line disabled:text-muted dark:disabled:bg-surface-muted dark:disabled:text-muted"
        >
          {saving ? 'Saving…' : direction === 'expense' ? 'Save expense' : 'Save income'}
          {!saving && <Icon name="check" className="h-4 w-4" />}
        </button>
      </div>

      {toast && (
        <div className="animate-pop fixed inset-x-0 bottom-24 z-30 mx-auto w-fit rounded-full bg-brand px-4 py-2 text-xs font-medium text-brand-ink shadow-lg">
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
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink"
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
            className="w-full rounded-xl bg-surface-muted px-3.5 py-3 text-sm outline-none ring-brand focus:ring-2 "
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayISO())}
            className="w-full rounded-xl bg-surface-muted px-3.5 py-3 text-sm outline-none ring-brand focus:ring-2 "
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note"
            className="w-full rounded-xl bg-surface-muted px-3.5 py-3 text-sm outline-none ring-brand focus:ring-2 "
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
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink disabled:bg-line disabled:text-muted dark:disabled:bg-surface-muted dark:disabled:text-muted"
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
                className="w-16 shrink-0 rounded-xl bg-surface-muted px-2 py-3 text-center text-xl outline-none ring-brand focus:ring-2 "
              />
              <input
                value={newCat.name}
                onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                placeholder="Category name"
                autoFocus
                className="min-w-0 flex-1 rounded-xl bg-surface-muted px-3.5 py-3 text-sm outline-none ring-brand focus:ring-2 "
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_SUGGESTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setNewCat({ ...newCat, emoji: e })}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                    newCat.emoji === e ? 'bg-brand/15 ring-2 ring-brand ' : 'bg-surface-muted '
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
            className="w-full rounded-xl border border-line py-3 text-sm font-semibold text-ink "
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
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-base ">
                    {asString(c.icon) || '•'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{asString(c.name)}</span>
                  {id === categoryId && <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-brand " />}
                </button>

                {pinned && (
                  <span className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => reorder(id, -1)}
                      aria-label="Move up"
                      className="flex h-7 w-6 items-center justify-center text-muted"
                    >
                      <Icon name="chevron-down" className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorder(id, 1)}
                      aria-label="Move down"
                      className="flex h-7 w-6 items-center justify-center text-muted"
                    >
                      <Icon name="chevron-down" className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => togglePin(id, !pinned)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    pinned ? 'bg-brand text-brand-ink' : 'bg-surface-muted text-muted '
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
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink disabled:bg-surface-muted disabled:text-muted"
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
