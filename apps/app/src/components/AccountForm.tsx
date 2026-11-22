import type { AccountType } from '@em/core';

export const TYPE_META: Record<string, { label: string; emoji: string }> = {
  bank: { label: 'Bank', emoji: '🏦' },
  cash: { label: 'Cash', emoji: '💵' },
  wallet: { label: 'Wallet', emoji: '👛' },
  credit: { label: 'Card', emoji: '💳' },
  upi: { label: 'UPI', emoji: '📱' },
};

export interface AccountDraft {
  id?: string;
  name: string;
  type: AccountType;
  opening: string;
  kind?: 'bank' | 'cash' | 'wallet' | 'card';
  isSavings?: boolean;
  last4?: string;
  bankName?: string;
}

export const EMPTY_ACCOUNT: AccountDraft = {
  name: '',
  type: 'bank',
  opening: '',
  kind: 'bank',
  isSavings: false,
  last4: '',
  bankName: '',
};

interface AccountFormProps {
  draft: AccountDraft;
  onChange: (next: AccountDraft) => void;
  autoFocus?: boolean;
  hint?: string;
}

export function AccountForm({ draft, onChange, autoFocus, hint }: AccountFormProps) {
  return (
    <div className="space-y-4 pt-1">
      {/* Nickname */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-1">
          Nickname
        </label>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="e.g. HDFC · Savings, Kotak Salary"
          autoFocus={autoFocus}
          autoCapitalize="words"
          className="w-full rounded-xl bg-raised border border-line px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
      </div>

      {/* Type */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-1.5">
          Type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(['bank', 'cash', 'wallet', 'credit'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ ...draft, type: t === 'credit' ? 'credit' : t })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                draft.type === t || (t === 'credit' && draft.type === 'credit')
                  ? 'border border-accent/60 bg-accent/15 text-accent'
                  : 'border border-line bg-raised text-muted hover:text-text'
              }`}
            >
              {TYPE_META[t]?.label ?? t}
            </button>
          ))}
        </div>
      </div>

      {/* Bank Name */}
      {(draft.type === 'bank' || draft.type === 'credit') && (
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-1">
            Bank Name
          </label>
          <input
            value={draft.bankName ?? ''}
            onChange={(e) => onChange({ ...draft, bankName: e.target.value })}
            placeholder="e.g. HDFC Bank, SBI, ICICI"
            className="w-full rounded-xl bg-raised border border-line px-3.5 py-2.5 text-sm outline-none focus:border-accent"
          />
        </div>
      )}

      {/* Opening Balance */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-1">
          Opening Balance
        </label>
        <div className="flex items-center rounded-xl bg-raised border border-line px-3.5 focus-within:border-accent">
          <span className="font-mono text-sm text-muted mr-1.5">₹</span>
          <input
            value={draft.opening}
            onChange={(e) => onChange({ ...draft, opening: e.target.value })}
            inputMode="decimal"
            placeholder="0"
            className="money min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none font-mono text-text"
          />
        </div>
      </div>

      {/* Last 4 Digits (Optional) */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted mb-1">
          Last 4 Digits · Optional
        </label>
        <div className="flex items-center rounded-xl bg-raised border border-line px-3.5 focus-within:border-accent">
          <span className="font-mono text-xs text-muted mr-2">••</span>
          <input
            value={draft.last4 ?? ''}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              onChange({ ...draft, last4: val });
            }}
            inputMode="numeric"
            maxLength={4}
            placeholder="7310"
            className="money min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none font-mono text-text"
          />
        </div>
        <p className="mt-1 text-[11px] text-muted">
          Never the full number. This only tells two accounts at the same bank apart.
        </p>
      </div>

      {/* This is a savings account toggle */}
      <div className="rounded-[16px] border border-accent/40 bg-accent/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-text">This is a savings account</p>
          <p className="text-[11px] text-muted mt-0.5">
            Money moved here counts as saved, not spent.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange({ ...draft, isSavings: !draft.isSavings })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
            draft.isSavings ? 'bg-accent' : 'bg-line'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
              draft.isSavings ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {hint && <p className="px-0.5 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
