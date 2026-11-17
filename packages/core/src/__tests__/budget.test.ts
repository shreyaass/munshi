import { describe, expect, it } from 'vitest';
import { goalProgress, resolveBudgets } from '../budget.js';
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

describe('goalProgress', () => {
  it('fills with the money remaining, not the money spent', () => {
    // ₹10 target, ₹2 spent -> ₹8 left -> 80% full.
    const goal = goalProgress(1000, 200);
    expect(goal.remaining).toBe(800);
    expect(goal.fill).toBe(0.8);
    expect(goal.used).toBe(0.2);
    expect(goal.status).toBe('ok');
  });

  it('calls out the low and warning bands', () => {
    expect(goalProgress(1000, 800).status).toBe('low'); // 20% left
    expect(goalProgress(1000, 600).status).toBe('warn'); // 40% left
    expect(goalProgress(1000, 500).status).toBe('ok'); // 50% left
    expect(goalProgress(1000, 800).fill).toBe(0.2);
  });

  it('reports over-target spending and clamps the water to empty', () => {
    const goal = goalProgress(1000, 1250);
    expect(goal.status).toBe('over');
    expect(goal.overBy).toBe(250);
    expect(goal.remaining).toBe(0);
    expect(goal.fill).toBe(0);
    expect(goal.used).toBe(1);
  });

  it('marks an exactly-spent goal as met rather than over', () => {
    const goal = goalProgress(1000, 1000);
    expect(goal.status).toBe('met');
    expect(goal.overBy).toBe(0);
    expect(goal.fill).toBe(0);
  });

  it('returns nothing for an unset target', () => {
    const goal = goalProgress(0, 500);
    expect(goal.status).toBe('none');
    expect(goal.fill).toBe(0);
    expect(goal.remaining).toBe(0);
    expect(goal.overBy).toBe(0);
  });

  it('tolerates negative and non-finite input', () => {
    expect(goalProgress(-100, 50).status).toBe('none');
    expect(goalProgress(1000, -50).spent).toBe(0);
    expect(goalProgress(Number.NaN, 50).status).toBe('none');
    expect(goalProgress(1000, Number.POSITIVE_INFINITY).spent).toBe(0);
  });
});
