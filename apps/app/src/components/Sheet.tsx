import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional sticky footer rendered above the safe area. */
  footer?: ReactNode;
}

/**
 * Bottom sheet. Used for anything that must not steal vertical space from the
 * Add screen (details, new category, quick-list management).
 */
export function Sheet({ open, onClose, title, children, footer }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full max-w-md overflow-hidden rounded-t-3xl border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] "
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          >
            <div className="flex items-center justify-between px-4 pb-2 pt-4">
              <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted transition active:scale-95"
              >
                <Icon name="close" className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">{children}</div>
            {footer && <div className="border-t border-line px-4 py-3 ">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
