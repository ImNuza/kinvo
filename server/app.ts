// The Kinvo JSON API. createApp() builds the server but does not listen, so tests can use port 0.
// Spec: docs/API.md.

import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { parseAction } from '../src/shared/index.ts';
import { openDb } from './db.ts';
import type { KinvoDb } from './db.ts';
import { scheduleNightly } from './nightly.ts';
import { createRateLimiter } from './rateLimit.ts';

export const BODY_LIMIT_BYTES = 32 * 1024;
export const DEFAULT_RATE_LIMIT = { max: 60, windowMs: 60_000 } as const;

export type AppOptions = {
  /** SQLite file path, or ":memory:". */
  dbPath: string;
  /** Clock in epoch milliseconds. Tests pass a fake one. */
  now?: () => number;
  /** POST requests allowed per client in each window. */
  rateLimit?: { max?: number; windowMs?: number };
  /** Reset to the seed at 04:00 Asia/Singapore. Default true. */
  nightlyReset?: boolean;
  /** Called when a handler throws. Default: one line on stderr. */
  logError?: (err: unknown) => void;
};

export type App = {
  server: Server;
  db: KinvoDb;
  close(): Promise<void>;
};

type Method = 'GET' | 'POST';

const ROUTES: Readonly<Record<string, Method>> = {
  '/api/health': 'GET',
  '/api/state': 'GET',
  '/api/actions': 'POST',
  '/api/reset': 'POST',
};

const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** The first X-Forwarded-For value when the peer is the local proxy, else the socket address. */
export function clientOf(req: IncomingMessage): string {
  const peer = req.socket.remoteAddress ?? 'unknown';
  if (!LOOPBACK.has(peer)) return peer;
  const header = req.headers['x-forwarded-for'];
  const raw = Array.isArray(header) ? header[0] : header;
  const first = raw?.split(',')[0]?.trim().slice(0, 64);
  return first ? first : peer;
}

function send(res: ServerResponse, status: number, body: unknown, extra: Record<string, string> = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-length': Buffer.byteLength(payload),
    ...extra,
  });
  res.end(payload);
}

/** Resolves the body text, or null when it passes the limit. Stops collecting at once when it does. */
function readBody(req: IncomingMessage, limit: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.headers['content-length']);
    if (Number.isFinite(declared) && declared > limit) {
      resolve(null);
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    function settle(value: string | null) {
      if (settled) return;
      settled = true;
      req.removeListener('data', onData);
      resolve(value);
    }
    function onData(chunk: Buffer) {
      size += chunk.length;
      if (size > limit) {
        chunks.length = 0;
        settle(null);
        return;
      }
      chunks.push(chunk);
    }
    req.on('data', onData);
    req.on('end', () => settle(Buffer.concat(chunks).toString('utf8')));
    req.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    req.on('close', () => {
      if (!settled && !req.complete) {
        settled = true;
        reject(new Error('request closed early'));
      }
    });
  });
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false };
  }
}

export function createApp(options: AppOptions): App {
  const now = options.now ?? Date.now;
  const logError =
    options.logError ??
    ((err: unknown) => {
      process.stderr.write(`kinvo: request failed: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
    });

  const db = openDb({ path: options.dbPath, now });
  const limiter = createRateLimiter({
    max: options.rateLimit?.max ?? DEFAULT_RATE_LIMIT.max,
    windowMs: options.rateLimit?.windowMs ?? DEFAULT_RATE_LIMIT.windowMs,
    now,
  });

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const path = (req.url ?? '/').split('?')[0] ?? '/';
    const method = req.method ?? 'GET';
    const allowed = ROUTES[path];

    if (allowed === undefined) {
      send(res, 404, { error: 'not found' });
      return;
    }
    if (method !== allowed) {
      send(res, 405, { error: 'method not allowed' }, { allow: allowed });
      return;
    }

    if (method === 'GET') {
      if (path === '/api/health') send(res, 200, { ok: true, version: db.snapshot().version });
      else send(res, 200, db.snapshot());
      return;
    }

    if (!limiter.allow(clientOf(req))) {
      send(res, 429, { error: 'too many requests' }, { 'retry-after': '60' });
      return;
    }

    const text = await readBody(req, BODY_LIMIT_BYTES);
    if (text === null) {
      send(res, 413, { error: 'body too large' }, { connection: 'close' });
      // The client may keep sending. End the socket soon after the answer.
      res.once('finish', () => {
        setTimeout(() => req.socket.destroy(), 1000).unref();
      });
      return;
    }

    if (path === '/api/reset') {
      if (text.trim() !== '' && !parseJson(text).ok) {
        send(res, 400, { error: 'invalid json' });
        return;
      }
      send(res, 200, db.reset());
      return;
    }

    const body = parseJson(text);
    const action = body.ok && typeof body.value === 'object' && body.value !== null
      ? parseAction((body.value as { action?: unknown }).action)
      : null;
    if (!action) {
      send(res, 400, { error: 'invalid action' });
      return;
    }
    send(res, 200, db.apply(action));
  }

  const server = createServer((req, res) => {
    handle(req, res).catch((err: unknown) => {
      try {
        logError(err);
      } catch {
        // A broken logger must not stop the answer.
      }
      if (res.destroyed || res.writableEnded) return;
      if (res.headersSent) {
        res.destroy();
        return;
      }
      send(res, 500, { error: 'server error' });
    });
  });

  const stopNightly =
    options.nightlyReset === false
      ? () => {}
      : scheduleNightly({
          now,
          run: () => {
            db.reset();
          },
          onError: logError,
        });

  let closed = false;
  return {
    server,
    db,
    async close() {
      if (closed) return;
      closed = true;
      stopNightly();
      if (server.listening) {
        await new Promise<void>((resolve) => {
          server.close(() => resolve());
          server.closeAllConnections();
        });
      }
      db.close();
    },
  };
}
