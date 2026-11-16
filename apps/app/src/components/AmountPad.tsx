const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const;

interface AmountPadProps {
  value: string;
  onChange: (next: string) => void;
}

function applyKey(current: string, key: string): string {
  if (key === '⌫') return current.slice(0, -1);

  if (key === '.') {
    if (current.includes('.')) return current;
    return current === '' ? '0.' : `${current}.`;
  }

  // Max two decimals.
  const [whole, frac] = current.split('.');
  if (frac !== undefined && frac.length >= 2) return current;

  // Avoid leading zeros like "007".
  if (whole === '0' && key !== '.') {
    return current.includes('.') ? current + key : key;
  }

  if (current.length >= 10) return current;
  return current + key;
}

/**
 * Fills whatever height it is given, so the Add screen never needs to scroll.
 * Rows share the space evenly instead of using a fixed button height.
 */
export function AmountPad({ value, onChange }: AmountPadProps) {
  return (
    <div className="grid h-full min-h-0 grid-cols-3 grid-rows-4 gap-1.5">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(applyKey(value, key))}
          className="flex h-full min-h-0 items-center justify-center rounded-xl bg-slate-100 text-xl font-semibold text-slate-800 transition active:scale-95 active:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:active:bg-slate-700"
          aria-label={key === '⌫' ? 'Backspace' : key}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
