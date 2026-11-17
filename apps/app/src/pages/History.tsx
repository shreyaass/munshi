import { useMemo, useState } from 'react';
import { currentMonthKey, formatPaise, fromISODate, monthLabel } from '@em/core';
import { Icon } from '../components/Icon';
import { softDelete, useMetaValue, useTabRows, useTransactions } from '../lib/repo';
import { asNumber, asString, rowDate, rowMonth } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';

export function History() {
  const [month, setMonth] = useState(currentMonthKey());
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ tab: 'Expenses' | 'Income'; id: string } | null>(null);

  const transactions = useTransactions();
  const categories = useTabRows('Categories');
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');
  const { syncNow } = useSync();

  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [asString(c.id), c])),
    [categories],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (transactions ?? [])
      .filter((tx) => rowMonth(tx.row) === month)
      .filter((tx) => {
        if (!q) return true;
        const cat = categoryMap.get(asString(tx.row.category_id));
        const hay = [tx.row.payee, tx.row.notes, cat ? cat.name : '']
          .map((v) => asString(v).toLowerCase())
          .join(' ');
        return hay.includes(q);
      })
      .sort((a, b) => {
        const byDate = rowDate(b.row).localeCompare(rowDate(a.row));
        return byDate !== 0 ? byDate : String(b.row.created_at).localeCompare(String(a.row.created_at));
      });
  }, [transactions, month, query, categoryMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const tx of filtered) {
      const key = rowDate(tx.row);
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const selectedTx = useMemo(() => {
    if (!selected) return null;
    const found = (transactions ?? []).find(
      (tx) =>
        asString(tx.row.id) === selected.id &&
        (selected.tab === 'Expenses' ? tx.kind === 'expense' : tx.kind === 'income'),
    );
    return found ?? null;
  }, [selected, transactions]);

  const monthTotal = filtered.reduce(
    (acc, tx) => {
      const amount = asNumber(tx.row.amount_paise);
      if (tx.kind === 'expense') acc.spent += amount;
      else acc.earned += amount;
      return acc;
    },
    { spent: 0, earned: 0 },
  );

  async function handleDelete() {
    if (!selected) return;
    await softDelete(selected.tab, selected.id);
    setSelected(null);
    void syncNow();
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value || currentMonthKey())}
          className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink outline-none "
        />
        <span className="text-xs text-muted">{monthLabel(month, locale)}</span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-bg p-3 ">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Spent</p>
          <p className="money text-sm font-semibold text-ink">
            {formatPaise(monthTotal.spent, locale, currency, { decimals: false })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Earned</p>
          <p className="money text-sm font-semibold text-success">
            {formatPaise(monthTotal.earned, locale, currency, { decimals: false })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Entries</p>
          <p className="money text-sm font-semibold text-ink ">{filtered.length}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search payee, note or category"
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none ring-brand focus:ring-2 "
        />
        <svg
          className="absolute left-3 top-2.5 h-4 w-4 text-muted"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-xl border border-dashed border-line py-12 text-center ">
          <p className="text-sm font-medium text-muted">Nothing here yet</p>
          <p className="mt-1 text-xs text-muted">Add an entry and it appears instantly.</p>
        </div>
      )}

      <div className="space-y-5">
        {grouped.map(([day, items]) => {
          const dayTotal = items.reduce(
            (sum, tx) =>
              sum + (tx.kind === 'expense' ? -asNumber(tx.row.amount_paise) : asNumber(tx.row.amount_paise)),
            0,
          );
          return (
            <section key={day}>
              <div className="mb-1.5 flex items-baseline justify-between px-0.5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  {fromISODate(day).toLocaleDateString(locale, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </h2>
                <span className={`money text-[11px] font-medium ${dayTotal < 0 ? 'text-muted' : 'text-success'}`}>
                  {dayTotal < 0 ? '−' : '+'}
                  {formatPaise(Math.abs(dayTotal), locale, currency, { decimals: false })}
                </span>
              </div>

              <ul className="overflow-hidden rounded-xl border border-line ">
                {items.map((tx) => {
                  const cat = categoryMap.get(asString(tx.row.category_id));
                  const isExpense = tx.kind === 'expense';
                  const id = asString(tx.row.id);
                  return (
                    <li key={`${tx.kind}-${id}`}>
                      <button
                        type="button"
                        onClick={() => setSelected({ tab: isExpense ? 'Expenses' : 'Income', id })}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-bg dark:active:bg-ink"
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                          style={{ backgroundColor: `${asString(cat?.color) || '#64748b'}1a` }}
                        >
                          {asString(cat?.icon) || '•'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {asString(tx.row.payee) || asString(cat?.name) || 'Entry'}
                          </span>
                          <span className="block truncate text-[11px] text-muted">
                            {asString(cat?.name)}
                            {tx.row.notes ? ` · ${asString(tx.row.notes)}` : ''}
                          </span>
                        </span>
                        <span
                          className={`money shrink-0 text-sm font-semibold ${isExpense ? 'text-ink' : 'text-success'}`}
                        >
                          {isExpense ? '−' : '+'}
                          {formatPaise(asNumber(tx.row.amount_paise), locale, currency, { decimals: false })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {selectedTx && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-3 pb-3"
          onClick={() => setSelected(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-surface p-4 " onClick={(e) => e.stopPropagation()}>
            <div className="mb-1 flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {selectedTx.kind === 'expense' ? 'Expense' : 'Income'} · {rowDate(selectedTx.row)}
                </p>
                <p className="money text-2xl font-semibold">
                  {formatPaise(asNumber(selectedTx.row.amount_paise), locale, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted transition active:scale-95"
              >
                <Icon name="close" className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>

            <dl className="my-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Category</dt>
                <dd className="font-medium">
                  {asString(categoryMap.get(asString(selectedTx.row.category_id))?.name) || 'Uncategorised'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Payee</dt>
                <dd className="font-medium">{asString(selectedTx.row.payee) || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Note</dt>
                <dd className="max-w-[60%] text-right font-medium">
                  {asString(selectedTx.row.notes) || '—'}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={handleDelete}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-danger-soft py-3 text-sm font-semibold text-danger "
            >
              <Icon name="alert" className="h-4 w-4" />
              Delete entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
