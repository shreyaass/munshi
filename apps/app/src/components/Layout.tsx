import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { useConnectionState } from '../lib/connection';
import { useSync } from '../lib/SyncProvider';
import { useDirtyCount } from '../lib/repo';

const NAV = [
  { to: '/', label: 'Add', icon: 'add' as const },
  { to: '/history', label: 'History', icon: 'history' as const },
  { to: '/dashboard', label: 'Insights', icon: 'chart' as const },
  { to: '/settings', label: 'Settings', icon: 'settings' as const },
];

const TITLES: Record<string, string> = {
  '/': 'Add entry',
  '/history': 'History',
  '/dashboard': 'Insights',
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
        ? 'bg-amber-500 animate-pulse'
        : status === 'offline' || pending > 0
          ? 'bg-slate-400'
          : 'bg-emerald-500';

  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

export function Layout() {
  const { conn } = useConnectionState();
  const dirty = useDirtyCount();
  const location = useLocation();

  if (!conn) return <Navigate to="/connect" replace />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/85 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <h1 className="text-base font-semibold tracking-tight">{TITLES[location.pathname] ?? 'Expense Manager'}</h1>
        <SyncBadge />
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-stretch justify-around border-t border-slate-100 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 active:text-slate-600 dark:text-slate-500'
              }`
            }
          >
            <span className="relative">
              <Icon name={item.icon} className="h-[22px] w-[22px]" />
              {item.to === '/' && dirty > 0 && (
                <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
