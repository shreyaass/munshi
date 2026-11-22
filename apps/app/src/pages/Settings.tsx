import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConnectionState } from '../lib/connection';
import { exportCsv, useSyncMeta } from '../lib/repo';
import { useSync } from '../lib/SyncProvider';
import { useTheme, type ThemeMode } from '../lib/theme';
import { db } from '../lib/db';
import { Icon, type IconName } from '../components/Icon';

const THEMES: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: 'system', label: 'System', icon: 'computer' },
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline px-4 py-3 text-sm border-b border-line last:border-b-0">
      <span className="text-text">{label}</span>
      <span className="font-mono text-muted max-w-[62%] truncate text-right">{value}</span>
    </div>
  );
}

function ThemeControl() {
  const { mode, setMode } = useTheme();
  return (
    <div
      className="grid grid-cols-3 gap-1 rounded-[12px] bg-raised p-1"
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
          className={`flex items-center justify-center gap-2 rounded-[10px] py-2 text-xs font-semibold transition ${
            mode === t.value ? 'bg-accent text-on-accent' : 'text-muted'
          }`}
        >
          <Icon name={t.icon} size={16} />
          <span>{t.label}</span>
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
    <div className="space-y-6">
      {/* Desktop / Tablet Header (md+) */}
      <div className="hidden md:flex items-center justify-between pb-2 pt-1">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-medium text-text">Settings</h1>
          <p className="text-xs text-muted mt-1 uppercase tracking-[0.08em] font-medium">
            Appearance, planning and sync
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Left Column: Appearance, Connection, Data */}
        <div className="space-y-5">
          {/* Appearance */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">Appearance</p>
            <section className="bg-surface border border-line rounded-[16px] overflow-hidden p-3.5">
              <ThemeControl />
            </section>
          </div>

          {/* Connection */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">Connection</p>
            <section className="bg-surface border border-line rounded-[16px] overflow-hidden">
              <Row label="Web App URL" value={shortUrl} />
              <Row label="Token" value={conn ? `${'•'.repeat(12)}${conn.token.slice(-4)}` : '—'} />
              <Row label="Connected" value={conn ? new Date(conn.connectedAt).toLocaleDateString() : '—'} />
            </section>
          </div>

          {/* Data */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">Data</p>
            <section className="bg-surface border border-line rounded-[16px] overflow-hidden p-3.5 space-y-2">
              <button
                type="button"
                onClick={handleExport}
                className="w-full rounded-xl border border-line bg-raised py-2.5 text-xs font-semibold text-text hover:bg-line transition"
              >
                Export CSV
              </button>
              <Link
                to="/tour"
                className="block text-center w-full rounded-xl border border-line bg-raised py-2.5 text-xs font-semibold text-text hover:bg-line transition"
              >
                Replay setup guide
              </Link>
              <button
                type="button"
                onClick={handleDisconnect}
                className="w-full rounded-xl border border-expense/50 py-2.5 text-xs font-semibold text-expense hover:bg-expense/10 transition"
              >
                Disconnect
              </button>
            </section>
          </div>
        </div>

        {/* Right Column: Sync */}
        <div className="space-y-5">
          {/* Sync */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">Sync</p>
            <section className="bg-surface border border-line rounded-[16px] overflow-hidden">
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
              <div className="p-3.5">
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={busy}
                  className="bg-accent text-on-accent rounded-xl py-3 w-full font-semibold text-sm transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
                >
                  {busy ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
            </section>
          </div>

          {message && (
            <p className="rounded-xl bg-raised border border-line px-4 py-3 text-xs text-text">{message}</p>
          )}

          <p className="pt-2 text-center text-[10px] leading-relaxed text-muted">
            Munshi v0.1 · schema v2
            <br />
            Your entries live in your Google Sheet. This app holds only a local cache.
          </p>
        </div>
      </div>
    </div>
  );
}
