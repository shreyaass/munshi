import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { formatPaise, parseToPaise, todayISO } from '@em/core';
import { AmountPad } from '../components/AmountPad';
import { Icon } from '../components/Icon';
import { addTransaction, useMetaValue, useTabRows } from '../lib/repo';
import { asNumber, asString, categoriesFor } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';

type Direction = 'expense' | 'income';

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
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const categoryRows = useTabRows('Categories');
  const accountRows = useTabRows('Accounts');

  // `undefined` means Dexie is still reading — not "you have no categories".
  const categoriesLoading = categoryRows === undefined;
  const categories = useMemo(() => categoriesFor(categoryRows ?? [], direction), [categoryRows, direction]);
  const accounts = useMemo(
    () => (accountRows ?? []).filter((a) => !a.deleted && a.active !== false),
    [accountRows],
  );

  // Sensible defaults so Save always works with two taps.
  useEffect(() => {
    if (categories.length === 0) return;
    if (!categories.some((c) => asString(c.id) === categoryId)) {
      setCategoryId(asString(categories[0].id));
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (accounts.length === 0) return;
    if (!accounts.some((a) => asString(a.id) === accountId)) {
      setAccountId(asString(accounts[0].id));
    }
  }, [accounts, accountId]);

  const paise = parseToPaise(raw) ?? 0;
  const canSave = paise > 0 && categoryId !== '' && !categoriesLoading && !saving;

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
      setShowDetails(false);

      void syncNow();
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const accent = direction === 'expense' ? 'text-rose-600' : 'text-emerald-600';

  return (
    <div className="flex flex-col">
      {/* Direction */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
        {(['expense', 'income'] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDirection(d)}
            className={`rounded-lg py-2 text-sm font-semibold capitalize transition ${
              direction === d
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                : 'text-slate-500'
            }`}
          >
            {d === 'expense' ? 'Expense' : 'Income'}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="mb-5 text-center">
        <div className={`text-[2.75rem] font-semibold leading-none tracking-tight ${raw ? accent : 'text-slate-300 dark:text-slate-700'}`}>
          ₹{raw || '0'}
        </div>
        <div className="mt-1.5 h-4 text-[11px] text-slate-400">
          {paise > 0 ? formatPaise(paise, locale, currency) : 'Type an amount'}
        </div>
      </div>

      {/* Categories */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
          <span className="text-[11px] text-slate-400">
            {categoriesLoading ? 'Loading…' : `${categories.length} options`}
          </span>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {categoriesLoading &&
            [64, 80, 72, 88].map((w, i) => (
              <span
                key={i}
                className="h-9 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800"
                style={{ width: w }}
              />
            ))}

          {!categoriesLoading &&
            categories.map((c) => {
            const id = asString(c.id);
            const selected = id === categoryId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setCategoryId(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition ${
                  selected
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                <span>{asString(c.icon) || '•'}</span>
                {asString(c.name)}
              </button>
            );
          })}
          {!categoriesLoading && categories.length === 0 && (
            <p className="text-xs text-slate-400">No categories yet — connect your sheet first.</p>
          )}
        </div>
      </div>

      {/* Accounts */}
      {accounts.length > 0 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {accounts.map((a) => {
            const id = asString(a.id);
            const selected = id === accountId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAccountId(id)}
                className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition ${
                  selected
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {asString(a.name)}
              </button>
            );
          })}
        </div>
      )}

      {/* Details toggle */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="mb-3 self-start text-xs font-medium text-indigo-600 dark:text-indigo-400"
      >
        {showDetails ? '− Hide details' : '+ Add payee, date or note'}
      </button>

      {showDetails && (
        <div className="mb-4 space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <input
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            placeholder="Paid to / received from"
            className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-900"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-900"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Note"
            className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2 dark:bg-slate-900"
          />
        </div>
      )}

      <AmountPad value={raw} onChange={setRaw} />

      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-sm font-semibold text-white transition active:scale-[0.99] disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
      >
        {saving ? 'Saving…' : direction === 'expense' ? 'Save expense' : 'Save income'}
        {!saving && <Icon name="check" className="h-4 w-4" />}
      </button>

      {toast && (
        <div className="animate-pop fixed inset-x-0 bottom-24 z-30 mx-auto w-fit rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      {accounts.length > 0 && (
        <p className="mt-3 text-center text-[11px] text-slate-400">
          Saved to your sheet · {asNumber(accounts.length)} accounts
        </p>
      )}
    </div>
  );
}
