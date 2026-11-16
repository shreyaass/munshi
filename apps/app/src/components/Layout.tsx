import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from './Icon';
import { useConnectionState } from '../lib/connection';
import { useSync } from '../lib/SyncProvider';
import { useDirtyCount } from '../lib/repo';

type NavItem = { to: string; label: string; icon: 'history' | 'chart' | 'wallet' | 'settings' };

const LEFT: NavItem[] = [
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/dashboard', label: 'Insights', icon: 'chart' },
];

const RIGHT: NavItem[] = [
  { to: '/accounts', label: 'Accounts', icon: 'wallet' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

const TITLES: Record<string, string> = {
  '/': 'Add entry',
  '/history': 'History',
  '/dashboard': 'Insights',
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
      ? 'bg-rose-500'
      : status === 'syncing'
        ? 'bg-amber-400 animate-pulse'
        : status === 'offline' || pending > 0
          ? 'bg-slate-400'
          : 'bg-emerald-500';

  return (
    <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function NavButton({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className="relative flex flex-1 items-center justify-center rounded-2xl px-2 py-2.5 outline-none"
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/25"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <motion.span
            className={`relative z-10 flex items-center gap-1.5 ${
              isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'
            }`}
            animate={{ scale: isActive ? 1 : 0.96 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          >
            <Icon name={item.icon} className="h-[21px] w-[21px]" />
            <motion.span
              className="text-[11px] font-semibold"
              initial={false}
              animate={{ width: isActive ? 'auto' : 0, opacity: isActive ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
            >
              {item.label}
            </motion.span>
          </motion.span>
        </>
      )}
    </NavLink>
  );
}

export function Layout() {
  const { conn } = useConnectionState();
  const dirty = useDirtyCount();
  const location = useLocation();

  if (!conn) return <Navigate to="/connect" replace />;

  const onAdd = location.pathname === '/';

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="flex shrink-0 items-center justify-between px-4 pb-1 pt-3">
        <h1 className="text-[17px] font-semibold tracking-tight">{TITLES[location.pathname] ?? 'Expense Manager'}</h1>
        <SyncBadge />
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+104px)]">
        <Outlet />
      </main>

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3 pb-[calc(env(safe-area-inset-bottom)+10px)]"
        aria-label="Primary"
      >
        <div className="pointer-events-auto relative flex items-center justify-between rounded-[26px] border border-slate-200/70 bg-white/85 px-1.5 py-1.5 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80">
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
              className={`flex h-[54px] w-[54px] items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-indigo-600 to-sky-500 text-white ring-4 transition-shadow ${
                onAdd
                  ? 'ring-white shadow-xl shadow-indigo-600/40 dark:ring-slate-950'
                  : 'ring-slate-50 shadow-lg shadow-indigo-600/25 dark:ring-slate-950'
              }`}
              animate={{ rotate: onAdd ? 45 : 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 20 }}
            >
              <Icon name="add" className="h-6 w-6" strokeWidth={2.5} />
              {dirty > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-400 dark:border-slate-950" />
              )}
            </motion.span>
          </motion.button>
        </div>
      </nav>
    </div>
  );
}
