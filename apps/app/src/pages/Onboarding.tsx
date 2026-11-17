import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { parseToPaise } from '@em/core';
import { AccountForm, EMPTY_ACCOUNT, type AccountDraft } from '../components/AccountForm';
import { Icon } from '../components/Icon';
import { useConnectionState } from '../lib/connection';
import { addAccount, setLocalMeta, useTabRows } from '../lib/repo';
import { asString } from '../lib/analytics';
import { useSync } from '../lib/SyncProvider';

/**
 * First run, after Connect. The sheet is empty at this point (the template no
 * longer seeds accounts), so this is where the book-keeping starts: one main
 * account with its real current balance, plus Cash by default.
 */
export function Onboarding() {
  const { conn } = useConnectionState();
  const { syncNow } = useSync();
  const navigate = useNavigate();
  const accountRows = useTabRows('Accounts');

  const [draft, setDraft] = useState<AccountDraft>({ ...EMPTY_ACCOUNT });
  const [trackCash, setTrackCash] = useState(true);
  const [busy, setBusy] = useState(false);

  const hasCash = useMemo(
    () => (accountRows ?? []).some((a) => asString(a.type) === 'cash'),
    [accountRows],
  );

  if (!conn) return <Navigate to="/connect" replace />;

  const canStart = draft.name.trim().length > 0 && !busy;
  const cashWillBeAdded = trackCash && draft.type !== 'cash' && !hasCash;

  async function start() {
    if (!canStart) return;
    setBusy(true);
    try {
      await addAccount({
        name: draft.name,
        type: draft.type,
        openingBalancePaise: parseToPaise(draft.opening) ?? 0,
      });
      if (cashWillBeAdded) {
        await addAccount({ name: 'Cash', type: 'cash', openingBalancePaise: 0 });
      }
      await setLocalMeta('onboarded', '1');
      await syncNow();
      navigate('/', { replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg px-5 pb-6 pt-8 text-ink">
      <div className="mb-7 flex items-center gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
        <div>
          <p className="text-[15px] font-semibold tracking-tight">Munshi</p>
          <p className="text-[11px] text-muted">Your books, in your own sheet</p>
        </div>
      </div>

      <h1 className="text-[22px] font-semibold leading-tight tracking-tight">
        Which account should we start with?
      </h1>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
        Use the account you spend from most. You can add the rest later.
      </p>

      <div className="mt-4">
        <AccountForm
          draft={draft}
          onChange={setDraft}
          autoFocus
          hint="Enter what is actually in it today. No account numbers needed — just a name you will recognise."
        />
      </div>

      {draft.type !== 'cash' && !hasCash && (
        <button
          type="button"
          role="switch"
          aria-checked={trackCash}
          onClick={() => setTrackCash((v) => !v)}
          className="mt-4 flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-3 text-left"
        >
          <span>
            <span className="block text-[13px] font-medium">Also track cash</span>
            <span className="block text-[11px] text-muted">Adds a Cash account with a ₹0 balance.</span>
          </span>
          <span
            className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
              trackCash ? 'bg-brand' : 'bg-surface-muted'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-sm transition-all ${
                trackCash ? 'left-[18px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
      )}

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={start}
          disabled={!canStart}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-semibold text-brand-ink transition active:scale-[0.99] disabled:bg-surface-muted disabled:text-muted"
        >
          {busy ? 'Setting up…' : 'Start tracking'}
          {!busy && <Icon name="check" className="h-4 w-4" />}
        </button>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
          Everything from here lands in your Google Sheet — not on a server.
        </p>
      </div>
    </div>
  );
}
