// SQLite storage for the one shared family snapshot.
// One row in `state` holds the current AppState as JSON. `version` goes up by 1 only when the state changes.

import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createSeed, reduce } from '../src/shared/index.ts';
import type { Action, AppState } from '../src/shared/index.ts';

export type Snapshot = { version: number; state: AppState };

export type KinvoDb = {
  /** The current version and state. Reads memory, not disk. */
  snapshot(): Snapshot;
  /** Runs the reducer and saves the result in one transaction. Same version when the reducer ignores the action. */
  apply(action: Action): Snapshot;
  /** Puts the seed back and adds 1 to the version. */
  reset(): Snapshot;
  close(): void;
};

export type OpenDbOptions = {
  /** File path, or ":memory:". The folder is created when it does not exist. */
  path: string;
  /** Clock for the updated_at column. */
  now?: () => number;
};

type StateRow = { version: number; json: string };

function parseState(json: string): AppState | null {
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value === 'object' && value !== null && (value as { schema?: unknown }).schema === 1) {
      return value as AppState;
    }
  } catch {
    // Damaged JSON: the caller falls back to the seed.
  }
  return null;
}

export function openDb(options: OpenDbOptions): KinvoDb {
  const now = options.now ?? Date.now;
  if (options.path !== ':memory:') mkdirSync(dirname(options.path), { recursive: true });

  const db = new DatabaseSync(options.path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
    json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  const select = db.prepare('SELECT version, json FROM state WHERE id = 1');
  const upsert = db.prepare(
    `INSERT INTO state (id, version, json, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET version = excluded.version, json = excluded.json, updated_at = excluded.updated_at`,
  );

  function write(version: number, state: AppState) {
    upsert.run(version, JSON.stringify(state), new Date(now()).toISOString());
  }

  function inTransaction<T>(work: () => T): T {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }

  function load(): Snapshot {
    const row = select.get() as StateRow | undefined;
    if (row) {
      const state = parseState(row.json);
      if (state) return { version: row.version, state };
    }
    // First start, or a damaged row: begin from the seed.
    const fresh: Snapshot = { version: row ? row.version + 1 : 1, state: createSeed() };
    inTransaction(() => write(fresh.version, fresh.state));
    return fresh;
  }

  // One process owns the file, so memory is the read path and disk is the safe copy.
  let current = load();

  return {
    snapshot: () => current,
    apply(action) {
      const next = reduce(current.state, action);
      if (next === current.state) return current;
      const saved: Snapshot = { version: current.version + 1, state: next };
      inTransaction(() => write(saved.version, saved.state));
      current = saved;
      return current;
    },
    reset() {
      const saved: Snapshot = { version: current.version + 1, state: createSeed() };
      inTransaction(() => write(saved.version, saved.state));
      current = saved;
      return current;
    },
    close() {
      db.close();
    },
  };
}
