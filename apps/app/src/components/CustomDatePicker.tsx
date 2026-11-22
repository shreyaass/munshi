import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

interface CustomDatePickerProps {
  value: string; // ISO date 'YYYY-MM-DD'
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  id?: string;
  'aria-label'?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Formats YYYY-MM-DD to DD-MM-YYYY display */
function formatDisplayDate(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const parts = iso.slice(0, 10).split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

/**
 * Custom Theme-Adapted Date Picker matching Munshi Kaala Bahi dark brass styling:
 * - Replaces native browser/OS calendar popups with full dark mode theme.
 * - Month navigation, day grid, brass active selection, "Today" and "Clear" actions.
 */
export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className = '',
  disabled = false,
  min,
  max,
  id,
  'aria-label': ariaLabel,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year and month
  const initialDate = useMemo(() => {
    if (value && value.length >= 10) {
      const parts = value.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      if (!isNaN(y) && !isNaN(m)) return { year: y, month: m };
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);

  useEffect(() => {
    if (isOpen) {
      setViewYear(initialDate.year);
      setViewMonth(initialDate.month);
    }
  }, [isOpen, initialDate]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const todayIso = new Date().toISOString().slice(0, 10);

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelect(year: number, month: number, day: number) {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const iso = `${year}-${mm}-${dd}`;
    if (min && iso < min) return;
    if (max && iso > max) return;
    onChange(iso);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative w-full select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-raised px-3.5 py-2.5 text-left text-sm text-text transition hover:border-accent/50 focus:border-accent focus:outline-none ${
          isOpen ? 'border-accent ring-1 ring-accent/30' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="font-mono text-xs sm:text-sm text-text tabular">
          {value ? formatDisplayDate(value) : <span className="text-muted">{placeholder}</span>}
        </span>
        <span className="text-accent flex items-center">
          <Icon name="calendar_today" size={16} />
        </span>
      </button>

      {/* Custom Theme Calendar Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute left-0 right-0 sm:right-auto top-full z-50 mt-1.5 w-full sm:w-[280px] rounded-2xl border border-line/80 bg-surface/95 p-3.5 shadow-2xl backdrop-blur-md"
          >
            {/* Header: Month & Year with Navigation */}
            <div className="flex items-center justify-between pb-2 border-b border-line/40">
              <span className="font-display font-medium text-sm text-text">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text transition"
                >
                  <Icon name="chevron_left" size={18} />
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text transition"
                >
                  <Icon name="chevron_right" size={18} />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center font-mono text-[11px] text-muted font-medium">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-0.5">
                  {w}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center font-mono text-xs">
              {/* Previous Month Days */}
              {Array.from({ length: firstDayOfWeek }, (_, i) => {
                const day = daysInPrevMonth - firstDayOfWeek + 1 + i;
                const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
                const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
                return (
                  <button
                    key={`prev-${i}`}
                    type="button"
                    onClick={() => handleSelect(prevY, prevM, day)}
                    className="h-7 w-7 rounded-lg text-muted/40 hover:bg-raised hover:text-muted transition flex items-center justify-center mx-auto"
                  >
                    {day}
                  </button>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const mm = String(viewMonth + 1).padStart(2, '0');
                const dd = String(day).padStart(2, '0');
                const iso = `${viewYear}-${mm}-${dd}`;
                const isSelected = iso === value;
                const isToday = iso === todayIso;

                return (
                  <button
                    key={`curr-${day}`}
                    type="button"
                    onClick={() => handleSelect(viewYear, viewMonth, day)}
                    className={`h-7 w-7 rounded-lg transition flex items-center justify-center mx-auto ${
                      isSelected
                        ? 'bg-accent text-on-accent font-bold shadow-[0_0_8px_rgba(200,164,92,0.45)]'
                        : isToday
                          ? 'border border-accent/60 text-accent font-medium hover:bg-raised'
                          : 'text-text hover:bg-raised hover:text-accent'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-line/40 text-xs">
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="font-medium text-muted hover:text-expense transition"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(todayIso);
                  setIsOpen(false);
                }}
                className="font-semibold text-accent hover:brightness-110 transition"
              >
                Today
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
