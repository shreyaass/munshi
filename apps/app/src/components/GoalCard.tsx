import { formatPaise, goalProgress } from '@em/core';

interface GoalCardProps {
  name: string;
  emoji: string;
  target: number;
  spent: number;
  currency: string;
  locale: string;
  /** Marks the card as the centred one in the carousel. */
  active?: boolean;
  onOpen: () => void;
}

const TONES = {
  ok: { water: 'text-goal-ok', body: 'bg-goal-ok/25', pill: 'bg-goal-ok-soft text-goal-ok' },
  warn: {
    water: 'text-goal-warn',
    body: 'bg-goal-warn/25',
    pill: 'bg-goal-warn-soft text-goal-warn',
  },
  low: {
    water: 'text-goal-low',
    body: 'bg-goal-low/25',
    pill: 'bg-goal-low-soft text-goal-low',
  },
  over: {
    water: 'text-danger',
    body: 'bg-danger/15',
    pill: 'bg-danger-soft text-danger',
  },
  met: { water: 'text-goal-ok', body: 'bg-goal-ok/10', pill: 'bg-goal-ok-soft text-goal-ok' },
  none: { water: 'text-muted', body: 'bg-surface-muted', pill: 'bg-surface-muted text-muted' },
} as const;

/** A single wave strip, drawn twice as wide as the card so its loop is seamless. */
function Wave({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`absolute -top-2 left-0 h-4 w-[200%] ${className}`}
      viewBox="0 0 200 20"
      preserveAspectRatio="none"
      fill="currentColor"
    >
      <path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z" />
    </svg>
  );
}

/**
 * Water-container goal card.
 *
 * The water is the money *left*: a ₹10 target with ₹2 spent sits at 80%. Two
 * SVG strips slide forever at different speeds, clipped by the card, so the
 * surface is always moving. The wave is decorative — the amount, the "left of"
 * line and the pill carry the meaning for screen readers.
 */
export function GoalCard({
  name,
  emoji,
  target,
  spent,
  currency,
  locale,
  active = false,
  onOpen,
}: GoalCardProps) {
  const goal = goalProgress(target, spent);
  const tone = TONES[goal.status];
  const money = (paise: number) =>
    formatPaise(paise, locale, currency, { decimals: false, compact: true });

  const pill =
    goal.status === 'over'
      ? 'Over'
      : goal.status === 'met'
        ? 'Met'
        : goal.status === 'low'
          ? 'Low'
          : `${Math.round(goal.fill * 100)}%`;

  const headline = goal.status === 'over' ? money(goal.overBy) : money(goal.remaining);
  const caption =
    goal.status === 'over'
      ? `over of ${money(goal.target)}`
      : goal.status === 'met'
        ? `of ${money(goal.target)} spent`
        : `left of ${money(goal.target)}`;

  const label =
    goal.status === 'over'
      ? `${name} goal: ${money(goal.overBy)} over the ${money(goal.target)} target`
      : goal.status === 'met'
        ? `${name} goal met: ${money(goal.target)} spent`
        : `${name} goal: ${money(goal.remaining)} left of ${money(goal.target)}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className={`relative flex h-[168px] w-full flex-col overflow-hidden rounded-2xl border p-3.5 text-left transition duration-300 ${
        active ? 'border-line bg-goal-card shadow-sm' : 'border-line/70 bg-goal-card'
      }`}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out ${tone.body}`}
        style={{ height: `${goal.fill * 100}%` }}
      >
        {goal.fill > 0 && (
          <>
            <Wave className={`goal-wave-slow opacity-50 ${tone.water}`} />
            <Wave className={`goal-wave-fast opacity-35 ${tone.water}`} />
          </>
        )}
      </div>

      <div className="relative z-10 flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface/80 text-base shadow-sm backdrop-blur-sm">
          {emoji || '🎯'}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tone.pill}`}
        >
          {pill}
        </span>
      </div>

      <div className="relative z-10 mt-auto">
        <p className="truncate text-[12px] font-medium text-muted">{name}</p>
        <p
          className={`money mt-0.5 text-[26px] font-semibold leading-tight ${
            goal.status === 'over' ? 'text-danger' : 'text-ink'
          }`}
        >
          {headline}
        </p>
        <p className="money text-[11px] text-muted">{caption}</p>
      </div>
    </button>
  );
}
