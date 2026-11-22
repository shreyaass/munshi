import { formatPaise } from '@em/core';
import { Icon } from './Icon';

interface GoalCardProps {
  name: string;
  emoji?: string;
  target: number;
  spent: number;
  currency: string;
  locale: string;
  priority?: number;
  recurrence?: 'once' | 'monthly' | 'yearly';
  active?: boolean;
  onOpen: () => void;
}

const MATERIAL_NAMES = new Set([
  'flight',
  'smartphone',
  'laptop',
  'directions_car',
  'shield',
  'savings',
  'home',
  'trending_up',
  'restaurant',
  'sports_motorsports',
  'two_wheeler',
  'speed',
]);

export function isEmoji(str?: string): boolean {
  if (!str) return false;
  if (MATERIAL_NAMES.has(str)) return false;
  if (/^[a-z_]{3,}$/i.test(str)) return false;
  return true;
}

/** Map goal/category name to an appropriate icon or emoji */
export function resolveGoalIcon(name: string, emoji?: string): { isMaterial: boolean; icon: string } {
  const n = (name || '').toLowerCase();

  // High-confidence auto-detection based on the goal name
  let autoIcon: string | null = null;
  if (n.includes('phone') || n.includes('samsung') || n.includes('iphone') || n.includes('pixel') || n.includes('mobile') || n.includes('galaxy') || n.includes('s25')) {
    autoIcon = '📱';
  } else if (n.includes('laptop') || n.includes('macbook') || n.includes('computer') || n.includes('pc') || n.includes('ipad')) {
    autoIcon = '💻';
  } else if (n.includes('bike') || n.includes('motorcycle') || n.includes('scooter') || n.includes('activa') || n.includes('cycle') || n.includes('bullet') || n.includes('pulsar')) {
    autoIcon = '🏍️';
  } else if (n.includes('car') || n.includes('auto') || n.includes('vehicle') || n.includes('thar') || n.includes('suv') || n.includes('drive')) {
    autoIcon = '🚗';
  } else if (n.includes('flight') || n.includes('travel') || n.includes('trip') || n.includes('goa') || n.includes('vacation') || n.includes('paris')) {
    autoIcon = '✈️';
  } else if (n.includes('beach') || n.includes('resort') || n.includes('island')) {
    autoIcon = '🏖️';
  } else if (n.includes('home') || n.includes('house') || n.includes('flat') || n.includes('rent')) {
    autoIcon = '🏠';
  } else if (n.includes('safe') || n.includes('fund') || n.includes('emerg') || n.includes('shield')) {
    autoIcon = '🛡️';
  } else if (n.includes('gold') || n.includes('invest') || n.includes('sip') || n.includes('wealth')) {
    autoIcon = '🪙';
  } else if (n.includes('game') || n.includes('ps5') || n.includes('playstation') || n.includes('xbox')) {
    autoIcon = '🎮';
  }

  // If user provided a specific custom emoji
  if (emoji && emoji !== '•' && emoji !== '🎯' && emoji !== 'savings') {
    // If it's a real emoji (e.g. 📱, 🏍️, 🏖️, or any keyboard emoji)
    if (isEmoji(emoji)) {
      // Discard stale mismatched default like flight ✈️ on a phone or bike
      if (autoIcon && emoji === '✈️' && (n.includes('phone') || n.includes('laptop') || n.includes('bike') || n.includes('car') || n.includes('s25') || n.includes('samsung'))) {
        return { isMaterial: false, icon: autoIcon };
      }
      return { isMaterial: false, icon: emoji };
    }
    // If it's a material icon name (e.g. 'flight', 'smartphone')
    if (MATERIAL_NAMES.has(emoji)) {
      // If auto-detect has a better emoji match for this named item, prefer the emoji
      if (autoIcon) {
        return { isMaterial: false, icon: autoIcon };
      }
      return { isMaterial: true, icon: emoji };
    }
  }

  if (autoIcon) {
    return { isMaterial: false, icon: autoIcon };
  }

  return { isMaterial: false, icon: '🎯' };
}

/**
 * Organic, visible undulating water wave layer with dual sine crests:
 * - High-amplitude wave curves (not flat lines)
 * - Luminous golden wave crest strokes
 * - Gradient water body filling from the bottom
 */
export function FluidWaterLayer({ percent, minHeight = 24 }: { percent: number; minHeight?: number }) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const waterHeight = Math.max(minHeight, safePercent);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
      style={{ height: `${waterHeight}%` }}
    >
      {/* Wave Layer 2 (Back wave, reverse motion, deeper trough) */}
      <svg
        aria-hidden="true"
        className="goal-wave-fast absolute -top-5 left-0 h-8 w-[200%] text-accent/30 pointer-events-none"
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 30 Q 125 5, 250 30 T 500 30 T 750 30 T 1000 30 V 60 H 0 Z"
          fill="currentColor"
          stroke="rgba(200, 164, 92, 0.45)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Wave Layer 1 (Front wave, forward motion, glowing crest line) */}
      <svg
        aria-hidden="true"
        className="goal-wave-slow absolute -top-6 left-0 h-9 w-[200%] text-accent/55 pointer-events-none"
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 25 Q 125 0, 250 25 T 500 25 T 750 25 T 1000 25 V 60 H 0 Z"
          fill="currentColor"
          stroke="rgba(200, 164, 92, 0.9)"
          strokeWidth="2"
        />
      </svg>

      {/* Golden water gradient body */}
      <div className="absolute inset-0 bg-gradient-to-t from-accent/40 via-accent/28 to-accent/15" />
    </div>
  );
}

/** Legacy Wave component kept for backward compatibility */
export function Wave({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`absolute -top-3.5 left-0 h-5 w-[200%] ${className}`}
      viewBox="0 0 200 20"
      preserveAspectRatio="none"
      fill="currentColor"
    >
      <path d="M0 10 Q 25 0 50 10 T 100 10 T 150 10 T 200 10 V 20 H 0 Z" />
    </svg>
  );
}

/**
 * Water-container goal card matching the Munshi Kaala Bahi design system:
 * - Top: Icon left, Target amount right
 * - Center: Big bold percentage (0% to 100%)
 * - Animated water waves filling from the bottom in brand accent (brass / copper)
 * - Minimum resting waterline (12%) so water is ALWAYS visible and rippling
 * - Bottom: Goal name in Fraunces font, saved amount in mono
 */
export function GoalCard({
  name,
  emoji,
  target,
  spent,
  currency,
  locale,
  priority,
  recurrence,
  active = false,
  onOpen,
}: GoalCardProps) {
  const goalIcon = resolveGoalIcon(name, emoji);
  const safeTarget = Number.isFinite(target) && target > 0 ? target : 0;
  const safeSpent = Number.isFinite(spent) && spent > 0 ? spent : 0;

  // If no target is configured at all, render an actionable dashed card
  if (safeTarget <= 0) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${name}: set target`}
        className="relative flex h-[195px] w-full flex-col justify-between overflow-hidden rounded-[20px] border border-dashed border-line bg-surface p-4 text-left transition hover:border-accent active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          {goalIcon.isMaterial ? (
            <Icon name={goalIcon.icon} size={22} className="text-muted" />
          ) : (
            <span className="text-xl">{goalIcon.icon}</span>
          )}
          <span className="font-mono text-xs text-muted">No target</span>
        </div>
        <div>
          <p className="font-display text-lg font-medium text-text">{name}</p>
          <p className="mt-0.5 text-xs text-accent">Tap to set target →</p>
          <p className="money mt-1 text-[11px] text-muted">
            {formatPaise(safeSpent, locale, currency, { decimals: false })} spent
          </p>
        </div>
      </button>
    );
  }

  // Calculate percentage (0% to 100%)
  const ratio = Math.min(1, Math.max(0, safeSpent / safeTarget));
  const percent = Math.round(ratio * 100);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${name} goal: ${percent}% reached of ${formatPaise(safeTarget, locale, currency, { decimals: false })}`}
      className={`relative flex h-[195px] w-full flex-col justify-between overflow-hidden rounded-[20px] border p-4 text-left transition-all duration-300 active:scale-[0.99] select-none ${
        active
          ? 'border-accent bg-surface ring-1 ring-accent/50 shadow-[0_8px_30px_-6px_rgba(200,164,92,0.35)] dark:shadow-[0_8px_30px_-6px_rgba(200,164,92,0.25)]'
          : 'border-line/70 bg-surface/90 hover:border-line'
      }`}
    >
      {/* Animated Water Background */}
      <FluidWaterLayer percent={percent} minHeight={20} />

      {/* Top row: Icon & priority on left, target amount on right */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {goalIcon.isMaterial ? (
            <Icon name={goalIcon.icon} size={22} className="text-accent" />
          ) : (
            <span className="text-xl">{goalIcon.icon}</span>
          )}
          {priority !== undefined && (
            <span className="font-mono text-xs text-muted tabular">#{priority}</span>
          )}
        </div>
        <span className="font-mono text-xs text-muted tabular">
          {formatPaise(safeTarget, locale, currency, { decimals: false })}
          {recurrence === 'monthly' ? ' / mo' : recurrence === 'yearly' ? ' / yr' : ''}
        </span>
      </div>

      {/* Middle: Big bold percentage */}
      <div className="relative z-10 py-1">
        <span className="font-mono text-[38px] font-bold leading-none tracking-tight text-text">
          {percent}%
        </span>
      </div>

      {/* Bottom: Goal Name (Fraunces) and Saved amount */}
      <div className="relative z-10">
        <p className="font-display truncate text-[18px] font-medium leading-snug text-text">
          {name}
        </p>
        <p className="font-mono text-[12px] text-muted tabular mt-0.5">
          {formatPaise(safeSpent, locale, currency, { decimals: false })}{' '}
          {recurrence === 'monthly' ? 'this month' : 'saved'}
        </p>
      </div>
    </button>
  );
}
