import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

/**
 * Dev-only fake Apps Script endpoint at POST /__mock.
 *
 * Lets the whole app (connect, sync, dashboard) be developed and tested without
 * deploying anything to Google. It mirrors the real contract in apps/script:
 * { token, action: 'ping' | 'readAll' | 'batch', payload }.
 *
 * Never included in a production build — `apply: 'serve'`.
 */

const TOKEN = 'dev-token';
const SCHEMA_VERSION = 1;

type Row = Record<string, unknown>;
type Tab = string;

const HEADERS: Record<Tab, string[]> = {
  Expenses: ['id', 'date', 'amount_paise', 'category_id', 'account_id', 'payee', 'notes', 'tags', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Income: ['id', 'date', 'amount_paise', 'category_id', 'account_id', 'payee', 'notes', 'tags', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Transfers: ['id', 'date', 'amount_paise', 'from_account_id', 'to_account_id', 'notes', 'created_at', 'updated_at', 'device_id', 'deleted'],
  Accounts: ['id', 'name', 'type', 'opening_balance_paise', 'active', 'updated_at', 'device_id', 'deleted'],
  Categories: ['id', 'name', 'type', 'parent_id', 'icon', 'color', 'monthly_budget_paise', 'active', 'updated_at', 'device_id', 'deleted'],
  Budgets: ['id', 'month', 'category_id', 'amount_paise', 'updated_at', 'device_id', 'deleted'],
  Recurring: ['id', 'amount_paise', 'type', 'category_id', 'account_id', 'payee', 'rule', 'next_date', 'active', 'updated_at', 'device_id', 'deleted'],
};

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

function base(id: string, extra: Row): Row {
  return { id, updated_at: now(), device_id: 'mock', deleted: false, ...extra };
}

const rows: Record<Tab, Row[]> = {
  Categories: [
    base('cat-exp-1', { name: 'Food', type: 'expense', parent_id: '', icon: '🍜', color: '#f97316', monthly_budget_paise: 800000, active: true }),
    base('cat-exp-2', { name: 'Groceries', type: 'expense', parent_id: '', icon: '🛒', color: '#22c55e', monthly_budget_paise: 600000, active: true }),
    base('cat-exp-3', { name: 'Transport', type: 'expense', parent_id: '', icon: '🚌', color: '#3b82f6', monthly_budget_paise: 300000, active: true }),
    base('cat-exp-4', { name: 'Bills', type: 'expense', parent_id: '', icon: '⚡', color: '#eab308', monthly_budget_paise: 400000, active: true }),
    base('cat-exp-5', { name: 'Shopping', type: 'expense', parent_id: '', icon: '🛍️', color: '#ec4899', monthly_budget_paise: 0, active: true }),
    base('cat-exp-6', { name: 'Health', type: 'expense', parent_id: '', icon: '💊', color: '#ef4444', monthly_budget_paise: 0, active: true }),
    base('cat-inc-1', { name: 'Salary', type: 'income', parent_id: '', icon: '💰', color: '#16a34a', monthly_budget_paise: 0, active: true }),
    base('cat-inc-2', { name: 'Refund', type: 'income', parent_id: '', icon: '↩️', color: '#0d9488', monthly_budget_paise: 0, active: true }),
  ],
  Accounts: [
    base('acc-cash', { name: 'Cash', type: 'cash', opening_balance_paise: 500000, active: true }),
    base('acc-bank', { name: 'Bank', type: 'bank', opening_balance_paise: 4200000, active: true }),
    base('acc-upi', { name: 'UPI', type: 'upi', opening_balance_paise: 300000, active: true }),
  ],
  Expenses: [],
  Income: [],
  Transfers: [],
  Budgets: [],
  Recurring: [],
};

function seedTransactions() {
  if (rows.Expenses.length > 0) return;
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  const tx = (id: string, date: string, amount: number, categoryId: string, accountId: string, payee: string) =>
    base(id, {
      date,
      amount_paise: amount,
      category_id: categoryId,
      account_id: accountId,
      payee,
      notes: '',
      tags: '',
      created_at: now(),
    });

  rows.Expenses.push(
    tx('tx-1', day(0), 25000, 'cat-exp-1', 'acc-upi', 'Chai Point'),
    tx('tx-2', day(0), 120000, 'cat-exp-2', 'acc-bank', 'BigBasket'),
    tx('tx-3', day(1), 4500, 'cat-exp-3', 'acc-cash', 'Auto'),
    tx('tx-4', day(2), 250000, 'cat-exp-4', 'acc-bank', 'Electricity'),
    tx('tx-5', day(3), 89900, 'cat-exp-5', 'acc-bank', 'Amazon'),
    tx('tx-6', day(4), 60000, 'cat-exp-1', 'acc-upi', 'Swiggy'),
    tx('tx-7', day(5), 15000, 'cat-exp-1', 'acc-cash', 'Office canteen'),
    tx('tx-8', day(7), 1200000, 'cat-exp-4', 'acc-bank', 'Rent'),
    tx('tx-9', day(9), 32000, 'cat-exp-6', 'acc-upi', 'Pharmacy'),
    tx('tx-10', day(11), 189000, 'cat-exp-2', 'acc-bank', 'DMart'),
  );
  rows.Income.push(
    base('tx-in-1', {
      date: day(8),
      amount_paise: 8500000,
      category_id: 'cat-inc-1',
      account_id: 'acc-bank',
      payee: 'Employer',
      notes: '',
      tags: '',
      created_at: now(),
    }),
  );
}

seedTransactions();

function ok(res: ServerResponse, result: unknown) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: true, result }));
}

function fail(res: ServerResponse, error: string) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ok: false, error }));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5_000_000) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export function mockSheetPlugin(): Plugin {
  return {
    name: 'expense-manager-mock-sheet',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__mock', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('POST only');
          return;
        }

        let body: { token?: string; action?: string; payload?: Record<string, unknown> };
        try {
          body = JSON.parse(await readBody(req));
        } catch {
          fail(res, 'invalid JSON');
          return;
        }

        if (body.token !== TOKEN) {
          fail(res, 'unauthorized: bad token');
          return;
        }

        switch (body.action) {
          case 'ping':
            ok(res, { ok: true, version: SCHEMA_VERSION, currency: 'INR', locale: 'en-IN', problems: [] });
            return;

          case 'readAll':
            ok(res, { ok: true, version: SCHEMA_VERSION, data: rows, serverTime: now() });
            return;

          case 'batch': {
            const payload = (body.payload ?? {}) as {
              upserts?: { tab: string; row: Row }[];
              deletes?: { tab: string; id: string }[];
            };

            let applied = 0;
            const rejected: { tab: string; id: string; reason: string }[] = [];

            for (const up of payload.upserts ?? []) {
              const list = rows[up.tab];
              if (!list || !HEADERS[up.tab]) {
                rejected.push({ tab: up.tab, id: String(up.row?.id), reason: 'unknown tab' });
                continue;
              }
              if (!up.row?.id) {
                rejected.push({ tab: up.tab, id: '-', reason: 'missing id' });
                continue;
              }
              const index = list.findIndex((r) => r.id === up.row.id);
              const next = { ...up.row, updated_at: up.row.updated_at || now() };
              if (index >= 0) list[index] = next;
              else list.push(next);
              applied++;
            }

            for (const del of payload.deletes ?? []) {
              const list = rows[del.tab];
              const index = list?.findIndex((r) => r.id === del.id) ?? -1;
              if (!list || index < 0) {
                rejected.push({ tab: del.tab, id: del.id, reason: 'not found' });
                continue;
              }
              list[index] = { ...list[index], deleted: true, updated_at: now() };
              applied++;
            }

            ok(res, { ok: rejected.length === 0, applied, rejected });
            return;
          }

          default:
            fail(res, `unknown action: ${body.action}`);
        }
      });
    },
  };
}

export const MOCK_TOKEN = TOKEN;
export const MOCK_URL_PATH = '/__mock';
export const MOCK_TODAY = today;
