/**
 * Money helpers. Everything is integer paise internally.
 * Parsing accepts user input like "1,234.50", "₹ 250", "12.5".
 */

const MAX_PAISE = 1_000_000_000_00; // ₹1,00,00,000 — sanity ceiling

/** Parse a human string into paise. Returns null when unusable. */
export function parseToPaise(input: string): number | null {
  if (typeof input !== 'string') return null;
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (cleaned === '' || cleaned === '.') return null;

  const parts = cleaned.split('.');
  if (parts.length > 2) return null;

  const whole = parts[0] === '' ? '0' : parts[0];
  const fracRaw = parts[1] ?? '';
  const frac = (fracRaw + '00').slice(0, 2);

  const paise = Number(whole) * 100 + Number(frac);
  if (!Number.isFinite(paise) || paise <= 0) return null;
  if (paise > MAX_PAISE) return null;
  return Math.round(paise);
}

/** Digits typed on a keypad ("1234" -> ₹12.34) into paise. */
export function digitsToPaise(digits: string): number {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  return d === '' ? 0 : Number(d);
}

/** Paise back to a digit string for the keypad. */
export function paiseToDigits(paise: number): string {
  return paise > 0 ? String(Math.round(paise)) : '';
}

/** Format paise for display, e.g. "₹1,234.50". */
export function formatPaise(
  paise: number,
  locale = 'en-IN',
  currency = 'INR',
  opts: { compact?: boolean; decimals?: boolean } = {},
): string {
  const { compact = false, decimals = true } = opts;
  const value = (Number.isFinite(paise) ? paise : 0) / 100;

  if (compact && Math.abs(value) >= 100000) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(value);
    } catch {
      /* fall through */
    }
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: decimals ? 2 : 0,
      maximumFractionDigits: decimals ? 2 : 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(decimals ? 2 : 0)}`;
  }
}

/** "1,234" style without a currency symbol, for editable fields. */
export function formatAmountPlain(paise: number, decimals = true): string {
  const value = paise / 100;
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  });
}

export function sumPaise(values: readonly number[]): number {
  return values.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}
