import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from './Icon';
import { addCategory } from '../lib/repo';
import { useSync } from '../lib/SyncProvider';
import { sound } from '../lib/sound';

const EMOJI_SUGGESTIONS = [
  '🍜',
  '🛒',
  '🚌',
  '⚡',
  '🛍️',
  '💊',
  '🎬',
  '✈️',
  '🏠',
  '📚',
  '🎁',
  '☕',
  '💼',
  '💰',
  '🏦',
  '💡',
];

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  defaultType?: 'expense' | 'income';
  onCreated?: (id: string, type: 'expense' | 'income') => void;
}

export function AddCategoryModal({
  open,
  onClose,
  defaultType = 'expense',
  onCreated,
}: AddCategoryModalProps) {
  const { syncNow } = useSync();
  const [type, setType] = useState<'expense' | 'income'>(defaultType);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setType(defaultType);
      setName('');
      setEmoji('');
    }
  }, [open, defaultType]);

  const canSave = name.trim().length > 0 && !busy;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setBusy(true);
    try {
      sound.play('click');
      const id = await addCategory({
        name: name.trim(),
        emoji: emoji.trim() || (type === 'income' ? '💰' : '📦'),
        type,
      });
      void syncNow();
      onCreated?.(id, type);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="relative z-10 w-full max-w-[400px] rounded-[20px] border border-line bg-surface p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-medium text-text">New category</h2>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text transition"
                aria-label="Close"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Expense / Income toggle */}
              <div className="grid grid-cols-2 gap-1 rounded-[12px] bg-raised p-1">
                <button
                  type="button"
                  onClick={() => setType('expense')}
                  className={`rounded-[10px] py-1.5 text-xs font-semibold transition ${
                    type === 'expense' ? 'bg-accent text-on-accent shadow-sm' : 'text-muted'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType('income')}
                  className={`rounded-[10px] py-1.5 text-xs font-semibold transition ${
                    type === 'income' ? 'bg-income text-white shadow-sm' : 'text-muted'
                  }`}
                >
                  Income
                </button>
              </div>

              {/* Emoji + Name */}
              <div className="flex gap-2">
                <input
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder={type === 'income' ? '💰' : '📦'}
                  aria-label="Category emoji"
                  className="w-16 shrink-0 rounded-xl border border-line bg-raised px-2 py-3 text-center text-xl outline-none ring-accent focus:ring-2"
                />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === 'income' ? 'e.g. Bonus, Freelance, Dividend' : 'e.g. Dining, Groceries, Rent'}
                  autoFocus
                  className="min-w-0 flex-1 rounded-xl border border-line bg-raised px-3.5 py-3 text-sm text-text outline-none ring-accent focus:ring-2 placeholder:text-muted/60"
                />
              </div>

              {/* Emoji quick picks */}
              <div className="flex flex-wrap gap-1.5">
                {EMOJI_SUGGESTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                      emoji === e ? 'bg-accent/15 ring-2 ring-accent' : 'bg-raised hover:bg-raised/80'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!canSave}
                className={`w-full rounded-[14px] py-3 text-sm font-semibold transition active:scale-[0.99] shadow-md ${
                  canSave
                    ? 'bg-accent text-on-accent hover:brightness-105 cursor-pointer'
                    : 'bg-raised text-muted cursor-not-allowed border border-line opacity-60'
                }`}
              >
                {busy ? 'Adding…' : 'Add category'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
