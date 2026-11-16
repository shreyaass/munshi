import { describe, expect, it } from 'vitest';
import { digitsToPaise, formatPaise, parseToPaise, sumPaise } from '../money.js';
import { daysLeftInMonth, daysInMonth, monthKey } from '../date.js';
import { validateHeaders, HEADERS } from '../schema.js';

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

describe('schema', () => {
  it('accepts a correct header row', () => {
    expect(validateHeaders('Expenses', [...HEADERS.Expenses])).toEqual([]);
  });

  it('rejects a renamed column', () => {
    const bad = [...HEADERS.Expenses];
    bad[2] = 'amount';
    const problems = validateHeaders('Expenses', bad);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toContain('amount_paise');
  });
});
