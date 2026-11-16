/**
 * Choosing the Add screen's quick chips: pinned first (in the order the user
 * set), then whatever they actually use most, then creation order as filler.
 *
 * "Most used" is computed from transactions, so there is no counter column to
 * drift out of sync between devices.
 */

export interface QuickCandidate {
  id: string;
  name: string;
  pinned?: boolean;
  sort_order?: number;
  active?: boolean;
  deleted?: boolean;
}

export function pickQuickCategories<T extends QuickCandidate>(
  categories: readonly T[],
  usage: ReadonlyMap<string, number>,
  limit: number,
): T[] {
  const eligible = categories.filter((c) => !c.deleted && c.active !== false);

  const pinned = eligible
    .filter((c) => c.pinned)
    .sort((a, b) => {
      const byOrder = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      return byOrder !== 0 ? byOrder : a.name.localeCompare(b.name);
    });

  const rest = eligible
    .filter((c) => !c.pinned)
    .sort((a, b) => {
      const byUsage = (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0);
      return byUsage !== 0 ? byUsage : a.name.localeCompare(b.name);
    });

  return [...pinned, ...rest].slice(0, Math.max(0, limit));
}

/** category_id -> number of times used in the given window. */
export function categoryUsage(
  transactions: readonly { category_id?: unknown; date?: unknown }[],
  sinceISO: string,
): Map<string, number> {
  const usage = new Map<string, number>();
  for (const tx of transactions) {
    const date = String(tx.date ?? '').slice(0, 10);
    if (date < sinceISO) continue;
    const id = String(tx.category_id ?? '');
    if (!id) continue;
    usage.set(id, (usage.get(id) ?? 0) + 1);
  }
  return usage;
}

/** ISO date N days before today, for the usage window. */
export function daysAgoISO(days: number, now = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
