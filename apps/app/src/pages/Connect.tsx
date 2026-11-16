import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SheetClient, SheetError, type Connection } from '@em/core';
import { db } from '../lib/db';
import { loadConnection, useConnectionState } from '../lib/connection';
import { Icon } from '../components/Icon';

const EXEC_RE = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/;
// Dev-only: the local mock at /__mock, so the app can be exercised without Google.
const DEV_MOCK_RE = /^http:\/\/(?:localhost|127\.0\.0\.1):\d+\/__mock\/?$/;

export function Connect() {
  const navigate = useNavigate();
  const { connect } = useConnectionState();
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  async function handleConnect() {
    setError(null);
    setProblems([]);

    const cleanUrl = url.trim();
    const cleanToken = token.trim();

    if (!cleanUrl || !cleanToken) {
      setError('Both the Web App URL and the access token are required.');
      return;
    }
    if (!EXEC_RE.test(cleanUrl) && !(import.meta.env.DEV && DEV_MOCK_RE.test(cleanUrl))) {
      setError(
        'That is not a Web App URL. It must look like https://script.google.com/macros/s/XXXX/exec — open the sheet, run Expense Tracker → Show connection info to copy it.',
      );
      return;
    }

    setBusy(true);
    try {
      const client = new SheetClient({ url: cleanUrl, token: cleanToken });
      const ping = await client.ping();

      if (ping.problems.length > 0) {
        setProblems(ping.problems);
      }
      if (!ping.ok && ping.problems.length === 0) {
        setError('The sheet responded but is not usable. Run Setup from the sheet menu, then try again.');
        return;
      }

      const previous = loadConnection();
      if (previous && previous.url !== cleanUrl) {
        // A different sheet: the local cache belongs to the old one.
        await db.rows.clear();
        await db.meta.clear();
      }

      connect({ url: cleanUrl, token: cleanToken } satisfies Connection);
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof SheetError) {
        setError(
          err.kind === 'auth'
            ? 'The token was rejected. Open the sheet menu → Expense Tracker → Show connection info and copy the token again.'
            : err.message,
        );
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white px-5 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 text-lg font-bold text-white">
          ₹
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Connect your sheet</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Your data stays in your own Google Drive.</p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Web App URL
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="url"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-[13px] outline-none ring-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Access token
          </span>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="32-character token from the sheet menu"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-mono text-[13px] outline-none ring-indigo-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>

        {error && (
          <div className="flex gap-2 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {problems.length > 0 && (
          <div className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <p className="mb-1 font-medium">The sheet needs attention:</p>
            <ul className="list-disc space-y-1 pl-4">
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={handleConnect}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition active:scale-[0.99] disabled:opacity-60"
        >
          {busy ? 'Checking…' : 'Connect'}
          {!busy && <Icon name="check" className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => navigate('/tour')}
          className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          I don't have these yet — show me how
        </button>
      </div>

      <p className="mt-auto pt-10 text-center text-[11px] leading-relaxed text-slate-400">
        No account, no server, no tracking. The app talks only to the Web App URL you paste here.
      </p>
    </div>
  );
}
