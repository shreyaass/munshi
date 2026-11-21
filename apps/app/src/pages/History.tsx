import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  currentMonthKey,
  formatPaise,
  fromISODate,
  inDateRange,
  matchesAmount,
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

interface TxRowProps {
  tx: Tx;
  categoryMap: Map<string, Row>;
  locale: string;
  currency: string;
  /** Amount sorts are flat, so the date moves into the row. */
  showDate: boolean;
  onSelect: () => void;
}

function TxRow({ tx, categoryMap, locale, currency, showDate, onSelect }: TxRowProps) {
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

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition active:bg-bg dark:active:bg-ink"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
          style={{ backgroundColor: `${asString(category?.color) || '#64748b'}1a` }}
        >
          {asString(category?.icon) || '•'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {asString(tx.row.payee) || asString(category?.name) || 'Entry'}
          </span>
          <span className="block truncate text-[11px] text-muted">{meta}</span>
        </span>
        <span className={`money shrink-0 text-sm font-semibold ${isExpense ? 'text-ink' : 'text-success'}`}>
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
  const currency = useMetaValue('currency', 'INR');
  const locale = useMetaValue('locale', 'en-IN');
  const { syncNow } = useSync();

  const categoryMap = useMemo(
    () => new Map((categories ?? []).map((c) => [asString(c.id), c])),
    [categories],
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
    <div>
      <div className="mb-3 flex items-center gap-2">
        {filters.range === 'month' && (
          <input
            type="month"
            value={filters.month}
            onChange={(e) =>
              setFilters((current) => ({ ...current, month: e.target.value || currentMonthKey() }))
            }
            aria-label="Month"
            className="rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs font-medium text-ink outline-none"
          />
        )}

        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition active:bg-surface-muted"
        >
          <Icon name="filter" className="h-3.5 w-3.5" />
          Filters
          {active > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-ink">
              {active}
            </span>
          )}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              aria-label={`Remove filter: ${chip.label}`}
              className="flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink"
            >
              {chip.label}
              <Icon name="close" className="h-3 w-3 text-muted" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearEverything}
            className="px-1 text-[11px] font-semibold text-brand"
          >
            Clear
          </button>
        </div>
      )}

      {active > 0 && (
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
          Filtered · {rangeSummary(filters, locale)}
        </p>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-bg p-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Spent</p>
          <p className="money text-sm font-semibold text-ink">
            {formatPaise(totals.spent, locale, currency, { decimals: false })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Received</p>
          <p className="money text-sm font-semibold text-success">
            {formatPaise(totals.earned, locale, currency, { decimals: false })}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted">Entries</p>
          <p className="money text-sm font-semibold text-ink">{filtered.length}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search payee, note or category"
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-3 text-sm outline-none ring-brand focus:ring-2"
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

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-line py-12 text-center">
          {hasNarrowing ? (
            <>
              <p className="text-sm font-medium text-muted">No entries match</p>
              <p className="mt-1 text-xs text-muted">Try a wider range or fewer filters.</p>
              <button
                type="button"
                onClick={clearEverything}
                className="mt-3 rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink"
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

      {flat && filtered.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-line">
          {filtered.map((tx) => (
            <TxRow
              key={`${tx.kind}-${asString(tx.row.id)}`}
              tx={tx}
              categoryMap={categoryMap}
              locale={locale}
              currency={currency}
              showDate
              onSelect={() => openTx(tx)}
            />
          ))}
        </ul>
      )}

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
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {fromISODate(day).toLocaleDateString(locale, {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                  </h2>
                  <span
                    className={`money text-[11px] font-medium ${
                      dayTotal < 0 ? 'text-muted' : 'text-success'
                    }`}
                  >
                    {dayTotal < 0 ? '−' : '+'}
                    {formatPaise(Math.abs(dayTotal), locale, currency, { decimals: false })}
                  </span>
                </div>

                <ul className="overflow-hidden rounded-xl border border-line">
                  {items.map((tx) => (
                    <TxRow
                      key={`${tx.kind}-${asString(tx.row.id)}`}
                      tx={tx}
                      categoryMap={categoryMap}
                      locale={locale}
                      currency={currency}
                      showDate={false}
                      onSelect={() => openTx(tx)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {selectedTx && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-3 pb-3"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface p-4"
            onClick={(e) => e.stopPropagation()}
          >
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
                  {asString(categoryMap.get(asString(selectedTx.row.category_id))?.name) ||
                    'Uncategorised'}
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

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink"
              >
                <Icon name="edit" className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleRepeat}
                className="flex items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-semibold text-ink"
              >
                <Icon name="repeat" className="h-4 w-4" />
                Add again
              </button>
            </div>

            <button
              type="button"
              onClick={handleDelete}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-danger-soft py-3 text-sm font-semibold text-danger"
            >
              <Icon name="trash" className="h-4 w-4" />
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
