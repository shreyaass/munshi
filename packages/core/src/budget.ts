import { BUDGET_DEFAULT_MONTH, type BudgetKind } from './schema.js';
import { daysInMonth } from './date.js';
import type { Row } from './types.js';

/**
 * Budgets are plain rows in the `Budgets` tab: `kind` is total | daily |
 * category, `month` is `*` for a standing target or `YYYY-MM` for one month,
 * and `category_id` only matters for category limits.
 */

export interface ResolvedBudgets {
  /** Monthly ceiling in paise: the total, or daily × days in the month. 0 = unset. */
  ceiling: number;
  total: number;
  daily: number;
  /** Which figure set the ceiling. */
  source: 'total' | 'daily' | 'none';
  /** Category limits in paise, keyed by category id (zero limits omitted). */
  byCategory: Map<string, number>;
  /** True when this month has its own rows shadowing the standing ones. */
  monthSpecific: boolean;
  /** Ids of the rows that belong to this specific month. */
  monthRowIds: string[];
}

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
 * Resolves the Budgets tab for one month.
 *
 * A month-specific row beats the standing `*` row for the same kind (and, for
 * category limits, the same category). Total and daily stay independent: the
 * total is the monthly ceiling, the daily is a pace target of its own, and
 * daily × days in month is the fallback ceiling when no total is set.
 * Category limits never roll into the ceiling.
 */
export function resolveBudgets(rows: Row[], month: string): ResolvedBudgets {
  const live = rows.filter((r) => !asBool(r.deleted));

  function pick(kind: BudgetKind, categoryId = ''): number {
    const candidates = live.filter(
      (r) =>
        asString(r.kind) === kind &&
        (kind === 'category' ? asString(r.category_id) === categoryId : true),
    );
    const exact = candidates.find((r) => asString(r.month) === month);
    const row = exact ?? candidates.find((r) => asString(r.month) === BUDGET_DEFAULT_MONTH);
    return row ? asNumber(row.amount_paise) : 0;
  }

  const total = pick('total');
  const daily = pick('daily');

  const categoryIds = new Set(
    live.filter((r) => asString(r.kind) === 'category').map((r) => asString(r.category_id)),
  );
  const byCategory = new Map<string, number>();
  for (const id of categoryIds) {
    const amount = pick('category', id);
    if (id && amount > 0) byCategory.set(id, amount);
  }

  const monthRows = live.filter((r) => asString(r.month) === month);
  const source = total > 0 ? 'total' : daily > 0 ? 'daily' : 'none';

  return {
    ceiling: total > 0 ? total : daily > 0 ? daily * daysInMonth(month) : 0,
    total,
    daily,
    source,
    byCategory,
    monthSpecific: monthRows.length > 0,
    monthRowIds: monthRows.map((r) => asString(r.id)),
  };
}

/* -------------------------------------------------------------------------- */
/* Goals                                                                       */
/* -------------------------------------------------------------------------- */

export type GoalStatus = 'none' | 'ok' | 'warn' | 'low' | 'over' | 'met';

export interface GoalProgress {
  /** Target in paise. 0 means no goal was set. */
  target: number;
  /** Spent against the goal this month, in paise. */
  spent: number;
  /** `max(0, target - spent)` — the money left, which is what the water shows. */
  remaining: number;
  /** `max(0, spent - target)`. */
  overBy: number;
  /** `remaining / target`, clamped to 0–1. 0.8 means the card is 80% full. */
  fill: number;
  /** `spent / target`, clamped to 0–1. */
  used: number;
  status: GoalStatus;
}

/**
 * Goal progress for a category limit + that category's spend.
 *
 * The water level is the money *remaining*, not the money spent: a ₹10 target
 * with ₹2 spent leaves ₹8, so the card fills to 80%. Colours only ever
 * reinforce the number and the label, never carry the meaning alone.
 */
export function goalProgress(target: number, spent: number): GoalProgress {
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 0;
  const safeSpent = Number.isFinite(spent) && spent > 0 ? spent : 0;

  if (safeTarget <= 0) {
    return {
      target: 0,
      spent: safeSpent,
      remaining: 0,
      overBy: 0,
      fill: 0,
      used: 0,
      status: 'none',
    };
  }

  const remaining = Math.max(0, safeTarget - safeSpent);
  const overBy = Math.max(0, safeSpent - safeTarget);
  const fill = Math.min(1, remaining / safeTarget);
  const used = Math.min(1, safeSpent / safeTarget);

  const status: GoalStatus =
    overBy > 0
      ? 'over'
      : remaining === 0
        ? 'met'
        : fill < 0.25
          ? 'low'
          : fill < 0.5
            ? 'warn'
            : 'ok';

  return { target: safeTarget, spent: safeSpent, remaining, overBy, fill, used, status };
}
