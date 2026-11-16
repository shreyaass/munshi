import Dexie, { type Table } from 'dexie';
import type { LocalRow } from '@em/core';

export interface MetaRow {
  key: string;
  value: string;
}

/**
 * Local mirror of the sheet. This database is a *cache*, not the source of
 * truth — if it is wiped, the app rehydrates from the sheet on next launch.
 */
export class EmDB extends Dexie {
  rows!: Table<LocalRow, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super('expense-manager');
    this.version(1).stores({
      rows: 'key, tab, id, updated_at, dirty, deleted',
      meta: 'key',
    });
  }
}

export const db = new EmDB();
