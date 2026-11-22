import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatPaise } from '@em/core';
import { Icon } from './Icon';
import { resolveGoalIcon, FluidWaterLayer } from './GoalCard';

export interface GoalStackItem {
  id: string;
  name: string;
  emoji?: string;
  targetPaise: number;
  savedPaise: number;
  priority?: number;
  recurrence?: 'once' | 'monthly' | 'yearly';
  deadline?: string;
}

interface StackedGoalsWidgetProps {
  goals: GoalStackItem[];
  currency: string;
  locale: string;
  onSelectGoal: (id: string) => void;
  onAddNewGoal: () => void;
}

/**
 * Stacked Cards Widget (like iOS Smart Stack / Android Stack Widget):
 * - Cards sit physically layered one behind the other with realistic depth & scale.
 * - Gentle peek / nudge animation on screen load and after idle time.
 * - Gestures: Vertical swipe/drag up/down and mouse wheel to cycle endlessly.
 * - When only 1 card (or swiping past empty stack), triggers New Goal modal.
 * - Pagination indicators matching the mockup.
 */
export function StackedGoalsWidget({
  goals,
  currency,
  locale,
  onSelectGoal,
  onAddNewGoal,
}: StackedGoalsWidgetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [isDragging, setIsDragging] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const wheelLockRef = useRef(false);

  const total = goals.length;

  const nextCard = useCallback(() => {
    if (total <= 1) {
      onAddNewGoal();
      return;
    }
    setDirection('up');
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total, onAddNewGoal]);

  const prevCard = useCallback(() => {
    if (total <= 1) {
      onAddNewGoal();
      return;
    }
    setDirection('down');
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total, onAddNewGoal]);

  // Peek hint animation on screen mount & periodic idle prompt
  useEffect(() => {
    if (total <= 1) return;

    let idleTimer: number;

    const runHint = () => {
      setIsNudging(true);
      setTimeout(() => setIsNudging(false), 380);
    };

    // First hint after 800ms
    const initialTimer = window.setTimeout(runHint, 800);

    // Periodic hint every 12s if user is idle
    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(runHint, 12000);
    };

    resetIdle();
    window.addEventListener('touchstart', resetIdle, { passive: true });
    window.addEventListener('mousedown', resetIdle, { passive: true });

    return () => {
      window.clearTimeout(initialTimer);
      window.clearTimeout(idleTimer);
      window.removeEventListener('touchstart', resetIdle);
      window.removeEventListener('mousedown', resetIdle);
    };
  }, [total]);

  // Mouse wheel listener on widget container
  const handleWheel = (e: React.WheelEvent) => {
    if (total <= 1) return;
    if (wheelLockRef.current) return;
    if (Math.abs(e.deltaY) < 25) return;

    wheelLockRef.current = true;
    if (e.deltaY > 0) {
      nextCard();
    } else {
      prevCard();
    }
    setTimeout(() => {
      wheelLockRef.current = false;
    }, 450);
  };

  if (total === 0) {
    return (
      <button
        type="button"
        onClick={onAddNewGoal}
        className="relative flex h-[105px] w-full items-center justify-between overflow-hidden rounded-[20px] border border-dashed border-line bg-surface/50 p-5 text-left transition hover:border-accent active:scale-[0.99]"
      >
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-raised text-accent">
            <Icon name="add" size={22} />
          </div>
          <div>
            <p className="font-display text-base font-medium text-text">Create your first goal</p>
            <p className="text-xs text-muted mt-0.5">Trip, laptop, or emergency fund</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-accent">
          <span>Add</span>
          <Icon name="arrow_forward" size={14} />
        </span>
      </button>
    );
  }

  const activeGoal = goals[currentIndex % total];
  const secondGoal = total > 1 ? goals[(currentIndex + 1) % total] : null;
  const thirdGoal = total > 2 ? goals[(currentIndex + 2) % total] : null;

  const percent = activeGoal.targetPaise > 0
    ? Math.min(100, Math.round((activeGoal.savedPaise / activeGoal.targetPaise) * 100))
    : 0;
  const activeIcon = resolveGoalIcon(activeGoal.name, activeGoal.emoji);

  return (
    <div className="space-y-3">
      {/* 3D Stack Container */}
      <div
        onWheel={handleWheel}
        className="relative h-[126px] w-full select-none"
      >
        {/* Layer 3 (Deepest card peek) */}
        {thirdGoal && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-3 top-0 mx-auto rounded-[20px] border border-line/40 bg-surface/40 shadow-sm pointer-events-none transition-all duration-300"
            style={{
              transform: 'translateY(14px) scale(0.92)',
              zIndex: 5,
              opacity: 0.45,
            }}
          />
        )}

        {/* Layer 2 (Middle card peek) */}
        {secondGoal && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-3 top-0 mx-auto rounded-[20px] border border-line/60 bg-surface/75 shadow-sm pointer-events-none transition-all duration-300"
            style={{
              transform: 'translateY(7px) scale(0.96)',
              zIndex: 10,
              opacity: 0.75,
            }}
          />
        )}

        {/* Layer 1: Front Active Card with gestures and liquid waves */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={activeGoal.id}
            initial={{
              opacity: 0.8,
              y: direction === 'up' ? 24 : -24,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: isNudging ? -8 : 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: direction === 'up' ? -65 : 65,
              scale: 0.92,
              transition: { duration: 0.2, ease: 'easeIn' },
            }}
            transition={{
              type: 'spring',
              stiffness: 420,
              damping: 28,
            }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.4}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={(_, info) => {
              setIsDragging(false);
              const swipeThreshold = 35;
              if (info.offset.y < -swipeThreshold) {
                nextCard();
              } else if (info.offset.y > swipeThreshold) {
                prevCard();
              }
            }}
            onClick={() => {
              if (!isDragging) {
                onSelectGoal(activeGoal.id);
              }
            }}
            className="absolute inset-x-0 top-0 bottom-3 z-30 cursor-pointer overflow-hidden rounded-[20px] border border-accent/40 bg-surface p-4 shadow-md transition-shadow active:shadow-lg touch-pan-x"
          >
            {/* Animated Liquid Wave Background */}
            <FluidWaterLayer percent={percent} minHeight={30} />

            {/* Content row */}
            <div className="relative z-10 flex h-full items-center justify-between">
              {/* Left: Icon, Name & Saved */}
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-raised/90 text-accent shadow-sm border border-line/40">
                  {activeIcon.isMaterial ? (
                    <Icon name={activeIcon.icon as any} size={22} />
                  ) : (
                    <span className="text-2xl leading-none">{activeIcon.icon}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-medium text-text truncate leading-snug">
                    {activeGoal.name}
                  </h3>
                  <p className="text-xs text-muted font-medium mt-0.5 truncate">
                    {formatPaise(activeGoal.savedPaise, locale, currency, { decimals: false })}{' '}
                    {activeGoal.recurrence === 'monthly' ? 'this month' : 'saved'}
                  </p>
                </div>
              </div>

              {/* Right: Priority tag & Big bold percentage */}
              <div className="flex flex-col items-end shrink-0 pl-2">
                <span className="font-mono text-xs text-muted/70">
                  #{activeGoal.priority ?? 1}
                </span>
                <span className="font-sans text-2xl font-light text-text tabular leading-tight mt-0.5">
                  {percent}%
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer: Centered Pagination Pills (Matching mockup image 10) */}
      <div className="flex flex-col items-center justify-center gap-1 pt-1">
        <div className="flex items-center justify-center gap-2 py-0.5">
          {goals.map((g, idx) => {
            const isActive = idx === currentIndex % total;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setDirection(idx > currentIndex % total ? 'up' : 'down');
                  setCurrentIndex(idx);
                }}
                aria-label={`Show ${g.name}`}
                className={`transition-all duration-300 rounded-full ${
                  isActive
                    ? 'h-1.5 w-6 bg-accent shadow-[0_0_8px_rgba(200,164,92,0.5)]'
                    : 'h-1.5 w-1.5 bg-line hover:bg-muted/60'
                }`}
              />
            );
          })}
        </div>
        {total > 1 && (
          <span className="text-[10px] font-mono text-muted/50 tracking-wider">
            swipe up/down to browse
          </span>
        )}
      </div>
    </div>
  );
}