// Nightly reset at 04:00 in Singapore. Singapore is UTC+8 all year (no daylight saving).

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SGT_OFFSET_MS = 8 * HOUR_MS;
const RESET_HOUR = 4;

/** The first 04:00 SGT that is strictly after `nowMs`. Both values are epoch milliseconds. */
export function nextResetAt(nowMs: number): number {
  const sgtNow = nowMs + SGT_OFFSET_MS;
  const sgtMidnight = Math.floor(sgtNow / DAY_MS) * DAY_MS;
  let target = sgtMidnight + RESET_HOUR * HOUR_MS;
  if (target <= sgtNow) target += DAY_MS;
  return target - SGT_OFFSET_MS;
}

export type NightlyOptions = {
  now: () => number;
  run: () => void;
  onError?: (err: unknown) => void;
};

/** Calls `run` at every 04:00 SGT. Returns a function that stops the schedule. */
export function scheduleNightly(options: NightlyOptions): () => void {
  let timer: NodeJS.Timeout | null = null;
  let stopped = false;

  function arm(from: number) {
    const target = nextResetAt(from);
    timer = setTimeout(() => {
      timer = null;
      if (stopped) return;
      try {
        options.run();
      } catch (err) {
        options.onError?.(err);
      }
      // A timer can fire a few ms early. Start from the target so the same night never runs twice.
      if (!stopped) arm(Math.max(options.now(), target));
    }, Math.max(0, target - options.now()));
    timer.unref();
  }

  arm(options.now());
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    timer = null;
  };
}
