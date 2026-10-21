// One DataStore interface, two implementations:
//   local - localStorage in this browser (tabs of the same browser sync through the storage event)
//   api   - the Kinvo server: GET /api/state, POST /api/actions, poll every 3 s
// createStore() picks api when /api/health answers { ok: true }, else local.

import type { Action } from '../shared/actions.ts';
import { reduce } from '../shared/reducer.ts';
import { createSeed } from '../shared/seed.ts';
import type { AppState } from '../shared/types.ts';

export type StoreMode = 'local' | 'api';

export interface DataStore {
  readonly mode: StoreMode;
  getState(): AppState;
  /** Applies the action. In api mode the UI updates at once and the server result follows. */
  dispatch(action: Action): Promise<void>;
  /** Calls the listener after every state change. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Back to the seed scenario, for everyone who shares this store. */
  reset(): Promise<void>;
  dispose(): void;
}

type ServerSnapshot = { version: number; state: AppState };

const LOCAL_KEY = 'kinvo.state.v1';
const POLL_MS = 3000;
const HEALTH_TIMEOUT_MS = 1500;

function isAppState(v: unknown): v is AppState {
  return typeof v === 'object' && v !== null && (v as { schema?: unknown }).schema === 1;
}

function createEmitter() {
  const listeners = new Set<() => void>();
  return {
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    emit() {
      for (const fn of listeners) fn();
    },
  };
}

export function createLocalStore(storage: Storage = window.localStorage): DataStore {
  const emitter = createEmitter();

  function read(): AppState {
    try {
      const raw = storage.getItem(LOCAL_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isAppState(parsed)) return parsed;
      }
    } catch {
      // Broken or blocked storage: fall back to the seed.
    }
    return createSeed();
  }

  function write(next: AppState) {
    try {
      storage.setItem(LOCAL_KEY, JSON.stringify(next));
    } catch {
      // Private mode or full storage: keep the state in memory only.
    }
  }

  let state = read();

  function onStorage(e: StorageEvent) {
    if (e.key !== LOCAL_KEY) return;
    state = read();
    emitter.emit();
  }
  window.addEventListener('storage', onStorage);

  return {
    mode: 'local',
    getState: () => state,
    async dispatch(action) {
      const next = reduce(state, action);
      if (next === state) return;
      state = next;
      write(state);
      emitter.emit();
    },
    subscribe: emitter.subscribe,
    async reset() {
      state = createSeed();
      write(state);
      emitter.emit();
    },
    dispose() {
      window.removeEventListener('storage', onStorage);
    },
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${url} failed: ${res.status}`);
  return (await res.json()) as T;
}

export function createApiStore(initial: ServerSnapshot): DataStore {
  const emitter = createEmitter();
  let version = initial.version;
  let state = initial.state;
  let pending = 0;

  function accept(snap: ServerSnapshot, force = false) {
    if (!force && snap.version === version) return;
    version = snap.version;
    state = snap.state;
    emitter.emit();
  }

  async function poll() {
    if (pending > 0 || document.visibilityState === 'hidden') return;
    try {
      const snap = await fetchJson<ServerSnapshot>('/api/state');
      if (pending === 0) accept(snap);
    } catch {
      // Offline for a moment. The next poll tries again.
    }
  }
  const timer = window.setInterval(poll, POLL_MS);
  const onVisible = () => {
    if (document.visibilityState === 'visible') void poll();
  };
  document.addEventListener('visibilitychange', onVisible);

  return {
    mode: 'api',
    getState: () => state,
    async dispatch(action) {
      const optimistic = reduce(state, action);
      if (optimistic === state) return;
      state = optimistic;
      emitter.emit();
      pending += 1;
      try {
        const snap = await fetchJson<ServerSnapshot>('/api/actions', { method: 'POST', body: JSON.stringify({ action }) });
        accept(snap, true);
      } catch (err) {
        const snap = await fetchJson<ServerSnapshot>('/api/state').catch(() => null);
        if (snap) accept(snap, true);
        throw err;
      } finally {
        pending -= 1;
      }
    },
    subscribe: emitter.subscribe,
    async reset() {
      const snap = await fetchJson<ServerSnapshot>('/api/reset', { method: 'POST', body: '{}' });
      accept(snap, true);
    },
    dispose() {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    },
  };
}

/** True only when the Kinvo API answers. A static host that returns index.html for /api/health gives false. */
export async function apiAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return false;
    const body = (await res.json()) as { ok?: unknown };
    return body.ok === true;
  } catch {
    return false;
  }
}

/** `?store=local` forces local mode, e.g. for offline demos. */
export async function createStore(): Promise<DataStore> {
  const forced = new URLSearchParams(window.location.search).get('store');
  if (forced !== 'local' && (await apiAvailable())) {
    try {
      const snap = await fetchJson<ServerSnapshot>('/api/state');
      if (isAppState(snap.state)) return createApiStore(snap);
    } catch {
      // Fall through to local.
    }
  }
  return createLocalStore();
}
