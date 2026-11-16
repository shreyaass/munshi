import { describe, expect, it } from 'vitest';
import { digitsToPaise, formatPaise, parseToPaise, sumPaise } from '../money.js';
import { daysLeftInMonth, daysInMonth, monthKey } from '../date.js';
import { HEADERS, validateHeaders, rowFromValues, valuesFromRow, SCHEMA_VERSION, BUDGET_KINDS, BUDGET_DEFAULT_MONTH } from '../schema.js';
import { pickQuickCategories, categoryUsage } from '../quick.js';

describe('money', () => {
  it('parses user input into paise', () => {
    expect(parseToPaise('250')).toBe(25000);
    expect(parseToPaise('₹ 1,234.50')).toBe(123450);
    expect(parseToPaise('12.5')).toBe(1250);
    expect(parseToPaise('.75')).toBe(75);
    expect(parseToPaise('0')).toBeNull();
    expect(parseToPaise('abc')).toBeNull();
    expect(parseToPaise('1.2.3')).toBeNull();
  });

  it('round-trips keypad digits', () => {
    expect(digitsToPaise('1234')).toBe(1234);
    expect(digitsToPaise('')).toBe(0);
  });

  it('formats INR', () => {
    expect(formatPaise(123450)).toContain('1,234.50');
    expect(formatPaise(0)).toContain('0.00');
  });

  it('sums safely', () => {
    expect(sumPaise([100, 250, 50])).toBe(400);
    expect(sumPaise([100, NaN as unknown as number])).toBe(100);
  });
});

describe('date', () => {
  it('derives month keys', () => {
    expect(monthKey('2026-11-16')).toBe('2026-11');
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2024-02')).toBe(29);
    expect(daysLeftInMonth('2026-02', new Date(2026, 1, 25))).toBe(4);
  });
});

describe('schema v2', () => {
  it('is at version 2', () => {
    expect(SCHEMA_VERSION).toBe(2);
    expect(HEADERS.Categories).toContain('pinned');
    expect(HEADERS.Categories).toContain('sort_order');
    expect(HEADERS.Budgets).toContain('kind');
    expect(BUDGET_KINDS).toEqual(['total', 'daily', 'category']);
    expect(BUDGET_DEFAULT_MONTH).toBe('*');
  });

  it('accepts a correct header row', () => {
    expect(validateHeaders('Expenses', [...HEADERS.Expenses])).toEqual([]);
  });

  it('accepts reordered headers (name matching, not position)', () => {
    const shuffled = [...HEADERS.Expenses].reverse();
    expect(validateHeaders('Expenses', shuffled)).toEqual([]);
  });

  it('accepts extra user-added columns', () => {
    const withExtra = [...HEADERS.Expenses, 'my_own_column'];
    expect(validateHeaders('Expenses', withExtra)).toEqual([]);
  });

  it('rejects a renamed required column', () => {
    const bad = [...HEADERS.Expenses];
    bad[2] = 'amount';
    const problems = validateHeaders('Expenses', bad);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toContain('amount_paise');
  });

  it('round-trips rows through header mapping', () => {
    const headers = [...HEADERS.Accounts, 'my_note'];
    const values = ['id-1', 'Cash', 'cash', 0, true, 'ts', 'dev', false, 'hello'];
    const row = rowFromValues(headers, values);
    expect(row.id).toBe('id-1');
    expect(row.my_note).toBe('hello');
    const back = valuesFromRow(headers, { ...row, name: 'Wallet' });
    expect(back[1]).toBe('Wallet');
    expect(back[8]).toBe('hello');
  });
});

describe('quick categories', () => {
  const cats = [
    { id: 'a', name: 'Bills', pinned: false, sort_order: 0 },
    { id: 'b', name: 'Food', pinned: true, sort_order: 2 },
    { id: 'c', name: 'Groceries', pinned: true, sort_order: 1 },
    { id: 'd', name: 'Transport' },
    { id: 'e', name: 'Shopping', deleted: true },
  ];

  it('puts pinned first in sort_order, then most used', () => {
    const usage = new Map([
      ['a', 9],
      ['d', 3],
    ]);
    const picked = pickQuickCategories(cats, usage, 4).map((c) => c.id);
    expect(picked).toEqual(['c', 'b', 'a', 'd']);
  });

  it('respects the limit and skips deleted', () => {
    const picked = pickQuickCategories(cats, new Map(), 2).map((c) => c.id);
    expect(picked).toEqual(['c', 'b']);
    expect(pickQuickCategories(cats, new Map(), 9)).not.toContain('e');
  });

  it('counts usage inside the window only', () => {
    const usage = categoryUsage(
      [
        { category_id: 'a', date: '2026-11-10' },
        { category_id: 'a', date: '2026-01-01' },
        { category_id: 'b', date: '2026-11-11' },
      ],
      '2026-10-01',
    );
    expect(usage.get('a')).toBe(1);
    expect(usage.get('b')).toBe(1);
  });
});
