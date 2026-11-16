import { useCallback, useEffect, useState } from 'react';
import type { Connection } from '@em/core';
import { newId } from '@em/core';

const CONN_KEY = 'em.connection.v1';
const DEVICE_KEY = 'em.device_id.v1';

export interface StoredConnection extends Connection {
  connectedAt: string;
}

export function loadConnection(): StoredConnection | null {
  try {
    const raw = localStorage.getItem(CONN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConnection;
    if (!parsed.url || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConnection(conn: Connection): StoredConnection {
  const stored: StoredConnection = { ...conn, connectedAt: new Date().toISOString() };
  localStorage.setItem(CONN_KEY, JSON.stringify(stored));
  return stored;
}

export function clearConnection(): void {
  localStorage.removeItem(CONN_KEY);
}

/** Stable per-install id, used to attribute rows to a device. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = newId();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

const CONNECTION_EVENT = 'em:connection';

/** Reactive wrapper around the stored connection (same-tab updates included). */
export function useConnectionState() {
  const [conn, setConn] = useState<StoredConnection | null>(() => loadConnection());

  useEffect(() => {
    const refresh = () => setConn(loadConnection());
    window.addEventListener(CONNECTION_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(CONNECTION_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const connect = useCallback((next: Connection) => {
    const stored = saveConnection(next);
    window.dispatchEvent(new Event(CONNECTION_EVENT));
    setConn(stored);
    return stored;
  }, []);

  const disconnect = useCallback(() => {
    clearConnection();
    window.dispatchEvent(new Event(CONNECTION_EVENT));
    setConn(null);
  }, []);

  return { conn, connect, disconnect };
}
