interface SegmentedLimitBarProps {
  percent: number; // 0 to 100+
  totalSegments?: number;
  isOver?: boolean;
  isClose?: boolean;
}

/**
 * Returns color for segment at `index` (0-based) out of `totalSegments`,
 * reflecting the user's requirement:
 * "green when too much left, yellow when middleway, and red to deeper red when very small amount left (when towards the end)"
 */
function getSegmentColor(index: number, totalSegments: number, percent: number, isOver: boolean): string {
  if (isOver) {
    return '#DC2626'; // Deep Red
  }

  // Ratio along the total bar (0 = 0% spent, 1 = 100% spent)
  const segmentRatio = index / Math.max(1, totalSegments - 1);

  if (percent <= 50) {
    // Plenty left (> 50% left) -> Fresh green
    return '#10B981';
  }

  if (percent <= 75) {
    // Middleway -> Green transitioning into Yellow/Amber
    if (segmentRatio <= 0.45) return '#10B981';
    if (segmentRatio <= 0.60) return '#84CC16'; // Lime
    return '#EAB308'; // Yellow
  }

  if (percent <= 90) {
    // Getting close (< 25% left) -> Green -> Yellow -> Orange
    if (segmentRatio <= 0.40) return '#10B981';
    if (segmentRatio <= 0.60) return '#EAB308';
    if (segmentRatio <= 0.78) return '#F59E0B';
    return '#F97316'; // Orange
  }

  // Very small amount left (> 90% spent) -> Full progression ending in deep red
  if (segmentRatio <= 0.35) return '#10B981';
  if (segmentRatio <= 0.55) return '#EAB308';
  if (segmentRatio <= 0.72) return '#F97316';
  if (segmentRatio <= 0.88) return '#EF4444';
  return '#DC2626'; // Crimson
}

export function SegmentedLimitBar({
  percent,
  totalSegments = 30,
  isOver = false,
  isClose = false,
}: SegmentedLimitBarProps) {
  const safePercent = Math.max(0, percent);
  const filledCount = isOver
    ? totalSegments
    : Math.min(
        totalSegments,
        Math.max(safePercent > 0 ? 1 : 0, Math.round((safePercent / 100) * totalSegments)),
      );

  // Glow color based on current danger level
  const glowColor = isOver
    ? 'rgba(220, 38, 38, 0.55)'
    : percent >= 85 || isClose
      ? 'rgba(239, 68, 68, 0.45)'
      : percent >= 60
        ? 'rgba(245, 158, 11, 0.4)'
        : 'rgba(16, 185, 129, 0.4)';

  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex items-center justify-between py-2 w-full select-none"
    >
      {Array.from({ length: totalSegments }, (_, i) => {
        const isFilled = i < filledCount;
        const color = getSegmentColor(i, totalSegments, percent, isOver);

        return (
          <div
            key={i}
            className={`h-[22px] w-[2.5px] sm:w-[3px] rounded-full transition-all duration-300 ${
              isFilled
                ? 'opacity-100'
                : 'bg-line/60 dark:bg-white/15 opacity-60'
            }`}
            style={{
              backgroundColor: isFilled ? color : undefined,
              boxShadow: isFilled && (i === filledCount - 1 || isOver) ? `0 0 6px ${glowColor}` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
