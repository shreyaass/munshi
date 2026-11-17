import { useCallback, useEffect, useRef, useState } from 'react';
import { GoalCard } from './GoalCard';
import { Icon } from './Icon';

export interface GoalItem {
  categoryId: string;
  name: string;
  emoji: string;
  target: number;
  spent: number;
}

interface GoalsCarouselProps {
  goals: GoalItem[];
  currency: string;
  locale: string;
  onOpen: (categoryId: string) => void;
}

/**
 * Peek-style carousel: the centred goal is full size, its neighbours peek in at
 * both edges at reduced scale. Swiping is native CSS scroll-snap — no drag
 * handlers, so it never fights the page's vertical scroll on Android.
 */
export function GoalsCarousel({ goals, currency, locale, onOpen }: GoalsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [active, setActive] = useState(0);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const centre = track.scrollLeft + track.clientWidth / 2;
    const cards = [...track.querySelectorAll<HTMLElement>('[data-goal]')];
    let best = 0;
    let bestDistance = Infinity;
    cards.forEach((el, index) => {
      const childCentre = el.offsetLeft + el.offsetWidth / 2;
      const distance = Math.abs(childCentre - centre);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    setActive(best);
  }, []);

  useEffect(() => {
    measure();
  }, [measure]);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  function onScroll() {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      measure();
    });
  }

  function scrollTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(`[data-goal="goal-${index}"]`);
    if (!card) return;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: 'smooth',
    });
  }

  const atStart = active <= 0;
  const atEnd = active >= goals.length - 1;

  return (
    <div aria-roledescription="carousel" aria-label="Goals">
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1"
        >
          <div aria-hidden="true" className="w-[11%] shrink-0" />
          {goals.map((goal, index) => (
            <div
              key={goal.categoryId}
              data-goal={`goal-${index}`}
              className={`w-[78%] shrink-0 snap-center transition-[transform,opacity] duration-300 ${
                index === active ? 'scale-100 opacity-100' : 'scale-[0.94] opacity-55'
              }`}
            >
              <GoalCard
                name={goal.name}
                emoji={goal.emoji}
                target={goal.target}
                spent={goal.spent}
                currency={currency}
                locale={locale}
                active={index === active}
                onOpen={() => onOpen(goal.categoryId)}
              />
            </div>
          ))}
          <div aria-hidden="true" className="w-[11%] shrink-0" />
        </div>

        {goals.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous goal"
              onClick={() => scrollTo(active - 1)}
              disabled={atStart}
              className="absolute left-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition disabled:opacity-0 md:flex"
            >
              <Icon name="back" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next goal"
              onClick={() => scrollTo(active + 1)}
              disabled={atEnd}
              className="absolute right-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-sm transition disabled:opacity-0 md:flex"
            >
              <Icon name="back" className="h-4 w-4 rotate-180" />
            </button>
          </>
        )}
      </div>

      {goals.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {goals.map((goal, index) => (
            <button
              key={goal.categoryId}
              type="button"
              aria-label={`Go to goal ${index + 1}: ${goal.name}`}
              aria-current={index === active}
              onClick={() => scrollTo(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === active ? 'w-4 bg-brand' : 'w-1.5 bg-line'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
