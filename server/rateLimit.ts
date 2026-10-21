// Fixed-window rate limiter with bounded memory.

export type RateLimiterOptions = {
  max: number;
  windowMs: number;
  now: () => number;
  /** Upper bound on tracked clients. Old entries go first. */
  maxClients?: number;
};

export type RateLimiter = {
  /** Counts one request. Returns false when the client is over the limit. */
  allow(client: string): boolean;
  size(): number;
};

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const maxClients = options.maxClients ?? 5000;
  const windows = new Map<string, { start: number; count: number }>();

  function sweep(at: number) {
    for (const [client, w] of windows) {
      if (at - w.start >= options.windowMs) windows.delete(client);
    }
    // Still full after dropping expired windows: drop the oldest entries (a Map keeps insertion order).
    for (const client of windows.keys()) {
      if (windows.size < maxClients) break;
      windows.delete(client);
    }
  }

  return {
    allow(client) {
      const at = options.now();
      const w = windows.get(client);
      if (!w || at - w.start >= options.windowMs) {
        if (!w && windows.size >= maxClients) sweep(at);
        windows.delete(client);
        windows.set(client, { start: at, count: 1 });
        return options.max >= 1;
      }
      w.count += 1;
      return w.count <= options.max;
    },
    size: () => windows.size,
  };
}
