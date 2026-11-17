import { describe, expect, it } from 'vitest';
import { resolveBudgets } from '../budget.js';
import type { Row } from '../types.js';

function row(id: string, extra: Row): Row {
  return { id, updated_at: '2026-11-01T00:00:00Z', device_id: 'test', deleted: false, ...extra };
}

const standing = row('bud-total', { month: '*', kind: 'total', category_id: '', amount_paise: 3_000_000 });

describe('resolveBudgets', () => {
  it('uses the standing total as the ceiling', () => {
    const resolved = resolveBudgets([standing], '2026-11');
    expect(resolved.total).toBe(3_000_000);
    expect(resolved.ceiling).toBe(3_000_000);
    expect(resolved.source).toBe('total');
    expect(resolved.monthSpecific).toBe(false);
  });

  it('lets a month-specific row override the standing one', () => {
    const november = row('bud-total-nov', { month: '2026-11', kind: 'total', category_id: '', amount_paise: 5_000_000 });
    const resolved = resolveBudgets([standing, november], '2026-11');
    expect(resolved.total).toBe(5_000_000);
    expect(resolved.monthSpecific).toBe(true);
    expect(resolved.monthRowIds).toEqual(['bud-total-nov']);

    // Another month still sees the standing value.
    expect(resolveBudgets([standing, november], '2026-12').total).toBe(3_000_000);
  });

  it('keeps total and daily independent, preferring total for the ceiling', () => {
    const daily = row('bud-daily', { month: '*', kind: 'daily', category_id: '', amount_paise: 100_000 });
    const resolved = resolveBudgets([standing, daily], '2026-11');
    expect(resolved.total).toBe(3_000_000);
    expect(resolved.daily).toBe(100_000);
    expect(resolved.ceiling).toBe(3_000_000);
    expect(resolved.source).toBe('total');
  });

  it('falls back to daily × days in month when there is no total', () => {
    const daily = row('bud-daily', { month: '*', kind: 'daily', category_id: '', amount_paise: 100_000 });
    const resolved = resolveBudgets([daily], '2026-02');
    expect(resolved.total).toBe(0);
    expect(resolved.source).toBe('daily');
    expect(resolved.ceiling).toBe(100_000 * 28);
  });

  it('collects category limits without adding them to the ceiling', () => {
    const food = row('bud-cat-food', { month: '*', kind: 'category', category_id: 'cat-1', amount_paise: 400_000 });
    const empty = row('bud-cat-groc', { month: '*', kind: 'category', category_id: 'cat-2', amount_paise: 0 });
    const resolved = resolveBudgets([standing, food, empty], '2026-11');
    expect(resolved.byCategory.get('cat-1')).toBe(400_000);
    expect(resolved.byCategory.has('cat-2')).toBe(false);
    expect(resolved.ceiling).toBe(3_000_000);
  });

  it('resolves a month-specific category limit per category', () => {
    const standingFood = row('bud-cat-food', {
      month: '*',
      kind: 'category',
      category_id: 'cat-1',
      amount_paise: 400_000,
    });
    const novemberFood = row('bud-cat-food-nov', {
      month: '2026-11',
      kind: 'category',
      category_id: 'cat-1',
      amount_paise: 700_000,
    });
    expect(resolveBudgets([standingFood, novemberFood], '2026-11').byCategory.get('cat-1')).toBe(700_000);
    expect(resolveBudgets([standingFood, novemberFood], '2026-12').byCategory.get('cat-1')).toBe(400_000);
  });

  it('ignores tombstones and reports no budget', () => {
    const deleted = { ...standing, deleted: true };
    const resolved = resolveBudgets([deleted], '2026-11');
    expect(resolved.source).toBe('none');
    expect(resolved.ceiling).toBe(0);
    expect(resolved.total).toBe(0);
    expect(resolved.daily).toBe(0);
    expect(resolved.byCategory.size).toBe(0);
  });
});
