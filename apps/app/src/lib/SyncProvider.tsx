import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { SheetClient, syncOnce, type SyncResult } from '@em/core';
import { db } from './db';
import { getDeviceId, loadConnection } from './connection';
import { store } from './repo';

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error' | 'offline';

interface SyncContextValue {
  status: SyncStatus;
  lastResult: SyncResult | null;
  lastSync: string | null;
  syncNow: () => Promise<SyncResult>;
  pending: number;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const SYNC_INTERVAL_MS = 60_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const running = useRef(false);

  const refreshPending = useCallback(async () => {
    const count = await db.rows.where('dirty').equals(1).count();
    setPending(count);
  }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (running.current) {
      return { ok: true, pushed: 0, pulled: 0, conflicts: 0, at: new Date().toISOString() };
    }

    const conn = loadConnection();
    if (!conn) {
      setStatus('idle');
      return {
        ok: false,
        pushed: 0,
        pulled: 0,
        conflicts: 0,
        at: new Date().toISOString(),
        error: 'Not connected',
      };
    }

    running.current = true;
    setStatus(navigator.onLine === false ? 'offline' : 'syncing');

    try {
      const client = new SheetClient(conn);
      const result = await syncOnce(store, client, getDeviceId());

      setLastResult(result);
      if (result.ok) {
        setStatus('ok');
        setLastSync(result.at);
      } else {
        setStatus('error');
      }

      if (result.conflicts > 0) {
        const prev = Number((await db.meta.get('sync_conflicts'))?.value ?? '0') || 0;
        await db.meta.put({ key: 'sync_conflicts', value: String(prev + result.conflicts) });
      }

      await refreshPending();
      return result;
    } finally {
      running.current = false;
    }
  }, [refreshPending]);

  // First sync on launch, then on focus and on a slow timer while open.
  useEffect(() => {
    void syncNow();

    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow();
    };
    const onOnline = () => void syncNow();

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncNow();
    }, SYNC_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.clearInterval(timer);
    };
  }, [syncNow]);

  const value = useMemo<SyncContextValue>(
    () => ({ status, lastResult, lastSync, syncNow, pending }),
    [status, lastResult, lastSync, syncNow, pending],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
