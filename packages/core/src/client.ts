import type { DataTab, Row, TabName } from './types.js';

export interface Connection {
  url: string;
  token: string;
}

export interface PingResult {
  ok: boolean;
  version: number;
  currency: string;
  locale: string;
  problems: string[];
}

export interface ReadAllResult {
  ok: boolean;
  version: number;
  data: Partial<Record<DataTab, Row[]>>;
  serverTime: string;
}

export interface BatchPayload {
  upserts: { tab: DataTab; row: Row }[];
  deletes: { tab: DataTab; id: string }[];
}

export interface BatchResult {
  ok: boolean;
  applied: number;
  rejected: { tab: string; id: string; reason: string }[];
}

interface Envelope<T> {
  ok: boolean;
  error?: string;
  result?: T;
}

export class SheetError extends Error {
  constructor(
    message: string,
    readonly kind: 'network' | 'auth' | 'schema' | 'server' | 'timeout',
  ) {
    super(message);
    this.name = 'SheetError';
  }
}

const DEFAULT_TIMEOUT_MS = 25_000;

/**
 * Thin transport to the user's Apps Script Web App.
 *
 * POST + `Content-Type: text/plain` on purpose: that is a "simple request" for
 * CORS, so the browser sends no preflight — Apps Script cannot answer an
 * OPTIONS request. The body is still JSON.
 */
export class SheetClient {
  constructor(
    private readonly conn: Connection,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  async ping(): Promise<PingResult> {
    return this.call<PingResult>('ping', {});
  }

  async readAll(tabs?: TabName[]): Promise<ReadAllResult> {
    return this.call<ReadAllResult>('readAll', tabs ? { tabs } : {});
  }

  async batch(payload: BatchPayload): Promise<BatchResult> {
    return this.call<BatchResult>('batch', payload);
  }

  private async call<T>(action: string, payload: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let res: Response;
    try {
      res = await fetch(this.conn.url, {
        method: 'POST',
        // text/plain avoids the CORS preflight. Do not "fix" this to JSON.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: this.conn.token, action, payload }),
        signal: controller.signal,
        redirect: 'follow',
      });
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      throw new SheetError(
        aborted ? 'The sheet took too long to respond.' : 'Could not reach the sheet. Check your connection.',
        aborted ? 'timeout' : 'network',
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new SheetError(`Sheet responded with HTTP ${res.status}.`, 'server');
    }

    const text = await res.text();
    let body: Envelope<T>;
    try {
      body = JSON.parse(text) as Envelope<T>;
    } catch {
      throw new SheetError(
        'The URL did not return JSON. Make sure you pasted the Web App URL (ends in /exec), not the editor link.',
        'schema',
      );
    }

    if (!body.ok) {
      const msg = body.error ?? 'Unknown error';
      if (/token|unauthori[sz]ed/i.test(msg)) throw new SheetError('The access token was rejected.', 'auth');
      if (/schema|header|tab/i.test(msg)) throw new SheetError(msg, 'schema');
      throw new SheetError(msg, 'server');
    }

    return (body.result ?? ({} as T)) as T;
  }
}
