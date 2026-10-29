import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, afterEach, before, describe, it } from 'node:test';
import { PERSON, SCENARIO, SWING_STORY_ID, createSeed } from '../src/shared/index.ts';
import type { Action, AppState } from '../src/shared/index.ts';
import { createApp } from './app.ts';
import type { App, AppOptions } from './app.ts';
import { nextResetAt } from './nightly.ts';

type Snapshot = { version: number; state: AppState };

let tmp = '';
let counter = 0;
const apps: App[] = [];

before(() => {
  tmp = mkdtempSync(join(tmpdir(), 'kinvo-api-'));
});

afterEach(async () => {
  while (apps.length > 0) await apps.pop()?.close();
});

after(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function dbFile(): string {
  counter += 1;
  return join(tmp, `db-${counter}`, 'kinvo.sqlite');
}

type Started = { app: App; url: string };

async function start(options: Partial<AppOptions> = {}): Promise<Started> {
  const app = createApp({
    dbPath: dbFile(),
    rateLimit: { max: 1000 },
    nightlyReset: false,
    logError: () => {},
    ...options,
  });
  apps.push(app);
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve));
  const { port } = app.server.address() as AddressInfo;
  return { app, url: `http://127.0.0.1:${port}` };
}

async function json(res: Response): Promise<unknown> {
  return JSON.parse(await res.text());
}

function post(url: string, path: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(url + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const replyAction = (id: string, text = 'Hello'): Action => ({
  type: 'reply/add',
  id,
  storyId: SWING_STORY_ID,
  authorId: PERSON.mum,
  text,
  at: SCENARIO.times.mumReply,
});

function assertJsonHeaders(res: Response) {
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.equal(res.headers.get('cache-control'), 'no-store');
}

describe('GET /api/health', () => {
  it('answers ok with the version', async () => {
    const { url } = await start();
    const res = await fetch(`${url}/api/health`);
    assert.equal(res.status, 200);
    assertJsonHeaders(res);
    assert.deepEqual(await json(res), { ok: true, version: 1 });
  });

  it('ignores the query string', async () => {
    const { url } = await start();
    const res = await fetch(`${url}/api/health?x=1`);
    assert.equal(res.status, 200);
  });
});

describe('GET /api/state', () => {
  it('returns the seed at version 1', async () => {
    const { url } = await start();
    const res = await fetch(`${url}/api/state`);
    assert.equal(res.status, 200);
    assertJsonHeaders(res);
    const body = (await json(res)) as Snapshot;
    assert.equal(body.version, 1);
    assert.deepEqual(body.state, createSeed());
  });
});

describe('POST /api/actions', () => {
  it('applies a valid action and adds 1 to the version', async () => {
    const { url } = await start();
    const res = await post(url, '/api/actions', { action: replyAction('reply-1') });
    assert.equal(res.status, 200);
    assertJsonHeaders(res);
    const body = (await json(res)) as Snapshot;
    assert.equal(body.version, 2);
    assert.equal(body.state.replies.length, 1);
    assert.equal(body.state.replies[0]?.text, 'Hello');

    const state = (await json(await fetch(`${url}/api/state`))) as Snapshot;
    assert.equal(state.version, 2);
    assert.deepEqual(state.state, body.state);
    const health = (await json(await fetch(`${url}/api/health`))) as { version: number };
    assert.equal(health.version, 2);
  });

  it('keeps the version when the reducer ignores a duplicate id', async () => {
    const { url } = await start();
    await post(url, '/api/actions', { action: replyAction('reply-1') });
    const res = await post(url, '/api/actions', { action: replyAction('reply-1', 'Again') });
    assert.equal(res.status, 200);
    const body = (await json(res)) as Snapshot;
    assert.equal(body.version, 2);
    assert.equal(body.state.replies.length, 1);
    assert.equal(body.state.replies[0]?.text, 'Hello');
  });

  it('keeps the version when the story is unknown', async () => {
    const { url } = await start();
    const action = { ...replyAction('reply-x'), storyId: 'story-missing' };
    const res = await post(url, '/api/actions', { action });
    assert.equal(res.status, 200);
    assert.equal(((await json(res)) as Snapshot).version, 1);
  });

  it('answers 400 for an invalid action', async () => {
    const { url } = await start();
    const bodies: unknown[] = [
      { action: { type: 'reply/add', id: 'bad id!', storyId: SWING_STORY_ID, authorId: 'mum', text: 'x', at: SCENARIO.times.mumReply } },
      { action: { ...replyAction('r1'), text: 'a'.repeat(1001) } },
      { action: { type: 'nope' } },
      { action: null },
      { action: 'reply/add' },
      { action: [] },
      {},
      [],
      null,
      42,
      replyAction('r1'),
    ];
    for (const body of bodies) {
      const res = await post(url, '/api/actions', body);
      assert.equal(res.status, 400, JSON.stringify(body));
      assertJsonHeaders(res);
      assert.deepEqual(await json(res), { error: 'invalid action' });
    }
    assert.equal(((await json(await fetch(`${url}/api/state`))) as Snapshot).version, 1);
  });

  it('answers 400 for bad JSON and for an empty body', async () => {
    const { url } = await start();
    for (const body of ['{not json', '', '{"action":', 'undefined']) {
      const res = await post(url, '/api/actions', body);
      assert.equal(res.status, 400, body);
      assertJsonHeaders(res);
      assert.deepEqual(await json(res), { error: 'invalid action' });
    }
  });

  it('does not let extra fields reach the state', async () => {
    const { url } = await start();
    const action = { ...replyAction('reply-1'), admin: true, nested: { a: 1 } };
    const body = (await json(await post(url, '/api/actions', { action }))) as Snapshot;
    assert.deepEqual(Object.keys(body.state.replies[0] ?? {}).sort(), ['authorId', 'createdAt', 'id', 'storyId', 'text']);
  });

  it('accepts a body of exactly 32 KB', async () => {
    const { url } = await start();
    const filler = ' '.repeat(32 * 1024 - JSON.stringify({ action: replyAction('reply-1') }).length);
    const raw = JSON.stringify({ action: replyAction('reply-1') }) + filler;
    assert.equal(Buffer.byteLength(raw), 32 * 1024);
    const res = await post(url, '/api/actions', raw);
    assert.equal(res.status, 200);
  });

  it('answers 413 for a 33 KB body', async () => {
    const { url } = await start();
    const raw = JSON.stringify({ action: replyAction('reply-1'), pad: 'x'.repeat(33 * 1024) });
    const res = await post(url, '/api/actions', raw);
    assert.equal(res.status, 413);
    assertJsonHeaders(res);
    assert.deepEqual(await json(res), { error: 'body too large' });
    assert.equal(((await json(await fetch(`${url}/api/state`))) as Snapshot).version, 1);
  });

  it('answers 413 for a chunked body that passes the limit', async () => {
    const { url } = await start();
    const target = new URL(`${url}/api/actions`);
    const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = httpRequest(
        { host: target.hostname, port: target.port, path: target.pathname, method: 'POST', headers: { 'content-type': 'application/json' } },
        (res) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (c: string) => {
            text += c;
          });
          res.on('end', () => resolve({ status: res.statusCode ?? 0, body: text }));
        },
      );
      req.on('error', reject);
      req.write('{"pad":"');
      req.write('x'.repeat(20 * 1024));
      req.write('x'.repeat(20 * 1024));
      req.end('"}');
    });
    assert.equal(result.status, 413);
    assert.deepEqual(JSON.parse(result.body), { error: 'body too large' });
  });
});

describe('rate limit', () => {
  it('answers 429 above the limit and does not limit GET', async () => {
    const { url } = await start({ rateLimit: { max: 3, windowMs: 60_000 } });
    for (let i = 0; i < 3; i += 1) {
      const res = await post(url, '/api/actions', { action: replyAction(`reply-${i}`) });
      assert.equal(res.status, 200);
    }
    const blocked = await post(url, '/api/actions', { action: replyAction('reply-3') });
    assert.equal(blocked.status, 429);
    assertJsonHeaders(blocked);
    assert.deepEqual(await json(blocked), { error: 'too many requests' });

    const reset = await post(url, '/api/reset', {});
    assert.equal(reset.status, 429);

    for (let i = 0; i < 10; i += 1) {
      assert.equal((await fetch(`${url}/api/state`)).status, 200);
      assert.equal((await fetch(`${url}/api/health`)).status, 200);
    }
    const state = (await json(await fetch(`${url}/api/state`))) as Snapshot;
    assert.equal(state.state.replies.length, 3);
  });

  it('counts clients by the first X-Forwarded-For value when the peer is local', async () => {
    const { url } = await start({ rateLimit: { max: 2, windowMs: 60_000 } });
    const as = (ip: string, id: string) => post(url, '/api/actions', { action: replyAction(id) }, { 'x-forwarded-for': ip });
    assert.equal((await as('203.0.113.1, 10.0.0.1', 'a1')).status, 200);
    assert.equal((await as('203.0.113.1', 'a2')).status, 200);
    assert.equal((await as('203.0.113.1, 10.9.9.9', 'a3')).status, 429);
    assert.equal((await as('203.0.113.2', 'b1')).status, 200);
    assert.equal((await as('203.0.113.2', 'b2')).status, 200);
    assert.equal((await as('203.0.113.2', 'b3')).status, 429);
  });

  it('starts a new window after windowMs', async () => {
    let clock = Date.parse('2026-09-13T10:00:00Z');
    const { url } = await start({ now: () => clock, rateLimit: { max: 1, windowMs: 60_000 } });
    assert.equal((await post(url, '/api/actions', { action: replyAction('r1') })).status, 200);
    assert.equal((await post(url, '/api/actions', { action: replyAction('r2') })).status, 429);
    clock += 59_999;
    assert.equal((await post(url, '/api/actions', { action: replyAction('r2') })).status, 429);
    clock += 1;
    assert.equal((await post(url, '/api/actions', { action: replyAction('r2') })).status, 200);
  });
});

describe('POST /api/reset', () => {
  it('puts the seed back and adds 1 to the version', async () => {
    const { url } = await start();
    await post(url, '/api/actions', { action: replyAction('reply-1') });
    const res = await post(url, '/api/reset', {});
    assert.equal(res.status, 200);
    assertJsonHeaders(res);
    const body = (await json(res)) as Snapshot;
    assert.equal(body.version, 3);
    assert.deepEqual(body.state, createSeed());
    const state = (await json(await fetch(`${url}/api/state`))) as Snapshot;
    assert.equal(state.version, 3);
    assert.deepEqual(state.state, createSeed());
  });

  it('adds 1 even when the state is already the seed', async () => {
    const { url } = await start();
    const body = (await json(await post(url, '/api/reset', {}))) as Snapshot;
    assert.equal(body.version, 2);
  });

  it('accepts an empty body and rejects bad JSON', async () => {
    const { url } = await start();
    assert.equal((await post(url, '/api/reset', '')).status, 200);
    const bad = await post(url, '/api/reset', '{oops');
    assert.equal(bad.status, 400);
    assert.deepEqual(await json(bad), { error: 'invalid json' });
  });

  it('answers 413 for a big body', async () => {
    const { url } = await start();
    const res = await post(url, '/api/reset', JSON.stringify({ pad: 'x'.repeat(33 * 1024) }));
    assert.equal(res.status, 413);
  });
});

describe('404 and 405', () => {
  it('answers 404 for unknown paths', async () => {
    const { url } = await start();
    for (const path of ['/api/nope', '/api', '/api/', '/api/health/', '/', '/index.html', '/api/state/extra']) {
      const res = await fetch(url + path);
      assert.equal(res.status, 404, path);
      assertJsonHeaders(res);
      assert.deepEqual(await json(res), { error: 'not found' });
    }
    const res = await post(url, '/api/nope', {});
    assert.equal(res.status, 404);
  });

  it('answers 405 for the wrong method on a known path', async () => {
    const { url } = await start();
    const cases: Array<[string, string, string]> = [
      ['POST', '/api/health', 'GET'],
      ['POST', '/api/state', 'GET'],
      ['GET', '/api/actions', 'POST'],
      ['GET', '/api/reset', 'POST'],
      ['PUT', '/api/actions', 'POST'],
      ['DELETE', '/api/state', 'GET'],
      ['PATCH', '/api/health', 'GET'],
    ];
    for (const [method, path, allow] of cases) {
      const res = await fetch(url + path, { method, body: method === 'GET' ? undefined : '{}' });
      assert.equal(res.status, 405, `${method} ${path}`);
      assertJsonHeaders(res);
      assert.equal(res.headers.get('allow'), allow);
      assert.deepEqual(await json(res), { error: 'method not allowed' });
    }
  });
});

describe('errors', () => {
  it('answers 500 JSON and keeps serving', async () => {
    const { app, url } = await start();
    const original = app.db.apply;
    app.db.apply = () => {
      throw new Error('disk on fire');
    };
    const res = await post(url, '/api/actions', { action: replyAction('reply-1') });
    assert.equal(res.status, 500);
    assertJsonHeaders(res);
    assert.deepEqual(await json(res), { error: 'server error' });

    app.db.apply = original;
    assert.equal((await fetch(`${url}/api/health`)).status, 200);
    assert.equal((await post(url, '/api/actions', { action: replyAction('reply-1') })).status, 200);
  });

  it('calls logError with the error', async () => {
    const logged: unknown[] = [];
    const { app, url } = await start({ logError: (err) => logged.push(err) });
    app.db.reset = () => {
      throw new Error('boom');
    };
    const res = await post(url, '/api/reset', {});
    assert.equal(res.status, 500);
    assert.equal(logged.length, 1);
    assert.match(String((logged[0] as Error).message), /boom/);
  });
});

describe('persistence', () => {
  it('keeps the state after close and reopen of the same file', async () => {
    const dbPath = dbFile();
    const first = await start({ dbPath });
    await post(first.url, '/api/actions', { action: replyAction('reply-1', 'Saved text') });
    await post(first.url, '/api/actions', { action: replyAction('reply-2', 'Second') });
    const before = (await json(await fetch(`${first.url}/api/state`))) as Snapshot;
    assert.equal(before.version, 3);
    await first.app.close();

    const second = await start({ dbPath });
    const after = (await json(await fetch(`${second.url}/api/state`))) as Snapshot;
    assert.equal(after.version, 3);
    assert.deepEqual(after.state, before.state);
    assert.deepEqual(after.state.replies.map((r) => r.text), ['Saved text', 'Second']);

    const next = (await json(await post(second.url, '/api/actions', { action: replyAction('reply-3') }))) as Snapshot;
    assert.equal(next.version, 4);
  });

  it('creates the folder of the db file and uses WAL', async () => {
    const dbPath = dbFile();
    assert.equal(existsSync(join(dbPath, '..')), false);
    const { app } = await start({ dbPath });
    assert.equal(existsSync(dbPath), true);
    assert.equal(app.db.snapshot().version, 1);
    const { DatabaseSync } = await import('node:sqlite');
    const raw = new DatabaseSync(dbPath);
    const mode = raw.prepare('PRAGMA journal_mode').get() as { journal_mode: string };
    raw.close();
    assert.equal(mode.journal_mode, 'wal');
  });

  it('starts from the seed when the saved row is damaged', async () => {
    const dbPath = dbFile();
    const first = await start({ dbPath });
    await first.app.close();
    const { DatabaseSync } = await import('node:sqlite');
    const raw = new DatabaseSync(dbPath);
    raw.prepare('UPDATE state SET json = ? WHERE id = 1').run('{not json');
    raw.close();

    const second = await start({ dbPath });
    const body = (await json(await fetch(`${second.url}/api/state`))) as Snapshot;
    assert.deepEqual(body.state, createSeed());
    assert.equal(body.version, 2);
  });
});

describe('nightly reset', () => {
  it('runs db.reset at 04:00 SGT with the injected clock', async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let clock = Date.parse('2026-09-13T03:00:00+08:00');
    const app = createApp({
      dbPath: dbFile(),
      now: () => clock,
      nightlyReset: true,
      rateLimit: { max: 1000 },
      logError: () => {},
    });
    apps.push(app);
    app.db.apply(replyAction('reply-1'));
    assert.equal(app.db.snapshot().state.replies.length, 1);
    assert.equal(app.db.snapshot().version, 2);

    const target = nextResetAt(clock);
    assert.equal(target, Date.parse('2026-09-13T04:00:00+08:00'));

    clock = target;
    t.mock.timers.tick(60 * 60 * 1000);
    assert.equal(app.db.snapshot().state.replies.length, 0);
    assert.equal(app.db.snapshot().version, 3);

    // It arms itself again for the next night.
    clock = Date.parse('2026-09-14T04:00:00+08:00');
    app.db.apply(replyAction('reply-2'));
    t.mock.timers.tick(24 * 60 * 60 * 1000);
    assert.equal(app.db.snapshot().state.replies.length, 0);
  });
});

describe('study assignment (Iter2.05 A/B)', () => {
  type Counts = { a: number; b: number; total: number; lastAt: string | null };

  async function assign(url: string): Promise<string> {
    const res = await fetch(`${url}/api/study/assign`, { method: 'POST' });
    assert.equal(res.status, 200);
    assertJsonHeaders(res);
    return ((await json(res)) as { version: string }).version;
  }

  it('keeps A and B within one of each other', async () => {
    const { url } = await start();
    const seen = { a: 0, b: 0 };
    for (let i = 0; i < 21; i += 1) {
      const version = await assign(url);
      assert.ok(version === 'a' || version === 'b');
      seen[version] += 1;
      assert.ok(Math.abs(seen.a - seen.b) <= 1, `after ${i + 1}: ${seen.a} A, ${seen.b} B`);
    }
    const counts = (await json(await fetch(`${url}/api/study/counts`))) as Counts;
    assert.equal(counts.a, seen.a);
    assert.equal(counts.b, seen.b);
    assert.equal(counts.total, 21);
  });

  it('breaks a tie with the random source', async () => {
    const low = await start({ random: () => 0.1 });
    assert.equal(await assign(low.url), 'a');
    assert.equal(await assign(low.url), 'b');
    const high = await start({ random: () => 0.9 });
    assert.equal(await assign(high.url), 'b');
    assert.equal(await assign(high.url), 'a');
  });

  it('reports zero counts and the time of the last assignment', async () => {
    let clock = Date.UTC(2026, 9, 29, 6, 0, 0);
    const { url } = await start({ now: () => clock });
    assert.deepEqual(await json(await fetch(`${url}/api/study/counts`)), { a: 0, b: 0, lastAt: null, total: 0 });
    await assign(url);
    clock += 60_000;
    await assign(url);
    const counts = (await json(await fetch(`${url}/api/study/counts`))) as Counts;
    assert.equal(counts.lastAt, new Date(clock).toISOString());
  });

  it('keeps the counts through the nightly reset and a restart', async () => {
    const dbPath = dbFile();
    const first = await start({ dbPath });
    await assign(first.url);
    await assign(first.url);
    await assign(first.url);
    first.app.db.reset();
    assert.equal(first.app.db.studyCounts().a + first.app.db.studyCounts().b, 3);
    await first.app.close();

    const second = await start({ dbPath });
    const counts = (await json(await fetch(`${second.url}/api/study/counts`))) as Counts;
    assert.equal(counts.total, 3);
  });

  it('answers 405 for the wrong method', async () => {
    const { url } = await start();
    const get = await fetch(`${url}/api/study/assign`);
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('allow'), 'POST');
    const postCounts = await fetch(`${url}/api/study/counts`, { method: 'POST', body: '{}' });
    assert.equal(postCounts.status, 405);
    assert.equal(postCounts.headers.get('allow'), 'GET');
  });
});
