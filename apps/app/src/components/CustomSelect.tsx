import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}

/**
 * Custom Theme-Adapted Dropdown matching Munshi Kaala Bahi design:
 * - Rich dark brass & copper theme styling.
 * - Replaces native OS <select> popups (no Windows blue highlight).
 * - Animated floating menu with brass checkmark and smooth hover transitions.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

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

  return (
    <div ref={containerRef} className={`relative w-full select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-raised px-3.5 py-2.5 text-left text-sm text-text transition hover:border-accent/50 focus:border-accent focus:outline-none ${
          isOpen ? 'border-accent ring-1 ring-accent/30' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="text-base leading-none">{selectedOption.icon}</span>}
              <span className="font-medium text-text">{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-xs text-muted truncate">{selectedOption.sublabel}</span>
              )}
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </span>

        <span
          className={`flex shrink-0 items-center text-accent transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-accent' : 'text-muted'
          }`}
        >
          <Icon name="expand_more" size={18} />
        </span>
      </button>

      {/* Floating Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-line/80 bg-surface/95 p-1 shadow-2xl backdrop-blur-md outline-none scrollbar-thin"
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`group flex items-center justify-between rounded-lg px-3 py-2 text-xs transition cursor-pointer ${
                    isSelected
                      ? 'bg-accent/20 font-semibold text-accent'
                      : 'text-text hover:bg-raised hover:text-accent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {opt.icon && <span className="text-sm leading-none shrink-0">{opt.icon}</span>}
                    <span className="truncate">{opt.label}</span>
                    {opt.sublabel && (
                      <span className="text-[11px] text-muted truncate font-normal">
                        {opt.sublabel}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Icon name="check" size={15} className="text-accent shrink-0" />
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
