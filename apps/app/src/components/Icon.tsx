import type { HTMLAttributes } from 'react';

/**
 * Material Symbols Outlined icon.
 * The font is loaded via Google Fonts in index.html.
 * Any valid Material Symbols ligature name is accepted.
 */
export type IconName =
  | 'add'
  | 'history'
  | 'bar_chart'
  | 'settings'
  | 'account_balance_wallet'
  | 'arrow_back'
  | 'arrow_forward'
  | 'arrow_forward_ios'
  | 'chevron_right'
  | 'close'
  | 'edit'
  | 'sync_alt'
  | 'cloud_sync'
  | 'info'
  | 'check'
  | 'warning'
  | 'expand_more'
  | 'expand_less'
  | 'search'
  | 'tune'
  | 'replay'
  | 'delete'
  | 'restaurant'
  | 'shopping_basket'
  | 'train'
  | 'receipt_long'
  | 'work'
  | 'account_balance'
  | 'payments'
  | 'swap_horiz'
  | 'dark_mode'
  | 'light_mode'
  | 'computer'
  | 'sync'
  | (string & {});

export interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  name: IconName;
  /** Size in px. Defaults to 24px or inferred from Tailwind className (e.g. h-4 -> 16px). */
  size?: number;
  /** If true, uses FILL=1 (filled variant). */
  filled?: boolean;
  /** Backwards compatibility with Lucide call sites */
  strokeWidth?: number;
}

export function Icon({ name, size, filled = false, strokeWidth: _sw, style, className = '', ...rest }: IconProps) {
  // If size is not explicitly passed, infer it from Tailwind h-* or w-* classes
  let computedSize = size;
  if (!computedSize && className) {
    const match = className.match(/\bh-(\d+(?:\.\d+)?|\[\d+px\])\b/);
    if (match) {
      const val = match[1];
      if (val.startsWith('[') && val.endsWith('px]')) {
        computedSize = parseInt(val.slice(1, -3), 10);
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) computedSize = Math.round(num * 4);
      }
    }
  }

  // Default to 24px per design guidelines
  if (!computedSize) computedSize = 24;

  const opsz = Math.min(48, Math.max(20, computedSize));

  return (
    <span
      className={`material-icon select-none ${className}`}
      style={{
        fontSize: `${computedSize}px`,
        width: `${computedSize}px`,
        height: `${computedSize}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 300, 'GRAD' 0, 'opsz' ${opsz}`,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  );
}
