import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { useConnectionState } from '../lib/connection';
import { useSync } from '../lib/SyncProvider';
import { setLocalMeta, useDirtyCount, useMetaValue, useSyncMeta, useTabRows } from '../lib/repo';

type NavItem = { to: string; label: string; icon: 'history' | 'chart' | 'wallet' | 'settings' };

const LEFT: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'chart' },
  { to: '/history', label: 'History', icon: 'history' },
];

const RIGHT: NavItem[] = [
  { to: '/accounts', label: 'Accounts', icon: 'wallet' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const TITLES: Record<string, string> = {
  '/': 'Add entry',
  '/history': 'History',
  '/dashboard': 'Dashboard',
  '/accounts': 'Accounts',
  '/settings': 'Settings',
};

function SyncBadge() {
  const { status, pending } = useSync();
  const label =
    status === 'syncing'
      ? 'Syncing'
      : status === 'error'
        ? 'Sync failed'
        : status === 'offline'
          ? 'Offline'
          : pending > 0
            ? `${pending} pending`
            : 'Synced';

  const tone =
    status === 'error'
      ? 'bg-danger'
      : status === 'syncing'
        ? 'bg-accent animate-pulse'
        : status === 'offline' || pending > 0
          ? 'bg-muted'
          : 'bg-success';

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function NavButton({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className="flex flex-1 flex-col items-center gap-[3px] rounded-2xl px-1 py-1 outline-none"
    >
      {({ isActive }) => (
        <>
          <span
            className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
              isActive ? 'bg-brand/12 text-brand' : 'text-muted'
            }`}
          >
            <Icon name={item.icon} className="h-[21px] w-[21px]" strokeWidth={isActive ? 2.2 : 1.8} />
          </span>
          <span
            className={`text-[10px] font-medium leading-none tracking-[0.01em] ${
              isActive ? 'text-brand' : 'text-muted'
            }`}
          >
            {item.label}
          </span>
        </>
      )}
    </NavLink>
  );
}

export function Layout() {
  const { conn } = useConnectionState();
  const dirty = useDirtyCount();
  const location = useLocation();
  const onboarded = useMetaValue('onboarded', '');
  const { lastSync } = useSyncMeta();
  const accounts = useTabRows('Accounts');

  // Wait for the first pull before deciding: a second device must not flash
  // onboarding before its cache fills. If the sheet already has accounts,
  // setup has happened on another device — remember that locally.
  const ready = accounts !== undefined && lastSync !== null;
  const noAccounts = (accounts?.length ?? 0) === 0;

  useEffect(() => {
    if (ready && onboarded !== '1' && !noAccounts) void setLocalMeta('onboarded', '1');
  }, [ready, onboarded, noAccounts]);

  if (!conn) return <Navigate to="/connect" replace />;
  if (ready && onboarded !== '1' && noAccounts) return <Navigate to="/welcome" replace />;

  const onAdd = location.pathname === '/';
  const editing = onAdd && new URLSearchParams(location.search).has('edit');

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-bg text-ink">
      <header className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3">
        <h1 className="text-[19px] font-semibold tracking-tight">
          {editing ? 'Edit entry' : (TITLES[location.pathname] ?? 'Munshi')}
        </h1>
        <SyncBadge />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <Outlet />
      </main>

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]"
        aria-label="Primary"
      >
        <div className="pointer-events-auto relative flex items-start justify-between rounded-[24px] border border-line bg-surface/90 px-1.5 pb-1.5 pt-2 shadow-[0_14px_40px_-18px_rgba(7,61,43,0.45)] backdrop-blur-xl">
          {LEFT.map((item) => (
            <NavButton key={item.to} item={item} />
          ))}

          <div className="w-16 shrink-0" aria-hidden="true" />

          {RIGHT.map((item) => (
            <NavButton key={item.to} item={item} />
          ))}

          <motion.button
            type="button"
            onClick={() => window.location.assign('#/')}
            aria-label="Add entry"
            className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full"
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          >
            <motion.span
              className={`relative flex h-[54px] w-[54px] items-center justify-center rounded-full bg-accent text-accent-ink ring-4 ring-bg transition-shadow ${
                onAdd ? 'shadow-xl shadow-brand/30' : 'shadow-lg shadow-brand/20'
              }`}
              animate={{ rotate: onAdd ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 20 }}
            >
              <Icon name="add" className="h-6 w-6" strokeWidth={2.4} />
              {dirty > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent" />
              )}
            </motion.span>
          </motion.button>
        </div>
      </nav>
    </div>
  );
}
