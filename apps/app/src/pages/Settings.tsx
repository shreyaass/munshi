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
      <span className="text-muted">{label}</span>
      <span className="max-w-[62%] truncate text-right font-medium">{value}</span>
    </div>
  );
}

function ThemeControl() {
  const { mode, setMode } = useTheme();
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 "
      role="radiogroup"
      aria-label="Theme"
    >
      {THEMES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={mode === t.value}
          onClick={() => setMode(t.value)}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
            mode === t.value ? 'bg-surface text-ink shadow-sm ' : 'text-muted '
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
      setMessage(
        result.ok
          ? `Synced · pushed ${result.pushed}, pulled ${result.pulled}`
          : (result.error ?? 'Sync failed'),
      );
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
    if (
      !window.confirm(
        'Disconnect from this sheet? Your data stays in the sheet; the app just forgets the connection.',
      )
    )
      return;
    await db.rows.clear();
    await db.meta.clear();
    disconnect();
    navigate('/connect', { replace: true });
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-line ">
        <h2 className="border-b border-line bg-bg px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted ">
          Appearance
        </h2>
        <div className="px-3.5 py-3">
          <ThemeControl />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-line ">
        <h2 className="border-b border-line bg-bg px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted ">
          Connection
        </h2>
        <Row label="Web App URL" value={shortUrl} />
        <Row label="Token" value={conn ? `${'•'.repeat(12)}${conn.token.slice(-4)}` : '—'} />
        <Row label="Connected" value={conn ? new Date(conn.connectedAt).toLocaleDateString() : '—'} />
      </section>

      <section className="overflow-hidden rounded-xl border border-line ">
        <h2 className="border-b border-line bg-bg px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted ">
          Sync
        </h2>
        <Row
          label="Status"
          value={
            status === 'syncing'
              ? 'Syncing…'
              : status === 'error'
                ? 'Failed'
                : status === 'offline'
                  ? 'Offline'
                  : 'Idle'
          }
        />
        <Row label="Pending writes" value={String(pending)} />
        <Row label="Conflicts resolved" value={String(conflicts)} />
        <Row label="Last sync" value={lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'} />
      </section>

      {message && <p className="rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted ">{message}</p>}

      <div className="space-y-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={busy}
          className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-brand-ink disabled:opacity-60"
        >
          {busy ? 'Syncing…' : 'Sync now'}
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="w-full rounded-xl border border-line py-3 text-sm font-medium text-ink "
        >
          Export CSV
        </button>
        <Link
          to="/tour"
          className="block w-full rounded-xl border border-line py-3 text-center text-sm font-medium text-ink "
        >
          Replay setup guide
        </Link>
        <button
          type="button"
          onClick={handleDisconnect}
          className="w-full rounded-xl bg-danger-soft py-3 text-sm font-semibold text-danger "
        >
          Disconnect
        </button>
      </div>

      <p className="pt-2 text-center text-[10px] leading-relaxed text-muted">
        Munshi v0.1 · schema v2
        <br />
        Your entries live in your Google Sheet. This app holds only a local cache.
      </p>
    </div>
  );
}
