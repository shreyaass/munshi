import { describe, expect, it } from 'vitest';
import { inDateRange, matchesAmount, monthBounds, resolveDateRange } from '../history.js';

/** Noon avoids any DST edge while building plain local dates. */
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12);

describe('resolveDateRange', () => {
  it('covers the whole requested month, including future days', () => {
    expect(resolveDateRange('month', { month: '2026-02' }, at(2026, 11, 21))).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(monthBounds('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('falls back to the current month when none is given', () => {
    expect(resolveDateRange('month', {}, at(2026, 11, 21))).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
  });

  it('steps back a calendar month across a year boundary', () => {
    expect(resolveDateRange('last-month', {}, at(2026, 1, 15))).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('treats the last 30 days as today plus the previous 29', () => {
    expect(resolveDateRange('last-30', {}, at(2026, 3, 1))).toEqual({
      from: '2026-01-31',
      to: '2026-03-01',
    });
  });

  it('uses the whole calendar year and leaves all-time unbounded', () => {
    expect(resolveDateRange('year', {}, at(2026, 11, 21))).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(resolveDateRange('all')).toEqual({ from: '', to: '' });
  });

  it('trims custom bounds and swaps them when reversed', () => {
    expect(resolveDateRange('custom', { from: '2026-11-15', to: '2026-11-10' })).toEqual({
      from: '2026-11-10',
      to: '2026-11-15',
    });
    expect(resolveDateRange('custom', { from: '2026-11-15' })).toEqual({
      from: '2026-11-15',
      to: '',
    });
    expect(resolveDateRange('custom', { from: 'not-a-date', to: '2026-11-15' })).toEqual({
      from: '',
      to: '2026-11-15',
    });
  });
});

describe('inDateRange', () => {
  it('includes both ends and ignores empty bounds', () => {
    const range = { from: '2026-11-01', to: '2026-11-30' };
    expect(inDateRange('2026-11-01', range)).toBe(true);
    expect(inDateRange('2026-11-30', range)).toBe(true);
    expect(inDateRange('2026-10-31T23:00:00Z', range)).toBe(false);

    const open = { from: '', to: '' };
    expect(inDateRange('1999-01-01', open)).toBe(true);
    expect(inDateRange('2026-11-21', { from: '2026-11-21', to: '' })).toBe(true);
  });
});

describe('matchesAmount', () => {
  it('compares with strict greater and less, and exact equality', () => {
    expect(matchesAmount(500_00, 'gt', 500_00)).toBe(false);
    expect(matchesAmount(500_01, 'gt', 500_00)).toBe(true);
    expect(matchesAmount(499_99, 'lt', 500_00)).toBe(true);
    expect(matchesAmount(500_00, 'lt', 500_00)).toBe(false);
    expect(matchesAmount(500_00, 'eq', 500_00)).toBe(true);
    expect(matchesAmount(500_01, 'eq', 500_00)).toBe(false);
  });

  it('never filters when the operator is any or the threshold is empty', () => {
    expect(matchesAmount(1, 'any', 500_00)).toBe(true);
    expect(matchesAmount(1, 'gt', 0)).toBe(true);
    expect(matchesAmount(1, 'eq', Number.NaN)).toBe(true);
  });
});
