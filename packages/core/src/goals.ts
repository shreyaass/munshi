import type { Row } from './types.js';

function asString(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asBool(value: unknown): boolean {
  return value === true || value === 'TRUE' || value === 'true' || value === 1 || value === '1';
}

/**
 * Per-month need for a goal:
 * - One-time: (target − saved) / months remaining to deadline (minimum 1 month).
 * - Recurring monthly: target.
 * - Recurring yearly: target / 12.
 */
export function goalMonthlyNeed(
  targetPaise: number,
  savedPaise: number,
  recurrence: 'once' | 'monthly' | 'yearly',
  deadline?: string,
  todayStr?: string,
): number {
  if (targetPaise <= 0) return 0;

  if (recurrence === 'monthly') {
    return targetPaise;
  }

  if (recurrence === 'yearly') {
    return Math.ceil(targetPaise / 12);
  }

  // One-time goal
  const remainingPaise = Math.max(0, targetPaise - savedPaise);
  if (remainingPaise === 0) return 0;

  if (!deadline) return remainingPaise;

  const now = todayStr ? new Date(todayStr) : new Date();
  const end = new Date(deadline);

  if (Number.isNaN(end.getTime())) return remainingPaise;

  const monthsRemaining =
    (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()) + 1;

  const effectiveMonths = Math.max(1, monthsRemaining);
  return Math.ceil(remainingPaise / effectiveMonths);
}

export interface GoalAllocationTarget {
  goalId: string;
  needPaise: number;
  priority: number;
}

export interface GoalAllocationResult {
  goalId: string;
  allocatedPaise: number;
  needPaise: number;
  shortPaise: number;
  isFunded: boolean;
  isPartial: boolean;
}

/**
 * Distribute available amount by priority:
 * Fill priority 1 up to its per-month need, then 2, and so on.
 * The last funded goal may be partial and shows "short ₹X".
 * Exact sum matching: sum of allocations equals Math.min(availablePaise, totalNeeds).
 */
export function splitByPriority(
  availablePaise: number,
  goals: GoalAllocationTarget[],
): GoalAllocationResult[] {
  const sorted = [...goals].sort((a, b) => a.priority - b.priority);
  let remaining = Math.max(0, availablePaise);

  return sorted.map((goal) => {
    const need = Math.max(0, goal.needPaise);
    if (need === 0) {
      return {
        goalId: goal.goalId,
        allocatedPaise: 0,
        needPaise: 0,
        shortPaise: 0,
        isFunded: true,
        isPartial: false,
      };
    }

    const allocated = Math.min(remaining, need);
    remaining -= allocated;
    const short = need - allocated;

    return {
      goalId: goal.goalId,
      allocatedPaise: allocated,
      needPaise: need,
      shortPaise: short,
      isFunded: allocated >= need,
      isPartial: allocated > 0 && allocated < need,
    };
  });
}

/**
 * Distribute available amount proportionally:
 * Each goal gets need / totalNeed × available.
 * Distributes rounding remainder to ensure exact sum match.
 */
export function splitProportionally(
  availablePaise: number,
  goals: GoalAllocationTarget[],
): GoalAllocationResult[] {
  const totalNeed = goals.reduce((sum, g) => sum + Math.max(0, g.needPaise), 0);
  const totalToDistribute = Math.min(Math.max(0, availablePaise), totalNeed);

  if (totalNeed === 0 || totalToDistribute === 0) {
    return goals.map((g) => ({
      goalId: g.goalId,
      allocatedPaise: 0,
      needPaise: g.needPaise,
      shortPaise: g.needPaise,
      isFunded: g.needPaise === 0,
      isPartial: false,
    }));
  }

  let distributedSum = 0;
  const results = goals.map((goal) => {
    const need = Math.max(0, goal.needPaise);
    const rawShare = Math.floor(totalToDistribute * (need / totalNeed));
    distributedSum += rawShare;
    return {
      goalId: goal.goalId,
      allocatedPaise: rawShare,
      needPaise: need,
      shortPaise: need - rawShare,
      isFunded: false,
      isPartial: false,
    };
  });

  // Distribute rounding remainder to goals with highest need
  let remainder = totalToDistribute - distributedSum;
  if (remainder > 0) {
    const sortedIndices = results
      .map((r, idx) => ({ idx, short: r.shortPaise }))
      .sort((a, b) => b.short - a.short);

    for (let i = 0; i < sortedIndices.length && remainder > 0; i++) {
      const idx = sortedIndices[i].idx;
      results[idx].allocatedPaise += 1;
      results[idx].shortPaise -= 1;
      remainder -= 1;
    }
  }

  return results.map((r) => ({
    ...r,
    isFunded: r.allocatedPaise >= r.needPaise,
    isPartial: r.allocatedPaise > 0 && r.allocatedPaise < r.needPaise,
  }));
}

/**
 * Calculate saved amount for a goal from contributions:
 * Saving goals only read contributions!
 */
export function goalSavedAmount(
  goalId: string,
  recurrence: 'once' | 'monthly' | 'yearly',
  contributions: Row[],
  periodKey?: string, // 'YYYY-MM' for monthly, 'YYYY' for yearly
): number {
  const activeContributions = contributions.filter(
    (c) => !asBool(c.deleted) && asString(c.goal_id) === goalId,
  );

  if (recurrence === 'once') {
    return activeContributions.reduce((sum, c) => sum + asNumber(c.amount_paise), 0);
  }

  if (recurrence === 'monthly' && periodKey) {
    return activeContributions
      .filter((c) => asString(c.date).slice(0, 7) === periodKey)
      .reduce((sum, c) => sum + asNumber(c.amount_paise), 0);
  }

  if (recurrence === 'yearly' && periodKey) {
    const year = periodKey.slice(0, 4);
    return activeContributions
      .filter((c) => asString(c.date).slice(0, 4) === year)
      .reduce((sum, c) => sum + asNumber(c.amount_paise), 0);
  }

  return activeContributions.reduce((sum, c) => sum + asNumber(c.amount_paise), 0);
}
