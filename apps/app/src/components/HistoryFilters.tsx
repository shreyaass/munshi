import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Row } from '@em/core';
import { Sheet } from './Sheet';
import { asBool, asString } from '../lib/analytics';
import {
  defaultFilters,
  type HistoryFilters,
  type HistorySort,
  type HistoryType,
} from '../lib/historyFilters';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  columns: number;
  onChange: (value: T) => void;
}

/** Compact segmented control; the sheet is narrow, so options wrap into a grid. */
function Segmented<T extends string>({ label, value, options, columns, onChange }: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="grid gap-1 rounded-xl bg-surface-muted p-1"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-lg py-2 text-[12px] font-semibold transition ${
              selected ? 'bg-surface text-ink shadow-sm' : 'text-muted'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {children}
    </div>
  );
}

const RANGE_OPTIONS: Option<HistoryFilters['range']>[] = [
  { value: 'month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-30', label: '30 days' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

const TYPE_OPTIONS: Option<HistoryType>[] = [
  { value: 'all', label: 'All' },
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
];

const AMOUNT_OPTIONS: Option<HistoryFilters['amountOp']>[] = [
  { value: 'any', label: 'Any' },
  { value: 'gt', label: '>' },
  { value: 'eq', label: '=' },
  { value: 'lt', label: '<' },
];

const SORT_OPTIONS: Option<HistorySort>[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest', label: 'Highest' },
  { value: 'lowest', label: 'Lowest' },
];

interface HistoryFiltersSheetProps {
  open: boolean;
  onClose: () => void;
  filters: HistoryFilters;
  onApply: (next: HistoryFilters) => void;
  /** Every category row, both types; the sheet narrows them itself. */
  categories: Row[];
}

/**
 * Filter editor with draft state: nothing touches the list until **Show
 * results**, so setting five filters doesn't make the page jump five times.
 */
export function HistoryFiltersSheet({
  open,
  onClose,
  filters,
  onApply,
  categories,
}: HistoryFiltersSheetProps) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    if (open) setDraft(filters);
  }, [open, filters]);

  const categoryOptions = useMemo(() => {
    const type = draft.type === 'all' ? null : draft.type;
    return categories
      .filter((c) => !asBool(c.deleted) && c.active !== false)
      .filter((c) => !type || asString(c.type) === type)
      .map((c) => ({
        id: asString(c.id),
        name: asString(c.name) || 'Category',
        icon: asString(c.icon) || '•',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, draft.type]);

  function chooseType(type: HistoryType) {
    setDraft((current) => {
      if (type === 'all' || !current.categoryId) return { ...current, type };
      const category = categories.find((c) => asString(c.id) === current.categoryId);
      const compatible = category !== undefined && asString(category.type) === type;
      return { ...current, type, categoryId: compatible ? current.categoryId : '' };
    });
  }

  const amountDisabled = draft.amountOp === 'any';

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter history"
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDraft(defaultFilters())}
            className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-ink"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
            className="flex-[1.4] rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink"
          >
            Show results
          </button>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <Field label="Range">
          <Segmented
            label="Date range"
            value={draft.range}
            options={RANGE_OPTIONS}
            columns={3}
            onChange={(range) => setDraft((current) => ({ ...current, range }))}
          />

          {draft.range === 'month' && (
            <input
              type="month"
              value={draft.month}
              onChange={(e) =>
                setDraft((current) => ({ ...current, month: e.target.value || current.month }))
              }
              aria-label="Month"
              className="w-full rounded-xl bg-surface-muted px-3.5 py-2.5 text-sm outline-none ring-brand focus:ring-2"
            />
          )}

          {draft.range === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={draft.from}
                onChange={(e) => setDraft((current) => ({ ...current, from: e.target.value }))}
                aria-label="From date"
                className="w-full rounded-xl bg-surface-muted px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
              />
              <input
                type="date"
                value={draft.to}
                onChange={(e) => setDraft((current) => ({ ...current, to: e.target.value }))}
                aria-label="To date"
                className="w-full rounded-xl bg-surface-muted px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
              />
            </div>
          )}
        </Field>

        <Field label="Type">
          <Segmented
            label="Type"
            value={draft.type}
            options={TYPE_OPTIONS}
            columns={3}
            onChange={chooseType}
          />
        </Field>

        <Field label="Amount">
          <Segmented
            label="Amount comparison"
            value={draft.amountOp}
            options={AMOUNT_OPTIONS}
            columns={4}
            onChange={(amountOp) => setDraft((current) => ({ ...current, amountOp }))}
          />
          <div
            className={`flex items-center rounded-xl bg-surface-muted px-3.5 transition ${
              amountDisabled ? 'opacity-50' : ''
            }`}
          >
            <span className="money text-sm text-muted">₹</span>
            <input
              value={draft.amount}
              onChange={(e) => setDraft((current) => ({ ...current, amount: e.target.value }))}
              inputMode="decimal"
              disabled={amountDisabled}
              placeholder={amountDisabled ? 'Pick >, = or < first' : 'Amount'}
              aria-label="Amount"
              className="money min-w-0 flex-1 bg-transparent py-3 pl-1 text-sm outline-none"
            />
          </div>
        </Field>

        <Field label="Category">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setDraft((current) => ({ ...current, categoryId: '' }))}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                draft.categoryId === ''
                  ? 'border-brand bg-brand/10 text-brand'
                  : 'border-line text-muted'
              }`}
            >
              Any
            </button>
            {categoryOptions.map((category) => {
              const selected = draft.categoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({ ...current, categoryId: category.id }))
                  }
                  className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                    selected ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
                  }`}
                >
                  <span>{category.icon}</span>
                  {category.name}
                </button>
              );
            })}
            {categoryOptions.length === 0 && (
              <p className="py-1 text-[11px] text-muted">No categories of this type yet.</p>
            )}
          </div>
        </Field>

        <Field label="Sort">
          <Segmented
            label="Sort"
            value={draft.sort}
            options={SORT_OPTIONS}
            columns={2}
            onChange={(sort) => setDraft((current) => ({ ...current, sort }))}
          />
          <p className="px-0.5 text-[11px] leading-relaxed text-muted">
            Highest and lowest show one flat list with the date on each row. Newest and oldest
            keep the day groups.
          </p>
        </Field>
      </div>
    </Sheet>
  );
}
