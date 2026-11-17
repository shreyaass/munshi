import { ACCOUNT_TYPES, type AccountType } from '@em/core';

export const TYPE_META: Record<string, { label: string; emoji: string }> = {
  cash: { label: 'Cash', emoji: '💵' },
  bank: { label: 'Bank', emoji: '🏦' },
  upi: { label: 'UPI', emoji: '📱' },
  credit: { label: 'Credit card', emoji: '💳' },
  wallet: { label: 'Wallet', emoji: '👛' },
};

export interface AccountDraft {
  id?: string;
  name: string;
  type: AccountType;
  /** Rupees, as typed. Converted with parseToPaise on save. */
  opening: string;
}

export const EMPTY_ACCOUNT: AccountDraft = { name: '', type: 'bank', opening: '' };

/** Tapping one of these fills the name; the name stays editable. */
const BANKS = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'Cash', 'UPI'];

interface AccountFormProps {
  draft: AccountDraft;
  onChange: (next: AccountDraft) => void;
  autoFocus?: boolean;
  /** Copy shown under the balance field. */
  hint?: string;
}

/**
 * Shared account fields for onboarding, the Accounts page, the Add screen and
 * the transfer sheet. No account numbers: the name is the identifier, so
 * "HDFC Salary" and "HDFC Savings" can coexist.
 */
export function AccountForm({ draft, onChange, autoFocus, hint }: AccountFormProps) {
  return (
    <div className="space-y-3 pt-1">
      <div>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Account name, e.g. HDFC Salary"
          autoFocus={autoFocus}
          autoCapitalize="words"
          className="w-full rounded-xl bg-surface-muted px-3.5 py-3 text-sm outline-none ring-brand focus:ring-2"
        />
        <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1">
          {BANKS.map((bank) => {
            const active = draft.name === bank;
            return (
              <button
                key={bank}
                type="button"
                onClick={() => onChange({ ...draft, name: bank, type: bank === 'Cash' ? 'cash' : bank === 'UPI' ? 'upi' : draft.type })}
                className={`h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-medium transition ${
                  active ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted'
                }`}
              >
                {bank}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ACCOUNT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange({ ...draft, type: t })}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              draft.type === t ? 'bg-brand text-brand-ink' : 'bg-surface-muted text-muted'
            }`}
          >
            {TYPE_META[t]?.emoji} {TYPE_META[t]?.label ?? t}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
          Current balance
        </span>
        <div className="flex items-center rounded-xl bg-surface-muted px-3.5 focus-within:ring-2 focus-within:ring-brand">
          <span className="money text-sm text-muted">₹</span>
          <input
            value={draft.opening}
            onChange={(e) => onChange({ ...draft, opening: e.target.value })}
            inputMode="decimal"
            placeholder="0"
            aria-label="Current balance in rupees"
            className="money min-w-0 flex-1 bg-transparent py-3 pl-1.5 text-sm outline-none"
          />
        </div>
      </label>

      <p className="px-0.5 text-[11px] leading-relaxed text-muted">
        {hint ?? 'Balance = opening balance + income − expenses + transfers in − transfers out.'}
      </p>
    </div>
  );
}
