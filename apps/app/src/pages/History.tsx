import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentMonthKey,
  formatPaise,
  fromISODate,
  inDateRange,
  matchesAmount,
  monthLabel,
  parseToPaise,
  resolveDateRange,
  type Row,
} from '@em/core';
import { Icon } from '../components/Icon';
import { HistoryFiltersSheet } from '../components/HistoryFilters';
import { softDelete, useMetaValue, useTabRows, useTransactions } from '../lib/repo';
import { asNumber, asString, rowDate, type Tx } from '../lib/analytics';
import {
  activeFilterCount,
  amountSummary,
  defaultFilters,
  rangeSummary,
  SORT_LABEL,
  type HistoryFilters,
} from '../lib/historyFilters';
import { useSync } from '../lib/SyncProvider';

type Tab = 'Expenses' | 'Income';

function categoryIcon(name: string): Parameters<typeof Icon>[0]['name'] {
  const n = name.toLowerCase();
  if (n.includes('food') || n.includes('dining') || n.includes('restaurant') || n.includes('eat') || n.includes('swiggy') || n.includes('zomato')) return 'restaurant';
  if (n.includes('grocer') || n.includes('shop') || n.includes('market') || n.includes('basket')) return 'shopping_basket';
  if (n.includes('transport') || n.includes('travel') || n.includes('train') || n.includes('commute') || n.includes('bus') || n.includes('metro') || n.includes('fuel')) return 'train';
  if (n.includes('bill') || n.includes('utilit') || n.includes('electric') || n.includes('broadband') || n.includes('phone') || n.includes('internet')) return 'receipt_long';
  if (n.includes('income') || n.includes('work') || n.includes('freelance') || n.includes('salary') || n.includes('consult')) return 'work';
  return 'receipt_long';
}

interface TxRowProps {
  tx: Tx;
  categoryMap: Map<string, Row>;
  locale: string;
  currency: string;
  /** Amount sorts are flat, so the date moves into the row. */
  showDate: boolean;
  onSelect: () => void;
  isLast: boolean;
}

function TxRow({ tx, categoryMap, locale, currency, showDate, onSelect, isLast }: TxRowProps) {
  const category = categoryMap.get(asString(tx.row.category_id));
  const isExpense = tx.kind === 'expense';
  const meta = [
    showDate
      ? fromISODate(rowDate(tx.row)).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
      : '',
    asString(category?.name),
    asString(tx.row.notes),
  ]
    .filter(Boolean)
    .join(' · ');

  const iconStr = asString(category?.icon);
  const isEmoji = iconStr.length > 0 && iconStr.codePointAt(0)! > 127;

  return (
    <li className={!isLast ? 'border-b border-line/60' : ''}>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-raised"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-raised text-base">
          {isEmoji ? (
            <span>{iconStr}</span>
          ) : (
            <Icon name="receipt_long" className="h-[18px] w-[18px] text-muted" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text">
            {asString(tx.row.payee) || asString(category?.name) || 'Entry'}
          </span>
          <span className="block truncate text-[11px] text-muted">{meta}</span>
        </span>
        <span className={`money shrink-0 text-sm font-semibold ${isExpense ? 'text-expense' : 'text-income'}`}>
          {isExpense ? '−' : '+'}
          {formatPaise(asNumber(tx.row.amount_paise), locale, currency, { decimals: false })}
        </span>
      </button>
    </li>
  );
}

export function History() {
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<{ tab: Tab; id: string } | null>(null);

  const navigate = useNavigate();
  const transactions = useTransactions();
  const categories = useTabRows('Categories');
  const accountRows = useTabRows('Accounts');
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');
  const { syncNow } = useSync();

  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [asString(c.id), c])),
    [categories],
  );

  const accountMap = useMemo(
    () => new Map((accountRows ?? []).map((a) => [asString(a.id), a])),
    [accountRows],
  );

  const range = useMemo(
    () =>
      resolveDateRange(filters.range, {
        month: filters.month,
        from: filters.from,
        to: filters.to,
      }),
    [filters],
  );
  const threshold = parseToPaise(filters.amount) ?? 0;
  const active = activeFilterCount(filters);
  const flat = filters.sort === 'highest' || filters.sort === 'lowest';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (transactions ?? [])
      .filter((tx) => inDateRange(rowDate(tx.row), range))
      .filter((tx) => filters.type === 'all' || tx.kind === filters.type)
      .filter((tx) => !filters.categoryId || asString(tx.row.category_id) === filters.categoryId)
      .filter((tx) =>
        matchesAmount(asNumber(tx.row.amount_paise), filters.amountOp, threshold),
      )
      .filter((tx) => {
        if (!q) return true;
        const category = categoryMap.get(asString(tx.row.category_id));
        const hay = [tx.row.payee, tx.row.notes, category ? category.name : '']
          .map((v) => asString(v).toLowerCase())
          .join(' ');
        return hay.includes(q);
      })
      .sort((a, b) => {
        switch (filters.sort) {
          case 'highest':
            return asNumber(b.row.amount_paise) - asNumber(a.row.amount_paise);
          case 'lowest':
            return asNumber(a.row.amount_paise) - asNumber(b.row.amount_paise);
          case 'oldest': {
            const byDate = rowDate(a.row).localeCompare(rowDate(b.row));
            return byDate !== 0
              ? byDate
              : String(a.row.created_at).localeCompare(String(b.row.created_at));
          }
          default: {
            const byDate = rowDate(b.row).localeCompare(rowDate(a.row));
            return byDate !== 0
              ? byDate
              : String(b.row.created_at).localeCompare(String(a.row.created_at));
          }
        }
      });
  }, [
    transactions,
    range,
    filters.type,
    filters.categoryId,
    filters.amountOp,
    filters.sort,
    threshold,
    query,
    categoryMap,
  ]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tx[]>();
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

  const totals = filtered.reduce(
    (acc, tx) => {
      const amount = asNumber(tx.row.amount_paise);
      if (tx.kind === 'expense') acc.spent += amount;
      else acc.earned += amount;
      return acc;
    },
    { spent: 0, earned: 0 },
  );

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.range !== 'month' || filters.month !== currentMonthKey()) {
    chips.push({
      key: 'range',
      label: rangeSummary(filters, locale),
      clear: () =>
        setFilters((current) => ({
          ...current,
          range: 'month',
          month: currentMonthKey(),
          from: '',
          to: '',
        })),
    });
  }
  if (filters.type !== 'all') {
    chips.push({
      key: 'type',
      label: filters.type === 'expense' ? 'Expenses' : 'Income',
      clear: () => setFilters((current) => ({ ...current, type: 'all' })),
    });
  }
  if (filters.amountOp !== 'any' && threshold > 0) {
    chips.push({
      key: 'amount',
      label: amountSummary(filters, locale, currency),
      clear: () => setFilters((current) => ({ ...current, amountOp: 'any', amount: '' })),
    });
  }
  if (filters.categoryId) {
    chips.push({
      key: 'category',
      label: asString(categoryMap.get(filters.categoryId)?.name) || 'Category',
      clear: () => setFilters((current) => ({ ...current, categoryId: '' })),
    });
  }
  if (filters.sort !== 'newest') {
    chips.push({
      key: 'sort',
      label: SORT_LABEL[filters.sort],
      clear: () => setFilters((current) => ({ ...current, sort: 'newest' })),
    });
  }

  const searchActive = query.trim() !== '';
  const hasNarrowing = active > 0 || filters.sort !== 'newest' || searchActive;

  async function handleDelete() {
    if (!selected) return;
    await softDelete(selected.tab, selected.id);
    setSelected(null);
    void syncNow();
  }

  function handleEdit() {
    if (!selected) return;
    const { tab, id } = selected;
    setSelected(null);
    navigate(`/?edit=${tab}:${id}`);
  }

  function handleRepeat() {
    if (!selected) return;
    const { tab, id } = selected;
    setSelected(null);
    navigate(`/?repeat=${id}&tab=${tab}`);
  }

  function clearEverything() {
    setFilters(defaultFilters());
    setQuery('');
  }

  const openTx = (tx: Tx) =>
    setSelected({ tab: tx.kind === 'expense' ? 'Expenses' : 'Income', id: asString(tx.row.id) });

  return (
    <div className="space-y-6">
      {/* Desktop / Tablet Header (md+) */}
      <div className="hidden md:flex items-center justify-between pb-2 pt-1">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-medium text-text">History</h1>
          <p className="text-xs text-muted mt-1 uppercase tracking-[0.08em] font-medium">
            {monthLabel(filters.month, locale)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-text transition hover:bg-raised active:scale-[0.99]"
        >
          <Icon name="tune" size={16} />
          <span>Filters</span>
          {active > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
              {active}
            </span>
          )}
        </button>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-3 gap-3 md:gap-5">
        <div className="rounded-[16px] border border-line bg-surface p-4 md:p-5 flex flex-col justify-between">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-muted font-medium">Spent</p>
          <p className="money mt-1 text-xl md:text-3xl font-medium text-text tabular">
            {formatPaise(totals.spent, locale, currency, { decimals: false })}
          </p>
        </div>
        <div className="rounded-[16px] border border-line bg-surface p-4 md:p-5 flex flex-col justify-between">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-muted font-medium">Received</p>
          <p className="money mt-1 text-xl md:text-3xl font-medium text-income tabular">
            + {formatPaise(totals.earned, locale, currency, { decimals: false })}
          </p>
        </div>
        <div className="rounded-[16px] border border-line bg-surface p-4 md:p-5 flex flex-col justify-between">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.12em] text-muted font-medium">Entries</p>
          <p className="money mt-1 text-xl md:text-3xl font-medium text-text tabular">
            {filtered.length}
          </p>
        </div>
      </div>

      {/* Search + Mobile Filters row */}
      <div className="relative">
        <Icon name="search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search payee, note or category"
          className="w-full rounded-[14px] border border-line bg-surface py-3 pl-11 pr-24 text-sm text-text placeholder:text-muted outline-none focus:border-accent"
        />
        {/* Mobile filter button (< md) */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 md:hidden">
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex items-center gap-1 rounded-full border border-line bg-raised px-2.5 py-1 text-xs text-muted"
          >
            <Icon name="tune" size={14} />
            {active > 0 && <span>{active}</span>}
          </button>
        </div>
      </div>

      {/* Filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              aria-label={`Remove filter: ${chip.label}`}
              className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-text"
            >
              {chip.label}
              <Icon name="close" size={12} className="text-muted" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearEverything}
            className="px-1 text-[11px] font-semibold text-accent"
          >
            Clear
          </button>
        </div>
      )}

      {/* Desktop / Tablet Table View (md+) */}
      <div className="hidden md:block rounded-[16px] border border-line bg-surface overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              <th className="px-5 py-3.5">Payee</th>
              <th className="px-5 py-3.5">Category</th>
              <th className="hidden lg:table-cell px-5 py-3.5">Account</th>
              <th className="px-5 py-3.5">Date</th>
              <th className="px-5 py-3.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {filtered.map((tx) => {
              const isExpense = tx.kind === 'expense';
              const cat = categoryMap.get(asString(tx.row.category_id));
              const catName = asString(cat?.name) || 'Other';
              const acc = accountMap.get(asString(tx.row.account_id));
              const accName = asString(acc?.name) || 'Account';
              const payeeName = asString(tx.row.payee) || catName;
              const dateStr = asString(tx.row.date ?? '');
              const formattedDate = dateStr
                ? fromISODate(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                : '';
              const amount = asNumber(tx.row.amount_paise);

              return (
                <tr
                  key={`${tx.kind}-${asString(tx.row.id)}`}
                  onClick={() => openTx(tx)}
                  className="transition hover:bg-raised/50 cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-raised text-muted">
                        <Icon name={categoryIcon(catName)} size={16} />
                      </div>
                      <span className="font-medium text-text">{payeeName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted">{catName}</td>
                  <td className="hidden lg:table-cell px-5 py-3.5 text-muted">{accName}</td>
                  <td className="px-5 py-3.5 text-muted">{formattedDate}</td>
                  <td className={`px-5 py-3.5 text-right money font-medium tabular ${isExpense ? 'text-text' : 'text-income'}`}>
                    {isExpense ? '− ' : '+ '}{formatPaise(amount, locale, currency, { decimals: false })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-xs text-muted">No entries match your search.</div>
        )}
      </div>

      {/* Mobile Views (< md) */}
      <div className="md:hidden">
        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-line py-12 text-center">
            {hasNarrowing ? (
              <>
                <p className="text-sm font-medium text-muted">No entries match</p>
                <p className="mt-1 text-xs text-muted">Try a wider range or fewer filters.</p>
                <button
                  type="button"
                  onClick={clearEverything}
                  className="mt-3 rounded-lg bg-raised px-3 py-1.5 text-xs font-semibold text-text"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-muted">Nothing here yet</p>
                <p className="mt-1 text-xs text-muted">Add an entry and it appears instantly.</p>
              </>
            )}
          </div>
        )}

        {/* Flat (amount-sorted) list */}
        {flat && filtered.length > 0 && (
          <ul>
            {filtered.map((tx, i) => (
              <TxRow
                key={`${tx.kind}-${asString(tx.row.id)}`}
                tx={tx}
                categoryMap={categoryMap}
                locale={locale}
                currency={currency}
                showDate
                onSelect={() => openTx(tx)}
                isLast={i === filtered.length - 1}
              />
            ))}
          </ul>
        )}

        {/* Date-grouped list */}
        {!flat && (
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
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                      {fromISODate(day).toLocaleDateString(locale, {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </h2>
                    <span
                      className={`money text-[11px] font-medium ${
                        dayTotal < 0 ? 'text-expense' : 'text-income'
                      }`}
                    >
                      {dayTotal < 0 ? '−' : '+'}
                      {formatPaise(Math.abs(dayTotal), locale, currency, { decimals: false })}
                    </span>
                  </div>

                  <ul>
                    {items.map((tx, i) => (
                      <TxRow
                        key={`${tx.kind}-${asString(tx.row.id)}`}
                        tx={tx}
                        categoryMap={categoryMap}
                        locale={locale}
                        currency={currency}
                        showDate={false}
                        onSelect={() => openTx(tx)}
                        isLast={i === items.length - 1}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected tx detail panel */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-3 pb-3"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-[16px] bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-1 flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted">
                  {selectedTx.kind === 'expense' ? 'Expense' : 'Income'} · {rowDate(selectedTx.row)}
                </p>
                <p className="money text-2xl font-semibold text-text">
                  {formatPaise(asNumber(selectedTx.row.amount_paise), locale, currency)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised text-muted transition active:scale-95"
              >
                <Icon name="close" className="h-[18px] w-[18px]" />
              </button>
            </div>

            <dl className="my-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Category</dt>
                <dd className="font-medium text-text">
                  {asString(categoryMap.get(asString(selectedTx.row.category_id))?.name) ||
                    'Uncategorised'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Payee</dt>
                <dd className="font-medium text-text">{asString(selectedTx.row.payee) || '—'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Note</dt>
                <dd className="max-w-[60%] text-right font-medium text-text">
                  {asString(selectedTx.row.notes) || '—'}
                </dd>
              </div>
            </dl>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent py-3 text-sm font-semibold text-on-accent"
              >
                <Icon name="edit" className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleRepeat}
                className="flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-semibold text-text"
              >
                <Icon name="replay" className="h-4 w-4" />
                Add again
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-expense/40 py-3 text-sm font-semibold text-expense"
            >
              <Icon name="delete" className="h-4 w-4" />
              Delete entry
            </button>
          </div>
        </div>
      )}

      <HistoryFiltersSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        filters={filters}
        onApply={setFilters}
        categories={categories ?? []}
      />
    </div>
  );
}
