import { SheetClient } from './client.js';
import { nowISO } from './date.js';
import { rowKey } from './id.js';
import { DATA_TABS, SCHEMA_VERSION, type DataTab } from './schema.js';
import type { LocalRow, Row, SyncResult } from './types.js';

/**
 * Storage the sync engine needs. Implemented by Dexie in the app and by an
 * in-memory stub in tests, so the engine itself stays platform-free.
 */
export interface SyncStore {
  getRow(tab: DataTab, id: string): Promise<LocalRow | undefined>;
  allRows(tab: DataTab): Promise<LocalRow[]>;
  dirtyRows(): Promise<LocalRow[]>;
  putRow(row: LocalRow): Promise<void>;
  putRows(rows: LocalRow[]): Promise<void>;
  markClean(keys: string[]): Promise<void>;
  getMeta(key: string): Promise<string | undefined>;
  setMeta(key: string, value: string): Promise<void>;
}

export function toLocalRow(tab: DataTab, row: Row, dirty: boolean): LocalRow {
  const id = String(row.id ?? '');
  return {
    key: rowKey(tab, id),
    tab,
    id,
    updated_at: String(row.updated_at ?? ''),
    deleted: row.deleted === true || row.deleted === 'TRUE' || row.deleted === 'true',
    dirty: dirty ? 1 : 0,
    data: row,
  };
}

function isRemoteDeleted(row: Row): boolean {
  const v = row.deleted;
  return v === true || v === 'TRUE' || v === 'true' || v === 1 || v === '1';
}

/**
 * Push local changes, then pull anything newer. Last-write-wins per row on
 * `updated_at`; when a local edit loses, it is counted as a conflict rather
 * than silently dropped.
 */
export async function syncOnce(
  store: SyncStore,
  client: SheetClient,
  deviceId: string,
): Promise<SyncResult> {
  const at = nowISO();
  const result: SyncResult = { ok: true, pushed: 0, pulled: 0, conflicts: 0, at };

  try {
    // ---- push ----
    const dirty = await store.dirtyRows();
    const upserts = dirty.filter((r) => !r.deleted);
    const deletes = dirty.filter((r) => r.deleted);

    if (upserts.length > 0 || deletes.length > 0) {
      const res = await client.batch({
        upserts: upserts.map((r) => ({ tab: r.tab, row: r.data })),
        deletes: deletes.map((r) => ({ tab: r.tab, id: r.id })),
      });

      const rejected = new Set(res.rejected?.map((r) => rowKey(r.tab, r.id)) ?? []);
      const acceptedKeys = dirty.filter((r) => !rejected.has(r.key)).map((r) => r.key);
      await store.markClean(acceptedKeys);
      result.pushed = acceptedKeys.length;
    }

    // ---- pull ----
    const remote = await client.readAll();
    if (typeof remote.version === 'number' && remote.version !== SCHEMA_VERSION) {
      return {
        ...result,
        ok: false,
        error: `Sheet schema is v${remote.version}, this app expects v${SCHEMA_VERSION}.`,
      };
    }

    const writes: LocalRow[] = [];

    for (const tab of DATA_TABS) {
      const rows = remote.data[tab];
      if (!rows || rows.length === 0) continue;

      for (const row of rows) {
        const id = String(row.id ?? '');
        if (!id) continue;

        const local = await store.getRow(tab, id);
        const remoteUpdated = String(row.updated_at ?? '');

        // Never resurrect something the user has locally edited more recently.
        if (local && remoteUpdated <= local.updated_at) continue;

        if (local && local.dirty === 1 && remoteUpdated > local.updated_at) {
          result.conflicts++;
        }

        writes.push(toLocalRow(tab, row, false));
        result.pulled++;
      }
    }

    if (writes.length > 0) await store.putRows(writes);

    // Tombstones for rows that only exist remotely should disappear locally too.
    await store.setMeta('last_sync', at);
    await store.setMeta('device_id', deviceId);

    return result;
  } catch (err) {
    return {
      ...result,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** A local write is visible immediately; this only records the intent to sync. */
export function markDirty(tab: DataTab, row: Row): LocalRow {
  return toLocalRow(tab, row, true);
}

export function isRemoteDeletedRow(row: LocalRow): boolean {
  return row.deleted;
}

export { isRemoteDeleted };
