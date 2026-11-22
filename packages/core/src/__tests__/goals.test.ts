import { describe, expect, it } from 'vitest';
import {
  goalMonthlyNeed,
  splitByPriority,
  splitProportionally,
  goalSavedAmount,
} from '../goals.js';

describe('goalMonthlyNeed', () => {
  it('calculates monthly need for one-time goals with deadline', () => {
    // 30,000 target, 12,000 saved = 18,000 remaining
    // from 2026-11-22 to 2027-01-31 is ~3 months (Nov, Dec, Jan)
    const need = goalMonthlyNeed(3000000, 1200000, 'once', '2027-01-31', '2026-11-22');
    expect(need).toBe(600000); // 18,000 / 3 = 6,000
  });

  it('handles monthly recurrence', () => {
    const need = goalMonthlyNeed(1000000, 400000, 'monthly');
    expect(need).toBe(1000000);
  });

  it('handles yearly recurrence', () => {
    const need = goalMonthlyNeed(12000000, 0, 'yearly');
    expect(need).toBe(1000000); // 120,000 / 12 = 10,000
  });
});

describe('splitByPriority', () => {
  const goals = [
    { goalId: 'g1', priority: 1, needPaise: 780000 },
    { goalId: 'g2', priority: 2, needPaise: 1000000 },
    { goalId: 'g3', priority: 3, needPaise: 900000 },
  ];

  it('funds goals in exact priority order', () => {
    // Available 23,580:
    // g1 gets 7,800 (fully funded)
    // g2 gets 10,000 (fully funded)
    // g3 gets remaining 5,780 (short by 3,220)
    const res = splitByPriority(2358000, goals);
    expect(res).toHaveLength(3);

    expect(res[0].goalId).toBe('g1');
    expect(res[0].allocatedPaise).toBe(780000);
    expect(res[0].isFunded).toBe(true);

    expect(res[1].goalId).toBe('g2');
    expect(res[1].allocatedPaise).toBe(1000000);
    expect(res[1].isFunded).toBe(true);

    expect(res[2].goalId).toBe('g3');
    expect(res[2].allocatedPaise).toBe(578000);
    expect(res[2].shortPaise).toBe(322000);
    expect(res[2].isPartial).toBe(true);
    expect(res[2].isFunded).toBe(false);

    // Sum strictly equals available
    const totalAllocated = res.reduce((sum, r) => sum + r.allocatedPaise, 0);
    expect(totalAllocated).toBe(2358000);
  });
});

describe('splitProportionally', () => {
  const goals = [
    { goalId: 'g1', priority: 1, needPaise: 100000 },
    { goalId: 'g2', priority: 2, needPaise: 100000 },
  ];

  it('distributes available amount proportionally with exact sum', () => {
    const res = splitProportionally(150000, goals);
    expect(res[0].allocatedPaise).toBe(75000);
    expect(res[1].allocatedPaise).toBe(75000);

    const totalAllocated = res.reduce((sum, r) => sum + r.allocatedPaise, 0);
    expect(totalAllocated).toBe(150000);
  });
});

describe('goalSavedAmount', () => {
  const contributions = [
    { id: 'c1', goal_id: 'g1', amount_paise: 500000, date: '2026-11-01', deleted: false },
    { id: 'c2', goal_id: 'g1', amount_paise: 300000, date: '2026-11-15', deleted: false },
    { id: 'c3', goal_id: 'g1', amount_paise: 200000, date: '2026-10-15', deleted: false },
    { id: 'c4', goal_id: 'g1', amount_paise: 999999, date: '2026-11-20', deleted: true }, // deleted
    { id: 'c5', goal_id: 'g2', amount_paise: 700000, date: '2026-11-10', deleted: false },
  ];

  it('sums all active contributions for once goal', () => {
    const saved = goalSavedAmount('g1', 'once', contributions);
    expect(saved).toBe(1000000); // 500k + 300k + 200k (excluding deleted)
  });

  it('sums contributions only within period for monthly goal', () => {
    const savedNov = goalSavedAmount('g1', 'monthly', contributions, '2026-11');
    expect(savedNov).toBe(800000); // 500k + 300k
  });
});
