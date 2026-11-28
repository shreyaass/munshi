import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { useConnectionState } from '../lib/connection';
import { useSync } from '../lib/SyncProvider';
import { setLocalMeta, useDirtyCount, useMetaValue, useSyncMeta, useTabRows } from '../lib/repo';
import { sound } from '../lib/sound';
import { useAppUpdate } from '../lib/updater';

type NavItem = { to: string; label: string; icon: IconName };

const LEFT: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bar_chart' },
  { to: '/history',   label: 'History',   icon: 'history'   },
];

const RIGHT: NavItem[] = [
  { to: '/goals',    label: 'Goals',    icon: 'savings'                },
  { to: '/accounts', label: 'Accounts', icon: 'account_balance_wallet' },
];

const TITLES: Record<string, string> = {
  '/':          'Add entry',
  '/history':   'History',
  '/dashboard': 'Munshi',
  '/goals':     'Goals',
  '/accounts':  'Accounts',
  '/settings':  'Settings',
};

function SyncBadge({ compact = false }: { compact?: boolean }) {
  const { status, pending } = useSync();
  const isSyncing = status === 'syncing';
  const isError = status === 'error';
  const isOffline = status === 'offline';
  const isNotSynced = isError || isOffline;

  const label =
    isSyncing
      ? 'SYNCING'
      : isError
        ? 'SYNC FAILED'
        : isOffline
          ? 'OFFLINE'
          : pending > 0
            ? `${pending} PENDING`
            : 'SYNCED';

  return (
    <div className="flex items-center gap-2">
      {/* Indicator */}
      {isSyncing ? (
        <span className="relative flex h-3 w-3 items-center justify-center animate-spin">
          <span className="absolute top-0 h-1.5 w-1.5 rounded-full bg-[#E5A93C] shadow-[0_0_8px_#E5A93C]" />
          <span className="absolute bottom-0 h-1.5 w-1.5 rounded-full bg-[#E5A93C] shadow-[0_0_8px_#E5A93C]" />
        </span>
      ) : isNotSynced ? (
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-[#EF4444] shadow-[0_0_8px_2px_rgba(239,68,68,0.7)] animate-pulse" />
        </span>
      ) : (
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className="h-2 w-2 rounded-full bg-[#22C55E] shadow-[0_0_8px_2px_rgba(34,197,94,0.7)]" />
        </span>
      )}

      {/* Text (hidden in compact mode) */}
      {!compact && (
        <span
          className={`font-mono text-[11px] tracking-[0.08em] ${
            isSyncing
              ? 'text-accent animate-pulse font-medium'
              : isNotSynced
                ? 'text-expense font-medium'
                : 'text-muted'
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function NavButton({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      onClick={() => sound.play('click')}
      className="flex flex-1 flex-col items-center gap-[3px] py-2 outline-none group select-none"
    >
      {({ isActive }) => (
        <>
          <motion.div
            className="flex items-center justify-center"
            whileTap={{ scale: 0.78 }}
            animate={isActive ? { scale: [0.92, 1.15, 1], y: [0, -3, 0] } : { scale: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 450,
              damping: 22,
            }}
          >
            <Icon
              name={item.icon}
              size={24}
              filled={isActive}
              className={`transition-colors duration-200 ${isActive ? 'text-accent' : 'text-muted group-hover:text-text'}`}
            />
          </motion.div>
          <motion.span
            animate={isActive ? { scale: [0.95, 1.05, 1] } : { scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`text-[10px] font-medium leading-none tracking-[0.01em] transition-colors duration-200 ${
              isActive ? 'text-accent' : 'text-muted group-hover:text-text'
            }`}
          >
            {item.label}
          </motion.span>
        </>
      )}
    </NavLink>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  title,
  hasBadge = false,
}: {
  to: string;
  icon: IconName;
  label: string;
  title: string;
  hasBadge?: boolean;
}) {
  return (
    <NavLink
      to={to}
      title={title}
      className={({ isActive }) =>
        `relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 transition text-sm font-medium ${
          isActive
            ? 'bg-raised text-accent shadow-sm border border-line/40'
            : 'text-muted hover:text-text hover:bg-raised/50'
        } justify-center lg:justify-start`
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative flex items-center justify-center">
            <Icon name={icon} size={22} filled={isActive} className={isActive ? 'text-accent' : 'text-muted'} />
            {hasBadge && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent animate-pulse" />
            )}
          </div>
          <span className="hidden lg:inline">{label}</span>
          {hasBadge && (
            <span className="hidden lg:inline-flex ml-auto text-[10px] font-mono uppercase tracking-wider bg-accent/20 text-accent font-bold px-1.5 py-0.5 rounded-full">
              New
            </span>
          )}
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
  const { hasUpdate } = useAppUpdate();

  const ready = accounts !== undefined && lastSync !== null;
  const noAccounts = (accounts?.length ?? 0) === 0;

  useEffect(() => {
    if (ready && onboarded !== '1' && !noAccounts) void setLocalMeta('onboarded', '1');
  }, [ready, onboarded, noAccounts]);

  if (!conn) return <Navigate to="/landing" replace />;
  if (ready && onboarded !== '1' && noAccounts) return <Navigate to="/welcome" replace />;

  // Prevent flashing the main app / Add screen before the initial sheet sync decides
  // whether this user should land in #/welcome onboarding or straight in the app.
  if (!ready && onboarded !== '1') {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-bg px-6 text-text">
        <Logo className="h-12 w-12 animate-pulse" />
        <div className="text-center space-y-1">
          <p className="font-display text-lg font-medium text-text">Opening Munshi…</p>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
            Syncing your Google Sheet
          </p>
        </div>
      </div>
    );
  }

  const onAdd = location.pathname === '/';
  const editing = onAdd && new URLSearchParams(location.search).has('edit');
  const title = editing ? 'Edit entry' : (TITLES[location.pathname] ?? 'Munshi');

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-bg text-text">
      {/* Tablet & Desktop Sidebar (md+) */}
      <aside className="hidden md:flex md:w-16 lg:w-60 shrink-0 flex-col justify-between border-r border-line bg-surface/30 select-none">
        {/* Top: Logo & Navigation */}
        <div className="flex flex-col items-center lg:items-stretch py-6 px-2 lg:px-4">
          {/* Logo */}
          <div className="mb-8 px-2 flex items-center justify-center lg:justify-start gap-2.5">
            <Logo className="h-8 w-8 shrink-0" />
            <span className="hidden lg:inline font-display text-2xl font-medium text-text tracking-tight">Munshi</span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 w-full">
            <SidebarLink to="/dashboard" icon="bar_chart" label="Dashboard" title="Dashboard" />
            <SidebarLink to="/history" icon="history" label="History" title="History" />
            <SidebarLink to="/accounts" icon="account_balance_wallet" label="Accounts" title="Accounts" />
            <SidebarLink to="/goals" icon="savings" label="Goals" title="Goals" />
            <SidebarLink to="/settings" icon="settings" label="Settings" title="Settings" hasBadge={hasUpdate} />
          </nav>
        </div>

        {/* Bottom: Sync status */}
        <div className="p-4 flex items-center justify-center lg:justify-start border-t border-line/40">
          <div className="lg:hidden">
            <SyncBadge compact />
          </div>
          <div className="hidden lg:block">
            <SyncBadge />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (< md) with safe-area top and side insets */}
        <header className="md:hidden flex shrink-0 items-center justify-between px-4 pb-1 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pl-[max(1rem,calc(env(safe-area-inset-left,0px)+1rem))] pr-[max(1rem,calc(env(safe-area-inset-right,0px)+1rem))]">
          <div className="flex items-center gap-2.5">
            {location.pathname === '/dashboard' && (
              <Logo className="h-7 w-7 shrink-0" />
            )}
            <h1 className="font-display text-[26px] leading-none text-text">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {location.pathname === '/goals' ? (
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-new-goal'))}
                className="flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-on-accent transition hover:brightness-105 active:scale-95 shadow-sm"
              >
                <Icon name="add" size={15} />
                <span>New</span>
              </button>
            ) : (
              <SyncBadge />
            )}
            {location.pathname === '/dashboard' && (
              <NavLink
                to="/settings"
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-text transition active:scale-95"
                aria-label="Settings"
              >
                <Icon name="settings" size={20} />
                {hasUpdate && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent animate-pulse" />
                )}
              </NavLink>
            )}
          </div>
        </header>

        {/* Scrollable page body */}
        <main className="min-h-0 flex-1 overflow-y-auto px-4 md:px-8 py-3 md:py-6 pb-[calc(env(safe-area-inset-bottom)+108px)] md:pb-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation (< md) */}
        <nav
          className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md px-3"
          aria-label="Primary"
        >
          <div className="pointer-events-auto relative flex items-center justify-between border-t border-line bg-bg/95 backdrop-blur-md px-3 pb-[calc(env(safe-area-inset-bottom)+4px)]">
            {LEFT.map((item) => (
              <NavButton key={item.to} item={item} />
            ))}

            {/* FAB spacer */}
            <div className="w-16 shrink-0" aria-hidden="true" />

            {RIGHT.map((item) => (
              <NavButton key={item.to} item={item} />
            ))}

            {/* Floating action button — centred, raised above nav */}
            <motion.button
              type="button"
              onClick={() => {
                sound.play('click');
                window.location.assign('#/');
              }}
              aria-label="Add entry"
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0 rounded-full"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
            >
              <motion.span
                className="relative flex h-[52px] w-[52px] items-center justify-center rounded-full bg-accent text-on-accent shadow-lg"
                animate={{ rotate: onAdd ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 340, damping: 20 }}
              >
                <Icon name="add" size={24} />
                {dirty > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg bg-accent" />
                )}
              </motion.span>
            </motion.button>
          </div>
        </nav>
      </div>
    </div>
  );
}
