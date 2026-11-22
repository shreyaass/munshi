import { useCallback, useEffect, useRef, useState } from 'react';
import { GoalCard } from './GoalCard';

export interface GoalItem {
  id?: string;
  categoryId?: string;
  name: string;
  emoji: string;
  target: number;
  spent: number;
  priority?: number;
  recurrence?: 'once' | 'monthly' | 'yearly';
}

interface GoalsCarouselProps {
  goals: GoalItem[];
  currency: string;
  locale: string;
  onOpen: (id: string) => void;
}

/**
 * Centered carousel matching the Munshi Kaala Bahi design:
 * - When 1 goal: displays full width.
 * - When multiple goals: centers the active card with equal side peeks and scale transitions.
 * - Active card illuminated with accent glow border.
 * - Pill pagination indicator below.
 */
export function GoalsCarousel({ goals, currency, locale, onOpen }: GoalsCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [active, setActive] = useState(0);

  const isMulti = goals.length > 1;

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

  // Single goal: render cleanly full width
  if (!isMulti && goals.length === 1) {
    const goal = goals[0];
    const key = goal.id || goal.categoryId || 'single';
    return (
      <div className="w-full">
        <GoalCard
          name={goal.name}
          emoji={goal.emoji}
          target={goal.target}
          spent={goal.spent}
          priority={goal.priority}
          recurrence={goal.recurrence}
          currency={currency}
          locale={locale}
          active={true}
          onOpen={() => onOpen(key)}
        />
      </div>
    );
  }

  return (
    <div aria-roledescription="carousel" aria-label="Goals" className="relative">
      {/* Scroll track with centered peek */}
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3.5 overflow-x-auto overscroll-x-contain py-2"
      >
        {/* Left spacer so the 1st card centers in the viewport */}
        <div aria-hidden="true" className="w-[10%] shrink-0" />

        {goals.map((goal, index) => {
          const key = goal.id || goal.categoryId || String(index);
          return (
            <div
              key={key}
              data-goal={`goal-${index}`}
              className={`w-[80%] shrink-0 snap-center transition-all duration-300 ${
                index === active ? 'scale-100 opacity-100 z-10' : 'scale-[0.95] opacity-55'
              }`}
            >
              <GoalCard
                name={goal.name}
                emoji={goal.emoji}
                target={goal.target}
                spent={goal.spent}
                priority={goal.priority}
                recurrence={goal.recurrence}
                currency={currency}
                locale={locale}
                active={index === active}
                onOpen={() => onOpen(key)}
              />
            </div>
          );
        })}

        {/* Right spacer so the last card also centers in the viewport */}
        <div aria-hidden="true" className="w-[10%] shrink-0" />
      </div>

      {/* Pagination dots */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5">
        {goals.map((goal, index) => {
          const key = goal.id || goal.categoryId || String(index);
          return (
            <button
              key={key}
              type="button"
              aria-label={`Go to goal ${index + 1}: ${goal.name}`}
              aria-current={index === active}
              onClick={() => scrollTo(index)}
              className={`rounded-full transition-all duration-300 ${
                index === active ? 'h-1.5 w-6 bg-accent' : 'h-1.5 w-1.5 bg-line'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
