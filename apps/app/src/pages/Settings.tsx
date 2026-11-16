import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConnectionState } from '../lib/connection';
import { exportCsv, useSyncMeta } from '../lib/repo';
import { useSync } from '../lib/SyncProvider';
import { useTheme, type ThemeMode } from '../lib/theme';
import { db } from '../lib/db';

const THEMES: { value: ThemeMode; label: string; emoji: string }[] = [
  { value: 'system', label: 'System', emoji: '🖥️' },
  { value: 'light', label: 'Light', emoji: '☀️' },
  { value: 'dark', label: 'Dark', emoji: '🌙' },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-3.5 py-2.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[62%] truncate text-right font-medium">{value}</span>
    </div>
  );
}

function ThemeControl() {
  const { mode, setMode } = useTheme();
  return (
    <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/60" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={mode === t.value}
          onClick={() => setMode(t.value)}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
            mode === t.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <span aria-hidden="true">{t.emoji}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Settings() {
  const { conn, disconnect } = useConnectionState();
  const { status, syncNow, pending } = useSync();
  const { lastSync, conflicts } = useSyncMeta();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const shortUrl = conn ? conn.url.replace(/^https:\/\/script\.google\.com\/macros\/s\//, '…/') : '—';

  async function handleSync() {
    setBusy(true);
    try {
      const result = await syncNow();
      setMessage(result.ok ? `Synced · pushed ${result.pushed}, pulled ${result.pulled}` : result.error ?? 'Sync failed');
    } finally {
      setBusy(false);
      window.setTimeout(() => setMessage(null), 3500);
    }
  }

  async function handleExport() {
    const csv = await exportCsv();
    if (!csv) {
      setMessage('Nothing to export yet');
      window.setTimeout(() => setMessage(null), 2500);
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect from this sheet? Your data stays in the sheet; the app just forgets the connection.')) return;
    await db.rows.clear();
    await db.meta.clear();
    disconnect();
    navigate('/connect', { replace: true });
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
        <h2 className="border-b border-slate-100 bg-slate-50 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Appearance
        </h2>
        <div className="px-3.5 py-3">
          <ThemeControl />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
        <h2 className="border-b border-slate-100 bg-slate-50 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Connection
        </h2>
        <Row label="Web App URL" value={shortUrl} />
        <Row label="Token" value={conn ? `${'•'.repeat(12)}${conn.token.slice(-4)}` : '—'} />
        <Row label="Connected" value={conn ? new Date(conn.connectedAt).toLocaleDateString() : '—'} />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
        <h2 className="border-b border-slate-100 bg-slate-50 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          Sync
        </h2>
        <Row
          label="Status"
          value={status === 'syncing' ? 'Syncing…' : status === 'error' ? 'Failed' : status === 'offline' ? 'Offline' : 'Idle'}
        />
        <Row label="Pending writes" value={String(pending)} />
        <Row label="Conflicts resolved" value={String(conflicts)} />
        <Row label="Last sync" value={lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'} />
      </section>

      {message && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {message}
        </p>
      )}

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          Export CSV
        </button>
        <Link
          to="/tour"
          className="block w-full rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
        >
          Replay setup guide
        </Link>
        <button
          type="button"
          onClick={handleDisconnect}
          className="w-full rounded-xl bg-rose-50 py-3 text-sm font-semibold text-rose-600 dark:bg-rose-950/40"
        >
          Disconnect
        </button>
      </div>

      <p className="pt-2 text-center text-[10px] leading-relaxed text-slate-400">
        Expense Manager v0.1 · schema v2
        <br />
        Your entries live in your Google Sheet. This app holds only a local cache.
      </p>
    </div>
  );
}
