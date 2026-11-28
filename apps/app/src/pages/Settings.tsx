import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConnectionState } from '../lib/connection';
import { exportCsv, useSyncMeta } from '../lib/repo';
import { useSync } from '../lib/SyncProvider';
import { useTheme, type ThemeMode } from '../lib/theme';
import { useSound } from '../hooks/useSound';
import { sound } from '../lib/sound';
import { db } from '../lib/db';
import { Icon, type IconName } from '../components/Icon';
import { useAppUpdate } from '../lib/updater';

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

function SoundControl() {
  const { soundEnabled, setSoundEnabled, play } = useSound();
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <Icon
          name={soundEnabled ? 'volume_up' : 'volume_off'}
          size={18}
          className={soundEnabled ? 'text-accent' : 'text-muted'}
        />
        <div>
          <p className="text-sm font-medium text-text">Sound & Haptics</p>
          <p className="text-[11px] text-muted">Tactile audio and vibration feedback</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={soundEnabled}
        onClick={() => {
          const next = !soundEnabled;
          setSoundEnabled(next);
          if (next) play('click');
        }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          soundEnabled ? 'bg-accent' : 'bg-raised border border-line'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-surface transition-transform ${
            soundEnabled ? 'translate-x-6 bg-on-accent' : 'translate-x-1'
          }`}
        />
      </button>
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
  const {
    currentVersion,
    updateInfo,
    hasUpdate,
    checking,
    installing,
    error: updateError,
    statusMessage,
    checkForUpdates,
    triggerInstall,
  } = useAppUpdate();

  const shortUrl = conn ? conn.url.replace(/^https:\/\/script\.google\.com\/macros\/s\//, '…/') : '—';

  async function handleSync() {
    setBusy(true);
    try {
      const result = await syncNow();
      if (result.ok) {
        sound.play('sync');
      }
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
    navigate('/tour?step=5', { replace: true });
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

          {/* Audio & Haptics */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">Feedback</p>
            <section className="bg-surface border border-line rounded-[16px] overflow-hidden p-3.5">
              <SoundControl />
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

          {/* App Updates */}
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted font-semibold mb-2">Updates</p>
            <section className="bg-surface border border-line rounded-[16px] overflow-hidden p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text flex items-center gap-2">
                    <span>Munshi App</span>
                    {hasUpdate ? (
                      <span className="text-[10px] font-mono uppercase tracking-wider bg-accent/20 text-accent font-bold px-2 py-0.5 rounded-full">
                        Update available
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase tracking-wider bg-income/15 text-income font-bold px-2 py-0.5 rounded-full">
                        Up to date
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Installed: <span className="font-mono text-text">{currentVersion}</span>
                    {updateInfo?.tagName && (
                      <> · Latest: <span className="font-mono text-text">{updateInfo.tagName}</span></>
                    )}
                  </p>
                </div>
              </div>

              {hasUpdate && updateInfo && (
                <div className="rounded-xl bg-raised border border-line p-3 text-xs space-y-1">
                  <p className="font-semibold text-text">{updateInfo.name}</p>
                  {updateInfo.notes && (
                    <p className="text-muted leading-relaxed line-clamp-3 whitespace-pre-line text-[11px]">
                      {updateInfo.notes}
                    </p>
                  )}
                </div>
              )}

              {statusMessage && (
                <p className="text-xs text-muted flex items-center gap-1.5">
                  <Icon name="info" size={14} className="text-accent shrink-0" />
                  <span>{statusMessage}</span>
                </p>
              )}

              {updateError && (
                <p className="text-xs text-expense flex items-center gap-1.5">
                  <Icon name="warning" size={14} className="shrink-0" />
                  <span>{updateError}</span>
                </p>
              )}

              <div className="pt-1">
                {hasUpdate ? (
                  <button
                    type="button"
                    onClick={triggerInstall}
                    disabled={installing}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent text-on-accent py-2.5 text-xs font-semibold hover:brightness-105 active:scale-[0.99] transition disabled:opacity-60 shadow-sm"
                  >
                    <Icon name={installing ? 'cloud_sync' : 'arrow_forward'} size={15} />
                    <span>{installing ? 'Starting installation…' : 'Install update'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => checkForUpdates(true)}
                    disabled={checking}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-raised py-2.5 text-xs font-semibold text-text hover:bg-line active:scale-[0.99] transition disabled:opacity-60"
                  >
                    <Icon name={checking ? 'sync' : 'replay'} size={15} className={checking ? 'animate-spin' : ''} />
                    <span>{checking ? 'Checking for updates…' : 'Check for updates'}</span>
                  </button>
                )}
              </div>
            </section>
          </div>

          {message && (
            <p className="rounded-xl bg-raised border border-line px-4 py-3 text-xs text-text">{message}</p>
          )}

          <p className="pt-2 text-center text-[10px] leading-relaxed text-muted">
            Munshi {currentVersion} · schema v2
            <br />
            Your entries live in your Google Sheet. This app holds only a local cache.
          </p>
        </div>
      </div>
    </div>
  );
}
